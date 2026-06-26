<script lang="ts">
import PageHeader from "$lib/components/PageHeader.svelte";
import { Badge, type BadgeVariant } from "$lib/components/ui";
import { m } from "$lib/paraglide/messages.js";

type Severity = "info" | "warn" | "error";

interface LogEntry {
	time: string;
	severity: Severity;
	source: string;
	message: string;
}

const severityVariant: Record<Severity, BadgeVariant> = {
	info: "default",
	warn: "warn",
	error: "error",
};

// Stub event stream for layout work.
const entries: LogEntry[] = [
	{
		time: "12:04:51",
		severity: "info",
		source: "spine-1",
		message: "Port et-0/0/3 link up (10Gbps)",
	},
	{
		time: "12:04:48",
		severity: "warn",
		source: "spine-1",
		message: "CRC errors detected on et-0/0/7 (3/min)",
	},
	{
		time: "12:03:12",
		severity: "info",
		source: "bmc-7",
		message: "Power state transition: S5 -> S0",
	},
	{
		time: "12:02:59",
		severity: "error",
		source: "rmc-1",
		message: "Sensor inlet-temp read timeout, retrying",
	},
	{
		time: "12:01:33",
		severity: "info",
		source: "bmc-7",
		message: "Firmware image verified (sha256 ok)",
	},
	{
		time: "11:58:07",
		severity: "warn",
		source: "rmc-1",
		message: "Fan 2 below expected RPM threshold",
	},
	{
		time: "11:55:41",
		severity: "info",
		source: "spine-1",
		message: "BGP session 10.0.0.2 established",
	},
	{
		time: "11:51:20",
		severity: "info",
		source: "admin",
		message: "User signed in from 10.2.4.18",
	},
];

let filter = $state<Severity | "all">("all");
const filters: Array<Severity | "all"> = ["all", "info", "warn", "error"];

const visible = $derived(
	filter === "all" ? entries : entries.filter((e) => e.severity === filter),
);
</script>

<svelte:head>
	<title>{m.app_name()} · {m.logs_title()}</title>
</svelte:head>

<PageHeader title={m.logs_title()} subtitle={m.logs_subtitle()} />

<div class="mb-4 flex flex-wrap gap-2">
	{#each filters as level (level)}
		<button
			type="button"
			onclick={() => {
				filter = level;
			}}
			aria-pressed={filter === level}
			class="rounded-full border border-border px-3 py-1 text-xs font-medium capitalize transition-colors hover:bg-surface-muted aria-[pressed=true]:border-transparent aria-[pressed=true]:bg-accent aria-[pressed=true]:text-accent-foreground"
		>
			{level}
		</button>
	{/each}
</div>

<div class="overflow-hidden rounded-lg border border-border">
	<table class="w-full text-sm">
		<thead class="bg-surface-muted text-left text-foreground-muted">
			<tr>
				<th class="px-4 py-2 font-medium">{m.logs_col_time()}</th>
				<th class="px-4 py-2 font-medium">{m.logs_col_severity()}</th>
				<th class="px-4 py-2 font-medium">{m.logs_col_source()}</th>
				<th class="px-4 py-2 font-medium">{m.logs_col_message()}</th>
			</tr>
		</thead>
		<tbody>
			{#each visible as entry (entry.time + entry.message)}
				<tr class="border-t border-border">
					<td class="whitespace-nowrap px-4 py-2 font-mono text-xs tabular-nums text-foreground-muted">
						{entry.time}
					</td>
					<td class="px-4 py-2">
						<Badge variant={severityVariant[entry.severity]}>{entry.severity}</Badge>
					</td>
					<td class="whitespace-nowrap px-4 py-2 font-mono text-xs">{entry.source}</td>
					<td class="px-4 py-2">{entry.message}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
