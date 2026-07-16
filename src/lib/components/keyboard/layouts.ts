/**
 * On-screen keyboard layouts.
 *
 * A layout is just rows of key caps, so customers can ship their own (pass a
 * custom `layouts` array to `VirtualKeyboard`). Printable caps send their
 * character; special caps send a named token ("Enter", "Backspace", "F1",
 * "Control", …) so a consumer (e.g. a serial/SSH session) can translate them.
 *
 * `Shift` is handled inside the component (toggles case / symbol alternates).
 */

export type KeyRole = "char" | "mod" | "action";

export interface KeyCap {
	/** Token emitted to `onkey`. Defaults to `label` when omitted. */
	value: string;
	/** Visible label. Defaults to `value`. */
	label?: string;
	/** Alternate value/label while Shift is active (for symbols). */
	shiftValue?: string;
	shiftLabel?: string;
	/** Relative width in flex units (1 = a standard key). */
	width?: number;
	role?: KeyRole;
}

export interface KeyboardLayout {
	id: string;
	/** Human-readable name shown in the layout picker. */
	name: string;
	rows: KeyCap[][];
}

// Shared rows ----------------------------------------------------------------

const functionRow: KeyCap[] = [
	{ value: "Escape", label: "esc", role: "action", width: 1.5 },
	...Array.from({ length: 12 }, (_, i) => ({
		value: `F${i + 1}`,
		role: "action" as const,
	})),
];

const controlRow: KeyCap[] = [
	{ value: "Control", label: "ctrl", role: "mod", width: 1.5 },
	{ value: "Meta", label: "meta", role: "mod", width: 1.5 },
	{ value: "Alt", label: "alt", role: "mod", width: 1.5 },
	{ value: " ", label: "space", role: "char", width: 8 },
	{ value: "Alt", label: "alt", role: "mod", width: 1.5 },
	{ value: "ArrowLeft", label: "←", role: "action" },
	{ value: "ArrowUp", label: "↑", role: "action" },
	{ value: "ArrowDown", label: "↓", role: "action" },
	{ value: "ArrowRight", label: "→", role: "action" },
];

function digitRow(symbols: string[]): KeyCap[] {
	const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
	return [
		...digits.map((d, i) => ({ value: d, shiftValue: symbols[i] })),
		{ value: "-", shiftValue: "_" },
		{ value: "=", shiftValue: "+" },
		{ value: "Backspace", label: "⌫", role: "action" as const, width: 2 },
	];
}

const shiftL: KeyCap = { value: "Shift", label: "⇧", role: "mod", width: 2 };
const shiftR: KeyCap = { value: "Shift", label: "⇧", role: "mod", width: 2 };
const tab: KeyCap = { value: "Tab", label: "tab", role: "action", width: 1.5 };
const enter: KeyCap = { value: "Enter", label: "⏎", role: "action", width: 2 };

const usSymbols = ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")"];

// Layouts --------------------------------------------------------------------

const qwertyUs: KeyboardLayout = {
	id: "us",
	name: "QWERTY (US)",
	rows: [
		functionRow,
		digitRow(usSymbols),
		[
			tab,
			...["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"].map((v) => ({
				value: v,
			})),
			{ value: "[", shiftValue: "{" },
			{ value: "]", shiftValue: "}" },
			{ value: "\\", shiftValue: "|" },
		],
		[
			...["a", "s", "d", "f", "g", "h", "j", "k", "l"].map((v) => ({
				value: v,
			})),
			{ value: ";", shiftValue: ":" },
			{ value: "'", shiftValue: '"' },
			enter,
		],
		[
			shiftL,
			...["z", "x", "c", "v", "b", "n", "m"].map((v) => ({ value: v })),
			{ value: ",", shiftValue: "<" },
			{ value: ".", shiftValue: ">" },
			{ value: "/", shiftValue: "?" },
			shiftR,
		],
		controlRow,
	],
};

const qwertzDe: KeyboardLayout = {
	id: "de",
	name: "QWERTZ (DE)",
	rows: [
		functionRow,
		digitRow(['"', "§", "$", "%", "&", "/", "(", ")", "=", "?"]),
		[
			tab,
			...["q", "w", "e", "r", "t", "z", "u", "i", "o", "p"].map((v) => ({
				value: v,
			})),
			{ value: "ü" },
			{ value: "+", shiftValue: "*" },
		],
		[
			...["a", "s", "d", "f", "g", "h", "j", "k", "l"].map((v) => ({
				value: v,
			})),
			{ value: "ö" },
			{ value: "ä" },
			enter,
		],
		[
			shiftL,
			...["y", "x", "c", "v", "b", "n", "m"].map((v) => ({ value: v })),
			{ value: ",", shiftValue: ";" },
			{ value: ".", shiftValue: ":" },
			{ value: "ß", shiftValue: "?" },
			shiftR,
		],
		controlRow,
	],
};

// Pinyin: Hanyu Pinyin is typed on a Latin keyboard, so the base is QWERTY with
// a dedicated tone-mark row and the ü vowel — a stub demonstrating that a
// non-Latin "method" layout plugs into the same data model. A real IME
// (candidate selection) is out of scope for now.
const pinyin: KeyboardLayout = {
	id: "pinyin",
	name: "拼音 Pinyin",
	rows: [
		[
			{ value: "ā" },
			{ value: "á" },
			{ value: "ǎ" },
			{ value: "à" },
			{ value: "ē" },
			{ value: "é" },
			{ value: "ě" },
			{ value: "è" },
			{ value: "ī" },
			{ value: "í" },
			{ value: "ǐ" },
			{ value: "ì" },
			{ value: "ü" },
		],
		[
			...["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"].map((v) => ({
				value: v,
			})),
			{ value: "Backspace", label: "⌫", role: "action" as const, width: 2 },
		],
		[
			...["a", "s", "d", "f", "g", "h", "j", "k", "l"].map((v) => ({
				value: v,
			})),
			enter,
		],
		[
			shiftL,
			...["z", "x", "c", "v", "b", "n", "m"].map((v) => ({ value: v })),
			shiftR,
		],
		[
			{ value: " ", label: "space", role: "char", width: 8 },
			{ value: "ArrowLeft", label: "←", role: "action" },
			{ value: "ArrowRight", label: "→", role: "action" },
		],
	],
};

export const keyboardLayouts: KeyboardLayout[] = [qwertyUs, qwertzDe, pinyin];
