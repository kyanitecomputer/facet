/**
 * power.ts — Tier 2 power control (Redfish-aligned Reset) over the transport.
 *
 * Sends a `ManagementService.Reset` for a node and returns the resulting
 * PowerState the backend reports. Stateless helper (no rune store): the caller
 * holds the last result locally, mirroring how a real backend acknowledges an
 * accepted action. Transport is injectable for unit tests.
 */

import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import {
	PowerState,
	ResetRequestSchema,
	ResetResponseSchema,
	type ResetType,
} from "@kyanite/schema/schema/v1/system_pb";
import { getTransport } from "$lib/nats.svelte";
import type { TransportPort } from "$lib/transport/port";
import { requestSubjects } from "$lib/transport/subjects";

/** Request a power/reset action for a node; returns the resulting PowerState. */
export async function resetNode(
	nodeId: string,
	resetType: ResetType,
	transport: TransportPort | null = getTransport(),
): Promise<PowerState> {
	if (!transport) return PowerState.UNSPECIFIED;
	const request = toBinary(
		ResetRequestSchema,
		create(ResetRequestSchema, { id: nodeId, resetType }),
	);
	const replyBytes = await transport.request(
		requestSubjects.powerReset,
		request,
	);
	return fromBinary(ResetResponseSchema, replyBytes).powerState;
}
