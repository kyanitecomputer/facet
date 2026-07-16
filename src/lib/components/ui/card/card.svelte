<script lang="ts">
import type { HTMLAttributes } from "svelte/elements";
import { cn, type WithElementRef } from "$lib/utils";

let {
	class: className,
	ref = $bindable(null),
	children,
	...rest
}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	class={cn("rounded-lg border border-border bg-surface-muted", className)}
	{...rest}
>
	{@render children?.()}
</div>
