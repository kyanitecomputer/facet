<script lang="ts">
import { Badge, type BadgeVariant } from "$lib/components/ui";
import type { ConnectionStatus } from "$lib/nats.svelte";
import { getStatus } from "$lib/nats.svelte";
import { m } from "$lib/paraglide/messages.js";

const status = $derived(getStatus());

const labels: Record<ConnectionStatus, string> = {
	connected: m.status_connected(),
	connecting: m.status_connecting(),
	disconnected: m.status_disconnected(),
	error: m.status_error(),
};

const variants: Record<ConnectionStatus, BadgeVariant> = {
	connected: "ok",
	connecting: "warn",
	disconnected: "muted",
	error: "error",
};

const dots: Record<ConnectionStatus, string> = {
	connected: "bg-ok",
	connecting: "bg-warn animate-pulse",
	disconnected: "bg-foreground-muted",
	error: "bg-error",
};
</script>

<Badge variant={variants[status]}>
	<span class="size-2 rounded-full {dots[status]}" aria-hidden="true"></span>
	{m.connection_label()}: {labels[status]}
</Badge>
