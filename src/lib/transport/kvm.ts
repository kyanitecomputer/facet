/**
 * kvm.ts — KVM (VNC-over-WebSocket) endpoint resolution.
 *
 * Unlike control/serial (NATS) and auth (HTTP), KVM is a high-throughput pixel
 * stream on its own dedicated WebSocket. The endpoint is always **same-origin**,
 * proxied by the hosting server and keyed by nodeId:
 *
 *   wss://<origin>/kvm/<nodeId>
 *
 * Embedded on-device: the device proxies to its local websockify → video engine.
 * Standalone/on-prem: the central host proxies out to the fleet device. Same
 * origin means the WS upgrade is authorized by the HttpOnly session cookie
 * automatically (no CORS, no cross-origin token), and the node needs no address
 * in the inventory schema — the proxy resolves the id.
 */

interface UrlLocation {
	protocol: string;
	host: string;
}

/** Build the same-origin KVM WebSocket URL for `nodeId`. */
export function resolveKvmUrl(
	nodeId: string,
	location: UrlLocation = window.location,
): string {
	if (nodeId.length === 0) throw new Error("resolveKvmUrl: empty nodeId");
	const scheme = location.protocol === "https:" ? "wss:" : "ws:";
	return `${scheme}//${location.host}/kvm/${encodeURIComponent(nodeId)}`;
}
