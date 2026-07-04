/**
 * switch-detail.ts — a fully-populated `SwitchDetail` for the mock.
 *
 * Models the "Vega" class switch (the hardware Vein drives): 14 front-panel
 * ports (8× 1G RJ45, 4× 1G SFP, 2× 10G SFP+) plus the CPU port, with every L2
 * control protocol the device exposes (VLANs, LLDP, RSTP, LACP, IGMP snooping,
 * storm control, QoS, port mirroring, ACLs, ERPS, 802.1X, SNMP). Shared by the
 * `vega` scenario and any other scenario that hosts a switch node, so the node
 * detail page renders against realistic data with no real device.
 */

import type { MessageInitShape } from "@bufbuild/protobuf";
import {
	AclAction,
	AclRuleType,
	Dot1xPortState,
	ErpsRingState,
	LagMode,
	LinkState,
	MirrorDirection,
	PortMedia,
	QosSchedulerMode,
	QosTrustMode,
	SnmpAccess,
	SnmpSecurityLevel,
	StpPortRole,
	StpPortState,
	type SwitchDetailSchema,
} from "@kyanite/schema/schema/v1/switch_pb";

type SwitchDetailInit = MessageInitShape<typeof SwitchDetailSchema>;

/** Port label and media for index 0–13 (front panel) and 31 (CPU). */
function portMeta(index: number): { label: string; media: PortMedia } {
	if (index >= 0 && index <= 7) {
		return { label: `ge${index}`, media: PortMedia.RJ45_1G };
	}
	if (index >= 8 && index <= 11) {
		return { label: `sfp${index - 8}`, media: PortMedia.SFP_1G };
	}
	if (index >= 12 && index <= 13) {
		return { label: `sfp+${index - 12}`, media: PortMedia.SFP_PLUS_10G };
	}
	return { label: "cpu", media: PortMedia.CPU };
}

/** Build the 15-entry port list (14 physical + CPU) with mixed link state. */
function buildPorts() {
	const up = new Set([0, 1, 4, 8, 12]); // a believable mix of live links
	const ports = [];
	for (let i = 0; i < 14; i++) {
		const { label, media } = portMeta(i);
		const linkUp = up.has(i);
		const speed = !linkUp
			? 0
			: media === PortMedia.SFP_PLUS_10G
				? 10_000
				: 1_000;
		ports.push({
			index: i,
			label,
			media,
			adminUp: i !== 6, // ge6 administratively down, to show the state
			link: linkUp ? LinkState.UP : LinkState.DOWN,
			speedMbps: speed,
			description: i === 0 ? "uplink-core" : i === 12 ? "spine-a" : "",
		});
	}
	ports.push({
		index: 31,
		label: "cpu",
		media: PortMedia.CPU,
		adminUp: true,
		link: LinkState.UP,
		speedMbps: 0,
		description: "management",
	});
	return ports;
}

