/**
 * vega.ts — a single "Vega" class Ethernet switch.
 *
 * The focus scenario for bringing up Vein: one 14-port switch node exposing its
 * full management surface (see switch-detail.ts) plus live switch sensors and a
 * device-attached serial console. Run it with:
 *
 *   PUBLIC_USE_MOCK=true PUBLIC_MOCK_SCENARIO=vega pnpm dev
 */

import {
	ListInventoryRequestSchema,
	ListInventoryResponseSchema,
	NodeAvailability,
	NodeKind,
} from "@kyanite/schema/schema/v1/node_pb";
import {
	SensorReadingSchema,
	SensorType,
} from "@kyanite/schema/schema/v1/sensor_pb";
import { requestSubjects } from "$lib/transport/subjects";
import { managementRoutes, serialTargetsRoute } from "../management";
import { echoSerial, type MockScenario, route, stream } from "../scenario";
import { switchRoutes } from "../switch-routes";

const nodes = [
	{ id: "vega", kind: "switch" as const, vein: { ports: 14, uplinks: 2 } },
];

export const vega: MockScenario = {
	name: "vega",
	nodes,
	requests: {
		[requestSubjects.inventoryList]: route(
			ListInventoryRequestSchema,
			ListInventoryResponseSchema,
			() => ({
				nodes: [
					{
						id: "vega",
						name: "vega",
						kind: NodeKind.SWITCH,
						availability: NodeAvailability.ONLINE,
						uptimeSeconds: 864_000n,
						// Vega is a passively-cooled switch: no fans, no temperature or
						// other ADC sensors. It advertises only what it can actually
						// report — memory, storage, and CPU frequency — plus a serial
						// console and switch management, but no KVM.
						capabilities: {
							kvm: false,
							serialConsole: true,
							switchManagement: true,
							powerControl: false,
							metrics: [
								{
									id: "memory",
									label: "Memory",
									type: SensorType.UTILIZATION,
									unit: "%",
								},
								{
									id: "storage",
									label: "Storage",
									type: SensorType.UTILIZATION,
									unit: "%",
								},
								{
									id: "cpu_freq",
									label: "CPU frequency",
									type: SensorType.FREQUENCY,
									unit: "MHz",
								},
							],
						},
					},
				],
			}),
		),
		...switchRoutes(["vega"]),
		...serialTargetsRoute(nodes),
		...managementRoutes(),
	},
	streams: [
		stream("telemetry.vega.memory", 1000, SensorReadingSchema, (tick) => ({
			nodeId: "vega",
			sensorId: "memory",
			type: SensorType.UTILIZATION,
			value: 42 + Math.sin(tick / 8) * 5,
			unit: "%",
		})),
		stream("telemetry.vega.storage", 1000, SensorReadingSchema, (tick) => ({
			nodeId: "vega",
			sensorId: "storage",
			type: SensorType.UTILIZATION,
			value: 18 + Math.sin(tick / 30),
			unit: "%",
		})),
		stream("telemetry.vega.cpu_freq", 1000, SensorReadingSchema, (tick) => ({
			nodeId: "vega",
			sensorId: "cpu_freq",
			type: SensorType.FREQUENCY,
			value: 1200 + Math.sin(tick / 6) * 200,
			unit: "MHz",
		})),
	],
	serial: echoSerial(),
};
