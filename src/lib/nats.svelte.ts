/**
 * nats.svelte.ts — reactive NATS WebSocket connection manager.
 *
 * Backend communication for Facet runs over a NATS WebSocket connection. This
 * module exposes a small reactive surface built on Svelte 5 `$state` runes:
 * connection status and a capped live message buffer.
 *
 * This is a skeleton: it connects with an optional token. Authentication
 * (WebAuthn-derived tokens) and Protobuf/JetStream consumer wiring land in
 * later steps — `jetstream()` is exposed now so those steps have a seam.
 */

import { type JetStreamClient, jetstream } from "@nats-io/jetstream";
import { type Msg, type NatsConnection, wsconnect } from "@nats-io/nats-core";
import { NatsTransport } from "./transport/nats-transport";
import type { TransportPort } from "./transport/port";

const MAX_MESSAGES = 500;

export type ConnectionStatus =
	| "disconnected"
	| "connecting"
	| "connected"
	| "error";

export interface NatsMessage {
	id: number;
	subject: string;
	/** UTF-8 decoded payload, truncated; hex fallback for binary data. */
	data: string;
	timestamp: Date;
	size: number;
}

export interface ConnectOptions {
	/** WebSocket URL, e.g. `wss://bmc.local:443`. */
	url: string;
	/** Optional short-lived auth token. Omitted until auth lands. */
	token?: string;
}

let status = $state<ConnectionStatus>("disconnected");
let messages = $state<NatsMessage[]>([]);
let seq = 0;
let nc: NatsConnection | null = null;
let transport: TransportPort | null = null;
let mockScenarioName = $state<string | null>(null);

export function getStatus(): ConnectionStatus {
	return status;
}

/** Active mock scenario name when the mock backend is in use, else null. */
export function getMockScenarioName(): string | null {
	return mockScenarioName;
}

/** The active transport port (NATS adapter), or null when disconnected. */
export function getTransport(): TransportPort | null {
	return transport;
}

export function getMessages(): NatsMessage[] {
	return messages;
}

export function clearMessages(): void {
	messages = [];
}

export function isConnected(): boolean {
	return status === "connected";
}

/** Connect to the NATS WebSocket endpoint, replacing any existing connection. */
export async function connect(options: ConnectOptions): Promise<void> {
	if (nc) {
		await disconnect();
	}

	status = "connecting";
	try {
		nc = await wsconnect({
			servers: options.url,
			token: options.token,
			maxReconnectAttempts: 5,
			reconnectTimeWait: 2000,
			pingInterval: 30_000,
		});
		status = "connected";
		transport = new NatsTransport(nc);
		watchStatus(nc);
	} catch (err) {
		status = "error";
		nc = null;
		transport = null;
		throw err;
	}
}

/**
 * Attach an in-process mock transport (dev/test/CI) — no network. The
 * env-driven decision to use a mock and which scenario lives in
 * `connection.ts`; this keeps `nats.svelte` free of build-time env imports so
 * it stays importable from unit tests.
 */
export function connectMock(
	mockTransport: TransportPort,
	scenarioName: string,
): void {
	transport = mockTransport;
	mockScenarioName = scenarioName;
	status = "connected";
}

/** Gracefully drain and reset the connection. */
export async function disconnect(): Promise<void> {
	if (nc) {
		try {
			await nc.drain();
		} catch {
			// Ignore drain errors on explicit disconnect.
		}
		nc = null;
	}
	transport = null;
	mockScenarioName = null;
	status = "disconnected";
}

/** Subscribe to a subject and stream messages into the reactive buffer. */
export function subscribe(subject: string): void {
	if (!nc) throw new Error("Not connected to NATS");
	const sub = nc.subscribe(subject);
	void (async () => {
		for await (const msg of sub) {
			appendMessage(msg);
		}
	})();
}

/** Returns a JetStream client over the active connection. */
export function jetstreamClient(): JetStreamClient {
	if (!nc) throw new Error("Not connected to NATS");
	return jetstream(nc);
}

function watchStatus(connection: NatsConnection): void {
	void (async () => {
		for await (const s of connection.status()) {
			switch (s.type) {
				case "disconnect":
				case "error":
					status = "error";
					break;
				case "reconnecting":
					status = "connecting";
					break;
				case "reconnect":
					status = "connected";
					break;
			}
		}
	})();
}

function appendMessage(msg: Msg): void {
	let data: string;
	try {
		data = new TextDecoder("utf-8", { fatal: true }).decode(msg.data);
	} catch {
		data = Array.from(msg.data)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join(" ");
	}

	const entry: NatsMessage = {
		id: ++seq,
		subject: msg.subject,
		data: data.length > 256 ? `${data.slice(0, 256)}…` : data,
		timestamp: new Date(),
		size: msg.data.length,
	};

	messages =
		messages.length >= MAX_MESSAGES
			? [...messages.slice(1), entry]
			: [...messages, entry];
}
