/**
 * mock-transport.ts — in-process mock backend (Layer A).
 *
 * Implements the same `TransportPort` as `NatsTransport`, but answers from a
 * declarative `MockScenario` instead of a real NATS connection. Payloads are
 * real protobuf bytes: requests/streams are encoded and decoded with the
 * generated message schemas declared on each route/stream, so all NATS-path
 * code works unchanged. It impersonates the NATS path (`kind = "nats"`). No
 * network, fully deterministic — ideal for unit/component tests, Playwright,
 * and CI.
 */

import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
import type { Subscription, TransportPort } from "$lib/transport/port";
import type { MockScenario } from "./scenario";
import { matchSubject } from "./subject";

export interface PublishedMessage {
	subject: string;
	/** Raw protobuf bytes as published; decode with the expected schema. */
	payload: Uint8Array;
}

interface ActiveSub {
	pattern: string;
	onMessage: (payload: Uint8Array) => void;
}

/** Extract the nodeId from a `serial.<nodeId>.<dir>` subject, else null. */
function serialNodeId(subject: string, dir: "in" | "out"): string | null {
	const tokens = subject.split(".");
	return tokens.length === 3 && tokens[0] === "serial" && tokens[2] === dir
		? tokens[1]
		: null;
}

export class MockTransport implements TransportPort {
	readonly kind = "nats" as const;

	private readonly published: PublishedMessage[] = [];
	private readonly subs = new Set<ActiveSub>();

	constructor(private readonly scenario: MockScenario) {}

	async request(subject: string, payload: Uint8Array): Promise<Uint8Array> {
		const route = this.scenario.requests?.[subject];
		if (!route) {
			throw new Error(
				`mock: no request handler registered for subject "${subject}"`,
			);
		}
		const request = fromBinary(route.request, payload);
		const response = await route.handle(request);
		return toBinary(route.response, create(route.response, response));
	}

	subscribe(
		subject: string,
		onMessage: (payload: Uint8Array) => void,
	): Subscription {
		const sub: ActiveSub = { pattern: subject, onMessage };
		this.subs.add(sub);

		const timers = (this.scenario.streams ?? [])
			.filter((stream) => matchSubject(subject, stream.subject))
			.map((stream) => {
				let tick = 0;
				return setInterval(() => {
					const message = create(stream.schema, stream.produce(tick++));
					onMessage(toBinary(stream.schema, message));
				}, stream.intervalMs);
			});

		// Serial: greet a client that subscribes to a node's serial output.
		const serial = this.scenario.serial;
		const greetNode = serialNodeId(subject, "out");
		if (serial?.greeting && greetNode !== null) {
			const greeting = serial.greeting(greetNode);
			if (greeting) onMessage(greeting);
		}

		return {
			unsubscribe: () => {
				this.subs.delete(sub);
				for (const timer of timers) clearInterval(timer);
			},
		};
	}

	publish(subject: string, payload: Uint8Array): void {
		this.published.push({ subject, payload: payload.slice() });

		// Serial: route input to the bridge and deliver its response to any
		// subscriber on the matching `serial.<nodeId>.out` subject.
		const serial = this.scenario.serial;
		const inNode = serialNodeId(subject, "in");
		if (serial && inNode !== null) {
			const response = serial.respond(inNode, payload);
			if (response) this.deliver(`serial.${inNode}.out`, response);
		}
	}

	private deliver(subject: string, payload: Uint8Array): void {
		for (const sub of this.subs) {
			if (matchSubject(sub.pattern, subject)) sub.onMessage(payload);
		}
	}

	/** Test/inspection helper: messages published by the app to the mock. */
	getPublished(): readonly PublishedMessage[] {
		return this.published;
	}
}
