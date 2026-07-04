/**
 * rack-mixed.ts — a mixed rack: one Vein switch, one Cairn BMC, one RMC.
 *
 * Exercises a heterogeneous topology with live CPU/inlet telemetry on the BMC
 * and an `inventory.list` request/reply returning generated `NodeSummary`
 * messages.
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
import { switchRoutes } from "../switch-routes";

const nodes: NodeProfile[] = [
	{ id: "spine-1", kind: "switch", vein: { ports: 32, uplinks: 4 } },
	{
		id: "bmc-7",
		kind: "bmc",
		cairn: { sensors: ["cpu", "inlet", "fan0", "fan1"], power: "on" },
	},
	{ id: "rmc-1", kind: "rmc" },
];

export const rackMixed: MockScenario = {
	name: "rack-mixed",
	nodes,
	requests: {
		[requestSubjects.inventoryList]: route(
			ListInventoryRequestSchema,
			ListInventoryResponseSchema,
			() => ({
				nodes: [
					{
						id: "spine-1",
						name: "spine-1",
						kind: NodeKind.SWITCH,
						availability: NodeAvailability.ONLINE,
						uptimeSeconds: 864_000n,
						// A larger switch than Vega that DOES have thermal/power
						// monitoring (not all switches are passively cooled).
						capabilities: {
							kvm: false,
							serialConsole: true,
							switchManagement: true,
							powerControl: false,
							metrics: [
								{
									id: "temp",
									label: "Temperature",
									type: SensorType.TEMPERATURE,
									unit: "C",
								},
								{
									id: "power",
									label: "Power draw",
									type: SensorType.POWER,
									unit: "W",
								},
							],
						},
					},
					{
						id: "bmc-7",
						name: "bmc-7",
						kind: NodeKind.BMC,
						availability: NodeAvailability.ONLINE,
						uptimeSeconds: 432_000n,
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
								{
									id: "inlet",
									label: "Inlet temperature",
									type: SensorType.TEMPERATURE,
									unit: "C",
								},
							],
						},
					},
					{
						id: "rmc-1",
						name: "rmc-1",
						kind: NodeKind.RMC,
						availability: NodeAvailability.DEGRADED,
						uptimeSeconds: 3_600n,
						capabilities: {
							kvm: true,
							serialConsole: true,
							switchManagement: false,
							powerControl: true,
						},
					},
				],
			}),
		),
		...switchRoutes(["spine-1"]),
		...serialTargetsRoute(nodes),
		...managementRoutes(),
	},
	streams: [
		stream("telemetry.spine-1.temp", 1000, SensorReadingSchema, (tick) => ({
			nodeId: "spine-1",
			sensorId: "temp",
			type: SensorType.TEMPERATURE,
			value: 44 + Math.sin(tick / 7) * 4,
			unit: "C",
		})),
		stream("telemetry.spine-1.power", 1000, SensorReadingSchema, (tick) => ({
			nodeId: "spine-1",
			sensorId: "power",
			type: SensorType.POWER,
			value: 95 + Math.cos(tick / 10) * 8,
			unit: "W",
		})),
		stream("telemetry.bmc-7.cpu", 1000, SensorReadingSchema, (tick) => ({
			nodeId: "bmc-7",
			sensorId: "cpu",
			type: SensorType.TEMPERATURE,
			value: 55 + Math.sin(tick / 6) * 6,
			unit: "C",
		})),
		stream("telemetry.bmc-7.inlet", 1000, SensorReadingSchema, (tick) => ({
			nodeId: "bmc-7",
			sensorId: "inlet",
			type: SensorType.TEMPERATURE,
			value: 24 + Math.cos(tick / 9) * 2,
			unit: "C",
		})),
	],
	serial: echoSerial(),
};
