import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import {
	ListInventoryResponseSchema,
	NodeKind,
} from "@kyanite/schema/schema/v1/node_pb";
import { SensorReadingSchema } from "@kyanite/schema/schema/v1/sensor_pb";
import {
	StateAction,
	StateCommandSchema,
} from "@kyanite/schema/schema/v1/state_pb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockTransport, MockTransport, singleBmc } from "./index";

describe("MockTransport", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("answers a request from the scenario handler", async () => {
		const transport = createMockTransport(singleBmc);

		const reply = await transport.request("inventory.list", new Uint8Array());
		const inventory = fromBinary(ListInventoryResponseSchema, reply);

		expect(inventory.nodes[0]).toMatchObject({
			id: "bmc-1",
			kind: NodeKind.BMC,
		});
	});

	it("rejects an unknown request subject", async () => {
		const transport = createMockTransport(singleBmc);
		await expect(
			transport.request("does.not.exist", new Uint8Array()),
		).rejects.toThrow(/no request handler/);
	});

	it("emits stream messages on subscribe and stops on unsubscribe", () => {
		vi.useFakeTimers();
		const transport = createMockTransport(singleBmc);
		const received: string[] = [];

		const sub = transport.subscribe("telemetry.>", (payload) => {
			received.push(fromBinary(SensorReadingSchema, payload).sensorId);
		});

		vi.advanceTimersByTime(2500);
		expect(received).toEqual(["cpu", "cpu"]);

		sub.unsubscribe();
		vi.advanceTimersByTime(3000);
		expect(received).toHaveLength(2);
	});

	it("records published protobuf messages for assertions", () => {
		const transport = new MockTransport(singleBmc);

		const cmd = create(StateCommandSchema, {
			nodeId: "bmc-1",
			component: "power",
			action: StateAction.RESET,
		});
		transport.publish("cmd.bmc-1.power", toBinary(StateCommandSchema, cmd));

		const published = transport.getPublished();
		expect(published).toHaveLength(1);
		expect(published[0].subject).toBe("cmd.bmc-1.power");
		expect(fromBinary(StateCommandSchema, published[0].payload)).toMatchObject({
			nodeId: "bmc-1",
			component: "power",
			action: StateAction.RESET,
		});
	});
});
