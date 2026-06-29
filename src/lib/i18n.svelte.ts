import {
	getLocale,
	type Locale,
	overwriteGetLocale,
	setLocale as runtimeSetLocale,
} from "$lib/paraglide/runtime";

// Resolve the initial locale through the configured strategies
// (cookie → preferredLanguage → baseLocale) BEFORE we take over getLocale().
let locale = $state<Locale>(getLocale());

// Back getLocale() with a rune. Every message call goes through getLocale(),
// so reading a `$state` here makes the whole UI re-render reactively when the
// locale changes — without a full page reload. That matters because the auth
// session lives in memory only (architecture §4): a reload would sign the user
// out, which is what caused the "white page" on language switch.
overwriteGetLocale(() => locale);

/** The active locale as a reactive value (safe to read in markup/effects). */
export function activeLocale(): Locale {
	return locale;
}

/**
 * Switch the UI language. Persists the choice via the cookie strategy and
 * updates the reactive locale in place — no navigation, no reload, so the
 * in-memory session and current route are preserved.
 */
export function switchLocale(next: Locale): void {
	if (next === locale) {
		return;
	}
	void runtimeSetLocale(next, { reload: false });
	locale = next;
}
