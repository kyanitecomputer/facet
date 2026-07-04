import { describe, expect, it } from "vitest";
import { matchSubject } from "./subject";

describe("matchSubject", () => {
	it("matches identical subjects", () => {
		expect(matchSubject("a.b.c", "a.b.c")).toBe(true);
	});

	it("matches a single-token wildcard", () => {
		expect(matchSubject("telemetry.*.cpu", "telemetry.bmc-7.cpu")).toBe(true);
		expect(matchSubject("telemetry.*.cpu", "telemetry.bmc-7.inlet")).toBe(
			false,
		);
	});

	it("matches a trailing > wildcard over one or more tokens", () => {
		expect(matchSubject("telemetry.>", "telemetry.bmc-7.cpu")).toBe(true);
		expect(matchSubject("telemetry.>", "telemetry.bmc-7")).toBe(true);
		expect(matchSubject("telemetry.>", "telemetry")).toBe(false);
	});

	it("rejects length mismatches", () => {
		expect(matchSubject("a.b", "a.b.c")).toBe(false);
		expect(matchSubject("a.b.c", "a.b")).toBe(false);
	});
});
