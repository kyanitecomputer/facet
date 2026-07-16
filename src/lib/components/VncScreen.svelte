<script lang="ts">
import MonitorIcon from "@lucide/svelte/icons/monitor";
import type { RFBOptions } from "@novnc/novnc";
import { m } from "$lib/paraglide/messages.js";

interface Props {
	/** WebSocket URL of the VNC/websockify endpoint. Omit to stay disconnected. */
	url?: string;
	options?: RFBOptions;
	class?: string;
}

let { url, options, class: className }: Props = $props();

type Status = "disconnected" | "connecting" | "connected" | "error";
let status = $state<Status>("disconnected");
let host = $state<HTMLDivElement>();

$effect(() => {
	const el = host;
	// No endpoint yet: the real data connection is wired up in a later step.
	// The RFB session is only created once a `url` is provided.
	if (!el || !url) {
		status = "disconnected";
		return;
	}

	let disposed = false;
	let rfb: import("@novnc/novnc").default | undefined;

	void (async () => {
		const { default: RFB } = await import("@novnc/novnc");
		if (disposed) return;
		status = "connecting";
		rfb = new RFB(el, url, options);
		rfb.scaleViewport = true;
		rfb.background = "transparent";
		rfb.addEventListener("connect", () => {
			status = "connected";
		});
		rfb.addEventListener("disconnect", () => {
			status = "disconnected";
		});
		rfb.addEventListener("securityfailure", () => {
			status = "error";
		});
	})();

	return () => {
		disposed = true;
		rfb?.disconnect();
		rfb = undefined;
	};
});
</script>

<div class="relative h-full w-full bg-[oklch(0.16_0.02_264)] {className}">
	<!-- noVNC mounts its canvas here once a session is created. -->
	<div bind:this={host} class="h-full w-full"></div>

	{#if status !== "connected"}
		<div
			class="absolute inset-0 grid place-items-center text-foreground-muted"
		>
			<div class="flex flex-col items-center gap-2">
				<MonitorIcon class="size-10 opacity-60" aria-hidden="true" />
				<p class="text-sm">
					{status === "connecting" ? m.remote_connecting() : m.remote_no_signal()}
				</p>
				<p class="font-mono text-xs opacity-70">1920 × 1080 · 60 Hz</p>
			</div>
		</div>
	{/if}
</div>
