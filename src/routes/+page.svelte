<script lang="ts">
import Star from "@lucide/svelte/icons/star";
import MetricCard from "$lib/components/MetricCard.svelte";
import PageHeader from "$lib/components/PageHeader.svelte";
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "$lib/components/ui";
import {
	TimeSeriesChart,
	type TimeSeriesData,
	type TimeSeriesSeries,
} from "$lib/components/ui/chart";
import { getFavorites } from "$lib/dashboard.svelte";
import {
	getNodes,
	getSensor,
	loadInventory,
	startTelemetry,
} from "$lib/data/fabric.svelte";
import { metricsById } from "$lib/data/metrics";
import { isConnected } from "$lib/nats.svelte";
import { m } from "$lib/paraglide/messages.js";

// Pull live inventory + telemetry once a backend (real or mock) is connected.
$effect(() => {
	if (!isConnected()) return;
	void loadInventory();
	startTelemetry();
});

const nodeCount = $derived(getNodes().length);
const cards = $derived([
	{
		label: m.overview_card_nodes(),
		value: nodeCount > 0 ? String(nodeCount) : "—",
	},
	{ label: m.overview_card_alerts(), value: "2" },
	{ label: m.overview_card_uptime(), value: "10d 4h" },
]);

const favorites = $derived(
	getFavorites()
		.map((id) => metricsById[id])
		.filter((metric) => metric !== undefined),
);

// Synthetic CPU trace shown until live sensor samples arrive (e.g. no backend).
const now = Math.floor(Date.now() / 1000);
const xs = Array.from({ length: 120 }, (_, i) => now - (119 - i) * 30);
const cpuSynthetic = xs.map((_, i) => 55 + Math.sin(i / 6) * 6 + (i % 5));

const cpu = $derived(getSensor("cpu"));
const telemetry = $derived<TimeSeriesData>(
	cpu && cpu.ts.length > 0 ? [cpu.ts, cpu.values] : [xs, cpuSynthetic],
);
const telemetrySeries: TimeSeriesSeries[] = [{ label: "CPU °C" }];
</script>

<svelte:head>
	<title>{m.app_name()} · {m.overview_title()}</title>
</svelte:head>

<PageHeader title={m.overview_title()} subtitle={m.overview_subtitle()} />

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each cards as card (card.label)}
		<Card>
			<CardHeader>
				<CardTitle>{card.label}</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="text-3xl font-semibold tabular-nums">{card.value}</p>
			</CardContent>
		</Card>
	{/each}
</div>

<section class="mt-8">
	<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
		{m.dashboard_favorites()}
	</h2>

	{#if favorites.length === 0}
		<div
			class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center"
		>
			<Star class="size-6 text-foreground-muted" aria-hidden="true" />
			<div>
				<p class="font-medium">{m.dashboard_empty_title()}</p>
				<p class="mt-1 text-sm text-foreground-muted">
					{m.dashboard_empty_body()}
				</p>
			</div>
			<Button variant="outline" size="sm" href="/monitoring">
				{m.dashboard_browse()}
			</Button>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each favorites as metric (metric.id)}
				<MetricCard {metric} />
			{/each}
		</div>
	{/if}
</section>

<div class="mt-8">
	<Card>
		<CardHeader>
			<CardTitle>{m.overview_telemetry()}</CardTitle>
		</CardHeader>
		<CardContent>
			<TimeSeriesChart data={telemetry} series={telemetrySeries} />
		</CardContent>
	</Card>
</div>
