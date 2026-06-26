<script lang="ts">
import { goto } from "$app/navigation";
import LanguageSwitcher from "$lib/components/LanguageSwitcher.svelte";
import ThemeToggle from "$lib/components/ThemeToggle.svelte";
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "$lib/components/ui";
import { signIn } from "$lib/connection";
import { m } from "$lib/paraglide/messages.js";

let username = $state("");
let password = $state("");
let error = $state<string | null>(null);
let submitting = $state(false);

async function onsubmit(event: SubmitEvent) {
	event.preventDefault();
	submitting = true;
	error = null;

	// signIn bootstraps the auth client (idempotent), authenticates, and opens
	// the backend with the minted access token.
	const result = await signIn({ username, password });
	if (result.ok) {
		await goto("/");
		return;
	}

	error =
		result.error === "auth_unavailable"
			? m.login_unavailable()
			: m.login_error();
	submitting = false;
}
</script>

<svelte:head>
	<title>{m.app_name()} · {m.login_title()}</title>
</svelte:head>

<div class="grid min-h-screen place-items-center bg-surface-muted px-4">
	<Card class="w-full max-w-sm bg-surface">
		<CardHeader>
			<div class="flex items-center justify-between gap-2">
				<div class="flex items-center gap-2">
					<span class="grid size-8 place-items-center rounded bg-accent font-bold text-accent-foreground">
						F
					</span>
					<CardTitle>{m.login_title()}</CardTitle>
				</div>
				<div class="flex items-center gap-1">
					<LanguageSwitcher />
					<ThemeToggle />
				</div>
			</div>
			<p class="mt-1 text-sm text-foreground-muted">{m.login_subtitle()}</p>
		</CardHeader>
		<CardContent>
			<form class="flex flex-col gap-4" {onsubmit}>
				<div class="flex flex-col gap-1.5">
					<label for="username" class="text-sm font-medium">
						{m.login_username()}
					</label>
					<input
						id="username"
						name="username"
						autocomplete="username"
						required
						bind:value={username}
						class="rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
					/>
				</div>

				<div class="flex flex-col gap-1.5">
					<label for="password" class="text-sm font-medium">
						{m.login_password()}
					</label>
					<input
						id="password"
						name="password"
						type="password"
						autocomplete="current-password"
						required
						bind:value={password}
						class="rounded-md border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
					/>
				</div>

				{#if error}
					<p class="text-sm text-error" role="alert">{error}</p>
				{/if}

				<Button type="submit" disabled={submitting}>
					{m.login_submit()}
				</Button>

				<p class="text-center text-xs text-foreground-muted">{m.login_hint()}</p>
			</form>
		</CardContent>
	</Card>
</div>
