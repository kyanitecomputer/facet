<script lang="ts">
import {
	type KeyboardLayout,
	keyboardLayouts,
} from "$lib/components/keyboard/layouts";
import { m } from "$lib/paraglide/messages.js";
import { cn } from "$lib/utils";

interface Props {
	/** Receives the resolved key token (a character or a named key). */
	onkey?: (key: string) => void;
	/** Override the built-in layouts to ship a custom keyboard. */
	layouts?: KeyboardLayout[];
}

let { onkey, layouts = keyboardLayouts }: Props = $props();

// Undefined until the user picks: the <select> shows the first option and the
// derived `layout` falls back to it, so the two stay in sync without reading a
// prop inside a $state initializer.
let selectedId = $state<string>();
let shift = $state(false);

const layout = $derived(layouts.find((l) => l.id === selectedId) ?? layouts[0]);

function isLetter(value: string): boolean {
	return value.length === 1 && value.toLowerCase() !== value.toUpperCase();
}

function capLabel(cap: {
	value: string;
	label?: string;
	shiftLabel?: string;
}): string {
	if (shift) {
		if (cap.shiftLabel) return cap.shiftLabel;
		if (isLetter(cap.value)) return (cap.label ?? cap.value).toUpperCase();
	}
	return cap.label ?? cap.value;
}

function press(cap: {
	value: string;
	shiftValue?: string;
	role?: string;
}): void {
	if (cap.value === "Shift") {
		shift = !shift;
		return;
	}
	let out = cap.value;
	if (shift) {
		if (cap.shiftValue) out = cap.shiftValue;
		else if (isLetter(cap.value)) out = cap.value.toUpperCase();
	}
	onkey?.(out);
	// Shift acts as a one-shot modifier, matching on-screen keyboards.
	if (shift && cap.role !== "mod") shift = false;
}

const baseKey =
	"flex h-10 items-center justify-center rounded-md border border-border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
</script>

<div class="rounded-lg border border-border bg-surface-muted p-3">
	<div class="mb-3 flex items-center justify-between gap-2">
		<label class="flex items-center gap-2 text-sm text-foreground-muted">
			<span>{m.keyboard_layout()}</span>
			<select
				bind:value={selectedId}
				aria-label={m.keyboard_layout()}
				class="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
			>
				{#each layouts as l (l.id)}
					<option value={l.id}>{l.name}</option>
				{/each}
			</select>
		</label>
	</div>

	<div class="mx-auto flex max-w-3xl flex-col gap-1.5">
		{#each layout.rows as row, rowIndex (rowIndex)}
			<div class="flex gap-1.5">
				{#each row as cap, capIndex (capIndex)}
					<button
						type="button"
						onclick={() => press(cap)}
						aria-pressed={cap.value === "Shift" ? shift : undefined}
						style="flex: {cap.width ?? 1} 1 0; min-width: 2rem;"
						class={cn(
							baseKey,
							cap.role === "mod"
								? "bg-surface font-medium text-foreground-muted aria-pressed:bg-accent aria-pressed:text-accent-foreground"
								: cap.role === "action"
									? "bg-surface font-mono text-foreground-muted"
									: "bg-surface font-mono hover:bg-accent/10 active:bg-accent/20",
						)}
					>
						{capLabel(cap)}
					</button>
				{/each}
			</div>
		{/each}
	</div>
</div>
