import type { HandleClientError } from "@sveltejs/kit";
import { initTelemetry } from "$lib/telemetry/otel";

// Initialise optional browser tracing as early as possible on the client. This
// is a no-op unless PUBLIC_OTEL_ENABLED is set at build time.
initTelemetry();

/**
 * Client-side error handler. SvelteKit calls this for unexpected errors thrown
 * during client-side navigation or rendering (expected `error()` throws are
 * not passed here). The raw error is logged for DevTools; a safe message is
 * returned to `+error.svelte`.
 */
export const handleError: HandleClientError = ({ error, status }) => {
	console.error("[facet] unhandled client error", { status, error });

	const message =
		error instanceof Error ? error.message : "An unexpected error occurred";

	return { message };
};
