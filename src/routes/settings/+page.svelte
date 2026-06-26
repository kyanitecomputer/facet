<script lang="ts">
import { timestampDate } from "@bufbuild/protobuf/wkt";
import { UserRole } from "@kyanite/schema/schema/v1/auth_pb";
import { AddressMode } from "@kyanite/schema/schema/v1/settings_pb";
import Trash2 from "@lucide/svelte/icons/trash-2";
import LanguageSwitcher from "$lib/components/LanguageSwitcher.svelte";
import PageHeader from "$lib/components/PageHeader.svelte";
import Panel from "$lib/components/Panel.svelte";
import { Badge, Button } from "$lib/components/ui";
import {
	createUser,
	deleteUser,
	getSettings,
	getUsers,
	loadSettings,
	loadUsers,
	setNetworkSettings,
	setServiceSettings,
	setTimeSettings,
	setUserRole,
} from "$lib/data/settings.svelte";
import { m } from "$lib/paraglide/messages.js";
import { runningInTauri } from "$lib/tauri";
import { telemetryEnabled } from "$lib/telemetry/otel";

const settings = $derived(getSettings());
const users = $derived(getUsers());

const roleLabel: Record<UserRole, string> = {
	[UserRole.UNSPECIFIED]: m.role_unknown(),
	[UserRole.READ_ONLY]: m.role_readonly(),
	[UserRole.OPERATOR]: m.role_operator(),
	[UserRole.ADMIN]: m.role_admin(),
};

const roleOptions = [UserRole.READ_ONLY, UserRole.OPERATOR, UserRole.ADMIN];

// New-user form.
let newUsername = $state("");
let newPassword = $state("");
let newRole = $state<UserRole>(UserRole.READ_ONLY);

// Editable section forms, seeded once from the loaded settings. Kept separate
// from the authoritative store so a save round-trips through the transport and
// re-adopts the server's normalized state.
interface TimeForm {
	ntpEnabled: boolean;
	ntpServers: string;
	timezone: string;
}
interface NetworkForm {
	mode: AddressMode;
	ipAddress: string;
	gateway: string;
	dnsServers: string;
	hostname: string;
}
interface ServiceForm {
	sshEnabled: boolean;
	sshPort: number;
	snmpEnabled: boolean;
	httpEnabled: boolean;
}
let timeForm = $state<TimeForm>();
let networkForm = $state<NetworkForm>();
let serviceForm = $state<ServiceForm>();

$effect(() => {
	void loadSettings();
	void loadUsers();
});

// Seed the editable forms the first time settings arrive (guarded so an
// unrelated settings refresh does not clobber in-progress edits).
$effect(() => {
	const s = settings;
	if (!s) return;
	if (!timeForm && s.time) {
		timeForm = {
			ntpEnabled: s.time.ntpEnabled,
			ntpServers: s.time.ntpServers.join(", "),
			timezone: s.time.timezone,
		};
	}
	if (!networkForm && s.network) {
		networkForm = {
			mode: s.network.mode,
			ipAddress: s.network.ipAddress,
			gateway: s.network.gateway,
			dnsServers: s.network.dnsServers.join(", "),
			hostname: s.network.hostname,
		};
	}
	if (!serviceForm && s.services) {
		serviceForm = {
			sshEnabled: s.services.sshEnabled,
			sshPort: s.services.sshPort,
			snmpEnabled: s.services.snmpEnabled,
			httpEnabled: s.services.httpEnabled,
		};
	}
});

function splitList(value: string): string[] {
	return value
		.split(",")
		.map((v) => v.trim())
		.filter((v) => v.length > 0);
}

async function submitNewUser(event: SubmitEvent): Promise<void> {
	event.preventDefault();
	if (!newUsername || !newPassword) return;
	await createUser(newUsername, newPassword, newRole);
	newUsername = "";
	newPassword = "";
	newRole = UserRole.READ_ONLY;
}

async function saveTime(event: SubmitEvent): Promise<void> {
	event.preventDefault();
	if (!timeForm) return;
	await setTimeSettings({
		ntpEnabled: timeForm.ntpEnabled,
		ntpServers: splitList(timeForm.ntpServers),
		timezone: timeForm.timezone,
		currentTime: settings?.time?.currentTime,
		synchronized: settings?.time?.synchronized ?? false,
	});
}

async function saveNetwork(event: SubmitEvent): Promise<void> {
	event.preventDefault();
	if (!networkForm) return;
	await setNetworkSettings({
		mode: networkForm.mode,
		ipAddress: networkForm.ipAddress,
		gateway: networkForm.gateway,
		dnsServers: splitList(networkForm.dnsServers),
		hostname: networkForm.hostname,
		macAddress: settings?.network?.macAddress ?? "",
	});
}

