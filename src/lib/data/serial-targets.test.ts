import { describe, expect, it } from "vitest";
import { createMockTransport, rackMixed, vega } from "$lib/mock";
import { fetchSerialTargets } from "./serial-targets";

describe("fetchSerialTargets", () => {
	it("returns a single console target for a switch", async () => {
		const targets = await fetchSerialTargets("vega", createMockTransport(vega));
		expect(targets.map((t) => t.id)).toEqual(["vega"]);
	});

	it("returns the BMC shell plus the host SOL for a BMC", async () => {
		const targets = await fetchSerialTargets(
			"bmc-7",
			createMockTransport(rackMixed),
		);
		expect(targets.map((t) => t.id)).toEqual(["bmc-7", "bmc-7-host"]);
	});
});
