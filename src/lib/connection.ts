/**
 * connection.ts — env-driven auth + backend wiring.
 *
 * Splits the two concerns the SPA bootstraps from build-time env:
 *
 *   - bootstrapAuth(): install the authenticator backing the login page.
 *   - connectBackend(token): open the transport AFTER sign-in (mock scenario,
 *     or real NATS with the bearer token attached).
 *
 * Keeping the env reads here (not in auth.svelte/nats.svelte) keeps those
 * modules unit-testable, and keeps the mock + its authenticator behind dynamic
 * imports so they are tree-shaken from production builds.
 *
 * Auth flow (see facet-architecture.md §4): login mints one session token →
 * connectBackend attaches it → token rotation will drive reconnect-with-new-creds.
 */

import {
	PUBLIC_MOCK_SCENARIO,
	PUBLIC_NATS_WS_URL,
	PUBLIC_USE_MOCK,
} from "$app/env/public";
import {
	type Credentials,
	getSession,
	type LoginResult,
	login,
	logout,
	registerAuthClient,
	restore,
} from "./auth/auth.svelte";
import { connect, connectMock, disconnect } from "./nats.svelte";

/** Same-origin HTTP base for the ConnectRPC AuthService (Cairn/Vein mux). */
const AUTH_BASE_URL = "/api/connect";

let authBootstrapped = false;

/** Install the env-appropriate AuthService client once, on app load. */
export async function bootstrapAuth(): Promise<void> {
	if (authBootstrapped) return;
	authBootstrapped = true;

	if (PUBLIC_USE_MOCK) {
		const { createMockAuthClient } = await import("./auth/mock-auth");
		registerAuthClient(createMockAuthClient());
		return;
	}

	const { createAuthClient } = await import("./transport/connect");
	registerAuthClient(createAuthClient(AUTH_BASE_URL));
}

/** Open the backend transport after sign-in (token attached for real NATS). */
export async function connectBackend(token?: string): Promise<void> {
	if (PUBLIC_USE_MOCK) {
		const { createMockTransport, resolveScenario } = await import("./mock");
		const scenario = resolveScenario(PUBLIC_MOCK_SCENARIO);
		connectMock(createMockTransport(scenario), scenario.name);
		return;
	}

	if (!PUBLIC_NATS_WS_URL) return;

	await connect({ url: PUBLIC_NATS_WS_URL, token });
}

/** Sign in: authenticate, then open the backend with the minted access token. */
export async function signIn(creds: Credentials): Promise<LoginResult> {
	await bootstrapAuth();
	const result = await login(creds);
	if (result.ok) await connectBackend(result.session.accessToken);
	return result;
}

/**
 * Restore a session on boot. The HttpOnly refresh cookie authorizes a
 * GetCurrentUser that re-mints the access token, so reloads need no re-login.
 * Opens the backend on success. Returns whether a session is now active.
 */
export async function restoreSession(): Promise<boolean> {
	await bootstrapAuth();
	const ok = await restore();
	if (ok) {
		const session = getSession();
		if (session) await connectBackend(session.accessToken);
	}
	return ok;
}

/** Sign out: revoke the session server-side and tear down the transport. */
export async function signOut(): Promise<void> {
	await logout();
	await disconnect();
}
