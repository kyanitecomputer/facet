<script lang="ts">
import Star from "@lucide/svelte/icons/star";
import { Card } from "$lib/components/ui";
import { isFavorite, toggleFavorite } from "$lib/dashboard.svelte";
import type { Metric, MetricStatus } from "$lib/data/metrics";
import { m } from "$lib/paraglide/messages.js";
import { cn } from "$lib/utils";

let { metric }: { metric: Metric } = $props();

const fav = $derived(isFavorite(metric.id));

const statusDot: Record<MetricStatus, string> = {
	ok: "bg-ok",
	warn: "bg-warn",
	error: "bg-error",
};

function sparkline(series: number[]): string {
	const width = 100;
	const height = 28;
	const min = Math.min(...series);
	const max = Math.max(...series);
	const range = max - min || 1;
	const step = series.length > 1 ? width / (series.length - 1) : width;
	return series
		.map(
			(value, i) =>
				`${(i * step).toFixed(1)},${(height - ((value - min) / range) * height).toFixed(1)}`,
		)
		.join(" ");
}
</script>

<Card class="relative">
	<div class="p-4">
		<button
			type="button"
			onclick={() => toggleFavorite(metric.id)}
			aria-pressed={fav}
			aria-label={fav ? m.widget_unstar() : m.widget_star()}
			class="absolute right-2.5 top-2.5 rounded-md p-1 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
		>
			<Star
				class={cn("size-4", fav ? "fill-warn text-warn" : "text-foreground-muted")}
			/>
		</button>

		<div class="flex items-center gap-2 text-xs text-foreground-muted">
			<span class="size-2 rounded-full {statusDot[metric.status]}" aria-hidden="true"
			></span>
			<span>{metric.group}</span>
		</div>

		<p class="mt-2 truncate text-sm text-foreground-muted">{metric.title}</p>
		<p class="mt-1 text-2xl font-semibold tabular-nums">
			{metric.value}{#if metric.unit}<span
					class="ml-1 text-base font-normal text-foreground-muted">{metric.unit}</span
				>{/if}
		</p>

		{#if metric.series}
			<svg
				viewBox="0 0 100 28"
				preserveAspectRatio="none"
				class="mt-3 h-8 w-full text-accent"
				aria-hidden="true"
			>
				<polyline
					points={sparkline(metric.series)}
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					vector-effect="non-scaling-stroke"
				/>
			</svg>
		{/if}
	</div>
</Card>
