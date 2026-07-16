<script lang="ts" module>
import type { HTMLAttributes } from "svelte/elements";
import type { WithElementRef } from "$lib/utils";

export type BadgeVariant =
	| "default"
	| "ok"
	| "warn"
	| "error"
	| "muted"
	| "outline";

export type BadgeProps = WithElementRef<
	HTMLAttributes<HTMLSpanElement>,
	HTMLSpanElement
> & {
	variant?: BadgeVariant;
};
</script>

<script lang="ts">
import { cn } from "$lib/utils";

let {
	variant = "default",
	class: className,
	ref = $bindable(null),
	children,
	...rest
}: BadgeProps = $props();

const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium";

const variants: Record<BadgeVariant, string> = {
	default: "bg-accent/10 text-accent",
	ok: "bg-ok/10 text-ok",
	warn: "bg-warn/10 text-warn",
	error: "bg-error/10 text-error",
	muted: "bg-surface text-foreground-muted",
	outline: "border border-border text-foreground",
};

const classes = $derived(cn(base, variants[variant], className));
</script>

<span bind:this={ref} class={classes} {...rest}>{@render children?.()}</span>
