/**
 * Stub metric catalog.
 *
 * Placeholder sensor/stat data used to design the dashboard and monitoring
 * layouts before the real telemetry transport is wired in. Each metric carries
 * a stable `id` so it can be starred onto the dashboard (see dashboard store).
 */

export type MetricStatus = "ok" | "warn" | "error";

export interface Metric {
	id: string;
	title: string;
	group: string;
	value: string;
	unit?: string;
	status: MetricStatus;
	/** Optional sparkline samples (most recent last). */
	series?: number[];
}

// Deterministic wavy series so sparklines look plausible without randomness
// changing on every render.
function wave(seed: number, base: number, amp: number, n = 32): number[] {
	return Array.from({ length: n }, (_, i) =>
		Number((base + Math.sin((i + seed) / 3) * amp + (i % 4)).toFixed(1)),
	);
}

export const metrics: Metric[] = [
	{
		id: "cpu-temp",
		title: "CPU temperature",
		group: "Thermal",
		value: "58",
		unit: "°C",
		status: "ok",
		series: wave(0, 56, 5),
	},
	{
		id: "inlet-temp",
		title: "Inlet temperature",
		group: "Thermal",
		value: "24",
		unit: "°C",
		status: "ok",
		series: wave(3, 24, 2),
	},
	{
		id: "exhaust-temp",
		title: "Exhaust temperature",
		group: "Thermal",
		value: "41",
		unit: "°C",
		status: "ok",
		series: wave(7, 40, 3),
	},
	{
		id: "fan-1",
		title: "Fan 1 speed",
		group: "Thermal",
		value: "8,200",
		unit: "RPM",
		status: "ok",
	},
	{
		id: "power-draw",
		title: "Power draw",
		group: "Power",
		value: "412",
		unit: "W",
		status: "ok",
		series: wave(1, 400, 30),
	},
	{
		id: "psu-1",
		title: "PSU 1 output",
		group: "Power",
		value: "12.1",
		unit: "V",
		status: "ok",
	},
	{
		id: "input-voltage",
		title: "Input voltage",
		group: "Power",
		value: "229",
		unit: "V",
		status: "ok",
	},
	{
		id: "ingress",
		title: "Ingress throughput",
		group: "Network",
		value: "7.8",
		unit: "Gbps",
		status: "ok",
		series: wave(2, 7, 2),
	},
	{
		id: "egress",
		title: "Egress throughput",
		group: "Network",
		value: "6.2",
		unit: "Gbps",
		status: "ok",
		series: wave(5, 6, 2),
	},
	{
		id: "port-errors",
		title: "Port CRC errors",
		group: "Network",
		value: "3",
		unit: "/min",
		status: "warn",
	},
	{
		id: "packet-loss",
		title: "Packet loss",
		group: "Network",
		value: "0.0",
		unit: "%",
		status: "ok",
	},
	{
		id: "cpu-load",
		title: "CPU load",
		group: "Compute",
		value: "34",
		unit: "%",
		status: "ok",
		series: wave(4, 32, 10),
	},
	{
		id: "mem-used",
		title: "Memory used",
		group: "Compute",
		value: "61",
		unit: "%",
		status: "ok",
		series: wave(6, 60, 6),
	},
	{
		id: "uptime",
		title: "Uptime",
		group: "Health",
		value: "10d 4h",
		status: "ok",
	},
	{
		id: "node-health",
		title: "Node health",
		group: "Health",
		value: "27 / 28",
		status: "warn",
	},
];

export const metricsById: Record<string, Metric> = Object.fromEntries(
	metrics.map((metric) => [metric.id, metric]),
);

export const metricGroups: string[] = [
	...new Set(metrics.map((metric) => metric.group)),
];
