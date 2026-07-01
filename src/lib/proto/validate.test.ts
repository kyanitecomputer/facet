import { create } from "@bufbuild/protobuf";
import {
	NodeAvailability,
	NodeKind,
	NodeSummarySchema,
} from "@kyanite/schema/schema/v1/node_pb";
import { describe, expect, it } from "vitest";
import { getValidator } from "./validate";

describe("getValidator", () => {
	it("returns a memoized protovalidate validator", () => {
		const a = getValidator();
		const b = getValidator();

		expect(a).toBe(b);
		expect(typeof a.validate).toBe("function");
	});

	it("accepts a valid NodeSummary", () => {
		const result = getValidator().validate(
			NodeSummarySchema,
			create(NodeSummarySchema, {
				id: "bmc-1",
				name: "bmc-1",
				kind: NodeKind.BMC,
				availability: NodeAvailability.ONLINE,
				uptimeSeconds: 7_200n,
			}),
		);

		expect(result.kind).toBe("valid");
	});

	it("rejects a NodeSummary that violates buf.validate rules", () => {
		const result = getValidator().validate(
			NodeSummarySchema,
			create(NodeSummarySchema, {
				id: "", // string.min_len = 1
				name: "", // string.min_len = 1
				kind: NodeKind.UNSPECIFIED, // enum.not_in = [0]
				uptimeSeconds: -1n, // int64.gte = 0
			}),
		);

		expect(result.kind).toBe("invalid");
		expect(result.violations?.length ?? 0).toBeGreaterThan(0);
	});
});
