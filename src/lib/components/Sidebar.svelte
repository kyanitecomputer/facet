<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/state";
import { getSession } from "$lib/auth/auth.svelte";
import LanguageSwitcher from "$lib/components/LanguageSwitcher.svelte";
import StatusBadge from "$lib/components/StatusBadge.svelte";
import ThemeToggle from "$lib/components/ThemeToggle.svelte";
import { Button } from "$lib/components/ui";
import { signOut as disconnectSession } from "$lib/connection";
import { getMockScenarioName } from "$lib/nats.svelte";
import { navSections } from "$lib/nav";
import { m } from "$lib/paraglide/messages.js";

function isActive(href: string): boolean {
	const path = page.url.pathname;
	return href === "/" ? path === "/" : path.startsWith(href);
}

// Surfaced only when the in-process mock backend is active (dev/test), so a
// developer can see which scenario is live.
const mockScenario = $derived(getMockScenarioName());
const user = $derived(getSession());

async function signOut(): Promise<void> {
	await disconnectSession();
	await goto("/login");
}
</script>

<aside
	class="flex w-60 shrink-0 flex-col border-r border-border bg-surface-muted"
	aria-label={m.app_name()}
>
	<div class="flex items-center gap-2 px-5 py-4">
		<span class="grid size-8 place-items-center rounded bg-accent text-accent-foreground font-bold">
			F
		</span>
		<span class="text-lg font-semibold">{m.app_name()}</span>
	</div>

	<nav class="flex-1 overflow-y-auto px-3 py-2">
		{#each navSections as section (section.labelKey)}
			<p class="px-2 pb-2 pt-3 text-xs font-medium uppercase tracking-wide text-foreground-muted first:pt-0">
				{m[section.labelKey]()}
			</p>
			<ul class="flex flex-col gap-1">
				{#each section.items as item (item.href)}
					{@const Icon = item.icon}
					<li>
						<a
							href={item.href}
							aria-current={isActive(item.href) ? "page" : undefined}
							class="flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-surface aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
						>
							<Icon class="size-5" aria-hidden="true" />
							<span>{m[item.labelKey]()}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/each}
	</nav>

	<div class="flex flex-col gap-2 border-t border-border px-5 py-4">
		<StatusBadge />
		<div class="flex items-center justify-between gap-2">
			<LanguageSwitcher />
			<ThemeToggle />
		</div>
		{#if mockScenario}
			<p class="text-xs text-foreground-muted">
				{m.mock_scenario_label()}: <span class="font-mono">{mockScenario}</span>
			</p>
		{/if}
		{#if user}
			<div class="flex items-center justify-between gap-2 pt-1">
				<span class="truncate text-sm font-medium">{user.username}</span>
				<Button variant="ghost" size="sm" onclick={signOut}>
					{m.user_signout()}
				</Button>
			</div>
		{/if}
	</div>
</aside>
