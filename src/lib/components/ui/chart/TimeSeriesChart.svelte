<script lang="ts" module>
export type TimeSeriesData = ReadonlyArray<ReadonlyArray<number | null>>;

export interface TimeSeriesSeries {
	label: string;
	/** Stroke colour; defaults to the built-in palette when omitted. */
	stroke?: string;
}
</script>

<script lang="ts">
import { untrack } from "svelte";
import uPlot from "uplot";
import { cn } from "$lib/utils";
import "uplot/dist/uPlot.min.css";

interface Props {
	data: TimeSeriesData;
	series: TimeSeriesSeries[];
	height?: number;
	class?: string;
}

let { data, series, height = 240, class: className }: Props = $props();

const palette = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#0891b2"];

let el = $state<HTMLDivElement>();
let chart: uPlot | undefined;

function buildOptions(width: number): uPlot.Options {
	return {
		width,
		height,
		series: [
			{},
			...series.map((s, i) => ({
				label: s.label,
				stroke: s.stroke ?? palette[i % palette.length],
				width: 2,
			})),
		],
		legend: { show: series.length > 1 },
		cursor: { drag: { x: true, y: false } },
	};
}

// uPlot is an imperative canvas library: create the instance once, keep it sized
// to the container via a ResizeObserver, and push new samples with setData.
$effect(() => {
	const target = el;
	if (!target) return;
	const width = target.clientWidth || 600;
	const instance = new uPlot(
		untrack(() => buildOptions(width)),
		untrack(() => data) as uPlot.AlignedData,
		target,
	);
	chart = instance;

	const observer = new ResizeObserver(() => {
		instance.setSize({ width: target.clientWidth || width, height: untrack(() => height) });
	});
	observer.observe(target);

	return () => {
		observer.disconnect();
		instance.destroy();
		chart = undefined;
	};
});

$effect(() => {
	const next = data;
	chart?.setData(next as uPlot.AlignedData);
});
</script>

<div bind:this={el} class={cn("w-full", className)}></div>
