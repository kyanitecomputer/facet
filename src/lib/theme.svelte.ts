/**
 * Theme (colour scheme) preference.
 *
 * Dark is the default. The choice is persisted in localStorage and reflected on
 * `<html data-theme="…">`, which `app.css` keys its light/dark tokens off. A
 * tiny inline script in `app.html` applies the stored value before first paint
 * (no flash); this store keeps it reactive afterwards.
 */

export type Theme = "dark" | "light";

const STORAGE_KEY = "facet-theme";

function readInitial(): Theme {
	if (typeof document !== "undefined") {
		const attr = document.documentElement.getAttribute("data-theme");
		if (attr === "light" || attr === "dark") {
			return attr;
		}
	}
	if (typeof localStorage !== "undefined") {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === "light" || stored === "dark") {
			return stored;
		}
	}
	return "dark";
}

let theme = $state<Theme>(readInitial());

export function getTheme(): Theme {
	return theme;
}

export function setTheme(next: Theme): void {
	theme = next;
	if (typeof document !== "undefined") {
		document.documentElement.setAttribute("data-theme", next);
	}
	if (typeof localStorage !== "undefined") {
		localStorage.setItem(STORAGE_KEY, next);
	}
}

export function toggleTheme(): void {
	setTheme(theme === "dark" ? "light" : "dark");
}
