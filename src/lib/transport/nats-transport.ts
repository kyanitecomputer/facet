/**
 * nats-transport.ts — NATS adapter for the transport port.
 *
 * Wraps an active `NatsConnection` (managed by src/lib/nats.svelte.ts) and
 * exposes it through the byte-oriented `TransportPort` contract. This is the
 * default and, for now, only adapter; the ConnectRPC adapter is deferred until
 * the NATS-only path has been benchmarked.
 */

import type { NatsConnection } from "@nats-io/nats-core";
import type { RequestOptions, Subscription, TransportPort } from "./port";

const DEFAULT_REQUEST_TIMEOUT_MS = 5000;

export class NatsTransport implements TransportPort {
	readonly kind = "nats" as const;

	constructor(private readonly nc: NatsConnection) {}

	async request(
		subject: string,
		payload: Uint8Array,
		opts: RequestOptions = {},
	): Promise<Uint8Array> {
		const reply = await this.nc.request(subject, payload, {
			timeout: opts.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
		});
		return reply.data;
	}

	subscribe(
		subject: string,
		onMessage: (payload: Uint8Array) => void,
	): Subscription {
		const sub = this.nc.subscribe(subject);
		void (async () => {
			for await (const msg of sub) {
				onMessage(msg.data);
			}
		})();
		return { unsubscribe: () => sub.unsubscribe() };
	}

	publish(subject: string, payload: Uint8Array): void {
		this.nc.publish(subject, payload);
	}
}
