# Facet ↔ Backend Contract (Cairn / Vein)

> **Audience:** backend engineers building the control plane (Cairn = BMC,
> Vein = switch) that Facet (the Web UI) talks to.
> **Status:** the Facet client implements this contract today against an
> in-process mock. Everything below is what a **real** backend must provide for
> the client to work unchanged. Items the client cannot exercise without a
> backend are called out explicitly.
> **Companion docs:** `facet-architecture.md`, `facet-auth-plan.md`, `AGENTS.md`.

Facet ships as a **static client-only SPA** (no SvelteKit server at runtime).
It is served as static files and talks to the backend over three transport
planes, split by traffic shape:

| Plane | Transport | Used for |
|---|---|---|
| **Auth** | HTTP / ConnectRPC (`/api/connect`) | login, session refresh, logout (the only cookie surface) |
| **Control + serial** | NATS over WebSocket | RPCs (inventory…), telemetry streams, serial console |
| **KVM (pixels)** | dedicated WebSocket (`/kvm/<nodeId>`) | remote video/keyboard/mouse (noVNC) |

**Golden rule — serve everything same-origin.** The SPA assets, `/api/connect`,
the NATS WS, and `/kvm/*` should all be reachable on one origin. Same-origin
makes the HttpOnly auth cookie flow automatically (no CORS, no `SameSite=None`),
lets the KVM/serial proxies authorize the WS upgrade by cookie, and means nodes
need **no address field** in the schema (the proxy resolves `nodeId`).

---

## 1. Deployment topologies

1. **Embedded on-device** — the device (Cairn/Vein) serves the SPA and exposes
   all three planes itself; `/kvm/<self>` proxies to the local
   websockify→video-engine.
2. **Standalone / on-prem central** — a central host serves the SPA and
   **proxies per-node**: `/api/connect`, NATS, and `/kvm/<nodeId>` are forwarded
   to the target fleet device. Inter-node auth/routing is the central host's job.
3. **Tauri desktop** — serves the SPA from `tauri://localhost`, so the backend is
   **cross-origin** → third-party-cookie rules bite. Use the Tauri HTTP plugin
   (native cookie jar) or OS-keychain token storage. **Special-cased later**; the
   same-origin web/embedded path is primary.

---

## 2. Schema (source of truth)

Protobuf lives in the dedicated schema repo (`../schema`, package `schema.v1`)
and generates **Go, TypeScript, and Rust**. The backend consumes the Go output
(`gen/go`, protobuf + vtprotobuf + connect-go); Facet consumes the TS output.

- **Wire format is protobuf** everywhere **except serial** (raw UART bytes).
- **Validation is protovalidate** (runtime, against the `buf.validate` rules
  compiled into the descriptors) — no codegen validator. The backend should
  validate inbound messages the same way (`buf.build/go/protovalidate`).
- Regenerate after any `.proto` change: `buf dep update && buf lint && buf generate`.
- The API is **pre-1.0 and freely breakable** right now; coordinate changes
  through the schema repo.

---

## 3. Auth plane — HTTP / ConnectRPC

**This is the most important section.** Design rationale (Path B) is in
`facet-auth-plan.md`. Summary of the model:

- **Long-lived refresh secret = HttpOnly cookie** set by the backend. Unreadable
  to JS (XSS-resistant). **Never** in the proto, never in a response body.
- **Short-lived access token = JSON in the response body**, held only in Facet's
  memory, and presented as the **NATS connect token** (see §4). The NATS user
  JWT minted by auth-callout must have **TTL ≤ the access token**.

### 3.1 Endpoint

- ConnectRPC service `schema.v1.AuthService`, mounted at base URL **`/api/connect`**
  (full path: `/api/connect/schema.v1.AuthService/<Method>`).
- The client uses **connect-web** with `credentials: "include"` (cookies sent on
  every call). Connect's default JSON codec is used unless you negotiate binary.
- Requests carry the `Connect-Protocol-Version` header (built-in CSRF resistance:
  a simple cross-site form cannot set it).

