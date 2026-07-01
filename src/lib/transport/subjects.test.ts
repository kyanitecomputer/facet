import { describe, expect, it } from "vitest";
import { serialSubjects } from "./subjects";

describe("serialSubjects", () => {
	it("builds out/in subjects for a node", () => {
		expect(serialSubjects("bmc-1")).toEqual({
			out: "serial.bmc-1.out",
			in: "serial.bmc-1.in",
		});
	});

	it.each([
		".",
		"a.b",
		"node id",
		"node*",
		"node>",
		"",
	])("rejects nodeId %o that is not a valid NATS token", (nodeId) => {
		expect(() => serialSubjects(nodeId)).toThrow(/invalid nodeId/);
	});
});
