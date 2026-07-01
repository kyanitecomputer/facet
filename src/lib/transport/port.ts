/**
 * port.ts — the single typed transport port.
 *
 * Per facet-architecture.md, the frontend talks to the backend through one
 * transport port with pluggable adapters, selected by capability/topology
 * rather than an operator toggle:
 *
 *   - NATS adapter (over WebSocket) — pub/sub, request/reply, JetStream. The
 *     only adapter implemented for now; we benchmark the NATS-only path first.
 *   - ConnectRPC adapter — unary + server-streaming over HTTP. Deliberately
 *     deferred until the NATS path is measured.
 *
 * Payloads are raw protobuf bytes; typed encode/decode and protovalidate live
 * one layer up (see src/lib/proto/). Keeping the port byte-oriented lets both
 * adapters share the exact same wire contract.
 */

export type TransportKind = "nats" | "connect";

export interface RequestOptions {
	/** Reply timeout in milliseconds. */
	timeoutMs?: number;
}

/** Handle returned by `subscribe`; call `unsubscribe` to stop the stream. */
export interface Subscription {
	unsubscribe(): void;
}

export interface TransportPort {
	/** Which adapter backs this port. */
	readonly kind: TransportKind;

	/** Request/reply: send `payload` to `subject` and await a single reply. */
	request(
		subject: string,
		payload: Uint8Array,
		opts?: RequestOptions,
	): Promise<Uint8Array>;

	/** Subscribe to `subject`, invoking `onMessage` for each received payload. */
	subscribe(
		subject: string,
		onMessage: (payload: Uint8Array) => void,
	): Subscription;

	/** Fire-and-forget publish of `payload` to `subject`. */
	publish(subject: string, payload: Uint8Array): void;
}