async function saveServices(event: SubmitEvent): Promise<void> {
	event.preventDefault();
	if (!serviceForm) return;
	await setServiceSettings({
		sshEnabled: serviceForm.sshEnabled,
		sshPort: serviceForm.sshPort,
		snmpEnabled: serviceForm.snmpEnabled,
		httpEnabled: serviceForm.httpEnabled,
	});
}
</script>

<svelte:head>
	<title>{m.app_name()} · {m.settings_title()}</title>
</svelte:head>

<PageHeader title={m.settings_title()} />

<div class="flex flex-col gap-4">
	<!-- Users & permissions -->
	<Panel title={m.settings_section_users()}>
		<table class="w-full text-sm">
			<thead class="bg-surface text-left text-foreground-muted">
				<tr>
					<th class="px-3 py-2 font-medium">{m.settings_users_username()}</th>
					<th class="px-3 py-2 font-medium">{m.settings_users_role()}</th>
					<th class="px-3 py-2 text-right font-medium">{m.settings_users_col_actions()}</th>
				</tr>
			</thead>
			<tbody>
				{#each users as user (user.username)}
					<tr class="border-t border-border">
						<td class="px-3 py-1.5 font-medium">{user.username}</td>
						<td class="px-3 py-1.5">
							<select
								value={user.role}
								onchange={(e) => setUserRole(user.username, Number(e.currentTarget.value))}
								class="rounded-md border border-border bg-surface px-2 py-1 text-sm"
							>
								{#each roleOptions as role (role)}
									<option value={role}>{roleLabel[role]}</option>
								{/each}
							</select>
						</td>
						<td class="px-3 py-1.5 text-right">
							<Button
								variant="ghost"
								size="icon"
								aria-label={m.settings_users_delete()}
								onclick={() => deleteUser(user.username)}
							>
								<Trash2 class="size-4" aria-hidden="true" />
							</Button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>

		<form class="flex flex-wrap items-end gap-3 border-t border-border p-3" onsubmit={submitNewUser}>
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-foreground-muted">{m.settings_users_username()}</span>
				<input
					bind:value={newUsername}
					required
					class="rounded-md border border-border bg-surface px-2 py-1"
				/>
			</label>
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-foreground-muted">{m.settings_users_password()}</span>
				<input
					type="password"
					bind:value={newPassword}
					required
					class="rounded-md border border-border bg-surface px-2 py-1"
				/>
			</label>
			<label class="flex flex-col gap-1 text-sm">
				<span class="text-foreground-muted">{m.settings_users_role()}</span>
				<select bind:value={newRole} class="rounded-md border border-border bg-surface px-2 py-1">
					{#each roleOptions as role (role)}
						<option value={role}>{roleLabel[role]}</option>
					{/each}
				</select>
			</label>
			<Button type="submit" size="sm">{m.settings_users_create()}</Button>
		</form>
	</Panel>

	<!-- Time -->
	<Panel title={m.settings_section_time()}>
		{#if timeForm}
			<form class="flex flex-col gap-4 p-4" onsubmit={saveTime}>
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" bind:checked={timeForm.ntpEnabled} class="size-4" />
					<span>{m.settings_time_ntp()}</span>
				</label>
				<div class="grid gap-4 sm:grid-cols-2">
					<label class="flex flex-col gap-1 text-sm">
						<span class="text-foreground-muted">{m.settings_time_timezone()}</span>
						<input bind:value={timeForm.timezone} class="rounded-md border border-border bg-surface px-2 py-1" />
					</label>
					<label class="flex flex-col gap-1 text-sm">
						<span class="text-foreground-muted">{m.settings_time_servers()}</span>
						<input bind:value={timeForm.ntpServers} class="rounded-md border border-border bg-surface px-2 py-1 font-mono" />
					</label>
				</div>
				<dl class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
					<div>
						<dt class="text-foreground-muted">{m.settings_time_synced()}</dt>
						<dd>
							<Badge variant={settings?.time?.synchronized ? "ok" : "warn"}>
								{settings?.time?.synchronized ? m.label_yes() : m.label_no()}
							</Badge>
						</dd>
					</div>
					<div class="col-span-2">
						<dt class="text-foreground-muted">{m.settings_time_current()}</dt>
						<dd class="font-mono">
							{settings?.time?.currentTime
								? timestampDate(settings.time.currentTime).toISOString()
								: "—"}
						</dd>
					</div>
				</dl>
				<div>
					<Button type="submit" size="sm">{m.settings_save()}</Button>
				</div>
			</form>
		{/if}
	</Panel>

	<!-- Network -->
	<Panel title={m.settings_section_network()}>
		{#if networkForm}
			<form class="flex flex-col gap-4 p-4" onsubmit={saveNetwork}>
				<div class="grid gap-4 sm:grid-cols-2">
					<label class="flex flex-col gap-1 text-sm">
						<span class="text-foreground-muted">{m.settings_network_hostname()}</span>
						<input bind:value={networkForm.hostname} class="rounded-md border border-border bg-surface px-2 py-1" />
					</label>
					<label class="flex flex-col gap-1 text-sm">
						<span class="text-foreground-muted">{m.settings_network_mode()}</span>
						<select bind:value={networkForm.mode} class="rounded-md border border-border bg-surface px-2 py-1">
							<option value={AddressMode.DHCP}>{m.address_mode_dhcp()}</option>
							<option value={AddressMode.STATIC}>{m.address_mode_static()}</option>
						</select>
					</label>
					<label class="flex flex-col gap-1 text-sm">
						<span class="text-foreground-muted">{m.settings_network_ip()}</span>
						<input
							bind:value={networkForm.ipAddress}
							disabled={networkForm.mode === AddressMode.DHCP}
							class="rounded-md border border-border bg-surface px-2 py-1 font-mono disabled:opacity-50"
						/>
					</label>
					<label class="flex flex-col gap-1 text-sm">
						<span class="text-foreground-muted">{m.settings_network_gateway()}</span>
						<input
							bind:value={networkForm.gateway}
							disabled={networkForm.mode === AddressMode.DHCP}
							class="rounded-md border border-border bg-surface px-2 py-1 font-mono disabled:opacity-50"
						/>
					</label>
					<label class="flex flex-col gap-1 text-sm">
						<span class="text-foreground-muted">{m.settings_network_dns()}</span>
						<input bind:value={networkForm.dnsServers} class="rounded-md border border-border bg-surface px-2 py-1 font-mono" />
					</label>
					<div class="flex flex-col gap-1 text-sm">
						<span class="text-foreground-muted">{m.settings_network_mac()}</span>
						<span class="px-2 py-1 font-mono text-foreground-muted">{settings?.network?.macAddress ?? "—"}</span>
					</div>
				</div>
				<div>
					<Button type="submit" size="sm">{m.settings_save()}</Button>
				</div>
			</form>
		{/if}
	</Panel>

	<!-- Services -->
	<Panel title={m.settings_section_services()}>
		{#if serviceForm}
			<form class="flex flex-col gap-4 p-4" onsubmit={saveServices}>
				<div class="grid gap-4 sm:grid-cols-2">
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" bind:checked={serviceForm.sshEnabled} class="size-4" />
						<span>{m.settings_services_ssh()}</span>
					</label>
					<label class="flex flex-col gap-1 text-sm">
						<span class="text-foreground-muted">{m.settings_services_ssh_port()}</span>
						<input
							type="number"
							bind:value={serviceForm.sshPort}
							min="1"
							max="65535"
							class="w-28 rounded-md border border-border bg-surface px-2 py-1 tabular-nums"
						/>
					</label>
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" bind:checked={serviceForm.snmpEnabled} class="size-4" />
						<span>{m.settings_services_snmp()}</span>
					</label>
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" bind:checked={serviceForm.httpEnabled} class="size-4" />
						<span>{m.settings_services_http()}</span>
					</label>
				</div>
				<div>
					<Button type="submit" size="sm">{m.settings_save()}</Button>
				</div>
			</form>
		{/if}
	</Panel>

	<!-- Appliance -->
	<Panel title={m.nav_section_system()}>
		<div class="flex flex-col gap-6 p-4">
			<div class="flex max-w-xs flex-col gap-2">
				<span class="text-sm font-medium">{m.settings_language()}</span>
				<LanguageSwitcher />
			</div>
			<div class="flex flex-col gap-1">
				<span class="text-sm font-medium">{m.settings_telemetry()}</span>
				<span class="text-foreground-muted">
					{telemetryEnabled() ? m.settings_telemetry_on() : m.settings_telemetry_off()}
				</span>
			</div>
			<div class="flex flex-col gap-1">
				<span class="text-sm font-medium">{m.settings_runtime()}</span>
				<span class="text-foreground-muted">
					{runningInTauri() ? m.runtime_desktop() : m.runtime_browser()}
				</span>
			</div>
		</div>
	</Panel>
</div>
