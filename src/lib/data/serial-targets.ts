/**
 * serial-targets.ts — fetch the serial console endpoints a node exposes.
 *
 * A switch points at its own console (one target); a BMC may expose several
 * (its shell plus the managed host's Serial-over-LAN). The returned target id
 * is the serial endpoint token used on the wire (`serial.<id>.{in,out}`).
 */

import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import {
	ListSerialTargetsRequestSchema,
	ListSerialTargetsResponseSchema,
	type SerialTarget,
} from "@kyanite/schema/schema/v1/node_pb";
import { getTransport } from "$lib/nats.svelte";
import type { TransportPort } from "$lib/transport/port";
import { requestSubjects } from "$lib/transport/subjects";

/** Request the serial console endpoints for `nodeId` (empty on failure). */
export async function fetchSerialTargets(
	nodeId: string,
	transport: TransportPort | null = getTransport(),
): Promise<SerialTarget[]> {
	if (!transport) return [];
	try {
		const request = toBinary(
			ListSerialTargetsRequestSchema,
			create(ListSerialTargetsRequestSchema, { nodeId }),
		);
		const replyBytes = await transport.request(
			requestSubjects.serialTargets,
			request,
		);
		return fromBinary(ListSerialTargetsResponseSchema, replyBytes).targets;
	} catch {
		return [];
	}
}
