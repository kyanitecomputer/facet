import { describe, expect, it } from "vitest";
import { createMockTransport, vega } from "$lib/mock";
import {
	clearSwitch,
	deleteVlan,
	getSwitchDetail,
	loadSwitch,
	setPortAdmin,
	setVlan,
} from "./switch.svelte";

describe("switch store", () => {
	it("loads and validates a switch detail via the transport", async () => {
		clearSwitch();
		await loadSwitch("vega", createMockTransport(vega));

		const detail = getSwitchDetail();
		expect(detail?.nodeId).toBe("vega");
		// 14 physical ports + the CPU port.
		expect(detail?.ports.length).toBe(15);
		expect(detail?.vlans.map((v) => v.vid)).toContain(10);
		expect(detail?.snmp?.communities.length).toBeGreaterThan(0);
	});

	it("persists port and VLAN mutations through the transport", async () => {
		clearSwitch();
		const t = createMockTransport(vega);
		await loadSwitch("vega", t);

		// Toggle ge6 (index 6, admin-down in the seed) up.
		expect(getSwitchDetail()?.ports.find((p) => p.index === 6)?.adminUp).toBe(
			false,
		);
		await setPortAdmin("vega", 6, true, t);
		expect(getSwitchDetail()?.ports.find((p) => p.index === 6)?.adminUp).toBe(
			true,
		);

		// Create a VLAN, then delete it.
		await setVlan("vega", { vid: 99, name: "guests", untaggedPorts: [5] }, t);
		expect(getSwitchDetail()?.vlans.map((v) => v.vid)).toContain(99);
		await deleteVlan("vega", 99, t);
		expect(getSwitchDetail()?.vlans.map((v) => v.vid)).not.toContain(99);
	});
});
