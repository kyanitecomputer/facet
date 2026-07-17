/**
 * tauri.ts — runtime integration seam for the Tauri v2 desktop shell.
 *
 * Facet is the same SPA whether it runs in a browser (embedded firmware host or
 * standalone on-prem) or inside the Tauri webview. This helper lets feature code
 * branch on the runtime — e.g. to use native APIs only when available — without
 * scattering `@tauri-apps/api` imports across the app.
 */

import { isTauri } from "@tauri-apps/api/core";

/** True when running inside the Tauri desktop shell rather than a plain browser. */
export function runningInTauri(): boolean {
	return isTauri();
}
