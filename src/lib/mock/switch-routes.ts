/**
 * switch-routes.ts — stateful mock routes for one or more switch nodes.
 *
 * Holds a mutable `SwitchDetail` per node (seeded from buildSwitchDetail) so the
 * Tier 2 mutations — port admin toggle, VLAN create/replace/delete — persist for
 * the session and the detail query reflects them, exactly like a real backend
 * that returns the full authoritative detail after each change.
 */

import { create, type MessageShape } from "@bufbuild/protobuf";
import {
	DeleteVlanRequestSchema,
	DeleteVlanResponseSchema,
	GetSwitchRequestSchema,
	GetSwitchResponseSchema,
	SetPortAdminRequestSchema,
	SetPortAdminResponseSchema,
	SetVlanRequestSchema,
	SetVlanResponseSchema,
	SwitchDetailSchema,
} from "@kyanite/schema/schema/v1/switch_pb";
import { requestSubjects } from "$lib/transport/subjects";
import type { RequestRoute } from "./scenario";
import { route } from "./scenario";
import { buildSwitchDetail } from "./switch-detail";

type SwitchDetailMsg = MessageShape<typeof SwitchDetailSchema>;

/** Build stateful switch detail + mutation routes for the given node ids. */
export function switchRoutes(nodeIds: string[]): Record<string, RequestRoute> {
	// Mutable per-node detail, seeded once from the shared builder.
	const details = new Map<string, SwitchDetailMsg>();
	for (const id of nodeIds) {
		details.set(id, create(SwitchDetailSchema, buildSwitchDetail(id)));
	}

	function detailFor(nodeId: string): SwitchDetailMsg {
		let detail = details.get(nodeId);
		if (!detail) {
			detail = create(SwitchDetailSchema, buildSwitchDetail(nodeId));
			details.set(nodeId, detail);
		}
		return detail;
	}

	return {
		[requestSubjects.switchDetail]: route(
			GetSwitchRequestSchema,
			GetSwitchResponseSchema,
			(req) => ({ detail: detailFor(req.nodeId) }),
		),
		[requestSubjects.switchSetPort]: route(
			SetPortAdminRequestSchema,
			SetPortAdminResponseSchema,
			(req) => {
				const detail = detailFor(req.nodeId);
				const port = detail.ports.find((p) => p.index === req.port);
				if (port) port.adminUp = req.adminUp;
				return { detail };
			},
		),
		[requestSubjects.switchSetVlan]: route(
			SetVlanRequestSchema,
			SetVlanResponseSchema,
			(req) => {
				const detail = detailFor(req.nodeId);
				if (req.vlan) {
					const i = detail.vlans.findIndex((v) => v.vid === req.vlan?.vid);
					if (i >= 0) detail.vlans[i] = req.vlan;
					else detail.vlans.push(req.vlan);
					detail.vlans.sort((a, b) => a.vid - b.vid);
				}
				return { detail };
			},
		),
		[requestSubjects.switchDeleteVlan]: route(
			DeleteVlanRequestSchema,
			DeleteVlanResponseSchema,
			(req) => {
				const detail = detailFor(req.nodeId);
				const i = detail.vlans.findIndex((v) => v.vid === req.vid);
				if (i >= 0) detail.vlans.splice(i, 1);
				return { detail };
			},
		),
	};
}
