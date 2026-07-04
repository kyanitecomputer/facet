/**
 * single-bmc.ts — the smallest scenario: one Cairn BMC, powered on.
 *
 * Useful as a minimal default for component tests that only need a connected
 * transport and a single telemetry stream.
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
import {
	echoSerial,
	type MockScenario,
	type NodeProfile,
	route,
	stream,
} from "../scenario";

const nodes: NodeProfile[] = [
	{
		id: "bmc-1",
		kind: "bmc",
		cairn: { sensors: ["cpu", "inlet"], power: "on" },
	},
];

export const singleBmc: MockScenario = {
	name: "single-bmc",
	nodes,
	requests: {
		[requestSubjects.inventoryList]: route(
			ListInventoryRequestSchema,
			ListInventoryResponseSchema,
			() => ({
				nodes: [
					{
						id: "bmc-1",
						name: "bmc-1",
						kind: NodeKind.BMC,
						availability: NodeAvailability.ONLINE,
						uptimeSeconds: 7_200n,
						capabilities: {
							kvm: true,
							serialConsole: true,
							switchManagement: false,
							powerControl: true,
							metrics: [
								{
									id: "cpu",
									label: "CPU temperature",
									type: SensorType.TEMPERATURE,
									unit: "C",
								},
							],
						},
					},
				],
			}),
		),
		...serialTargetsRoute(nodes),
		...managementRoutes(),
	},
	streams: [
		stream("telemetry.bmc-1.cpu", 1000, SensorReadingSchema, (tick) => ({
			nodeId: "bmc-1",
			sensorId: "cpu",
			type: SensorType.TEMPERATURE,
			value: 50 + Math.sin(tick / 5) * 5,
			unit: "C",
		})),
	],
	serial: echoSerial(),
};
