<script lang="ts">
import { page } from "$app/state";
import { Button } from "$lib/components/ui";
import { m } from "$lib/paraglide/messages.js";
</script>

<svelte:head>
	<title>{m.app_name()} · {page.status}</title>
</svelte:head>

<div class="grid min-h-full place-items-center text-center">
	<div class="flex flex-col items-center gap-4">
		<p class="text-5xl font-bold tabular-nums">{page.status}</p>
		<h1 class="text-xl font-semibold">{m.error_title()}</h1>
		{#if page.error?.message}
			<p class="text-foreground-muted">{page.error.message}</p>
		{/if}
		<Button href="/">{m.error_home()}</Button>
	</div>
</div>