### 3.2 Methods the client calls today

| RPC | Request | Response | Notes |
|---|---|---|---|
| `Login` | `LoginRequest{username,password}` | `LoginResponse` | On success **also `Set-Cookie`** the refresh cookie |
| `GetCurrentUser` | `GetCurrentUserRequest{}` | `GetCurrentUserResponse` | **Cookie-authed**; boot + refresh endpoint (re-mints access token) |
| `Logout` | `LogoutRequest{}` | `LogoutResponse{}` | Clear/revoke the cookie server-side |

`LoginResponse` / `GetCurrentUserResponse` fields:

```
access_token : string                  # short-lived; the NATS connect token
expires_at   : google.protobuf.Timestamp   # when access_token expires
username     : string
role         : UserRole
must_change_password : bool            # LoginResponse only
```

Defined-but-not-yet-consumed by the client (safe to stub/implement later):
`ChangePassword`, the WebAuthn flows, the OIDC provider/principal RPCs, and
`UserService`. The client does not call them yet.

### 3.3 Cookie requirements (backend-owned)

- `Set-Cookie` on `Login` (and on successful WebAuthn login later).
- Attributes: **`HttpOnly; Secure; SameSite=Strict; Path=/`**, and use the
  **`__Host-`** name prefix (e.g. `__Host-facet_session`).
- Contents: opaque server-side session / refresh handle (rotate on use; support
  revocation). Lifetime = the session lifetime (hours/days), independent of the
  short access-token TTL.
- `Logout` must invalidate it server-side **and** expire it via `Set-Cookie`.

### 3.4 Error mapping (Connect status codes → client behavior)

The client maps `ConnectError.code` to a user message:

- `Unauthenticated` / `InvalidArgument` / `PermissionDenied` → "invalid
  credentials" (login form error).
- Anything else (incl. transport failure) → "auth service unavailable".
- `GetCurrentUser` failing for **any** reason ⇒ client treats the user as
  signed-out (so an expired/missing cookie cleanly lands on `/login`).

### 3.5 What the client does **not** do (backend responsibilities)

- It never reads, stores, or sends the refresh cookie explicitly (the browser
  does, via `credentials:"include"`).
- It does not persist the access token (memory only; gone on reload — restored
  via `GetCurrentUser`).
- The client gate (redirect to `/login`) is **UX only**. Every SPA route is
  reachable client-side; **real protection is each API requiring a valid token**.
  Unauthorized calls must fail server-side — the UI just renders dataless.

---

## 4. NATS plane — control + telemetry + serial

### 4.1 Connection & auth-callout

- Facet opens a **NATS WebSocket** to the URL given by the build-time env
  `PUBLIC_NATS_WS_URL` (set this to the same-origin WS endpoint, e.g.
  `wss://<origin>/nats`).
- It connects with the **access token as the NATS `token`** connect option
  (nats.ws `wsconnect({ servers, token })`). The server must run in
  **`auth_callout` mode (NATS 2.10+)**: validate the access token against the
  Auth Service authority and mint a **scoped NATS user JWT** whose subject
  permissions encode the role (see `facet-auth-plan.md` §3–4).
- Client reconnect settings: `maxReconnectAttempts: 5`, `reconnectTimeWait:
  2000ms`, `pingInterval: 30s`.

### 4.2 Authorization (role → subject permissions)

`UserRole`: `USER_ROLE_UNSPECIFIED=0`, `READ_ONLY=1`, `OPERATOR=2`, `ADMIN=3`.
The callout is the single authz mapping point. Suggested shape:

- read-only: subscribe to `telemetry.>`, request `inventory.list`.
- operator/admin: additionally publish `serial.*.in` (and future command
  subjects).

### 4.3 Subjects the client uses

