<script lang="ts">
import type { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { openSerial, type SerialSession } from "$lib/data/serial";

interface Props {
	/** Node whose serial console to attach. Omit for a local design-mode echo. */
	nodeId?: string;
	class?: string;
}

let { nodeId, class: className }: Props = $props();

let host = $state<HTMLDivElement>();
let term: Terminal | undefined;
let session: SerialSession | null = null;

const encoder = new TextEncoder();

// A dark console reads as a terminal in both app themes; the surrounding panel
// chrome already adapts to light/dark.
const theme = {
	background: "#0b0f17",
	foreground: "#cdd6e6",
	cursor: "#7aa2f7",
	selectionBackground: "#28324a",
};

/**
 * Route a string of input to the device over serial. With no session (no node
 * or no transport) we echo locally so the panel stays interactive for layout
 * work; with a session the device echoes the bytes back on `serial.<id>.out`.
 */
function sendInput(data: string): void {
	if (session) {
		session.send(encoder.encode(data));
	} else if (term) {
		term.write(data === "\r" ? "\r\n$ " : data);
	}
}

/** Feed a key token from the on-screen keyboard into the console. */
export function type(token: string): void {
	switch (token) {
		case "Enter":
			sendInput("\r");
			break;
		case "Backspace":
			sendInput("\x7f");
			break;
		case "Tab":
			sendInput("\t");
			break;
		default:
			// Forward only printable single characters; ignore F-keys, arrows and
			// modifiers (named multi-character tokens) for now.
			if ([...token].length === 1 && token >= " ") sendInput(token);
	}
}

$effect(() => {
	const el = host;
	const node = nodeId;
	if (!el) return;

	let disposed = false;
	let observer: ResizeObserver | undefined;

	void (async () => {
		// Browser-only libraries: import lazily so they never touch the SSR/build
		// graph (the app is a client-only SPA).
		const [{ Terminal: XTerm }, { FitAddon }] = await Promise.all([
			import("@xterm/xterm"),
			import("@xterm/addon-fit"),
		]);
		if (disposed) return;

		const instance = new XTerm({
			convertEol: true,
			cursorBlink: true,
			fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace',
			fontSize: 13,
			theme,
		});
		const fit = new FitAddon();
		instance.loadAddon(fit);
		instance.open(el);
		fit.fit();
		term = instance;

		// Direct typing in the terminal goes to the device too.
		instance.onData(sendInput);

		// Attach the serial stream when a node is selected and connected.
		session = node ? openSerial(node, (bytes) => instance.write(bytes)) : null;
		if (!session) {
			instance.writeln("Kyanite serial console");
			instance.writeln("\x1b[2mnot connected — stream will attach here\x1b[0m");
			instance.write("\r\n$ ");
		}

		observer = new ResizeObserver(() => fit.fit());
		observer.observe(el);
	})();

	return () => {
		disposed = true;
		observer?.disconnect();
		session?.close();
		session = null;
		term?.dispose();
		term = undefined;
	};
});
</script>

<div bind:this={host} class={className}></div>
