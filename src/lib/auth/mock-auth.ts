/**
 * mock-auth.ts — in-process AuthService for dev/test/CI.
 *
 * Implements the real AuthService contract over a Connect router transport, so
 * the production client code path (createClient → login/getCurrentUser/logout)
 * runs unchanged against an in-memory backend — no HTTP server, no cookie. It
 * accepts the fixed admin/admin credentials and mints a fake admin session.
 *
 * `getCurrentUser` always succeeds, simulating a valid HttpOnly refresh cookie
 * so reload-survival can be exercised in dev/e2e. Real auth (NATS auth callout,
 * passkeys, OIDC) lives in the backend. Dynamically imported only under
 * PUBLIC_USE_MOCK, so it is tree-shaken from production builds.
 */

import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import {
	Code,
	ConnectError,
	createClient,
	createRouterTransport,
} from "@connectrpc/connect";
import { AuthService, UserRole } from "@kyanite/schema/schema/v1/auth_pb";
import type { AuthClient } from "$lib/transport/connect";

/** Access-token lifetime handed out by the mock (5 minutes). */
const TOKEN_TTL_MS = 5 * 60 * 1000;

// The mock stands in for the backend's HttpOnly refresh cookie with an ordinary
// browser cookie it manages itself. It can't set HttpOnly from JS, but that is
// irrelevant for a simulation: it gives faithful reload-survival semantics — a
// fresh visit has no cookie (→ login), a post-login reload does (→ restored),
// and logout clears it.
const SESSION_COOKIE = "facet-mock-session";

function hasSessionCookie(): boolean {
	return (
		typeof document !== "undefined" &&
		document.cookie.split("; ").some((c) => c.startsWith(`${SESSION_COOKIE}=`))
	);
}

function setSessionCookie(): void {
	if (typeof document !== "undefined") {
		// biome-ignore lint/suspicious/noDocumentCookie: mock stands in for the backend's session cookie
		document.cookie = `${SESSION_COOKIE}=1; path=/; SameSite=Strict`;
	}
}

function clearSessionCookie(): void {
	if (typeof document !== "undefined") {
		// biome-ignore lint/suspicious/noDocumentCookie: mock stands in for the backend's session cookie
		document.cookie = `${SESSION_COOKIE}=; path=/; Max-Age=0; SameSite=Strict`;
	}
}

function adminSession() {
	return {
		accessToken: "mock-access-token",
		expiresAt: timestampFromDate(new Date(Date.now() + TOKEN_TTL_MS)),
		username: "admin",
		role: UserRole.ADMIN,
	};
}

/** Build a client backed by an in-process mock AuthService. */
export function createMockAuthClient(): AuthClient {
	const transport = createRouterTransport((router) => {
		router.service(AuthService, {
			login({ username, password }) {
				if (username === "admin" && password === "admin") {
					setSessionCookie();
					return { ...adminSession(), mustChangePassword: false };
				}
				throw new ConnectError("invalid credentials", Code.Unauthenticated);
			},
			// Cookie-authed: reload restores the session, a fresh visit does not.
			getCurrentUser() {
				if (!hasSessionCookie()) {
					throw new ConnectError("no session", Code.Unauthenticated);
				}
				return adminSession();
			},
			logout() {
				clearSessionCookie();
				return {};
			},
		});
	});
	return createClient(AuthService, transport);
}
