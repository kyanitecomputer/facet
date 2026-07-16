<script lang="ts">
import type { Snippet } from "svelte";
import { cn } from "$lib/utils";

interface Props {
	title: string;
	children: Snippet;
	actions?: Snippet;
	class?: string;
}

let { title, children, actions, class: className }: Props = $props();
</script>

<section
	class={cn(
		"flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface-muted",
		className,
	)}
>
	<header
		class="flex items-center justify-between gap-2 border-b border-border bg-surface px-3 py-2"
	>
		<h2 class="text-sm font-medium">{title}</h2>
		{#if actions}
			<div class="flex items-center gap-1">{@render actions()}</div>
		{/if}
	</header>
	<div class="min-h-0 flex-1">{@render children()}</div>
</section>
