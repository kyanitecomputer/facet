import type { NatsConnection } from "@nats-io/nats-core";
import { describe, expect, it, vi } from "vitest";
import { NatsTransport } from "./nats-transport";

function fakeConnection() {
	const unsubscribe = vi.fn();
	return {
		request: vi.fn(async () => ({ data: new Uint8Array([1, 2, 3]) })),
		publish: vi.fn(),
		subscribe: vi.fn(() => ({
			unsubscribe,
			async *[Symbol.asyncIterator]() {},
		})),
		_unsubscribe: unsubscribe,
	};
}

describe("NatsTransport", () => {
	it("reports the nats kind", () => {
		const nc = fakeConnection();
		const transport = new NatsTransport(nc as unknown as NatsConnection);
		expect(transport.kind).toBe("nats");
	});

	it("returns reply bytes from request and applies a default timeout", async () => {
		const nc = fakeConnection();
		const transport = new NatsTransport(nc as unknown as NatsConnection);

		const reply = await transport.request("svc.ping", new Uint8Array([9]));

		expect(reply).toEqual(new Uint8Array([1, 2, 3]));
		expect(nc.request).toHaveBeenCalledWith("svc.ping", new Uint8Array([9]), {
			timeout: 5000,
		});
	});

	it("publishes payloads to a subject", () => {
		const nc = fakeConnection();
		const transport = new NatsTransport(nc as unknown as NatsConnection);

		const payload = new Uint8Array([7]);
		transport.publish("evt.test", payload);

		expect(nc.publish).toHaveBeenCalledWith("evt.test", payload);
	});

	it("returns an unsubscribe handle from subscribe", () => {
		const nc = fakeConnection();
		const transport = new NatsTransport(nc as unknown as NatsConnection);

		const sub = transport.subscribe("evt.>", () => {});
		sub.unsubscribe();

		expect(nc.subscribe).toHaveBeenCalledWith("evt.>");
		expect(nc._unsubscribe).toHaveBeenCalledTimes(1);
	});
});
