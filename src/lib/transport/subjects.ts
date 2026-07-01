/**
 * subjects.ts — NATS subject conventions for the Facet transport.
 *
 * One place to build the subjects the frontend talks on, so the wire contract
 * with the backend (Cairn/Vein) is declared once and validated by tests.
 *
 * Per-node serial console is two raw-byte subjects under `serial.<nodeId>`:
 *     `serial.<nodeId>.out`  device → browser  (subscribe)
 *     `serial.<nodeId>.in`   browser → device  (publish)
 * Serial payloads are raw UART bytes, NOT protobuf: the byte-oriented
 * `TransportPort` carries them directly with no per-keystroke encode/decode.
 *
 * A `nodeId` becomes a NATS subject token, so it must not contain the NATS
 * delimiters/wildcards (`.`, ` `, `*`, `>`); `serialSubjects` enforces that.
 *
 * NOTE: auth is NOT on NATS — it runs over HTTP/ConnectRPC (HttpOnly cookie);
 * see transport/connect.ts and facet-backend-contract.md §3.
 */

/**
 * Request/reply subjects (protobuf payloads). Each maps to a Tier 1 query the
 * backend answers as a NATS responder; the mock registers handlers on the same
 * keys. Telemetry/serial are streaming/byte subjects and live separately.
 */
export const requestSubjects = {
	/** ListInventory → ListInventoryResponse (no params). */
	inventoryList: "inventory.list",
	/** ListSerialTargets(node_id) → ListSerialTargetsResponse. */
	serialTargets: "serial.targets",
	/** GetSwitch(node_id) → GetSwitchResponse (full switch detail). */
	switchDetail: "switch.detail",
	/** SetPortAdmin(node_id, port, admin_up) → SetPortAdminResponse. */
	switchSetPort: "switch.set_port",
	/** SetVlan(node_id, vlan) → SetVlanResponse. */
	switchSetVlan: "switch.set_vlan",
	/** DeleteVlan(node_id, vid) → DeleteVlanResponse. */
	switchDeleteVlan: "switch.delete_vlan",
	/** GetSettings → GetSettingsResponse (management-plane settings). */
	settingsGet: "settings.get",
	/** SetTimeSettings → SetTimeSettingsResponse. */
	settingsSetTime: "settings.set_time",
	/** SetNetworkSettings → SetNetworkSettingsResponse. */
	settingsSetNetwork: "settings.set_network",
	/** SetServiceSettings → SetServiceSettingsResponse. */
	settingsSetServices: "settings.set_services",
	/** Reset(id, reset_type) → ResetResponse (power control). */
	powerReset: "power.reset",
	/** ListUsers → ListUsersResponse. */
	usersList: "users.list",
	/** CreateUser → CreateUserResponse. */
	usersCreate: "users.create",
	/** DeleteUser → DeleteUserResponse. */
	usersDelete: "users.delete",
	/** SetUserRole → SetUserRoleResponse. */
	usersSetRole: "users.set_role",
} as const;

/** Out (device → browser) and in (browser → device) subjects for a node. */
export interface SerialSubjects {
	/** Subscribe here for bytes emitted by the node's serial port. */
	out: string;
	/** Publish keystrokes/bytes here to send to the node's serial port. */
	in: string;
}

/** Characters that would break a single NATS subject token. */
const INVALID_TOKEN = /[.\s*>]/;

/** Build the serial in/out subjects for `nodeId` (validates the token). */
export function serialSubjects(nodeId: string): SerialSubjects {
	if (nodeId.length === 0 || INVALID_TOKEN.test(nodeId)) {
		throw new Error(
			`invalid nodeId for subject: ${JSON.stringify(nodeId)} ` +
				`(must be non-empty and free of ".", whitespace, "*", ">")`,
		);
	}
	return {
		out: `serial.${nodeId}.out`,
		in: `serial.${nodeId}.in`,
	};
}
