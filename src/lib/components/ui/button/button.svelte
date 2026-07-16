<script lang="ts" module>
import type {
	HTMLAnchorAttributes,
	HTMLButtonAttributes,
} from "svelte/elements";
import type { WithElementRef } from "$lib/utils";

export type ButtonVariant = "default" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "icon";

export type ButtonProps = WithElementRef<
	HTMLButtonAttributes & HTMLAnchorAttributes,
	HTMLButtonElement | HTMLAnchorElement
> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
};
</script>

<script lang="ts">
import { cn } from "$lib/utils";

let {
	variant = "default",
	size = "md",
	class: className,
	href,
	ref = $bindable(null),
	children,
	...rest
}: ButtonProps = $props();

const base =
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
	default: "bg-accent text-accent-foreground hover:bg-accent/90",
	outline: "border border-border bg-surface hover:bg-surface-muted",
	ghost: "hover:bg-surface-muted",
	destructive: "bg-error text-white hover:bg-error/90",
};

const sizes: Record<ButtonSize, string> = {
	sm: "h-8 px-3",
	md: "h-9 px-4",
	icon: "size-9",
};

const classes = $derived(cn(base, variants[variant], sizes[size], className));
</script>

{#if href}
	<a bind:this={ref} {href} class={classes} {...rest}>
		{@render children?.()}
	</a>
{:else}
	<button bind:this={ref} class={classes} {...rest}>
		{@render children?.()}
	</button>
{/if}
