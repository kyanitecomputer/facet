<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/state";
import { isAuthenticated } from "$lib/auth/auth.svelte";
import Sidebar from "$lib/components/Sidebar.svelte";
import { restoreSession } from "$lib/connection";
// Side-effect import: installs the reactive, no-reload locale override before
// any message is rendered.
import "$lib/i18n.svelte";
import { getLocale, getTextDirection } from "$lib/paraglide/runtime";
import "../app.css";

let { children } = $props();

const authed = $derived(isAuthenticated());
const onLoginRoute = $derived(page.url.pathname === "/login");

// True until the boot-time session restore resolves, so the gate doesn't flash
// the login page before a valid HttpOnly cookie has had a chance to restore.
let booting = $state(true);

// There is no server to render the <html> shell in SPA mode, so keep the
// document language and text direction in sync with the active locale
// client-side. This also keeps RTL-ready and CJK layouts correct.
$effect(() => {
	const locale = getLocale();
	document.documentElement.lang = locale;
	document.documentElement.dir = getTextDirection(locale);
});

// Restore any existing session once on app load (cookie-authed), then connect.
$effect(() => {
	void restoreSession().finally(() => {
		booting = false;
	});
});

// Auth gate (UX only — real protection is the API requiring a valid token):
// keep unauthenticated users on /login, signed-in users off it.
$effect(() => {
	if (booting) return;
	if (!authed && !onLoginRoute) {
		void goto("/login");
	} else if (authed && onLoginRoute) {
		void goto("/");
	}
});
</script>

{#if booting}
	<div class="grid h-screen w-screen place-items-center bg-surface-muted"></div>
{:else if onLoginRoute}
	{@render children()}
{:else if authed}
	<div class="flex h-screen w-screen overflow-hidden">
		<Sidebar />
		<main class="flex-1 overflow-y-auto px-8 py-6">
			{@render children()}
		</main>
	</div>
{:else}
	<div class="grid h-screen w-screen place-items-center bg-surface-muted"></div>
{/if}
