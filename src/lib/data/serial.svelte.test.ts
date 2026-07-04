import { describe, expect, it } from "vitest";
import { createMockTransport, singleBmc } from "$lib/mock";
import { openSerial } from "./serial";

const decoder = new TextDecoder();
const encoder = new TextEncoder();

function openOnNode(nodeId: string) {
	const transport = createMockTransport(singleBmc);
	const chunks: string[] = [];
	const session = openSerial(
		nodeId,
		(b) => chunks.push(decoder.decode(b)),
		transport,
	);
	return { session, chunks };
}

describe("openSerial", () => {
	it("returns null without a transport", () => {
		expect(openSerial("bmc-1", () => {}, null)).toBeNull();
	});

	it("delivers the device greeting on subscribe", () => {
		const { session, chunks } = openOnNode("bmc-1");
		expect(session).not.toBeNull();
		expect(chunks.join("")).toContain("Kyanite serial console");
		session?.close();
	});

	it("echoes sent input back from the device", () => {
		const { session, chunks } = openOnNode("bmc-1");
		session?.send(encoder.encode("ls"));
		expect(chunks.join("")).toContain("ls");
		session?.close();
	});

	it("turns a carriage return into a fresh prompt", () => {
		const { session, chunks } = openOnNode("bmc-1");
		chunks.length = 0; // drop the greeting
		session?.send(encoder.encode("\r"));
		expect(chunks.join("")).toContain("\r\n$ ");
		session?.close();
	});

	it("stops delivering after close", () => {
		const { session, chunks } = openOnNode("bmc-1");
		session?.close();
		chunks.length = 0;
		session?.send(encoder.encode("x"));
		expect(chunks.join("")).toBe("");
	});

	it("rejects a nodeId that is not a valid subject token", () => {
		const transport = createMockTransport(singleBmc);
		expect(() => openSerial("a.b", () => {}, transport)).toThrow(
			/invalid nodeId/,
		);
	});
});
