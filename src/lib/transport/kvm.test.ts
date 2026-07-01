import { describe, expect, it } from "vitest";
import { resolveKvmUrl } from "./kvm";

describe("resolveKvmUrl", () => {
	it("builds a wss URL same-origin under /kvm/<nodeId> over https", () => {
		expect(
			resolveKvmUrl("bmc-1", { protocol: "https:", host: "fabric.local" }),
		).toBe("wss://fabric.local/kvm/bmc-1");
	});

	it("uses ws over plain http", () => {
		expect(
			resolveKvmUrl("bmc-1", { protocol: "http:", host: "localhost:5173" }),
		).toBe("ws://localhost:5173/kvm/bmc-1");
	});

	it("encodes the nodeId path segment", () => {
		expect(resolveKvmUrl("rack/7", { protocol: "https:", host: "h" })).toBe(
			"wss://h/kvm/rack%2F7",
		);
	});

	it("rejects an empty nodeId", () => {
		expect(() => resolveKvmUrl("", { protocol: "https:", host: "h" })).toThrow(
			/empty nodeId/,
		);
	});
});
