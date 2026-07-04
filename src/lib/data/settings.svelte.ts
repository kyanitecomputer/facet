/**
 * settings.svelte.ts — reactive management-plane settings and user accounts.
 *
 * Loads time/network/service settings and the user list over the transport, and
 * exposes user mutations (create/delete/role change) that re-read the list so
 * the UI stays consistent. Transport is injectable for unit tests.
 */

import type { MessageInitShape } from "@bufbuild/protobuf";
import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import {
	CreateUserRequestSchema,
	CreateUserResponseSchema,
	DeleteUserRequestSchema,
	DeleteUserResponseSchema,
	ListUsersRequestSchema,
	ListUsersResponseSchema,
	SetUserRoleRequestSchema,
	SetUserRoleResponseSchema,
	type User,
	type UserRole,
} from "@kyanite/schema/schema/v1/auth_pb";
import {
	GetSettingsRequestSchema,
	GetSettingsResponseSchema,
	type NetworkSettingsSchema,
	type ServiceSettingsSchema,
	SetNetworkSettingsRequestSchema,
	SetNetworkSettingsResponseSchema,
	SetServiceSettingsRequestSchema,
	SetServiceSettingsResponseSchema,
	SetTimeSettingsRequestSchema,
	SetTimeSettingsResponseSchema,
	type SystemSettings,
	type TimeSettingsSchema,
} from "@kyanite/schema/schema/v1/settings_pb";
import { getTransport } from "$lib/nats.svelte";
import type { TransportPort } from "$lib/transport/port";
import { requestSubjects } from "$lib/transport/subjects";

let settings = $state<SystemSettings | null>(null);
let users = $state<User[]>([]);
let settingsError = $state<string | null>(null);

/** Latest management-plane settings, or null when not loaded. */
export function getSettings(): SystemSettings | null {
	return settings;
}

/** Latest user list. */
export function getUsers(): readonly User[] {
	return users;
}

/** Last settings/users error, or null. */
export function getSettingsError(): string | null {
	return settingsError;
}

/** Load the management-plane settings. */
export async function loadSettings(
	transport: TransportPort | null = getTransport(),
): Promise<void> {
	if (!transport) return;
	try {
		const request = toBinary(
			GetSettingsRequestSchema,
			create(GetSettingsRequestSchema, {}),
		);
		const replyBytes = await transport.request(
			requestSubjects.settingsGet,
			request,
		);
		settings =
			fromBinary(GetSettingsResponseSchema, replyBytes).settings ?? null;
		settingsError = null;
	} catch (err) {
		settingsError = err instanceof Error ? err.message : String(err);
	}
}

/** Persist the time/NTP settings, then adopt the returned authoritative state. */
export async function setTimeSettings(
	time: MessageInitShape<typeof TimeSettingsSchema>,
	transport: TransportPort | null = getTransport(),
): Promise<void> {
	if (!transport) return;
	const request = toBinary(
		SetTimeSettingsRequestSchema,
		create(SetTimeSettingsRequestSchema, { time }),
	);
	const replyBytes = await transport.request(
		requestSubjects.settingsSetTime,
		request,
	);
	settings =
		fromBinary(SetTimeSettingsResponseSchema, replyBytes).settings ?? settings;
}

/** Persist the management network settings. */
export async function setNetworkSettings(
	network: MessageInitShape<typeof NetworkSettingsSchema>,
	transport: TransportPort | null = getTransport(),
): Promise<void> {
	if (!transport) return;
	const request = toBinary(
		SetNetworkSettingsRequestSchema,
		create(SetNetworkSettingsRequestSchema, { network }),
	);
	const replyBytes = await transport.request(
		requestSubjects.settingsSetNetwork,
		request,
	);
	settings =
		fromBinary(SetNetworkSettingsResponseSchema, replyBytes).settings ??
		settings;
}

/** Persist the management service toggles. */
export async function setServiceSettings(
	services: MessageInitShape<typeof ServiceSettingsSchema>,
	transport: TransportPort | null = getTransport(),
): Promise<void> {
	if (!transport) return;
	const request = toBinary(
		SetServiceSettingsRequestSchema,
		create(SetServiceSettingsRequestSchema, { services }),
	);
	const replyBytes = await transport.request(
		requestSubjects.settingsSetServices,
		request,
	);
	settings =
		fromBinary(SetServiceSettingsResponseSchema, replyBytes).settings ??
		settings;
}

/** Load the user list. */
export async function loadUsers(
	transport: TransportPort | null = getTransport(),
): Promise<void> {
	if (!transport) return;
	try {
		const request = toBinary(
			ListUsersRequestSchema,
			create(ListUsersRequestSchema, {}),
		);
		const replyBytes = await transport.request(
			requestSubjects.usersList,
			request,
		);
		users = fromBinary(ListUsersResponseSchema, replyBytes).users;
		settingsError = null;
	} catch (err) {
		settingsError = err instanceof Error ? err.message : String(err);
	}
}

/** Create a user, then refresh the list. */
export async function createUser(
	username: string,
	password: string,
	role: UserRole,
	transport: TransportPort | null = getTransport(),
): Promise<void> {
	if (!transport) return;
	const request = toBinary(
		CreateUserRequestSchema,
		create(CreateUserRequestSchema, { username, password, role }),
	);
	const replyBytes = await transport.request(
		requestSubjects.usersCreate,
		request,
	);
	fromBinary(CreateUserResponseSchema, replyBytes);
	await loadUsers(transport);
}

/** Delete a user, then refresh the list. */
export async function deleteUser(
	username: string,
	transport: TransportPort | null = getTransport(),
): Promise<void> {
	if (!transport) return;
	const request = toBinary(
		DeleteUserRequestSchema,
		create(DeleteUserRequestSchema, { username }),
	);
	const replyBytes = await transport.request(
		requestSubjects.usersDelete,
		request,
	);
	fromBinary(DeleteUserResponseSchema, replyBytes);
	await loadUsers(transport);
}

/** Change a user's role, then refresh the list. */
export async function setUserRole(
	username: string,
	role: UserRole,
	transport: TransportPort | null = getTransport(),
): Promise<void> {
	if (!transport) return;
	const request = toBinary(
		SetUserRoleRequestSchema,
		create(SetUserRoleRequestSchema, { username, role }),
	);
	const replyBytes = await transport.request(
		requestSubjects.usersSetRole,
		request,
	);
	fromBinary(SetUserRoleResponseSchema, replyBytes);
	await loadUsers(transport);
}
