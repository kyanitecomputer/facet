/**
 * Typed environment variables for Facet.
 *
 * Uses SvelteKit's experimental `explicitEnvironmentVariables` feature: every
 * variable is declared here and consumed type-safely via `$app/env/public`.
 *
 * Facet ships as a static SPA (embedded firmware bundle, standalone on-prem
 * host, or Tauri v2 shell), so there is no server at runtime to inject values.
 * Every variable is therefore `public` (browser-readable) and `static`
 * (inlined at build time, enabling dead-code elimination of disabled features).
 *
 * Each variable carries a tiny inline Standard Schema validator that supplies a
 * default, keeping the build green when the variable is unset and avoiding any
 * additional validation dependency.
 */

import { defineEnvVars } from "@sveltejs/kit/hooks";

// Phantom `types` carriers let SvelteKit infer the env var's output type from
// the schema (Standard Schema's `InferOutput` reads `~standard.types.output`).
// They are never read at runtime.
const stringTypes = undefined as unknown as {
	input: string | undefined;
	output: string;
};
const boolTypes = undefined as unknown as {
	input: string | undefined;
	output: boolean;
};

/** Minimal Standard Schema validator: trimmed string, or `fallback` if unset. */
function stringDefault(fallback: string) {
	return {
		"~standard": {
			version: 1 as const,
			vendor: "facet",
			validate: (value: unknown) => ({
				value:
					typeof value === "string" && value.trim().length > 0
						? value.trim()
						: fallback,
			}),
			types: stringTypes,
		},
	};
}

/** Minimal Standard Schema validator coercing common truthy strings to boolean. */
function boolDefault(fallback: boolean) {
	return {
		"~standard": {
			version: 1 as const,
			vendor: "facet",
			validate: (value: unknown) => ({
				value:
					typeof value === "string" && value.trim().length > 0
						? ["1", "true", "yes", "on"].includes(value.trim().toLowerCase())
						: fallback,
			}),
			types: boolTypes,
		},
	};
}

export const variables = defineEnvVars({
	/** Toggle OpenTelemetry browser tracing. Disabled by default. */
	PUBLIC_OTEL_ENABLED: {
		public: true,
		static: true,
		description: "Enable OpenTelemetry browser tracing (OTLP/HTTP).",
		schema: boolDefault(false),
	},
	/** OTLP/HTTP traces collector endpoint. Same-origin default suits embedded hosting. */
	PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT: {
		public: true,
		static: true,
		description:
			"OTLP/HTTP traces endpoint, e.g. http://collector:4318/v1/traces.",
		schema: stringDefault("/v1/traces"),
	},
	/** Logical service name reported on every exported span. */
	PUBLIC_OTEL_SERVICE_NAME: {
		public: true,
		static: true,
		description: "service.name resource attribute for exported spans.",
		schema: stringDefault("facet-webui"),
	},
	/** NATS WebSocket URL used for backend communication. */
	PUBLIC_NATS_WS_URL: {
		public: true,
		static: true,
		description: "NATS WebSocket URL, e.g. wss://bmc.local:443.",
		schema: stringDefault(""),
	},
	/** Use the in-process mock backend instead of a real NATS connection. */
	PUBLIC_USE_MOCK: {
		public: true,
		static: true,
		description:
			"Back the transport with the in-process mock scenario (dev/test/CI).",
		schema: boolDefault(false),
	},
	/** Which mock scenario to serve when PUBLIC_USE_MOCK is on. */
	PUBLIC_MOCK_SCENARIO: {
		public: true,
		static: true,
		description:
			"Mock scenario name when PUBLIC_USE_MOCK is on (e.g. rack-mixed, single-bmc).",
		schema: stringDefault("rack-mixed"),
	},
});
