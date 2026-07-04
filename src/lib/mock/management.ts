/**
 * management.ts — shared mock routes for the management-plane surface.
 *
 * Settings (time/network/services) and user accounts are appliance-level, not
 * tied to a particular topology, so every scenario can spread these in to keep
 * the Settings page working. User CRUD mutates a closure-local list so the page
 * behaves like a real backend (create/delete/role changes persist for the
 * session). Serial targets are topology-derived, so that route is built from a
 * scenario's node list.
 */

import type { MessageInitShape } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import {
	CreateUserRequestSchema,
	CreateUserResponseSchema,
	DeleteUserRequestSchema,
	DeleteUserResponseSchema,
	ListUsersRequestSchema,
	ListUsersResponseSchema,
	SetUserRoleRequestSchema,
	SetUserRoleResponseSchema,
	UserRole,
} from "@kyanite/schema/schema/v1/auth_pb";
import {
	ListSerialTargetsRequestSchema,
	ListSerialTargetsResponseSchema,
} from "@kyanite/schema/schema/v1/node_pb";
import {
	AddressMode,
	GetSettingsRequestSchema,
	GetSettingsResponseSchema,
	SetNetworkSettingsRequestSchema,
	SetNetworkSettingsResponseSchema,
	SetServiceSettingsRequestSchema,
	SetServiceSettingsResponseSchema,
	SetTimeSettingsRequestSchema,
	SetTimeSettingsResponseSchema,
	type SystemSettingsSchema,
} from "@kyanite/schema/schema/v1/settings_pb";
import {
	PowerState,
	ResetRequestSchema,
	ResetResponseSchema,
	ResetType,
} from "@kyanite/schema/schema/v1/system_pb";
import { requestSubjects } from "$lib/transport/subjects";
import type { NodeProfile, RequestRoute } from "./scenario";
import { route } from "./scenario";

/** Resulting power state for a reset action against a current state. */
function nextPowerState(current: PowerState, reset: ResetType): PowerState {
	switch (reset) {
		case ResetType.ON:
		case ResetType.FORCE_ON:
		case ResetType.RESUME:
			return PowerState.ON;
		case ResetType.FORCE_OFF:
		case ResetType.GRACEFUL_SHUTDOWN:
			return PowerState.OFF;
		case ResetType.SUSPEND:
			return PowerState.PAUSED;
		case ResetType.GRACEFUL_RESTART:
		case ResetType.FORCE_RESTART:
		case ResetType.POWER_CYCLE:
		case ResetType.NMI:
			return PowerState.ON;
		case ResetType.PUSH_POWER_BUTTON:
			return current === PowerState.ON ? PowerState.OFF : PowerState.ON;
		default:
			return current;
	}
}

/** Build the management-plane settings + user CRUD + power routes (stateful). */
export function managementRoutes(): Record<string, RequestRoute> {
	// Mutable per-session user list seeded with a typical role spread.
	const users: { username: string; role: UserRole }[] = [
		{ username: "admin", role: UserRole.ADMIN },
		{ username: "operator", role: UserRole.OPERATOR },
		{ username: "viewer", role: UserRole.READ_ONLY },
	];

	// Mutable per-session settings; setters mutate this and echo it back.
	const settings: MessageInitShape<typeof SystemSettingsSchema> = {
		time: {
			ntpEnabled: true,
			ntpServers: ["pool.ntp.org", "time.cloudflare.com"],
			timezone: "UTC",
			currentTime: timestampFromDate(new Date()),
			synchronized: true,
		},
		network: {
			mode: AddressMode.STATIC,
			ipAddress: "192.168.1.1/24",
			gateway: "192.168.1.254",
			dnsServers: ["1.1.1.1", "9.9.9.9"],
			hostname: "vega",
			macAddress: "02:00:00:00:00:01",
		},
		services: {
			sshEnabled: true,
			sshPort: 22,
			snmpEnabled: true,
			httpEnabled: true,
		},
	};

	// Mutable per-node power state (seeded on); reset actions mutate it.
	const powerState = new Map<string, PowerState>();

	return {
		[requestSubjects.powerReset]: route(
			ResetRequestSchema,
			ResetResponseSchema,
			(req) => {
				const current = powerState.get(req.id) ?? PowerState.ON;
				const next = nextPowerState(current, req.resetType);
				powerState.set(req.id, next);
				return { powerState: next, acceptedAt: timestampFromDate(new Date()) };
			},
		),
		[requestSubjects.settingsGet]: route(
			GetSettingsRequestSchema,
			GetSettingsResponseSchema,
			() => ({ settings }),
		),
		[requestSubjects.settingsSetTime]: route(
			SetTimeSettingsRequestSchema,
			SetTimeSettingsResponseSchema,
			(req) => {
				if (req.time) settings.time = req.time;
				return { settings };
			},
		),
		[requestSubjects.settingsSetNetwork]: route(
			SetNetworkSettingsRequestSchema,
			SetNetworkSettingsResponseSchema,
			(req) => {
				if (req.network) settings.network = req.network;
				return { settings };
			},
		),
		[requestSubjects.settingsSetServices]: route(
			SetServiceSettingsRequestSchema,
			SetServiceSettingsResponseSchema,
			(req) => {
				if (req.services) settings.services = req.services;
				return { settings };
			},
		),
		[requestSubjects.usersList]: route(
			ListUsersRequestSchema,
			ListUsersResponseSchema,
			() => ({ users: users.map((u) => ({ ...u })) }),
		),
		[requestSubjects.usersCreate]: route(
			CreateUserRequestSchema,
			CreateUserResponseSchema,
			(req) => {
				if (req.username && !users.some((u) => u.username === req.username)) {
					users.push({ username: req.username, role: req.role });
				}
				return {};
			},
		),
		[requestSubjects.usersDelete]: route(
			DeleteUserRequestSchema,
			DeleteUserResponseSchema,
			(req) => {
				const i = users.findIndex((u) => u.username === req.username);
				if (i >= 0) users.splice(i, 1);
				return {};
			},
		),
		[requestSubjects.usersSetRole]: route(
			SetUserRoleRequestSchema,
			SetUserRoleResponseSchema,
			(req) => {
				const u = users.find((x) => x.username === req.username);
				if (u) u.role = req.role;
				return {};
			},
		),
	};
}

/** Default serial endpoints for a node, by device class. */
function targetsFor(node: NodeProfile): { id: string; label: string }[] {
	if (node.kind === "bmc") {
		return [
			{ id: node.id, label: "BMC shell" },
			{ id: `${node.id}-host`, label: "Host (SOL)" },
		];
	}
	return [{ id: node.id, label: "Console" }];
}

/** Build the `serial.targets` route from a scenario's node list. */
export function serialTargetsRoute(
	nodes: NodeProfile[],
): Record<string, RequestRoute> {
	return {
		[requestSubjects.serialTargets]: route(
			ListSerialTargetsRequestSchema,
			ListSerialTargetsResponseSchema,
			(req) => {
				const node = nodes.find((n) => n.id === req.nodeId);
				return { targets: node ? targetsFor(node) : [] };
			},
		),
	};
}
