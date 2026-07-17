/**
 * otel.ts — optional OpenTelemetry browser tracing for the SPA.
 *
 * Facet's backend already speaks OTLP, so emitting browser traces lets a single
 * collector stitch together the full picture: UI interaction → fetch → NATS →
 * hardware change. Tracing is opt-in and configured entirely through build-time
 * public env vars (see `src/env.ts`), so when disabled the exporter and SDK are
 * dead-code-eliminated from the bundle.
 *
 * Kept deliberately minimal: document-load + fetch auto-instrumentation over an
 * OTLP/HTTP exporter. Manual spans can be created via `getTracer()`.
 */

import { type Tracer, trace } from "@opentelemetry/api";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { DocumentLoadInstrumentation } from "@opentelemetry/instrumentation-document-load";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
	BatchSpanProcessor,
	WebTracerProvider,
} from "@opentelemetry/sdk-trace-web";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import {
	PUBLIC_OTEL_ENABLED,
	PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT,
	PUBLIC_OTEL_SERVICE_NAME,
} from "$app/env/public";

const TRACER_NAME = "facet-webui";

let started = false;

/** Whether browser tracing is enabled for this build. */
export function telemetryEnabled(): boolean {
	return PUBLIC_OTEL_ENABLED;
}

/**
 * Initialise browser tracing. Idempotent and a no-op outside the browser or
 * when `PUBLIC_OTEL_ENABLED` is false.
 */
export function initTelemetry(): void {
	if (started || !PUBLIC_OTEL_ENABLED || typeof window === "undefined") return;
	started = true;

	const endpoint = PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT;
	const exporter = new OTLPTraceExporter({ url: endpoint });

	const provider = new WebTracerProvider({
		resource: resourceFromAttributes({
			[ATTR_SERVICE_NAME]: PUBLIC_OTEL_SERVICE_NAME,
		}),
		spanProcessors: [new BatchSpanProcessor(exporter)],
	});

	provider.register({ contextManager: new ZoneContextManager() });

	registerInstrumentations({
		instrumentations: [
			new DocumentLoadInstrumentation(),
			// Avoid tracing the exporter's own requests to prevent feedback loops.
			new FetchInstrumentation({ ignoreUrls: [endpoint] }),
		],
	});
}

/** Returns the application tracer for creating manual spans. */
export function getTracer(): Tracer {
	return trace.getTracer(TRACER_NAME);
}
