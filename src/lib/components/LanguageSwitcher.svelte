<script lang="ts">
import Languages from "@lucide/svelte/icons/languages";
import { activeLocale, switchLocale } from "$lib/i18n.svelte";
import { m } from "$lib/paraglide/messages.js";
import { type Locale, locales } from "$lib/paraglide/runtime";

const localeNames: Record<Locale, string> = {
	en: "English",
	de: "Deutsch",
	zh: "中文",
	ja: "日本語",
};

function onchange(event: Event) {
	switchLocale((event.currentTarget as HTMLSelectElement).value as Locale);
}
</script>

<label
	class="flex items-center gap-2 text-sm text-foreground-muted focus-within:text-foreground"
>
	<Languages class="size-4 shrink-0" aria-hidden="true" />
	<span class="sr-only">{m.settings_language()}</span>
	<select
		value={activeLocale()}
		{onchange}
		aria-label={m.settings_language()}
		class="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
	>
		{#each locales as locale (locale)}
			<option value={locale}>{localeNames[locale]}</option>
		{/each}
	</select>
</label>
