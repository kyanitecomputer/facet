import { UserRole } from "@kyanite/schema/schema/v1/auth_pb";
import { AddressMode } from "@kyanite/schema/schema/v1/settings_pb";
import { describe, expect, it } from "vitest";
import { createMockTransport, vega } from "$lib/mock";
import {
	createUser,
	deleteUser,
	getSettings,
	getUsers,
	loadSettings,
	loadUsers,
	setNetworkSettings,
	setServiceSettings,
	setTimeSettings,
	setUserRole,
} from "./settings.svelte";

describe("settings store", () => {
	it("loads management-plane settings via the transport", async () => {
		const t = createMockTransport(vega);
		await loadSettings(t);

		const s = getSettings();
		expect(s?.network?.hostname).toBe("vega");
		expect(s?.time?.ntpEnabled).toBe(true);
		expect(s?.services?.sshPort).toBe(22);
	});

	it("persists settings changes and adopts the echoed state", async () => {
		const t = createMockTransport(vega);
		await loadSettings(t);

		await setTimeSettings(
			{
				ntpEnabled: false,
				ntpServers: ["ntp.example.com"],
				timezone: "Europe/Berlin",
			},
			t,
		);
		expect(getSettings()?.time?.timezone).toBe("Europe/Berlin");
		expect(getSettings()?.time?.ntpEnabled).toBe(false);

		await setNetworkSettings(
			{ mode: AddressMode.DHCP, hostname: "vega-2", dnsServers: ["8.8.8.8"] },
			t,
		);
		expect(getSettings()?.network?.hostname).toBe("vega-2");
		expect(getSettings()?.network?.mode).toBe(AddressMode.DHCP);

		await setServiceSettings({ sshEnabled: false, sshPort: 2222 }, t);
		expect(getSettings()?.services?.sshEnabled).toBe(false);
		expect(getSettings()?.services?.sshPort).toBe(2222);
	});

	it("creates, re-roles, and deletes users through the transport", async () => {
		const t = createMockTransport(vega);
		await loadUsers(t);
		expect(getUsers().map((u) => u.username)).toContain("admin");

		await createUser("alice", "secret", UserRole.OPERATOR, t);
		expect(getUsers().map((u) => u.username)).toContain("alice");

		await setUserRole("alice", UserRole.ADMIN, t);
		expect(getUsers().find((u) => u.username === "alice")?.role).toBe(
			UserRole.ADMIN,
		);

		await deleteUser("alice", t);
		expect(getUsers().map((u) => u.username)).not.toContain("alice");
	});
});
