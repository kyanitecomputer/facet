<script lang="ts">
import { SensorType } from "@kyanite/schema/schema/v1/sensor_pb";
import { PowerState, ResetType } from "@kyanite/schema/schema/v1/system_pb";
import Trash2 from "@lucide/svelte/icons/trash-2";
import { page } from "$app/state";
import PageHeader from "$lib/components/PageHeader.svelte";
import Panel from "$lib/components/Panel.svelte";
import { Badge, Button } from "$lib/components/ui";
import {
	getNodes,
	getSensor,
	loadInventory,
	startTelemetry,
} from "$lib/data/fabric.svelte";
import { resetNode } from "$lib/data/power";
import {
	clearSwitch,
	deleteVlan,
	getSwitchDetail,
	loadSwitch,
	setPortAdmin,
	setVlan,
} from "$lib/data/switch.svelte";
import {
	aclActionLabel,
	aclTypeLabel,
	dot1xStateLabel,
	erpsStateLabel,
	lagModeLabel,
	linkLabel,
	mirrorDirectionLabel,
	portMediaLabel,
	qosSchedulerLabel,
	qosTrustLabel,
	snmpAccessLabel,
	snmpLevelLabel,
	stpRoleLabel,
	stpStateLabel,
} from "$lib/data/switch-labels";
import { m } from "$lib/paraglide/messages.js";

const nodeId = $derived(page.params.id ?? "");
const nodes = $derived(getNodes());
const node = $derived(nodes.find((n) => n.id === nodeId));
const detail = $derived(getSwitchDetail());

// Capability-driven: render only what the node advertises in its inventory row.
const metrics = $derived(node?.capabilities?.metrics ?? []);
const switchManagement = $derived(
	node?.capabilities?.switchManagement ?? false,
);
const powerControl = $derived(node?.capabilities?.powerControl ?? false);

// Power control: available reset actions, the last reported state, and a
// two-step confirm so a destructive action is never a single click.
const powerActions: { type: ResetType; label: () => string }[] = [
	{ type: ResetType.ON, label: () => m.power_action_on() },
	{ type: ResetType.GRACEFUL_SHUTDOWN, label: () => m.power_action_shutdown() },
	{ type: ResetType.GRACEFUL_RESTART, label: () => m.power_action_restart() },
	{ type: ResetType.FORCE_OFF, label: () => m.power_action_force_off() },
];
const powerStateLabel: Record<PowerState, string> = {
	[PowerState.UNSPECIFIED]: m.power_state_unknown(),
	[PowerState.ON]: m.power_state_on(),
	[PowerState.OFF]: m.power_state_off(),
	[PowerState.POWERING_ON]: m.power_state_transition(),
	[PowerState.POWERING_OFF]: m.power_state_transition(),
	[PowerState.PAUSED]: m.power_state_paused(),
};
let powerState = $state<PowerState>(PowerState.UNSPECIFIED);
let pendingReset = $state<ResetType | null>(null);

async function confirmReset(): Promise<void> {
	if (pendingReset === null) return;
	powerState = await resetNode(nodeId, pendingReset);
	pendingReset = null;
}

// Inventory feeds the node identity + capabilities; load it once if not present.
$effect(() => {
	if (nodes.length === 0) void loadInventory();
});

// Live telemetry feeds the monitoring tiles (idempotent; subscribes once).
$effect(() => {
	startTelemetry();
});

// Pull the full switch detail only when the node advertises switch management.
$effect(() => {
	if (nodeId && switchManagement) void loadSwitch(nodeId);
	return () => clearSwitch();
});

function formatUptime(seconds: bigint): string {
	const total = Number(seconds);
	const days = Math.floor(total / 86_400);
	const hours = Math.floor((total % 86_400) / 3_600);
	return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}

function portList(ports: number[]): string {
	return ports.length > 0 ? ports.join(", ") : "—";
}

function parsePorts(value: string): number[] {
	return value
		.split(",")
		.map((v) => Number.parseInt(v.trim(), 10))
		.filter((n) => Number.isInteger(n));
}

