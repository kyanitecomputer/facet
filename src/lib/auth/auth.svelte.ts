/**
 * auth.svelte.ts — reactive session / auth state.
 *
 * Holds the single in-memory session per facet-auth-plan.md: a short-lived
 * access token (the NATS WebSocket bearer) lives in JS memory only. The
 * long-lived refresh secret is an HttpOnly cookie owned by the HTTP layer and
 * never visible here. The credential exchange is delegated to a registered
 * AuthService client (Connect over HTTP), so the mechanism is swappable without
 * touching the login UI:
 *
 *   - mock now (in-process router transport, admin:admin — see mock-auth.ts),
 *   - real backend over `/api/connect` (Cairn/Vein) — see transport/connect.ts.
 *
 * `restore()` (boot + token refresh) and `login()` both map an AuthService
 * response to the reactive Session. The env-driven choice of client lives in
 * connection.ts so this module stays free of build-time env imports.
 */

import { type Timestamp, timestampDate } from "@bufbuild/protobuf/wkt";
import { Code, ConnectError } from "@connectrpc/connect";
import type { UserRole } from "@kyanite/schema/schema/v1/auth_pb";
import type { AuthClient } from "$lib/transport/connect";

export interface Credentials {
	username: string;
	password: string;
}

export interface Session {
	username: string;
	role: UserRole;
	/** Short-lived bearer token for the NATS WS, held in memory only. */
	accessToken: string;
	/** When the access token expires (drives proactive refresh), or null. */
	expiresAt: Date | null;
}

export type AuthError = "invalid_credentials" | "auth_unavailable";

export type LoginResult =
	| { ok: true; session: Session }
	| { ok: false; error: AuthError };

/** Fields shared by Login/GetCurrentUser responses, mapped to a Session. */
interface SessionFields {
	accessToken: string;
	expiresAt?: Timestamp;
	username: string;
	role: UserRole;
}

let session = $state<Session | null>(null);
let client: AuthClient | null = null;

/** Install the AuthService client backing auth calls (called at bootstrap). */
export function registerAuthClient(c: AuthClient): void {
	client = c;
}

/** Current session, or null when signed out. */
export function getSession(): Session | null {
	return session;
}

export function isAuthenticated(): boolean {
	return session !== null;
}

function toSession(res: SessionFields): Session {
	return {
		username: res.username,
		role: res.role,
		accessToken: res.accessToken,
		expiresAt: res.expiresAt ? timestampDate(res.expiresAt) : null,
	};
}

/** Invalid credentials report as such; anything else is a service problem. */
function classify(err: unknown): AuthError {
	if (
		err instanceof ConnectError &&
		(err.code === Code.Unauthenticated ||
			err.code === Code.InvalidArgument ||
			err.code === Code.PermissionDenied)
	) {
		return "invalid_credentials";
	}
	return "auth_unavailable";
}

/** Attempt sign-in. On success the session is stored reactively. */
export async function login(creds: Credentials): Promise<LoginResult> {
	if (!client) return { ok: false, error: "auth_unavailable" };
	try {
		session = toSession(await client.login(creds));
		return { ok: true, session };
	} catch (err) {
		session = null;
		return { ok: false, error: classify(err) };
	}
}

/**
 * Restore the session on boot or rotate the access token. Authorized by the
 * HttpOnly refresh cookie, so it succeeds across reloads without re-login.
 * Returns whether a session is now active.
 */
export async function restore(): Promise<boolean> {
	if (!client) return false;
	try {
		session = toSession(await client.getCurrentUser({}));
		return true;
	} catch {
		session = null;
		return false;
	}
}

/** Clear the session and revoke it server-side. Transport teardown is the caller's. */
export async function logout(): Promise<void> {
	const c = client;
	session = null;
	try {
		await c?.logout({});
	} catch {
		// Best effort: the local session is already cleared.
	}
}
