# Facet WebUI — Architecture & Transport Plan

> **Scope:** Frontend (Svelte 5) decisions for the Facet WebUI in the Kyanite stack.
> **Assumption:** The backend (Cairn for BMC, Vein for switch) is the only thing Facet talks to. Device heterogeneity (Redfish vs. switch-native formats) is normalized **server-side**, so Facet sees one protobuf domain model.
> **Constraints:** Svelte 5 (runes), Tailwind v4, animejs v4. Keep minimal.

---

## 0. TL;DR Architecture

- Single typed **transport port** in the frontend with two adapters:
  - **ConnectRPC** adapter → unary + server-streaming over HTTP (request/reply, commands, config, resource fetches).
  - **NATS** adapter (over WebSocket) → pub/sub, request/reply, JetStream (telemetry, sensor streams, events).
- **protobuf** is the single wire format for both. Define services and message types **once** in proto; reuse across both transports.
- Adapter selection is by **capability/topology**, never an operator-facing toggle.
- **No REST in Facet.** Redfish (REST/JSON) and switch-native formats are normalized into one protobuf model by the backend.
- **TanStack Query** on the unary (Connect) path; **Svelte 5 runes** (`$state`) on push (NATS) streams.
- **OTLP** stays backend-side. Facet consumes a thin protobuf metrics projection, not raw OTLP.
- **Auth** unified via NATS **auth callout** delegating to the same authority the Connect interceptors use. One session token.
- **Charts:** animejs for gauges/transitions; uPlot **or** LayerChart for time-series. Do not attempt real charts with animejs alone.

---

## 1. Transport: NATS vs ConnectRPC

**Decision:** Support both, but not as a user-facing toggle. They are different paradigms; the choice is driven by concern, not preference.

| Transport | Mechanism | Browser lib | Fits |
|---|---|---|---|
| **ConnectRPC** | Unary + server-streaming over HTTP, browser-native | `connect-web` | Commands, resource fetches, config — request/reply |
| **NATS** | Pub/sub, request/reply, JetStream (replay/backpressure/fan-out) | `nats.ws` (over WebSocket) | Telemetry, sensor streams, events |

### Shared schema
Both carry protobuf. Define services and message types **once** in proto and reuse:
- Generate Connect clients from proto.
- Define **NATS subject conventions** carrying the same proto messages.

### Frontend structure
Put both behind a **single typed transport port** with two adapters. Select the adapter by **capability/topology** (what the target exposes), not by an operator switch:
- Device reachable only over its management NIC → **Connect**.
- Device in the NATS mesh → **NATS**.
- Streaming concerns route to **NATS even when Connect is also present**, because server-streaming RPC lacks replay and multi-consumer semantics.

### Cost / justification
- Cost: two connection managers and two auth attach points.
- Justified because the streaming-vs-unary split is real.
- If forced to one: NATS is already core to the platform, but Connect's browser ergonomics for unary make the dual-adapter approach worth the surface area.

---

## 2. REST and TanStack Query

### REST
**Drop REST as a Facet concern.**
- Redfish is REST/JSON; switch-native formats differ — but that divergence belongs in the **backend**.
- **Cairn** should normalize Redfish (BMC) and the switch format into one protobuf domain model so Facet sees a single API and single wire format.
- Putting Redfish-vs-switch branching in the frontend is the wrong layer.
- Any residual REST (e.g. a health probe) is incidental.

### TanStack Query
Adopt **only for the Connect/unary path** via `connect-query`.
- Earns its place for: cache dedup, stale-while-revalidate, invalidation, polling of normalized resources (inventory, config, Redfish-derived state).
- **Poor fit for push-based streams** — those feed Svelte 5 runes (`$state`) directly from NATS subscriptions.
- Result is a **hybrid**: TanStack Query for pull, runes for push.
- **Verify** `@tanstack/svelte-query` runes compatibility against your Svelte 5 version; some friction exists but it works.

---

## 3. OTLP Transport

Separate the two concerns:

