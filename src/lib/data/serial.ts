/**
 * serial.ts — per-node serial console session over the transport port.
 *
 * Serial runs over NATS (not a second WebSocket): the byte-oriented
 * `TransportPort` subscribes to `serial.<nodeId>.out` for device output and
 * publishes keystrokes to `serial.<nodeId>.in`. Payloads are raw UART bytes —
 * no protobuf — so there is no per-keystroke encode/decode.
 *
 * The transport is injectable so the session can be unit-tested against a
 * `MockTransport` without a live connection.
 */

import { getTransport } from "$lib/nats.svelte";
import type { TransportPort } from "$lib/transport/port";
import { serialSubjects } from "$lib/transport/subjects";

export interface SerialSession {
	/** Send raw bytes to the node's serial input (browser → device). */
	send(data: Uint8Array): void;
	/** Stop receiving and release the subscription. */
	close(): void;
}

/**
 * Open a serial session for `nodeId`, delivering device output to `onData`.
 * Returns null when no transport is connected (e.g. design-mode placeholder).
 */
export function openSerial(
	nodeId: string,
	onData: (bytes: Uint8Array) => void,
	transport: TransportPort | null = getTransport(),
): SerialSession | null {
	if (!transport) return null;

	const subjects = serialSubjects(nodeId);
	const subscription = transport.subscribe(subjects.out, onData);

	return {
		send: (data) => transport.publish(subjects.in, data),
		close: () => subscription.unsubscribe(),
	};
}
