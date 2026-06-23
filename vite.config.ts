import { paraglideVitePlugin } from "@inlang/paraglide-js";
import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Tauri expects a fixed dev-server port and prefers uncleared output so its own
// logs remain visible. The src-tauri/ crate is excluded from the file watcher so
// Rust rebuilds don't trigger frontend HMR. See https://tauri.app/start/frontend/sveltekit/
export default defineConfig({
	clearScreen: false,
	// Pre-bundle the protobuf runtime so Vitest does not re-optimize mid-run and
	// reload a test (which it warns can cause flaky/duplicated runs).
	optimizeDeps: {
		include: ["@bufbuild/protobuf", "@bufbuild/protovalidate"],
	},
	server: {
		port: 5173,
		strictPort: true,
		watch: { ignored: ["**/src-tauri/**"] },
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
				experimental: { async: true },
			},
			adapter: adapter({
				// SPA mode: every route falls back to index.html for client-side
				// routing. Required for Tauri v2 and for serving the bundle directly
				// from an embedded system or a standalone on-prem static host.
				fallback: "index.html",
				precompress: true,
				strict: true,
			}),
			experimental: {
				explicitEnvironmentVariables: true,
				handleRenderingErrors: true,
				forkPreloads: true,
			},
		}),
		paraglideVitePlugin({
			project: "./project.inlang",
			outdir: "./src/lib/paraglide",
			// SPA-appropriate locale resolution: no `url` strategy (the bundle is
			// served from a single index.html fallback, so locale-prefixed paths
			// would 404 — see paraglide-js#503). Persist the choice in a cookie,
			// fall back to the browser language on first visit, then the base locale.
			// Keep this in sync with the `--strategy` flag in the `prepare` script.
			strategy: ["cookie", "preferredLanguage", "baseLocale"],
		}),
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: "./vite.config.ts",
				test: {
					name: "client",
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: "chromium", headless: true }],
					},
					include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
					exclude: ["src/lib/server/**"],
				},
			},

			{
				extends: "./vite.config.ts",
				test: {
					name: "server",
					environment: "node",
					include: ["src/**/*.{test,spec}.{js,ts}"],
					exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
				},
			},
		],
	},
});
