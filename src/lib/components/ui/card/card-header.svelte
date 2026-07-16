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

<div bind:this={ref} class={cn("flex flex-col gap-1 p-5", className)} {...rest}>
	{@render children?.()}
</div>
