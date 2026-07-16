<script lang="ts">
import type { HTMLAttributes } from "svelte/elements";
import { cn, type WithElementRef } from "$lib/utils";

let {
	class: className,
	ref = $bindable(null),
	children,
	...rest
}: WithElementRef<
	HTMLAttributes<HTMLHeadingElement>,
	HTMLHeadingElement
> = $props();
</script>

<h3 bind:this={ref} class={cn("text-sm font-medium text-foreground-muted", className)} {...rest}>
	{@render children?.()}
</h3>
