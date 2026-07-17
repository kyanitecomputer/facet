/**
 * Minimal ambient types for noVNC, which ships untyped ESM
 * (`exports: "./core/rfb.js"`). Covers the subset of the RFB API Facet uses.
 * Upstream reference: https://github.com/novnc/noVNC/blob/master/docs/API.md
 */

declare module "@novnc/novnc" {
	export interface RFBOptions {
		shared?: boolean;
		credentials?: { username?: string; password?: string; target?: string };
		repeaterID?: string;
		wsProtocols?: string[];
	}

	export type RFBEvent =
		| "connect"
		| "disconnect"
		| "credentialsrequired"
		| "securityfailure"
		| "clipboard"
		| "bell"
		| "desktopname"
		| "capabilities";

	export default class RFB extends EventTarget {
		constructor(
			target: HTMLElement,
			urlOrChannel: string | WebSocket | RTCDataChannel,
			options?: RFBOptions,
		);

		viewOnly: boolean;
		focusOnClick: boolean;
		clipViewport: boolean;
		scaleViewport: boolean;
		resizeSession: boolean;
		background: string;
		qualityLevel: number;
		compressionLevel: number;

		disconnect(): void;
		focus(): void;
		blur(): void;
		sendCtrlAltDel(): void;
		sendKey(keysym: number, code: string, down?: boolean): void;
		machineShutdown(): void;
		machineReboot(): void;
		machineReset(): void;
	}
}
