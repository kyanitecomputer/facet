<script lang="ts">
import type { SerialTarget } from "@kyanite/schema/schema/v1/node_pb";
import Keyboard from "@lucide/svelte/icons/keyboard";
import Maximize from "@lucide/svelte/icons/maximize";
import PageHeader from "$lib/components/PageHeader.svelte";
import Panel from "$lib/components/Panel.svelte";
import SerialConsole from "$lib/components/SerialConsole.svelte";
import { Button } from "$lib/components/ui";
import VirtualKeyboard from "$lib/components/VirtualKeyboard.svelte";
import VncScreen from "$lib/components/VncScreen.svelte";
import { getNodes, loadInventory } from "$lib/data/fabric.svelte";
import { fetchSerialTargets } from "$lib/data/serial-targets";
import { m } from "$lib/paraglide/messages.js";
import { resolveKvmUrl } from "$lib/transport/kvm";

let keyboardOpen = $state(false);

// Bound instance of the serial console; the on-screen keyboard types into it.
let serial = $state<{ type: (token: string) => void }>();

const nodes = $derived(getNodes());
let selectedNodeId = $state<string>();

// Effective target: the user's pick when valid, otherwise the first node.
const activeNodeId = $derived(
	selectedNodeId && nodes.some((n) => n.id === selectedNodeId)
		? selectedNodeId
		: nodes[0]?.id,
);
const activeNode = $derived(nodes.find((n) => n.id === activeNodeId));

// KVM is shown only when the node advertises it (capability-driven): the panel
// is omitted entirely otherwise — no placeholder. A passively-managed device
// like the Vega switch advertises kvm=false, so the subwindow simply isn't there.
const hasKvm = $derived(activeNode?.capabilities?.kvm ?? false);

// Serial endpoints for the active node. A switch points at its own console
// (one target); a BMC exposes several (its shell + the host SOL), so a picker
// appears only when there is a choice.
let serialTargets = $state<SerialTarget[]>([]);
let selectedTargetId = $state<string>();

// Serial is shown only when the node exposes at least one endpoint.
const hasSerial = $derived(serialTargets.length > 0);

const serialEndpoint = $derived(
	selectedTargetId && serialTargets.some((t) => t.id === selectedTargetId)
		? selectedTargetId
		: (serialTargets[0]?.id ?? activeNodeId),
);

// A KVM session opens a remote video stream, so start it on intent rather than
// auto-connecting. The endpoint is same-origin (/kvm/<nodeId>), resolved on
// connect; switching nodes drops the stream until reconnected.
let kvmConnected = $state(false);
const kvmUrl = $derived(
	kvmConnected && hasKvm && activeNodeId
		? resolveKvmUrl(activeNodeId)
		: undefined,
);

// Load the inventory that feeds the node picker, once.
$effect(() => {
	void loadInventory();
});

// Refresh the serial targets whenever the active node changes. The `stale`
// guard drops a slow response when the node changed before it resolved.
$effect(() => {
	const id = activeNodeId;
	if (!id) {
		serialTargets = [];
		return;
	}
	let stale = false;
	void fetchSerialTargets(id).then((t) => {
		if (!stale) serialTargets = t;
	});
	return () => {
		stale = true;
	};
});

function onkey(token: string): void {
	serial?.type(token);
}
</script>

<svelte:head>
	<title>{m.app_name()} · {m.remote_title()}</title>
</svelte:head>

<div class="flex flex-wrap items-start justify-between gap-4">
	<PageHeader title={m.remote_title()} subtitle={m.remote_subtitle()} />
	<div class="flex flex-wrap items-center gap-3">
		<label class="flex items-center gap-2 text-sm">
			<span class="text-foreground-muted">{m.remote_node()}</span>
			<select
				value={activeNodeId}
				onchange={(e) => {
					selectedNodeId = e.currentTarget.value;
					selectedTargetId = undefined;
					kvmConnected = false;
				}}
				disabled={nodes.length === 0}
				class="rounded-md border border-border bg-surface px-2 py-1 text-sm disabled:opacity-50"
			>
				{#if nodes.length === 0}
					<option>{m.remote_no_nodes()}</option>
				{/if}
				{#each nodes as node (node.id)}
					<option value={node.id}>{node.name}</option>
				{/each}
			</select>
		</label>
		{#if serialTargets.length > 1}
			<label class="flex items-center gap-2 text-sm">
				<span class="text-foreground-muted">{m.remote_target()}</span>
				<select
					value={serialEndpoint}
					onchange={(e) => {
						selectedTargetId = e.currentTarget.value;
					}}
					class="rounded-md border border-border bg-surface px-2 py-1 text-sm"
				>
					{#each serialTargets as target (target.id)}
						<option value={target.id}>{target.label}</option>
					{/each}
				</select>
			</label>
		{/if}
		{#if hasSerial}
			<Button
				variant={keyboardOpen ? "default" : "outline"}
				size="sm"
				aria-pressed={keyboardOpen}
				onclick={() => {
					keyboardOpen = !keyboardOpen;
				}}
			>
				<Keyboard class="size-4" aria-hidden="true" />
				{keyboardOpen ? m.remote_keyboard_hide() : m.remote_keyboard_show()}
			</Button>
		{/if}
	</div>
</div>

<!-- Only the subwindows the node advertises are rendered (capability-driven). -->
<div class={hasKvm && hasSerial ? "grid gap-4 xl:grid-cols-3" : "grid gap-4"}>
	{#if hasKvm}
		<Panel title={m.remote_kvm()} class={hasSerial ? "h-[440px] xl:col-span-2" : "h-[440px]"}>
			{#snippet actions()}
				<Button
					variant={kvmConnected ? "default" : "outline"}
					size="sm"
					disabled={!activeNodeId}
					aria-pressed={kvmConnected}
					onclick={() => {
						kvmConnected = !kvmConnected;
					}}
				>
					{kvmConnected ? m.remote_kvm_disconnect() : m.remote_kvm_connect()}
				</Button>
				<Button variant="ghost" size="icon" aria-label="Fullscreen">
					<Maximize class="size-4" aria-hidden="true" />
				</Button>
			{/snippet}
			<VncScreen url={kvmUrl} />
		</Panel>
	{/if}

	{#if hasSerial}
		<Panel title={m.remote_serial()} class="h-[440px]">
			<div class="h-full bg-[#0b0f17] p-2">
				<SerialConsole bind:this={serial} nodeId={serialEndpoint} class="h-full" />
			</div>
		</Panel>
	{/if}
</div>

{#if activeNodeId && !hasKvm && !hasSerial}
	<p class="text-foreground-muted">{m.remote_none()}</p>
{/if}

{#if keyboardOpen && hasSerial}
	<div class="mt-4">
		<VirtualKeyboard {onkey} />
	</div>
{/if}
