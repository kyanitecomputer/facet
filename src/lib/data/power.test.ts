import { PowerState, ResetType } from "@kyanite/schema/schema/v1/system_pb";
import { describe, expect, it } from "vitest";
import { createMockTransport, rackMixed } from "$lib/mock";
import { resetNode } from "./power";

describe("resetNode", () => {
	it("maps reset actions to the resulting power state", async () => {
		const t = createMockTransport(rackMixed);

		expect(await resetNode("bmc-7", ResetType.FORCE_OFF, t)).toBe(
			PowerState.OFF,
		);
		expect(await resetNode("bmc-7", ResetType.ON, t)).toBe(PowerState.ON);
		// Push-button toggles from the current (on) state.
		expect(await resetNode("bmc-7", ResetType.PUSH_POWER_BUTTON, t)).toBe(
			PowerState.OFF,
		);
	});
});
