/**
 * utils.ts — shared helpers for the in-repo component library.
 *
 * `cn` is a tiny, dependency-free class-name joiner (clsx-style). We deliberately
 * avoid pulling in `clsx` + `tailwind-merge` ourselves to keep the dependency
 * surface minimal. The trade-off: conflicting Tailwind utilities are not
 * de-duplicated, so the `class` prop on a component is meant for additive
 * layout/spacing utilities rather than overriding a component's base colours.
 * Components expose explicit `variant` props for that instead.
 *
 * The public type is Svelte's own `ClassValue` (what the `class` attribute
 * accepts), so component `class` props flow straight into `cn` without casts.
 */

import type { ClassValue } from "svelte/elements";

export function cn(...inputs: Array<ClassValue | null | undefined>): string {
	const out: string[] = [];

	const walk = (value: unknown): void => {
		if (!value) return;
		if (
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "bigint"
		) {
			out.push(String(value));
			return;
		}
		if (Array.isArray(value)) {
			for (const item of value) walk(item);
			return;
		}
		if (typeof value === "object") {
			for (const [key, enabled] of Object.entries(value)) {
				if (enabled) out.push(key);
			}
		}
	};

	for (const input of inputs) walk(input);
	return out.join(" ");
}

/** Adds an optional bindable element `ref` to a component's prop type. */
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
	ref?: U | null;
};