// New-VLAN form.
let newVlanVid = $state<number>();
let newVlanName = $state("");
let newVlanUntagged = $state("");

async function submitVlan(event: SubmitEvent): Promise<void> {
	event.preventDefault();
	if (!newVlanVid) return;
	await setVlan(nodeId, {
		vid: newVlanVid,
		name: newVlanName,
		untaggedPorts: parsePorts(newVlanUntagged),
	});
	newVlanVid = undefined;
	newVlanName = "";
	newVlanUntagged = "";
}

/** Latest sampled value for a sensor id, formatted, or a dash. */
function latestValue(sensorId: string, type: SensorType): string {
	const series = getSensor(sensorId);
	if (!series || series.values.length === 0) return m.metric_no_data();
	const v = series.values[series.values.length - 1];
	return type === SensorType.FREQUENCY ? v.toFixed(0) : v.toFixed(1);
}
</script>

<svelte:head>
	<title>{m.app_name()} · {node?.name ?? nodeId}</title>
</svelte:head>

<a href="/nodes" class="text-sm text-accent hover:underline">{m.node_detail_back()}</a>

<div class="mt-2">
	<PageHeader title={node?.name ?? nodeId} subtitle={detail?.info?.model} />
</div>

{#if nodes.length > 0 && !node}
	<p class="text-foreground-muted">{m.node_detail_not_found()}</p>
{:else if node}
	<div class="flex flex-col gap-4">
		<!-- Monitoring: one live tile per advertised metric (omitted if none). -->
		{#if metrics.length > 0}
			<Panel title={m.node_detail_section_monitoring()}>
				<div class="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each metrics as metric (metric.id)}
						<div class="rounded-lg border border-border p-3">
							<div class="text-sm text-foreground-muted">{metric.label}</div>
							<div class="text-2xl font-semibold tabular-nums">
								{latestValue(metric.id, metric.type)}
								<span class="text-sm font-normal text-foreground-muted">{metric.unit}</span>
							</div>
						</div>
					{/each}
				</div>
			</Panel>
		{/if}

		<!-- Power control: shown only when the node advertises it. -->
		{#if powerControl}
			<Panel title={m.power_section()}>
				<div class="flex flex-col gap-4 p-4">
					<div class="flex items-center gap-2 text-sm">
						<span class="text-foreground-muted">{m.power_current()}</span>
						<Badge variant={powerState === PowerState.ON ? "ok" : powerState === PowerState.OFF ? "muted" : "warn"}>
							{powerStateLabel[powerState]}
						</Badge>
					</div>
					{#if pendingReset === null}
						<div class="flex flex-wrap gap-2">
							{#each powerActions as action (action.type)}
								<Button
									variant="outline"
									size="sm"
									onclick={() => {
										pendingReset = action.type;
									}}
								>
									{action.label()}
								</Button>
							{/each}
						</div>
					{:else}
						<div class="flex flex-wrap items-center gap-3 rounded-md border border-warn/40 bg-warn/5 p-3 text-sm">
							<span>{m.power_confirm()}</span>
							<Button variant="default" size="sm" onclick={confirmReset}>
								{m.action_confirm()}
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onclick={() => {
									pendingReset = null;
								}}
							>
								{m.action_cancel()}
							</Button>
						</div>
					{/if}
				</div>
			</Panel>
		{/if}

		{#if switchManagement && detail}
			{@const info = detail.info}
			{#if info}
			<Panel title={node?.name ?? nodeId}>
				<dl class="grid grid-cols-2 gap-x-6 gap-y-2 p-4 text-sm sm:grid-cols-3">
					<div>
						<dt class="text-foreground-muted">{m.switch_info_model()}</dt>
						<dd>{info.model}</dd>
					</div>
					<div>
						<dt class="text-foreground-muted">{m.switch_info_serial()}</dt>
						<dd class="font-mono">{info.serialNumber}</dd>
					</div>
					<div>
						<dt class="text-foreground-muted">{m.switch_info_firmware()}</dt>
						<dd>{info.firmwareVersion}</dd>
					</div>
					<div>
						<dt class="text-foreground-muted">{m.switch_info_mgmt_ip()}</dt>
						<dd class="font-mono">{info.managementIp}</dd>
					</div>
					<div>
						<dt class="text-foreground-muted">{m.switch_info_mgmt_mac()}</dt>
						<dd class="font-mono">{info.managementMac}</dd>
					</div>
					<div>
						<dt class="text-foreground-muted">{m.switch_info_uptime()}</dt>
						<dd>{formatUptime(info.uptimeSeconds)}</dd>
					</div>
				</dl>
			</Panel>
		{/if}

		<!-- Ports -->
		<Panel title={m.switch_section_ports()}>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="bg-surface text-left text-foreground-muted">
						<tr>
							<th class="px-3 py-2 font-medium">{m.col_label()}</th>
							<th class="px-3 py-2 font-medium">{m.col_media()}</th>
							<th class="px-3 py-2 font-medium">{m.col_admin()}</th>
							<th class="px-3 py-2 font-medium">{m.col_link()}</th>
							<th class="px-3 py-2 text-right font-medium">{m.col_speed()}</th>
							<th class="px-3 py-2 font-medium">{m.col_description()}</th>
						</tr>
					</thead>
					<tbody>
						{#each detail.ports as port (port.index)}
							<tr class="border-t border-border">
								<td class="px-3 py-1.5 font-mono">{port.label}</td>
								<td class="px-3 py-1.5">{portMediaLabel[port.media]}</td>
								<td class="px-3 py-1.5">
									{#if port.index === 31}
										<Badge variant="ok">up</Badge>
									{:else}
										<button
											type="button"
											class="cursor-pointer"
											aria-label={m.switch_port_admin_toggle()}
											onclick={() => setPortAdmin(nodeId, port.index, !port.adminUp)}
										>
											<Badge variant={port.adminUp ? "ok" : "muted"}>
												{port.adminUp ? "up" : "down"}
											</Badge>
										</button>
									{/if}
								</td>
								<td class="px-3 py-1.5">
									<Badge variant={linkLabel[port.link] === "up" ? "ok" : "muted"}>
										{linkLabel[port.link]}
									</Badge>
								</td>
								<td class="px-3 py-1.5 text-right tabular-nums">
									{port.speedMbps > 0 ? `${port.speedMbps} Mbps` : "—"}
								</td>
								<td class="px-3 py-1.5 text-foreground-muted">{port.description || "—"}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Panel>

		<!-- VLANs -->
		<Panel title={m.switch_section_vlans()}>
			<table class="w-full text-sm">
				<thead class="bg-surface text-left text-foreground-muted">
					<tr>
						<th class="px-3 py-2 font-medium">{m.col_vid()}</th>
						<th class="px-3 py-2 font-medium">{m.col_name()}</th>
						<th class="px-3 py-2 font-medium">{m.col_untagged()}</th>
						<th class="px-3 py-2 font-medium">{m.col_tagged()}</th>
						<th class="px-3 py-2 text-right font-medium">{m.col_actions()}</th>
					</tr>
				</thead>
				<tbody>
					{#each detail.vlans as vlan (vlan.vid)}
						<tr class="border-t border-border">
							<td class="px-3 py-1.5 tabular-nums">{vlan.vid}</td>
							<td class="px-3 py-1.5">{vlan.name}</td>
							<td class="px-3 py-1.5 font-mono">{portList(vlan.untaggedPorts)}</td>
							<td class="px-3 py-1.5 font-mono">{portList(vlan.taggedPorts)}</td>
							<td class="px-3 py-1.5 text-right">
								{#if vlan.vid !== 1}
									<Button
										variant="ghost"
										size="icon"
										aria-label={m.action_delete()}
										onclick={() => deleteVlan(nodeId, vlan.vid)}
									>
										<Trash2 class="size-4" aria-hidden="true" />
									</Button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<form class="flex flex-wrap items-end gap-3 border-t border-border p-3" onsubmit={submitVlan}>
				<label class="flex flex-col gap-1 text-sm">
					<span class="text-foreground-muted">{m.col_vid()}</span>
					<input
						type="number"
						bind:value={newVlanVid}
						min="2"
						max="4094"
						required
						class="w-24 rounded-md border border-border bg-surface px-2 py-1 tabular-nums"
					/>
				</label>
				<label class="flex flex-col gap-1 text-sm">
					<span class="text-foreground-muted">{m.col_name()}</span>
					<input bind:value={newVlanName} class="rounded-md border border-border bg-surface px-2 py-1" />
				</label>
				<label class="flex flex-col gap-1 text-sm">
					<span class="text-foreground-muted">{m.col_untagged()}</span>
					<input
						bind:value={newVlanUntagged}
						placeholder="1, 2, 3"
						class="rounded-md border border-border bg-surface px-2 py-1 font-mono"
					/>
				</label>
				<Button type="submit" size="sm">{m.switch_vlan_add()}</Button>
			</form>
		</Panel>

		<!-- LLDP -->
		<Panel title={m.switch_section_lldp()}>
			{#if detail.lldpNeighbors.length === 0}
				<p class="p-4 text-foreground-muted">{m.switch_empty()}</p>
			{:else}
				<table class="w-full text-sm">
					<thead class="bg-surface text-left text-foreground-muted">
						<tr>
							<th class="px-3 py-2 font-medium">{m.col_port()}</th>
							<th class="px-3 py-2 font-medium">{m.col_system()}</th>
							<th class="px-3 py-2 font-medium">{m.col_port_id()}</th>
							<th class="px-3 py-2 text-right font-medium">{m.col_ttl()}</th>
						</tr>
					</thead>
					<tbody>
						{#each detail.lldpNeighbors as n (n.localPort + n.chassisId)}
							<tr class="border-t border-border">
								<td class="px-3 py-1.5 tabular-nums">{n.localPort}</td>
								<td class="px-3 py-1.5">
									{n.systemName}
									<span class="block text-xs text-foreground-muted">{n.chassisId}</span>
								</td>
								<td class="px-3 py-1.5 font-mono">{n.portId}</td>
								<td class="px-3 py-1.5 text-right tabular-nums">{n.ttlSeconds}s</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</Panel>

		<!-- RSTP -->
		<Panel title={m.switch_section_rstp()}>
			{#if !detail.rstp?.enabled}
				<p class="p-4 text-foreground-muted">{m.switch_rstp_disabled()}</p>
			{:else}
				<div class="flex gap-6 px-3 py-2 text-sm text-foreground-muted">
					<span>{m.switch_rstp_root()}: <span class="font-mono text-foreground">{detail.rstp.rootBridge}</span></span>
					<span>{m.switch_rstp_priority()}: <span class="text-foreground">{detail.rstp.bridgePriority}</span></span>
				</div>
				<table class="w-full text-sm">
					<thead class="bg-surface text-left text-foreground-muted">
						<tr>
							<th class="px-3 py-2 font-medium">{m.col_port()}</th>
							<th class="px-3 py-2 font-medium">{m.col_role()}</th>
							<th class="px-3 py-2 font-medium">{m.col_state()}</th>
							<th class="px-3 py-2 text-right font-medium">{m.col_cost()}</th>
						</tr>
					</thead>
					<tbody>
						{#each detail.rstp.ports as p (p.port)}
							<tr class="border-t border-border">
								<td class="px-3 py-1.5 tabular-nums">{p.port}</td>
								<td class="px-3 py-1.5">{stpRoleLabel[p.role]}</td>
								<td class="px-3 py-1.5">{stpStateLabel[p.state]}</td>
								<td class="px-3 py-1.5 text-right tabular-nums">{p.pathCost}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</Panel>

		<!-- Link aggregation -->
		<Panel title={m.switch_section_lag()}>
			{#if detail.linkAggregation.length === 0}
				<p class="p-4 text-foreground-muted">{m.switch_empty()}</p>
			{:else}
				<table class="w-full text-sm">
					<thead class="bg-surface text-left text-foreground-muted">
						<tr>
							<th class="px-3 py-2 font-medium">{m.col_name()}</th>
							<th class="px-3 py-2 font-medium">{m.col_mode()}</th>
							<th class="px-3 py-2 font-medium">{m.col_members()}</th>
						</tr>
					</thead>
					<tbody>
						{#each detail.linkAggregation as lag (lag.id)}
							<tr class="border-t border-border">
								<td class="px-3 py-1.5">{lag.name}</td>
								<td class="px-3 py-1.5">{lagModeLabel[lag.mode]}</td>
								<td class="px-3 py-1.5 font-mono">{portList(lag.memberPorts)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</Panel>

		<!-- IGMP snooping -->
		<Panel title={m.switch_section_igmp()}>
			{#if !detail.igmpSnooping?.enabled}
				<p class="p-4 text-foreground-muted">{m.switch_igmp_disabled()}</p>
			{:else}
				<div class="px-3 py-2 text-sm text-foreground-muted">
					{m.switch_igmp_querier()}: <span class="text-foreground">{detail.igmpSnooping.querierIntervalSeconds}s</span>
				</div>
				<table class="w-full text-sm">
					<thead class="bg-surface text-left text-foreground-muted">
						<tr>
							<th class="px-3 py-2 font-medium">{m.col_group()}</th>
							<th class="px-3 py-2 font-medium">{m.col_vlan()}</th>
							<th class="px-3 py-2 font-medium">{m.col_ports()}</th>
						</tr>
					</thead>
					<tbody>
						{#each detail.igmpSnooping.groups as g (g.groupAddress + g.vlan)}
							<tr class="border-t border-border">
								<td class="px-3 py-1.5 font-mono">{g.groupAddress}</td>
								<td class="px-3 py-1.5 tabular-nums">{g.vlan}</td>
								<td class="px-3 py-1.5 font-mono">{portList(g.ports)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</Panel>

		<!-- Storm control -->
		<Panel title={m.switch_section_storm()}>
			{#if detail.stormControl.length === 0}
				<p class="p-4 text-foreground-muted">{m.switch_empty()}</p>
			{:else}
				<table class="w-full text-sm">
					<thead class="bg-surface text-left text-foreground-muted">
						<tr>
							<th class="px-3 py-2 font-medium">{m.col_port()}</th>
							<th class="px-3 py-2 text-right font-medium">{m.col_broadcast()}</th>
							<th class="px-3 py-2 text-right font-medium">{m.col_multicast()}</th>
							<th class="px-3 py-2 text-right font-medium">{m.col_unknown_unicast()}</th>
						</tr>
					</thead>
					<tbody>
						{#each detail.stormControl as s (s.port)}
							<tr class="border-t border-border">
								<td class="px-3 py-1.5 tabular-nums">{s.port}</td>
								<td class="px-3 py-1.5 text-right tabular-nums">{s.broadcastPps || "—"}</td>
								<td class="px-3 py-1.5 text-right tabular-nums">{s.multicastPps || "—"}</td>
								<td class="px-3 py-1.5 text-right tabular-nums">{s.unknownUnicastPps || "—"}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</Panel>

		<!-- QoS -->
		<Panel title={m.switch_section_qos()}>
			<div class="px-3 py-2 text-sm text-foreground-muted">
				{m.col_mode()}: <span class="text-foreground">{qosSchedulerLabel[detail.qos?.scheduler ?? 0]}</span>
			</div>
			<table class="w-full text-sm">
				<thead class="bg-surface text-left text-foreground-muted">
					<tr>
						<th class="px-3 py-2 font-medium">{m.col_port()}</th>
						<th class="px-3 py-2 font-medium">{m.col_trust()}</th>
						<th class="px-3 py-2 text-right font-medium">{m.col_priority()}</th>
					</tr>
				</thead>
				<tbody>
					{#each detail.qos?.ports ?? [] as q (q.port)}
						<tr class="border-t border-border">
							<td class="px-3 py-1.5 tabular-nums">{q.port}</td>
							<td class="px-3 py-1.5">{qosTrustLabel[q.trust]}</td>
							<td class="px-3 py-1.5 text-right tabular-nums">{q.defaultPriority}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</Panel>

		<!-- Port mirroring -->
		<Panel title={m.switch_section_mirror()}>
			{#if detail.mirrorSessions.length === 0}
				<p class="p-4 text-foreground-muted">{m.switch_empty()}</p>
			{:else}
				<table class="w-full text-sm">
					<thead class="bg-surface text-left text-foreground-muted">
						<tr>
							<th class="px-3 py-2 font-medium">#</th>
							<th class="px-3 py-2 font-medium">{m.col_direction()}</th>
							<th class="px-3 py-2 font-medium">{m.col_source()}</th>
							<th class="px-3 py-2 font-medium">{m.col_destination()}</th>
						</tr>
					</thead>
					<tbody>
						{#each detail.mirrorSessions as ms (ms.id)}
							<tr class="border-t border-border">
								<td class="px-3 py-1.5 tabular-nums">{ms.id}</td>
								<td class="px-3 py-1.5">{mirrorDirectionLabel[ms.direction]}</td>
								<td class="px-3 py-1.5 font-mono">{portList(ms.sourcePorts)}</td>
								<td class="px-3 py-1.5 font-mono">{ms.destinationPort}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</Panel>

		<!-- ACLs -->
		<Panel title={m.switch_section_acl()}>
			{#if detail.aclRules.length === 0}
				<p class="p-4 text-foreground-muted">{m.switch_empty()}</p>
			{:else}
				<table class="w-full text-sm">
					<thead class="bg-surface text-left text-foreground-muted">
						<tr>
							<th class="px-3 py-2 text-right font-medium">{m.col_priority()}</th>
							<th class="px-3 py-2 font-medium">{m.col_type()}</th>
							<th class="px-3 py-2 font-medium">{m.col_action()}</th>
							<th class="px-3 py-2 font-medium">{m.col_match()}</th>
						</tr>
					</thead>
					<tbody>
						{#each detail.aclRules as rule (rule.id)}
							<tr class="border-t border-border">
								<td class="px-3 py-1.5 text-right tabular-nums">{rule.priority}</td>
								<td class="px-3 py-1.5">{aclTypeLabel[rule.type]}</td>
								<td class="px-3 py-1.5">
									<Badge variant={aclActionLabel[rule.action] === "Permit" ? "ok" : "error"}>
										{aclActionLabel[rule.action]}
									</Badge>
								</td>
								<td class="px-3 py-1.5 font-mono text-xs">{rule.match}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</Panel>

		<!-- ERPS -->
		<Panel title={m.switch_section_erps()}>
			{#if detail.erpsRings.length === 0}
				<p class="p-4 text-foreground-muted">{m.switch_empty()}</p>
			{:else}
				<table class="w-full text-sm">
					<thead class="bg-surface text-left text-foreground-muted">
						<tr>
							<th class="px-3 py-2 font-medium">#</th>
							<th class="px-3 py-2 font-medium">{m.col_state()}</th>
							<th class="px-3 py-2 font-medium">{m.col_ports()}</th>
							<th class="px-3 py-2 font-medium">{m.col_vlan()}</th>
							<th class="px-3 py-2 font-medium">{m.col_blocked()}</th>
						</tr>
					</thead>
					<tbody>
						{#each detail.erpsRings as ring (ring.id)}
							<tr class="border-t border-border">
								<td class="px-3 py-1.5 tabular-nums">{ring.id}</td>
								<td class="px-3 py-1.5">{erpsStateLabel[ring.state]}</td>
								<td class="px-3 py-1.5 font-mono">{ring.port0}, {ring.port1}</td>
								<td class="px-3 py-1.5 tabular-nums">{ring.controlVlan}</td>
								<td class="px-3 py-1.5 tabular-nums">{ring.blockedPort}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</Panel>

		<!-- 802.1X -->
		<Panel title={m.switch_section_dot1x()}>
			{#if !detail.dot1x?.enabled}
				<p class="p-4 text-foreground-muted">{m.switch_dot1x_disabled()}</p>
			{:else}
				<div class="px-3 py-2 text-sm text-foreground-muted">
					{m.switch_dot1x_radius()}: <span class="font-mono text-foreground">{detail.dot1x.radiusServer}</span>
				</div>
				<table class="w-full text-sm">
					<thead class="bg-surface text-left text-foreground-muted">
						<tr>
							<th class="px-3 py-2 font-medium">{m.col_port()}</th>
							<th class="px-3 py-2 font-medium">{m.col_state()}</th>
							<th class="px-3 py-2 font-medium">{m.col_authenticated()}</th>
						</tr>
					</thead>
					<tbody>
						{#each detail.dot1x.ports as p (p.port)}
							<tr class="border-t border-border">
								<td class="px-3 py-1.5 tabular-nums">{p.port}</td>
								<td class="px-3 py-1.5">{dot1xStateLabel[p.state]}</td>
								<td class="px-3 py-1.5">
									<Badge variant={p.authenticated ? "ok" : "muted"}>
										{p.authenticated ? m.label_yes() : m.label_no()}
									</Badge>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</Panel>

		<!-- SNMP -->
		<Panel title={m.switch_section_snmp()}>
			{#if !detail.snmp?.enabled}
				<p class="p-4 text-foreground-muted">{m.switch_snmp_disabled()}</p>
			{:else}
				<div class="grid gap-1 px-3 py-2 text-sm text-foreground-muted">
					<span>{detail.snmp.location}</span>
					<span class="font-mono">{detail.snmp.contact}</span>
				</div>
				<div class="px-3 py-2 text-xs font-medium text-foreground-muted">{m.switch_snmp_communities()}</div>
				<table class="w-full text-sm">
					<thead class="bg-surface text-left text-foreground-muted">
						<tr>
							<th class="px-3 py-2 font-medium">{m.col_community()}</th>
							<th class="px-3 py-2 font-medium">{m.col_access()}</th>
						</tr>
					</thead>
					<tbody>
						{#each detail.snmp.communities as c (c.community)}
							<tr class="border-t border-border">
								<td class="px-3 py-1.5 font-mono">{c.community}</td>
								<td class="px-3 py-1.5">{snmpAccessLabel[c.access]}</td>
							</tr>
						{/each}
					</tbody>
				</table>
				{#if detail.snmp.v3Users.length > 0}
					<div class="px-3 py-2 text-xs font-medium text-foreground-muted">{m.switch_snmp_v3()}</div>
					<table class="w-full text-sm">
						<thead class="bg-surface text-left text-foreground-muted">
							<tr>
								<th class="px-3 py-2 font-medium">{m.col_user()}</th>
								<th class="px-3 py-2 font-medium">{m.col_level()}</th>
								<th class="px-3 py-2 font-medium">{m.col_auth()}</th>
								<th class="px-3 py-2 font-medium">{m.col_priv()}</th>
							</tr>
						</thead>
						<tbody>
							{#each detail.snmp.v3Users as u (u.name)}
								<tr class="border-t border-border">
									<td class="px-3 py-1.5">{u.name}</td>
									<td class="px-3 py-1.5">{snmpLevelLabel[u.level]}</td>
									<td class="px-3 py-1.5">{u.authProtocol || "—"}</td>
									<td class="px-3 py-1.5">{u.privProtocol || "—"}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			{/if}
		</Panel>
		{/if}

		{#if !switchManagement && metrics.length === 0 && !powerControl}
			<p class="text-foreground-muted">{m.node_detail_no_detail()}</p>
		{/if}
	</div>
{:else}
	<p class="text-foreground-muted">{m.node_detail_loading()}</p>
{/if}
