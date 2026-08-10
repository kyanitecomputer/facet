# Facet — Technology Overview

Facet is the web UI for the Kyanite control plane: it manages the embedded
software stacks of routers, switches, BMCs and RMCs, from a single node up to a
full rack or datacenter. It ships as a **static, client-only SPA** that can be
served directly from an embedded device, hosted standalone on-prem, or embedded
in a Tauri v2 desktop shell.

The guiding constraints are **minimal dependencies** and **security first**.
Everything is bundled at build time, so there are no runtime dependencies and
all npm packages live under `devDependencies`.

## Stack at a glance

| Area | Technology | Version | Why |
| --- | --- | --- | --- |
| Framework | [SvelteKit](https://svelte.dev/docs/kit) | 2.66.0 | App framework, routing, build orchestration |
| | [Svelte 5](https://svelte.dev) (runes) | 5.56.3 | Reactive UI; compiler-based, tiny runtime |
| | [`@sveltejs/adapter-static`](https://svelte.dev/docs/kit/adapter-static) | 3.0.10 | SPA output (`fallback: index.html`), no server |
| Build | [Vite](https://vite.dev) | 8.0.16 | Dev server + bundler |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) | 4.3.1 | Utility CSS via `@tailwindcss/vite`; hand-rolled shell |
| Animation | [anime.js v4](https://animejs.com) | 4.4.1 | Lightweight imperative animations |
| i18n | [Paraglide JS](https://paraglidejs.com/sveltekit) (inlang) | 2.20.0 | Compiler-based, tree-shakable i18n (en/de/zh/ja) |
| Backend comms | [`@nats-io/nats-core`](https://github.com/nats-io/nats.js) | 3.4.0 | NATS over WebSocket |
| | [`@nats-io/jetstream`](https://github.com/nats-io/nats.js) | 3.4.0 | JetStream client seam |
| Observability | [OpenTelemetry Web SDK](https://opentelemetry.io/docs/languages/js/) | 2.8.0 / 0.219.0 | Optional OTLP/HTTP browser tracing |
| Validation | [zod](https://zod.dev) | 4.4.3 | Runtime validation of untrusted payloads |
| Desktop | [Tauri v2](https://tauri.app) | 2.11 | Native shell wrapping the same SPA (`src-tauri/`) |
| Lint/format | [Biome](https://biomejs.dev) | 2.5.0 | Single tool for lint + format (incl. Svelte) |
| Unit tests | [Vitest](https://vitest.dev) | 4.1.9 | Node + browser (Playwright provider) projects |
| E2E tests | [Playwright](https://playwright.dev) | 1.61.0 | End-to-end browser tests |
| Types | [TypeScript](https://www.typescriptlang.org) | 6.0.3 | Strict type checking via `svelte-check` |

## How the pieces fit

### Rendering & deployment

The app runs as a pure client-side SPA. SSR and prerendering are disabled
(`src/routes/+layout.ts`), and `adapter-static` emits an `index.html` fallback so
client-side routing works whether the bundle is served from embedded firmware, a
static on-prem host, or the Tauri webview. There is no application server at
runtime.

### Internationalisation

Paraglide compiles `messages/*.json` into tree-shakable functions
(`src/lib/paraglide/`, generated, git-ignored). The locale strategy is
`["cookie", "preferredLanguage", "baseLocale"]` — deliberately **without** the
`url` strategy, which would 404 against a single-page fallback. Document `lang`
and `dir` are kept in sync client-side in the root layout for correct CJK/RTL
layout.

### Backend communication

`src/lib/nats.svelte.ts` is a reactive (Svelte 5 `$state`) NATS WebSocket
manager exposing connection status and a capped message buffer. Authentication
(WebAuthn-derived tokens) and Protobuf decoding are deferred to later steps;
`jetstreamClient()` provides the seam.

### Observability

`src/lib/telemetry/otel.ts` wires the OpenTelemetry Web SDK to an OTLP/HTTP
exporter with document-load and fetch instrumentation. It is **opt-in** via
build-time env (`PUBLIC_OTEL_ENABLED`) and tree-shaken when disabled, so UI
spans can join the backend's OTLP traces — UI click → fetch → NATS → hardware.

### Validation

`src/lib/schemas.ts` validates untrusted data at the boundary with zod
(e.g. `parseNodeSummary`). Decoded backend payloads are checked before the rest
of the UI consumes them.

### Configuration

Environment variables are declared and validated in `src/env.ts` using
SvelteKit's `explicitEnvironmentVariables`, consumed type-safely via
`$app/env/public`, and inlined at build time. See `.env.example`.

## Dependency & supply-chain policy

- **Exact version pins.** `package.json` pins every dependency to an exact
  version (no `^`/`~` ranges); `pnpm-lock.yaml` pins the full transitive tree.
- **Release-age cooldown.** `pnpm-workspace.yaml` sets `minimumReleaseAge: 20160`
  (14 days) with `minimumReleaseAgeStrict: true` and
  `minimumReleaseAgeIgnoreMissingTime: false`. No newly published version —
  direct or transitive — is adopted until it has been on the registry for two
  weeks, by which time compromised releases are typically caught and pulled.
- **Trusted baseline.** `trustLockfile: true` treats the committed lockfile as
  vetted (its existing entries install without re-checking the cooldown), while
  any change to the tree — a bump, a new package, a new transitive resolution —
  is re-gated by the cooldown. **Reviewers must scrutinise `pnpm-lock.yaml` diffs
  in every PR**, since a poisoned lockfile edit would otherwise be trusted.
- **Opt-in build scripts.** Only `@tailwindcss/oxide` and `esbuild` are allowed
  to run install lifecycle scripts (`allowBuilds`).
- **No runtime dependencies.** The SPA ships only static, bundled assets, so all
  packages are `devDependencies`.

### Bumping a dependency

1. Edit the exact version in `package.json` (the target must be ≥ 14 days old, or
   the install fails).
2. Run `pnpm install` and review the `pnpm-lock.yaml` diff.
3. Run `pnpm lint && pnpm check && pnpm build && pnpm test`.

## Licensing

Dual-licensed under [Apache-2.0](LICENSE-APACHE) **OR** [MIT](LICENSE-MIT).
