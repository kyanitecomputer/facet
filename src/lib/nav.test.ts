import { describe, expect, it } from "vitest";
import { navItems, navSections } from "./nav";

describe("navItems", () => {
	it("exposes the control-plane routes in order", () => {
		expect(navItems.map((item) => item.href)).toEqual([
			"/",
			"/nodes",
			"/remote",
			"/monitoring",
			"/logs",
			"/settings",
		]);
	});

	it("gives every item an icon and a message key", () => {
		for (const item of navItems) {
			expect(item.icon.length).toBeGreaterThan(0);
			expect(item.labelKey.length).toBeGreaterThan(0);
		}
	});

	it("flattens every section item in order", () => {
		expect(navItems).toEqual(navSections.flatMap((section) => section.items));
	});
});
