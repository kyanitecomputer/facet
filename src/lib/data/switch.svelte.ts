/**
 * switch.svelte.ts — reactive detail for a single switch (Vega) node.
 *
 * Requests the full `SwitchDetail` aggregate over the transport, validates it
 * with protovalidate at the trust boundary, and exposes it through a `$state`
 * rune. The transport is injectable so the store unit-tests against a
 * `MockTransport` without a live connection (mirrors fabric.svelte.ts).
 */

import {
	create,
	fromBinary,
	type MessageInitShape,
	toBinary,
} from "@bufbuild/protobuf";
import {
	DeleteVlanRequestSchema,
	DeleteVlanResponseSchema,
	GetSwitchRequestSchema,
	GetSwitchResponseSchema,
	SetPortAdminRequestSchema,
	SetPortAdminResponseSchema,
	SetVlanRequestSchema,
	SetVlanResponseSchema,
	type SwitchDetail,
	type VlanSchema,
} from "@kyanite/schema/schema/v1/switch_pb";
import { getTransport } from "$lib/nats.svelte";
import { getValidator } from "$lib/proto/validate";
import type { TransportPort } from "$lib/transport/port";
import { requestSubjects } from "$lib/transport/subjects";

let detail = $state<SwitchDetail | null>(null);
let switchError = $state<string | null>(null);

/** Latest validated switch detail, or null when not loaded. */
export function getSwitchDetail(): SwitchDetail | null {
	return detail;
}

/** Last switch load error, or null. */
export function getSwitchError(): string | null {
	return switchError;
}

/** Request one switch's detail, validate it, and publish it reactively. */
export async function loadSwitch(
	nodeId: string,
	transport: TransportPort | null = getTransport(),
): Promise<void> {
	if (!transport) return;
	try {
		const request = toBinary(
			GetSwitchRequestSchema,
			create(GetSwitchRequestSchema, { nodeId }),
		);
		const replyBytes = await transport.request(
			requestSubjects.switchDetail,
			request,
		);
		const reply = fromBinary(GetSwitchResponseSchema, replyBytes);

		const result = getValidator().validate(GetSwitchResponseSchema, reply);
		if (result.kind !== "valid") {
			switchError = `switch detail failed validation (${result.violations?.length ?? 0} violations)`;
			return;
		}

		detail = reply.detail ?? null;
		switchError = null;
	} catch (err) {
		switchError = err instanceof Error ? err.message : String(err);
	}
}

/** Toggle a port's administrative state; adopts the returned authoritative detail. */
export async function setPortAdmin(
	nodeId: string,
	port: number,
	adminUp: boolean,
	transport: TransportPort | null = getTransport(),
): Promise<void> {
	if (!transport) return;
	const request = toBinary(
		SetPortAdminRequestSchema,
		create(SetPortAdminRequestSchema, { nodeId, port, adminUp }),
	);
	const replyBytes = await transport.request(
		requestSubjects.switchSetPort,
		request,
	);
	detail = fromBinary(SetPortAdminResponseSchema, replyBytes).detail ?? detail;
}

/** Create or replace a VLAN; adopts the returned authoritative detail. */
export async function setVlan(
	nodeId: string,
	vlan: MessageInitShape<typeof VlanSchema>,
	transport: TransportPort | null = getTransport(),
): Promise<void> {
	if (!transport) return;
	const request = toBinary(
		SetVlanRequestSchema,
		create(SetVlanRequestSchema, { nodeId, vlan }),
	);
	const replyBytes = await transport.request(
		requestSubjects.switchSetVlan,
		request,
	);
	detail = fromBinary(SetVlanResponseSchema, replyBytes).detail ?? detail;
}

/** Delete a VLAN by VID; adopts the returned authoritative detail. */
export async function deleteVlan(
	nodeId: string,
	vid: number,
	transport: TransportPort | null = getTransport(),
): Promise<void> {
	if (!transport) return;
	const request = toBinary(
		DeleteVlanRequestSchema,
		create(DeleteVlanRequestSchema, { nodeId, vid }),
	);
	const replyBytes = await transport.request(
		requestSubjects.switchDeleteVlan,
		request,
	);
	detail = fromBinary(DeleteVlanResponseSchema, replyBytes).detail ?? detail;
}

/** Clear the loaded switch detail (e.g. when navigating away). */
export function clearSwitch(): void {
	detail = null;
	switchError = null;
}
