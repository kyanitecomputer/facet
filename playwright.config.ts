import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "e2e",
	testMatch: "**/*.e2e.{ts,js}",
	use: { baseURL: "http://localhost:4173" },
	webServer: {
		// Build with the in-process mock so e2e exercises the real transport
		// wiring (inventory + telemetry) without a NATS backend.
		command: "PUBLIC_USE_MOCK=true npm run build && npm run preview",
		port: 4173,
		reuseExistingServer: !process.env.CI,
	},
});
