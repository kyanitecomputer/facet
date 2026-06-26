<script lang="ts">
import { NodeAvailability, NodeKind } from "@kyanite/schema/schema/v1/node_pb";
import PageHeader from "$lib/components/PageHeader.svelte";
import { Badge, type BadgeVariant } from "$lib/components/ui";
import { getNodes, loadInventory } from "$lib/data/fabric.svelte";
import { isConnected } from "$lib/nats.svelte";
import { m } from "$lib/paraglide/messages.js";

$effect(() => {
	if (isConnected()) void loadInventory();
});

const nodes = $derived(getNodes());

const kindLabels: Record<NodeKind, string> = {
	[NodeKind.UNSPECIFIED]: "—",
	[NodeKind.ROUTER]: "Router",
	[NodeKind.SWITCH]: "Switch",
	[NodeKind.BMC]: "BMC",
	[NodeKind.RMC]: "RMC",
};

const availabilityLabels: Record<NodeAvailability, string> = {
	[NodeAvailability.UNSPECIFIED]: m.node_availability_unknown(),
	[NodeAvailability.ONLINE]: m.node_availability_online(),
	[NodeAvailability.OFFLINE]: m.node_availability_offline(),
	[NodeAvailability.DEGRADED]: m.node_availability_degraded(),
};

const availabilityVariant: Record<NodeAvailability, BadgeVariant> = {
	[NodeAvailability.UNSPECIFIED]: "muted",
	[NodeAvailability.ONLINE]: "ok",
	[NodeAvailability.OFFLINE]: "error",
	[NodeAvailability.DEGRADED]: "warn",
};

function formatUptime(seconds: bigint): string {
	const total = Number(seconds);
	const days = Math.floor(total / 86_400);
	const hours = Math.floor((total % 86_400) / 3_600);
	return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}
</script>

<svelte:head>
	<title>{m.app_name()} · {m.nodes_title()}</title>
</svelte:head>

<PageHeader title={m.nodes_title()} />

{#if nodes.length === 0}
	<div class="rounded-lg border border-dashed border-border p-10 text-center text-foreground-muted">
		{m.nodes_empty()}
	</div>
{:else}
	<div class="overflow-hidden rounded-lg border border-border">
		<table class="w-full text-sm">
			<thead class="bg-surface-muted text-left text-foreground-muted">
				<tr>
					<th class="px-4 py-2 font-medium">{m.nodes_col_name()}</th>
					<th class="px-4 py-2 font-medium">{m.nodes_col_kind()}</th>
					<th class="px-4 py-2 font-medium">{m.nodes_col_availability()}</th>
					<th class="px-4 py-2 text-right font-medium">{m.nodes_col_uptime()}</th>
				</tr>
			</thead>
			<tbody>
				{#each nodes as node (node.id)}
					<tr class="border-t border-border hover:bg-surface-muted">
						<td class="px-4 py-2 font-medium">
							<a href="/nodes/{node.id}" class="text-accent hover:underline">{node.name}</a>
						</td>
						<td class="px-4 py-2">{kindLabels[node.kind]}</td>
						<td class="px-4 py-2">
							<Badge variant={availabilityVariant[node.availability]}>
								{availabilityLabels[node.availability]}
							</Badge>
						</td>
						<td class="px-4 py-2 text-right tabular-nums">
							{formatUptime(node.uptimeSeconds)}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
