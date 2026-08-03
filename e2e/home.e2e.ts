import { expect, type Page, test } from "@playwright/test";

// The e2e build runs with PUBLIC_USE_MOCK=true, so the mock authenticator
// accepts admin/admin and the mock backend serves the rack-mixed scenario.
async function signIn(page: Page): Promise<void> {
	await page.goto("/login");
	await page.getByLabel("Username").fill("admin");
	await page.getByLabel("Password").fill("admin");
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(
		page.getByRole("heading", { name: "Fabric overview" }),
	).toBeVisible();
}

test("unauthenticated visit is redirected to the login page", async ({
	page,
}) => {
	await page.goto("/");
	await expect(page).toHaveURL(/\/login$/);
	await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("rejects invalid credentials", async ({ page }) => {
	await page.goto("/login");
	await page.getByLabel("Username").fill("admin");
	await page.getByLabel("Password").fill("wrong");
	await page.getByRole("button", { name: "Sign in" }).click();

	await expect(page.getByText("Invalid username or password.")).toBeVisible();
});

test("overview loads after sign-in", async ({ page }) => {
	await signIn(page);

	await expect(page.getByRole("link", { name: "Nodes" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();

	// The uPlot telemetry chart renders a canvas once hydrated.
	await expect(page.locator("canvas").first()).toBeVisible();
});

test("a signed-in session survives a page reload", async ({ page }) => {
	await signIn(page);

	// Reload drops in-memory state; the session cookie authorizes a
	// GetCurrentUser that re-mints the access token, so there is no bounce to
	// /login and the app reappears signed in.
	await page.reload();

	await expect(page).toHaveURL(/\/$/);
	await expect(
		page.getByRole("heading", { name: "Fabric overview" }),
	).toBeVisible();
});

test("switching language in the login page keeps it usable", async ({
	page,
}) => {
	await page.goto("/login");
	await page.getByLabel("Language").selectOption("de");

	// The locale change is applied in place (no reload, no localized route),
	// so the login form stays on /login and renders in German.
	await expect(page).toHaveURL(/\/login$/);
	await expect(page.getByRole("button", { name: "Anmelden" })).toBeVisible();
});

test("switching language while signed in preserves the session", async ({
	page,
}) => {
	await signIn(page);
	await page.getByLabel("Language").selectOption("de");

	// Regression: a language switch used to trigger a full reload that wiped the
	// in-memory session (blank page). It must now stay on the app, signed in.
	await expect(page).toHaveURL(/\/$/);
	await expect(
		page.getByRole("heading", { name: "Fabric-Übersicht" }),
	).toBeVisible();
});

test("navigates to the nodes route and lists mock inventory", async ({
	page,
}) => {
	await signIn(page);
	await page.getByRole("link", { name: "Nodes" }).click();

	await expect(page).toHaveURL(/\/nodes$/);
	await expect(page.getByRole("heading", { name: "Nodes" })).toBeVisible();

	// The default rack-mixed mock scenario reports a switch, a BMC, and an RMC.
	await expect(page.getByText("spine-1")).toBeVisible();
	await expect(page.getByRole("cell", { name: "Switch" })).toBeVisible();
});

test("defaults to dark theme and toggles to light", async ({ page }) => {
	await page.goto("/login");
	await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

	await page.getByRole("button", { name: "Switch to light theme" }).click();
	await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("exposes the expanded navigation after sign-in", async ({ page }) => {
	await signIn(page);

	for (const label of [
		"Dashboard",
		"Nodes",
		"Remote",
		"Monitoring",
		"Logs",
		"Settings",
	]) {
		await expect(page.getByRole("link", { name: label })).toBeVisible();
	}
});

test("remote page shows console panels and a toggleable keyboard", async ({
	page,
}) => {
	await signIn(page);
	await page.getByRole("link", { name: "Remote" }).click();

	await expect(page).toHaveURL(/\/remote$/);
	await expect(
		page.getByRole("heading", { name: "Serial console" }),
	).toBeVisible();

	// The on-screen keyboard is hidden until toggled on.
	await expect(page.getByRole("button", { name: "q" })).toHaveCount(0);
	await page.getByRole("button", { name: "Keyboard" }).click();
	await expect(page.getByRole("button", { name: "q" })).toBeVisible();
});

test("the KVM subwindow is omitted for a switch and present for a BMC", async ({
	page,
}) => {
	await signIn(page);
	await page.getByRole("link", { name: "Remote" }).click();

	// The default node is the switch (spine-1), which advertises no KVM: the
	// subwindow is omitted entirely (no notice), but the serial console remains.
	await expect(page.getByRole("heading", { name: "KVM" })).toHaveCount(0);
	await expect(
		page.getByRole("heading", { name: "Serial console" }),
	).toBeVisible();

	// The BMC advertises KVM, so the panel appears and a session starts on intent.
	await page.getByLabel("Node").selectOption("bmc-7");
	await expect(page.getByRole("heading", { name: "KVM" })).toBeVisible();
	const connect = page.getByRole("button", { name: "Connect", exact: true });
	await expect(connect).toBeVisible();
	await connect.click();
	await expect(
		page.getByRole("button", { name: "Disconnect", exact: true }),
	).toBeVisible();
});

test("a BMC offers multiple serial targets; a switch offers one", async ({
	page,
}) => {
	await signIn(page);
	await page.getByRole("link", { name: "Remote" }).click();

	// Switch default: a single console target, so no target picker is shown.
	await expect(page.getByLabel("Node")).toHaveValue("spine-1");
	await expect(page.getByLabel("Target")).toHaveCount(0);

	// The BMC exposes its shell plus the managed host's SOL → a target picker.
	await page.getByLabel("Node").selectOption("bmc-7");
	await expect(page.getByLabel("Target")).toBeVisible();
	await expect(page.getByRole("option", { name: "Host (SOL)" })).toBeAttached();
});

test("switch node detail renders the switching feature sections", async ({
	page,
}) => {
	await signIn(page);
	await page.getByRole("link", { name: "Nodes" }).click();

	// Open the switch detail page from the inventory.
	await page.getByRole("link", { name: "spine-1" }).click();
	await expect(page).toHaveURL(/\/nodes\/spine-1$/);

	// A representative spread of the switch's capabilities is rendered.
	await expect(page.getByRole("heading", { name: "Ports" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "VLANs" })).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Access control lists" }),
	).toBeVisible();
	await expect(page.getByText("ge0").first()).toBeVisible();

	// spine-1 is a switch that advertises thermal/power monitoring (unlike the
	// passively-cooled Vega), so a capability-driven Monitoring section appears.
	await expect(page.getByRole("heading", { name: "Monitoring" })).toBeVisible();
	await expect(page.getByText("Temperature")).toBeVisible();
});

test("switch port admin state can be toggled", async ({ page }) => {
	await signIn(page);
	await page.goto("/nodes/spine-1");

	// ge6 ships administratively down; its admin cell is a toggle button (the
	// only button in the row; the link column is a static badge).
	const toggle = page
		.getByRole("row")
		.filter({ hasText: "ge6" })
		.getByRole("button");
	await expect(toggle).toHaveText("down");
	await toggle.click();
	await expect(toggle).toHaveText("up");
});

test("a VLAN can be created and deleted on a switch", async ({ page }) => {
	await signIn(page);
	await page.goto("/nodes/spine-1");

	await expect(page.getByRole("heading", { name: "VLANs" })).toBeVisible();
	await page.getByLabel("VID").fill("99");
	await page.getByLabel("Name").fill("guests");
	await page.getByRole("button", { name: "Add VLAN" }).click();

	const vlanRow = page.getByRole("row").filter({ hasText: "guests" });
	await expect(vlanRow).toBeVisible();

	await vlanRow.getByRole("button", { name: "Delete" }).click();
	await expect(page.getByRole("row").filter({ hasText: "guests" })).toHaveCount(
		0,
	);
});

test("management settings can be edited and persist across navigation", async ({
	page,
}) => {
	await signIn(page);
	await page.getByRole("link", { name: "Settings" }).click();

	const hostname = page.getByLabel("Hostname");
	await expect(hostname).toHaveValue("vega");
	await hostname.fill("vega-renamed");
	// Save the Network section (the Save button within the same form).
	const networkForm = page.locator("form", { has: hostname });
	await networkForm.getByRole("button", { name: "Save" }).click();

	// Re-enter the page: the mock persisted the change and it re-loads.
	await page.getByRole("link", { name: "Nodes" }).click();
	await page.getByRole("link", { name: "Settings" }).click();
	await expect(page.getByLabel("Hostname")).toHaveValue("vega-renamed");
});

test("power control is offered for a power-capable node and confirms actions", async ({
	page,
}) => {
	await signIn(page);
	// bmc-7 advertises power_control (the switch spine-1 does not).
	await page.goto("/nodes/bmc-7");

	const power = page.locator("section", { hasText: "Power" });
	await expect(power.getByRole("heading", { name: "Power" })).toBeVisible();

	// A destructive action is a two-step confirm, then the reported state updates.
	await power.getByRole("button", { name: "Force off" }).click();
	await power.getByRole("button", { name: "Confirm" }).click();
	// Exact match: the state badge is "Off" (avoids matching the "Force off" button).
	await expect(power.getByText("Off", { exact: true })).toBeVisible();
});

test("remote serial console attaches over NATS and echoes input", async ({
	page,
}) => {
	await signIn(page);
	await page.getByRole("link", { name: "Remote" }).click();
	await expect(page).toHaveURL(/\/remote$/);

	// The node picker defaults to the first inventory node (rack-mixed).
	await expect(page.getByLabel("Node")).toHaveValue("spine-1");

	// The mock serial bridge greets the console once the stream attaches.
	await expect(page.getByText("(mock)")).toBeVisible();

	// Typing on the on-screen keyboard publishes bytes to serial.<node>.in; the
	// mock device echoes them on serial.<node>.out, which xterm renders. Scope
	// the assertion to the serial panel so it can't match UI chrome that happens
	// to contain "hi" (e.g. "This device has no KVM", "Hide keyboard").
	const serialPanel = page.locator("section", { hasText: "Serial console" });
	await page.getByRole("button", { name: "Keyboard" }).click();
	await page.getByRole("button", { name: "h", exact: true }).click();
	await page.getByRole("button", { name: "i", exact: true }).click();
	await expect(serialPanel.getByText("hi")).toBeVisible();
});