1. **Component → collector OTLP** (gRPC / HTTP-protobuf) is backend pipeline infrastructure — **not Facet's problem**.
2. **Display in Facet** — do **not** make Facet an OTLP endpoint.

### Two viable paths for display

| Path | Description | Trade-off |
|---|---|---|
| **1 (recommended)** | Backend exposes a **UI-shaped protobuf metrics API** (current values + bounded history windows) over Connect/NATS. Facet consumes a purpose-built projection. | Lighter; recommended for "minimal." |
| **2** | Re-emit OTLP protobuf on NATS subjects; decode in-browser with `opentelemetry-proto` types. | Zero translation (OTLP is already protobuf), but the OTLP metric data model (ResourceMetrics → ScopeMetrics → data points, histograms/exponential histograms) is heavy for a frontend that likely only needs gauges and sums. |

**Prefer Path 1** unless a single canonical schema end-to-end is specifically wanted.

### Sensor data
Same problem class (mostly gauges):
- Stream as protobuf on NATS, render via runes.
- If sensors originate from Redfish polling, the backend normalizes and re-emits for live push.

---

## 4. Auth

**Goal:** one identity validated by both transports against the same authority.

### Mechanism mismatch
- **NATS:** NKEY/JWT (account → user hierarchy, subject-scoped permissions).
- **Connect:** bearer headers via interceptors.
- A generic app/OIDC JWT **cannot** be used directly as a NATS user JWT.

### Solution: NATS auth callout (2.10+)
- Client presents **one bearer token** over the WebSocket.
- The callout delegates validation to the **same backend authority** the Connect interceptors use.
- Backend mints a **scoped NATS user** (subject permissions encode telemetry/command access).
- Unifies credential validation without two separate login flows.
- Frontend stores a **single session token**; each adapter attaches it.

### Authz layering
- **NATS subject permissions** → streams.
- **Connect interceptors** → RPCs.

### Lifecycle
- Short-lived access token + refresh RPC.
- On rotation, the NATS WebSocket needs **reconnect-with-new-creds** logic.
- Build that into the NATS adapter **from the start** — easy to overlook.

---

## 5. Charting

**animejs is an animation library, not a charting library.** It has no scales, axes, or data binding. Using it for real charts means reimplementing d3-scale by hand.
- Keep animejs for: UI transitions and **bespoke SVG gauges/needles/value tweens**. That is where it earns its place and keeps the stack minimal.

For **time-series** (metrics, sensors), add **one** purpose-built library:

| Library | Size / tech | Strengths | Best when |
|---|---|---|---|
| **uPlot** | ~40KB, canvas | Fastest for streaming/dense time-series; you style it yourself | Minimal, performance-sensitive dashboard; sub-second updates; many series |
| **LayerChart** | Svelte-native, SVG, d3-scale | Composable, themeable with Tailwind CSS variables, updated for Svelte 5 | Moderate point density; Svelte-idiomatic ergonomics; CSS-driven styling |
| **Chart.js** | Canvas, framework-agnostic, mature | Mature | No strong reason to pick over the above two here; imperative, not Svelte-idiomatic, harder to theme with Tailwind (canvas colors set in JS) |

### Recommendation
- **animejs** → gauges and transitions.
- **uPlot** → live time-series if telemetry is dense/high-frequency.
- **LayerChart** → if density is moderate and Tailwind-driven styling + Svelte composition matter more than raw redraw throughput.
- Do **not** attempt real charts with animejs alone.

---

## 6. Open Decisions / Follow-ups

- [ ] Confirm `@tanstack/svelte-query` runes compatibility against the target Svelte 5 version.
- [ ] Choose between uPlot and LayerChart based on measured telemetry density / update frequency.
- [ ] Define NATS subject naming conventions for telemetry, sensors, events, command replies.
- [ ] Decide OTLP display path (1 vs 2); Path 1 is recommended.
- [ ] Specify the UI-shaped protobuf metrics projection schema (current value + bounded history window).
- [ ] Implement NATS WebSocket reconnect-with-new-creds on token rotation in the NATS adapter.
- [ ] Define the transport port interface and the capability/topology rules for adapter selection.
