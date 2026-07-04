import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockTransport, singleBmc, vega } from "$lib/mock";
import {
	getNodes,
	getSensor,
	loadInventory,
	startTelemetry,
	stopTelemetry,
} from "./fabric.svelte";

describe("fabric store", () => {
	afterEach(() => {
		stopTelemetry();
		vi.useRealTimers();
	});

	it("loads and validates inventory via the transport", async () => {
		await loadInventory(createMockTransport(singleBmc));

		expect(getNodes().map((n) => n.id)).toEqual(["bmc-1"]);
	});

	it("surfaces a node's advertised capabilities", async () => {
		await loadInventory(createMockTransport(vega));

		const caps = getNodes()[0]?.capabilities;
		// Vega is a passively-cooled switch: no KVM, serial + switch mgmt, and
		// monitoring limited to memory/storage/CPU-frequency (no temperature/fans).
		expect(caps?.kvm).toBe(false);
		expect(caps?.serialConsole).toBe(true);
		expect(caps?.switchManagement).toBe(true);
		expect(caps?.metrics.map((m) => m.id)).toEqual([
			"memory",
			"storage",
			"cpu_freq",
		]);
	});

	it("buffers telemetry readings per sensor", () => {
		vi.useFakeTimers();

		startTelemetry("telemetry.>", createMockTransport(singleBmc));
		vi.advanceTimersByTime(2500);

		expect(getSensor("cpu")?.values.length).toBe(2);
	});
});
