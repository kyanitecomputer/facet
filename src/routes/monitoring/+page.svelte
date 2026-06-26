<script lang="ts">
import MetricCard from "$lib/components/MetricCard.svelte";
import PageHeader from "$lib/components/PageHeader.svelte";
import { metricGroups, metrics } from "$lib/data/metrics";
import { m } from "$lib/paraglide/messages.js";

const groups = metricGroups.map((group) => ({
	group,
	items: metrics.filter((metric) => metric.group === group),
}));
</script>

<svelte:head>
	<title>{m.app_name()} · {m.monitoring_title()}</title>
</svelte:head>

<PageHeader title={m.monitoring_title()} subtitle={m.monitoring_subtitle()} />

<div class="flex flex-col gap-8">
	{#each groups as { group, items } (group)}
		<section>
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
				{group}
			</h2>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each items as metric (metric.id)}
					<MetricCard {metric} />
				{/each}
			</div>
		</section>
	{/each}
</div>