/** A complete switch detail aggregate for `nodeId`. */
export function buildSwitchDetail(nodeId: string): SwitchDetailInit {
	return {
		nodeId,
		info: {
			hostname: nodeId,
			model: "Vega FSL91030 (14-port)",
			serialNumber: "VEGA-2026-0007",
			firmwareVersion: "vein 0.6.0",
			managementIp: "192.168.1.1/24",
			managementMac: "02:00:00:00:00:01",
			uptimeSeconds: 864_000n,
		},
		ports: buildPorts(),
		vlans: [
			{ vid: 1, name: "default", untaggedPorts: [2, 3, 4, 5, 7] },
			{ vid: 10, name: "mgmt", untaggedPorts: [0, 1], taggedPorts: [12, 13] },
			{ vid: 20, name: "data", untaggedPorts: [8, 9], taggedPorts: [12, 13] },
			{ vid: 30, name: "storage", taggedPorts: [12, 13] },
		],
		lldpNeighbors: [
			{
				localPort: 0,
				chassisId: "0c:42:a1:33:7b:01",
				portId: "Ethernet1/1",
				systemName: "core-router-1",
				systemDescription: "Kyanite Router, vein-rtr 0.6.0",
				ttlSeconds: 120,
			},
			{
				localPort: 12,
				chassisId: "02:00:00:00:00:42",
				portId: "sfp+0",
				systemName: "spine-a",
				systemDescription: "Vega FSL91030 (14-port)",
				ttlSeconds: 120,
			},
		],
		rstp: {
			enabled: true,
			bridgePriority: 32_768,
			rootBridge: "32768.0c:42:a1:33:7b:01",
			ports: [
				{
					port: 0,
					role: StpPortRole.ROOT,
					state: StpPortState.FORWARDING,
					pathCost: 20_000,
				},
				{
					port: 12,
					role: StpPortRole.DESIGNATED,
					state: StpPortState.FORWARDING,
					pathCost: 2_000,
				},
				{
					port: 13,
					role: StpPortRole.ALTERNATE,
					state: StpPortState.DISCARDING,
					pathCost: 2_000,
				},
			],
		},
		linkAggregation: [
			{
				id: 1,
				name: "po1-uplink",
				mode: LagMode.LACP_ACTIVE,
				memberPorts: [12, 13],
			},
		],
		igmpSnooping: {
			enabled: true,
			querierIntervalSeconds: 125,
			groups: [
				{ groupAddress: "239.255.0.1", vlan: 20, ports: [8, 9] },
				{ groupAddress: "239.1.1.10", vlan: 20, ports: [8] },
			],
		},
		stormControl: [
			{
				port: 0,
				broadcastPps: 1_000,
				multicastPps: 1_000,
				unknownUnicastPps: 0,
			},
			{ port: 1, broadcastPps: 1_000, multicastPps: 0, unknownUnicastPps: 0 },
		],
		qos: {
			scheduler: QosSchedulerMode.WEIGHTED_ROUND_ROBIN,
			ports: [
				{ port: 0, trust: QosTrustMode.DSCP, defaultPriority: 0 },
				{ port: 8, trust: QosTrustMode.COS, defaultPriority: 3 },
				{ port: 12, trust: QosTrustMode.DSCP, defaultPriority: 5 },
			],
		},
		mirrorSessions: [
			{
				id: 1,
				direction: MirrorDirection.BOTH,
				sourcePorts: [8, 9],
				destinationPort: 7,
			},
		],
		aclRules: [
			{
				id: 1,
				priority: 10,
				type: AclRuleType.IPV4,
				action: AclAction.PERMIT,
				match: "src 192.168.1.0/24 tcp dport 22",
			},
			{
				id: 2,
				priority: 20,
				type: AclRuleType.IPV4,
				action: AclAction.DENY,
				match: "any tcp dport 23",
			},
			{
				id: 3,
				priority: 30,
				type: AclRuleType.MAC,
				action: AclAction.DENY,
				match: "src 00:11:22:33:44:55",
			},
		],
		erpsRings: [
			{
				id: 1,
				state: ErpsRingState.IDLE,
				port0: 12,
				port1: 13,
				controlVlan: 4090,
				blockedPort: 13,
			},
		],
		dot1x: {
			enabled: true,
			radiusServer: "192.168.1.10",
			ports: [
				{ port: 2, state: Dot1xPortState.AUTO, authenticated: true },
				{ port: 3, state: Dot1xPortState.AUTO, authenticated: false },
				{
					port: 7,
					state: Dot1xPortState.FORCE_AUTHORIZED,
					authenticated: true,
				},
			],
		},
		snmp: {
			enabled: true,
			location: "rack A3, datacenter west",
			contact: "netops@example.com",
			communities: [
				{ community: "public", access: SnmpAccess.READ_ONLY },
				{ community: "private", access: SnmpAccess.READ_WRITE },
			],
			v3Users: [
				{
					name: "monitor",
					level: SnmpSecurityLevel.AUTH_PRIV,
					authProtocol: "SHA",
					privProtocol: "AES",
				},
			],
		},
	};
}
