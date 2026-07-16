<script lang="ts">
import Moon from "@lucide/svelte/icons/moon";
import Sun from "@lucide/svelte/icons/sun";
import { Button } from "$lib/components/ui";
import { m } from "$lib/paraglide/messages.js";
import { getTheme, toggleTheme } from "$lib/theme.svelte";

const isDark = $derived(getTheme() === "dark");
const label = $derived(isDark ? m.theme_switch_light() : m.theme_switch_dark());
</script>

<Button
	variant="ghost"
	size="icon"
	onclick={toggleTheme}
	aria-label={label}
	title={label}
>
	{#if isDark}
		<Sun class="size-5" aria-hidden="true" />
	{:else}
		<Moon class="size-5" aria-hidden="true" />
	{/if}
</Button>
