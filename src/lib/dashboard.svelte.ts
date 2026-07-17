/**
 * Dashboard favorites.
 *
 * Tracks which widgets a user has starred so the dashboard can surface them.
 * Persisted in localStorage (UI preference, not session data). Widget ids refer
 * to the metric catalog in `src/lib/data/metrics.ts`.
 */

const STORAGE_KEY = "facet-dashboard-favorites";

// Seeded on first run so the dashboard is not empty while we iterate on layout.
const DEFAULT_FAVORITES = ["cpu-temp", "power-draw", "ingress", "node-health"];

function readInitial(): string[] {
	if (typeof localStorage === "undefined") {
		return [...DEFAULT_FAVORITES];
	}
	const raw = localStorage.getItem(STORAGE_KEY);
	if (raw === null) {
		return [...DEFAULT_FAVORITES];
	}
	try {
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed)
			? parsed.filter((x): x is string => typeof x === "string")
			: [];
	} catch {
		return [];
	}
}

let favorites = $state<string[]>(readInitial());

function persist(): void {
	if (typeof localStorage !== "undefined") {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
	}
}

export function getFavorites(): readonly string[] {
	return favorites;
}

export function isFavorite(id: string): boolean {
	return favorites.includes(id);
}

export function toggleFavorite(id: string): void {
	favorites = favorites.includes(id)
		? favorites.filter((f) => f !== id)
		: [...favorites, id];
	persist();
}
