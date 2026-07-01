/**
 * connect.ts — ConnectRPC (HTTP) client for the AuthService.
 *
 * Auth runs over HTTP, not NATS: it is the one surface that needs an HttpOnly
 * cookie (set via Set-Cookie by the backend), which only the HTTP layer can
 * manage. `credentials: "include"` sends and stores that cookie. The cookie is
 * the long-lived refresh secret and never reaches JS; the short-lived access
 * token returned in the response body is held in memory and attached as the
 * NATS WebSocket bearer (see auth.svelte.ts / connection.ts).
 *
 * Everything else (telemetry, serial, commands) stays on the NATS transport.
 */

import { type Client, createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { AuthService } from "@kyanite/schema/schema/v1/auth_pb";

/** Typed client for the generated AuthService. */
export type AuthClient = Client<typeof AuthService>;

/** Real AuthService client over HTTP at `baseUrl` (e.g. "/api/connect"). */
export function createAuthClient(baseUrl: string): AuthClient {
	const transport = createConnectTransport({
		baseUrl,
		// Carry the HttpOnly session cookie on every auth call.
		fetch: (input, init) => fetch(input, { ...init, credentials: "include" }),
	});
	return createClient(AuthService, transport);
}