| Subject | Pattern | Op | Payload | Message |
|---|---|---|---|---|
| Inventory | `inventory.list` | request/reply | protobuf | `ListInventoryRequest` → `ListInventoryResponse` |
| Serial targets | `serial.targets` | request/reply | protobuf | `ListSerialTargetsRequest` → `ListSerialTargetsResponse` |
| Switch detail | `switch.detail` | request/reply | protobuf | `GetSwitchRequest` → `GetSwitchResponse` |
| Settings | `settings.get` | request/reply | protobuf | `GetSettingsRequest` → `GetSettingsResponse` |
| Users | `users.{list,create,delete,set_role}` | request/reply | protobuf | `UserService` messages |
| Telemetry | `telemetry.<nodeId>.<sensorId>` | the client **subscribes `telemetry.>`** | protobuf | `SensorReading` |
| Serial out | `serial.<nodeId>.out` | client subscribes | **raw bytes** | device→browser UART |
| Serial in | `serial.<nodeId>.in` | client publishes | **raw bytes** | browser→device UART |

Notes:
- **Request/reply subjects are consumed over NATS**, even though the same RPCs are
  also defined as Connect services in the schema. The backend must answer these
  subjects (encode the response protobuf). `ListInventoryRequest`/`GetSettingsRequest`
  are empty; `GetSwitchRequest`/`ListSerialTargetsRequest` carry `node_id`.
- `ListInventoryResponse{ repeated NodeSummary nodes }`;
  `NodeSummary{ id, name, kind:NodeKind, availability:NodeAvailability,
  uptime_seconds:int64, capabilities:NodeCapabilities }`. `uptime_seconds` is
  **int64 → bigint** on the wire. **`capabilities` drives the UI** — see §4.5.
- `SensorReading{ node_id, sensor_id, type:SensorType, value:double, unit,
  timestamp }`. The client buffers per `sensor_id` for live charts. `sensor_id`
  must match a `MetricDescriptor.id` the node advertised (see §4.5).
- `nodeId` becomes a **NATS subject token**: it must not contain `.`, whitespace,
  `*`, or `>` (the client validates this before subscribing/publishing). The same
  applies to `SerialTarget.id` (it is used in the `serial.<id>.{in,out}` subjects).

### 4.5 Capability advertisement (drives the UI)

Facet renders **only the UI a node advertises it supports** — this is how a
discovered node, including the single device in standalone/Tauri mode, tells the
client which remote-control, monitoring, and management surfaces to show. The
backend MUST populate `NodeSummary.capabilities` (`NodeCapabilities`) honestly in
the inventory reply:

```
NodeCapabilities {
  bool kvm                       // remote video available → Remote shows the KVM subwindow
  bool serial_console            // serial available → Remote shows the serial subwindow
  bool switch_management         // node answers switch.detail → node page shows switch config
  bool power_control             // node accepts ManagementService.Reset
  repeated MetricDescriptor metrics  // monitoring tiles to render (empty = no monitoring)
}
MetricDescriptor { string id; string label; SensorType type; string unit }
```

Rules the backend must honor:
- If `kvm=false`, Facet **omits the KVM subwindow entirely** (no placeholder). Only
  advertise `kvm=true` when a `/kvm/<nodeId>` proxy is actually wired (see §5).
- If `serial_console=true`, the node must also answer `serial.targets` with ≥1
  `SerialTarget`, and bridge each target id on `serial.<id>.{in,out}`.
- If `switch_management=true`, the node must answer `switch.detail` for its id.
- Each `MetricDescriptor.id` must equal the `sensor_id` published on
  `telemetry.<nodeId>.<id>`. Advertise **only metrics the device truly has** — e.g.
  the passively-cooled Vega switch advertises memory/storage/CPU-frequency
  (`SENSOR_TYPE_UTILIZATION`/`_FREQUENCY`) but **no temperature or fans**. Capability
  is per-device, not per-`NodeKind` (some switches are monitored, Vega is not).

### 4.4 Serial bridge (backend)

Bridge the node UART to NATS: publish device output as raw bytes on
`serial.<nodeId>.out`, and read raw bytes published to `serial.<nodeId>.in` and
write them to the UART. No framing, no protobuf — it is a byte pipe. Echo is the
device's responsibility (the client does **not** echo locally when attached); a
typical login shell already echoes input.

