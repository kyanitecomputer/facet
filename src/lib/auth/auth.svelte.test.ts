import { UserRole } from "@kyanite/schema/schema/v1/auth_pb";
import { beforeEach, describe, expect, it } from "vitest";
import {
	getSession,
	isAuthenticated,
	login,
	logout,
	registerAuthClient,
	restore,
} from "./auth.svelte";
import { createMockAuthClient } from "./mock-auth";

describe("auth store (mock AuthService client)", () => {
	beforeEach(async () => {
		await logout();
		registerAuthClient(createMockAuthClient());
	});

	it("accepts admin:admin and stores an admin session", async () => {
		const result = await login({ username: "admin", password: "admin" });

		expect(result.ok).toBe(true);
		expect(isAuthenticated()).toBe(true);
		expect(getSession()?.role).toBe(UserRole.ADMIN);
		expect(getSession()?.accessToken).toBe("mock-access-token");
		expect(getSession()?.expiresAt).toBeInstanceOf(Date);
	});

	it("rejects wrong credentials and stays signed out", async () => {
		const result = await login({ username: "admin", password: "nope" });

		expect(result).toEqual({ ok: false, error: "invalid_credentials" });
		expect(isAuthenticated()).toBe(false);
	});

	it("does not restore without a prior login (no cookie)", async () => {
		expect(await restore()).toBe(false);
		expect(isAuthenticated()).toBe(false);
	});

	it("restores a session after login (cookie-authed reload)", async () => {
		await login({ username: "admin", password: "admin" });
		// A reload drops in-memory state but the cookie persists; restore re-mints.
		expect(await restore()).toBe(true);
		expect(getSession()?.username).toBe("admin");
	});

	it("clears the session on logout and stops restoring", async () => {
		await login({ username: "admin", password: "admin" });
		await logout();

		expect(isAuthenticated()).toBe(false);
		expect(await restore()).toBe(false);
	});
});
