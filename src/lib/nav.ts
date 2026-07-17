/**
 * Navigation model for the app shell.
 *
 * Items are grouped into sections. `labelKey` maps to a Paraglide message id so
 * labels stay translated across all locales. `icon` is a Lucide Svelte
 * component, imported per-icon so unused icons are tree-shaken out of the bundle.
 */

import type { LucideIcon } from "@lucide/svelte";
import Activity from "@lucide/svelte/icons/activity";
import LayoutDashboard from "@lucide/svelte/icons/layout-dashboard";
import Monitor from "@lucide/svelte/icons/monitor";
import ScrollText from "@lucide/svelte/icons/scroll-text";
import Server from "@lucide/svelte/icons/server";
import Settings from "@lucide/svelte/icons/settings";
import type { m } from "$lib/paraglide/messages.js";

export type MessageKey = keyof typeof m;

export interface NavItem {
	href: string;
	labelKey: MessageKey;
	icon: LucideIcon;
}

export interface NavSection {
	labelKey: MessageKey;
	items: NavItem[];
}

export const navSections: NavSection[] = [
	{
		labelKey: "nav_section_operate",
		items: [
			{ href: "/", labelKey: "nav_dashboard", icon: LayoutDashboard },
			{ href: "/nodes", labelKey: "nav_nodes", icon: Server },
			{ href: "/remote", labelKey: "nav_remote", icon: Monitor },
		],
	},
	{
		labelKey: "nav_section_observe",
		items: [
			{ href: "/monitoring", labelKey: "nav_monitoring", icon: Activity },
			{ href: "/logs", labelKey: "nav_logs", icon: ScrollText },
		],
	},
	{
		labelKey: "nav_section_system",
		items: [{ href: "/settings", labelKey: "nav_settings", icon: Settings }],
	},
];

/** Flattened list of every navigable item, in sidebar order. */
export const navItems: NavItem[] = navSections.flatMap(
	(section) => section.items,
);