---

## 5. KVM plane — same-origin VNC-over-WebSocket proxy

- Endpoint: **`wss://<origin>/kvm/<nodeId>`** (`ws://` over plain http). The
  client builds this with `resolveKvmUrl(nodeId)` and connects with **noVNC**.
- Same-origin ⇒ the WS upgrade carries the HttpOnly cookie → **authorize the
  upgrade by cookie** (and by role). For the central topology, the proxy maps
  `nodeId` → the fleet device's VNC endpoint.
- The proxy terminates WebSocket and bridges to a raw **VNC/RFB** server
  (websockify-style).
- **Lazy connect:** the client only opens the socket when the user clicks
  *Connect* — do not expect a persistent stream.

### 5.1 VNC encoding guidance (Aspeed BMCs)

Keep the client on **stock noVNC** (no fork/patch). Recommended server design:

- Drive the Aspeed Video Engine to emit **hardware JPEG** (e.g. via the mainline
  `aspeed-video` V4L2 driver, `V4L2_PIX_FMT_JPEG`) and serve it as **standard VNC
  Tight/JPEG** rectangles — *repackage*, do not transcode. This keeps hardware
  compression + dirty-rect updates with a patch-free client.
- **Do not** software-decode the proprietary inter-frame codec and re-encode
  (that burns the BMC CPU and adds latency/quality loss).
- Only if a real-world bandwidth benchmark proves it necessary would we revisit a
  client-side Aspeed encoding-18 patch (deferred).

---

## 6. Token lifecycle & rotation

- Access token is **short-lived**; the client reads `expires_at`.
- The minted **NATS user JWT TTL must be ≤ the access token TTL**.
- **Rotation (frontend follow-up, not yet implemented):** before expiry the
  client will call `GetCurrentUser` (cookie-authed) to re-mint the access token,
  then **reconnect NATS with the new creds** (and re-establish subscriptions).
  This is only meaningfully testable once the backend enforces access-token TTL.
  Backend implication: tolerate a brief reconnect; keep refresh idempotent and
  the refresh cookie rotating.

---

## 7. Build-time configuration (deployment must provide)

Facet is static; these are inlined at build time (see `.env` / `src/env.ts`):

| Env var | Meaning | Production value |
|---|---|---|
| `PUBLIC_NATS_WS_URL` | NATS WebSocket URL | same-origin, e.g. `wss://<origin>/nats` |
| `PUBLIC_USE_MOCK` | use in-process mock instead of a backend | `false` |
| `PUBLIC_OTEL_ENABLED` / `…_OTLP_ENDPOINT` | browser tracing (optional) | endpoint default `/v1/traces` (same-origin collector proxy) |

The auth base URL (`/api/connect`) is currently a constant in the client
(`connection.ts`); the backend's Connect mux must serve there.

---

## 8. Security checklist (backend)

- [ ] `auth_callout` validates the access token against the Auth Service JWKS/authority.
- [ ] NATS user JWT permissions encode the role; TTL ≤ access token.
- [ ] Refresh cookie: `__Host-` + `HttpOnly; Secure; SameSite=Strict; Path=/`,
      rotating, revocable; cleared on `Logout`.
- [ ] CSRF: rely on `SameSite=Strict` + required Connect headers; add a
      double-submit token if you ever need `SameSite=Lax/None`.
- [ ] Every API authorizes server-side (the SPA gate is not a boundary).
- [ ] KVM/serial WS upgrades authorized by cookie **and** role.
- [ ] Same-origin (or correctly configured CORS + credentials if you must split).

---

## 9. Not yet consumed by the client (forward-looking)

These exist in the schema but the client does not call them yet — implement when
the matching UI lands: `ChangePassword`, WebAuthn/passkeys, OIDC
(providers/principals), `UserService`, sensor `GetSensor`/`ListSensors`/alerts,
config/state/system services. ConnectRPC for **non-auth** RPCs and TanStack Query
are deferred until the NATS-only path is benchmarked.
