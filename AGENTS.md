# Agent guide — facet

Context for LLM agents working in this repository. Keep it accurate and generic;
put transient decisions and scratch notes in local (git-ignored) files, not here.

## What this is

Facet is the web UI for the Kyanite control plane (routers, switches, BMCs,
RMCs). It ships as a static, client-only SPA that can be served from an embedded
device, hosted on-prem, or wrapped in a Tauri v2 desktop shell.

## Stack

- **SvelteKit** (Svelte 5 runes) with `adapter-static` in SPA mode
  (`fallback: index.html`, `ssr = false`).
- **Tailwind CSS v4** with a small token layer; **anime.js** for animation.
- **Biome** for lint/format; **Vitest** (unit) and **Playwright** (e2e).
- **Paraglide (inlang)** for i18n (en/de/zh/ja).
- **NATS** over WebSocket for control/serial transport; **ConnectRPC** for auth.
- **Protobuf** for all wire data, validated at runtime with **protovalidate**.
- Dependencies are minimal, pinned exact, and security-reviewed.

## Layout

- `src/lib/` — components, stores (`*.svelte.ts`), transport, i18n, theme.
- `src/routes/` — app shell and pages.
- `messages/` — Paraglide translation catalogues.
- `src-tauri/` — Tauri v2 desktop shell (Rust).
- `e2e/` — Playwright tests.

## Build & test

```sh
pnpm dev        # dev server
pnpm build      # static SPA -> ./build
pnpm check      # svelte-check
pnpm lint       # Biome
pnpm test       # unit + e2e
pnpm tauri dev  # desktop shell
```

## Schema

Generated TypeScript bindings come from the shared schema repo (`../schema`,
`src.kyanite.computer/schema`) and are consumed as the `@kyanite/schema` package.
Regenerate the schema there, then reinstall here.

## Conventions

- Client-only: `load` and components run in the browser; branch on
  `runningInTauri()` for native APIs.
- All wire data is protobuf validated via protovalidate — no ad-hoc JSON schemas.
- Follow the org-wide [CONTRIBUTING guide](https://github.com/kyanitecomputer/.github/blob/main/CONTRIBUTING.md):
  Conventional Commits, DCO sign-off (`git commit -s`), SPDX headers, dual
  Apache-2.0 OR MIT licensing.

See `README.md`, `facet-architecture.md`, and `TECHNOLOGIES.md` for details.
