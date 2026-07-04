/**
 * fabric.svelte.ts — reactive fabric state sourced from the transport port.
 *
 * Decodes protobuf payloads from the active transport (real NATS or the mock),
 * validates wire data with protovalidate at the trust boundary, and exposes the
 * result through Svelte 5 `$state` runes for components to read. The transport
 * is injectable so the store can be unit-tested against a `MockTransport`
 * without a live connection.
 */

import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import {
	ListInventoryRequestSchema,
	ListInventoryResponseSchema,
	type NodeSummary,
} from "@kyanite/schema/schema/v1/node_pb";
import { SensorReadingSchema } from "@kyanite/schema/schema/v1/sensor_pb";
import { getTransport } from "$lib/nats.svelte";
import { getValidator } from "$lib/proto/validate";
import type { Subscription, TransportPort } from "$lib/transport/port";

let nodes = $state<NodeSummary[]>([]);
let inventoryError = $state<string | null>(null);

/** Latest validated node inventory. */
export function getNodes(): readonly NodeSummary[] {
	return nodes;
}

/** Last inventory load error, or null. */
export function getInventoryError(): string | null {
	return inventoryError;
}

/** Request the node inventory, validate it, and publish it reactively. */
export async function loadInventory(
	transport: TransportPort | null = getTransport(),
): Promise<void> {
	if (!transport) return;
	try {
		const request = toBinary(
			ListInventoryRequestSchema,
			create(ListInventoryRequestSchema, {}),
		);
		const replyBytes = await transport.request("inventory.list", request);
		const reply = fromBinary(ListInventoryResponseSchema, replyBytes);

		// Validate at the wire boundary: this recurses into the repeated
		// NodeSummary messages and their buf.validate rules.
		const result = getValidator().validate(ListInventoryResponseSchema, reply);
		if (result.kind !== "valid") {
			inventoryError = `inventory failed validation (${result.violations?.length ?? 0} violations)`;
			return;
		}

		nodes = reply.nodes;
		inventoryError = null;
	} catch (err) {
		inventoryError = err instanceof Error ? err.message : String(err);
	}
}

/** Rolling window of samples kept per sensor for live charts. */
const MAX_POINTS = 120;

export interface SensorSeries {
	/** X axis: unix seconds. */
	ts: number[];
	/** Y axis: measured values. */
	values: number[];
}

let telemetry = $state<Record<string, SensorSeries>>({});
let telemetrySub: Subscription | null = null;

/** Reactive sample buffer for a sensor id (e.g. "cpu"), or undefined. */
export function getSensor(sensorId: string): SensorSeries | undefined {
	return telemetry[sensorId];
}

/**
 * Subscribe to a telemetry subject and buffer decoded `SensorReading`s per
 * sensor id. Idempotent: a no-op if already subscribed. Returns the handle.
 */
export function startTelemetry(
	subject = "telemetry.>",
	transport: TransportPort | null = getTransport(),
): Subscription | null {
	if (!transport || telemetrySub) return telemetrySub;

	telemetrySub = transport.subscribe(subject, (payload) => {
		const reading = fromBinary(SensorReadingSchema, payload);
		const at = reading.timestamp
			? Number(reading.timestamp.seconds)
			: Math.floor(Date.now() / 1000);
		const prev = telemetry[reading.sensorId] ?? { ts: [], values: [] };

		telemetry = {
			...telemetry,
			[reading.sensorId]: {
				ts: [...prev.ts, at].slice(-MAX_POINTS),
				values: [...prev.values, reading.value].slice(-MAX_POINTS),
			},
		};
	});
	return telemetrySub;
}

/** Stop the telemetry subscription and reset its handle. */
export function stopTelemetry(): void {
	telemetrySub?.unsubscribe();
	telemetrySub = null;
}
