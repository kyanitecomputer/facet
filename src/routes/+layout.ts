// Facet runs as a pure client-side SPA. The compiled bundle is either served
// directly from the embedded system (BMC/RMC/switch) or hosted standalone
// on-prem, and is also embedded into the Tauri v2 desktop shell. There is no
// application server at runtime, so SSR and prerendering are disabled and the
// adapter-static `index.html` fallback drives client-side routing.
export const ssr = false;
export const prerender = false;
