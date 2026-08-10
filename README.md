# Facet

Facet is the web UI for the Kyanite control plane. It manages the embedded
software stacks of routers, switches, BMCs and RMCs — from a single node up to a
full rack or datacenter.

> **Status:** experimental — expect breaking changes.

The UI ships as a pure client-side SPA that can be:

- **bundled and served directly** from the embedded system, or
- **hosted standalone** on-prem behind a static file server, or
- **embedded into a Tauri v2** desktop shell (`src-tauri/`).

## Stack

- **SvelteKit** (Svelte 5, runes) with `adapter-static` in SPA mode
  (`fallback: index.html`, SSR/prerender disabled).
- **Tailwind CSS v4** + **anime.js v4** for a hand-rolled, dependency-light UI.
- **Paraglide (inlang)** for i18n — `en`, `de`, `zh`, `ja`.
- **NATS** (`@nats-io/nats-core` + `@nats-io/jetstream`) for backend
  communication over WebSocket.
- **OpenTelemetry** browser tracing (OTLP/HTTP), opt-in and tree-shaken when
  disabled, so UI spans join the backend's OTLP traces end to end.
- **Biome** for linting and formatting; **Vitest** and **Playwright** for tests.

Dependencies are kept to a minimum with a focus on security.

## Scripts

```sh
pnpm dev          # start the dev server
pnpm build        # build the static SPA into ./build
pnpm preview      # preview the production build
pnpm check        # type-check with svelte-check
pnpm lint         # lint + format check (Biome)
pnpm format       # apply Biome formatting
pnpm lint:fix     # apply Biome lint + format fixes
pnpm test:unit    # Vitest (server + browser projects)
pnpm test:e2e     # Playwright end-to-end tests
pnpm test         # unit + e2e
pnpm tauri dev    # run the desktop shell (builds the SPA + Rust app)
pnpm tauri build  # produce a desktop bundle
```

## Desktop (Tauri v2)

The `src-tauri/` crate wraps the same static SPA in a Tauri v2 webview. Tauri is
configured to consume the SvelteKit `build/` output (`frontendDist: ../build`)
and the Vite dev server on `http://localhost:5173`. Because the app runs in SPA
mode (no prerendering), `load` functions and components execute only in the
webview, where Tauri's native APIs are available. Use `runningInTauri()` from
`$lib/tauri` to branch on the runtime. Building the desktop app requires a Rust
toolchain and the platform WebView dependencies.

## Configuration

All environment variables are declared and validated in `src/env.ts` and
consumed type-safely via `$app/env/public`. Because the bundle is static, values
are inlined at build time — see `.env.example` for the full list (OTLP endpoint,
telemetry toggle, NATS WebSocket URL).

## Project layout

```
src/
  app.css              Tailwind v4 theme + base styles
  app.html             SPA document shell
  env.ts               Typed, build-time public env vars
  hooks.client.ts      Client error handling + telemetry bootstrap
  hooks.ts             Locale-aware URL rerouting (Paraglide)
  lib/
    nats.svelte.ts     Reactive NATS connection manager
    nav.ts             App-shell navigation model
    telemetry/otel.ts  Optional OpenTelemetry browser tracing
    tauri.ts           Tauri runtime detection seam
    components/        Hand-rolled shell components
  routes/              App shell + skeleton pages (overview, nodes, settings)
messages/              Paraglide translation catalogues
e2e/                   Playwright tests
src-tauri/             Tauri v2 desktop shell (Rust)
```

> Authentication (WebAuthn) and Protobuf message schemas are intentionally out
> of scope for this scaffold and arrive in later steps.

## Contributing

See the org-wide [CONTRIBUTING guide](https://github.com/kyanitecomputer/.github/blob/main/CONTRIBUTING.md).
Contributions are dual-licensed.

## Security

See the org-wide [SECURITY policy](https://github.com/kyanitecomputer/.github/blob/main/SECURITY.md).

## License

Licensed under either of [Apache License, Version 2.0](LICENSE-APACHE) or
[MIT license](LICENSE-MIT) at your option.
