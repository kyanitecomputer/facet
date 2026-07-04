/**
 * scenario.ts — declarative mock backend scenarios (Layer B).
 *
 * A scenario describes a topology of Vein (switch) and Cairn (BMC) nodes plus
 * how the mock answers requests and emits streams over the protobuf wire. Each
 * route and stream is bound to a generated message schema, so `MockTransport`
 * encodes/decodes exactly like the real NATS path. Swapping scenarios exercises
 * different hardware configurations and faults with no real devices.
 */

import type {
	DescMessage,
	MessageInitShape,
	MessageShape,
} from "@bufbuild/protobuf";

/** Mock topology device class (scenario authoring config, not wire data). */
export type NodeKind = "router" | "switch" | "bmc" | "rmc";

/** Vein (switch) configuration knobs. */
export interface VeinProfile {
	/** Front-panel port count. */
	ports: number;
	/** Number of fabric uplinks. */
	uplinks?: number;
}

/** Cairn (BMC) configuration knobs. */
export interface CairnProfile {
	/** Sensor ids this BMC exposes, e.g. ["cpu", "inlet", "fan0"]. */
	sensors: string[];
	/** Initial power state. */
	power: "on" | "off";
}

/** A single managed node in the mock topology. */
export interface NodeProfile {
	id: string;
	kind: NodeKind;
	vein?: VeinProfile;
	cairn?: CairnProfile;
}

/** A request/reply route: typed protobuf request in, typed response out. */
export interface RequestRoute<
	I extends DescMessage = DescMessage,
	O extends DescMessage = DescMessage,
> {
	/** Schema the request payload is decoded with. */
	request: I;
	/** Schema the response value is encoded with. */
	response: O;
	/** Produces the response init for a decoded request. */
	handle(
		request: MessageShape<I>,
	): MessageInitShape<O> | Promise<MessageInitShape<O>>;
}

/**
 * A serial-console bridge: raw bytes in (browser → device) produce raw bytes
 * out (device → browser). Serial payloads are NOT protobuf — they are the
 * UART byte stream carried directly by the byte-oriented transport.
 */
export interface SerialBridge {
	/** Bytes emitted on `serial.<nodeId>.out` when a client first subscribes. */
	greeting?(nodeId: string): Uint8Array | undefined;
	/** Response bytes for input published to `serial.<nodeId>.in`, if any. */
	respond(nodeId: string, input: Uint8Array): Uint8Array | undefined;
}

const encoder = new TextEncoder();

/**
 * A "cooked" echo bridge that makes the mock console feel real: it echoes
 * printable input back and turns a carriage return into CRLF + a shell prompt.
 */
export function echoSerial(): SerialBridge {
	return {
		greeting: () =>
			encoder.encode("Kyanite serial console (mock)\r\nconnected\r\n$ "),
		respond: (_nodeId, input) => {
			const out: number[] = [];
			for (const byte of input) {
				if (byte === 0x0d || byte === 0x0a) {
					out.push(0x0d, 0x0a, 0x24, 0x20); // CRLF + "$ "
				} else {
					out.push(byte);
				}
			}
			return Uint8Array.from(out);
		},
	};
}

/** A periodic stream of a single message type bound to a concrete subject. */
export interface MockStream<S extends DescMessage = DescMessage> {
	/** Concrete subject the stream publishes on (subscribers may use wildcards). */
	subject: string;
	/** Emission cadence in milliseconds. */
	intervalMs: number;
	/** Schema each emitted message is encoded with. */
	schema: S;
	/** Produces the message init for emission `tick` (0-based). */
	produce(tick: number): MessageInitShape<S>;
}

export interface MockScenario {
	name: string;
	/** Topology of mocked nodes. */
	nodes: NodeProfile[];
	/** Request/reply routes keyed by exact subject. */
	requests?: Record<string, RequestRoute>;
	/** Streams emitted to matching subscribers. */
	streams?: MockStream[];
	/** Optional serial-console bridge for `serial.<nodeId>.{in,out}` subjects. */
	serial?: SerialBridge;
}

/** Type-inferring helper to author a request route. */
export function route<I extends DescMessage, O extends DescMessage>(
	request: I,
	response: O,
	handle: (
		request: MessageShape<I>,
	) => MessageInitShape<O> | Promise<MessageInitShape<O>>,
): RequestRoute<I, O> {
	return { request, response, handle };
}

/** Type-inferring helper to author a stream. */
export function stream<S extends DescMessage>(
	subject: string,
	intervalMs: number,
	schema: S,
	produce: (tick: number) => MessageInitShape<S>,
): MockStream<S> {
	return { subject, intervalMs, schema, produce };
}
