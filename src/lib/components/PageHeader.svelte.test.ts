import { expect, test } from "vitest";
import { render } from "vitest-browser-svelte";
import PageHeader from "./PageHeader.svelte";

test("renders the title and optional subtitle", async () => {
	const screen = render(PageHeader, {
		title: "Overview",
		subtitle: "Monitor everything",
	});

	await expect
		.element(screen.getByRole("heading", { name: "Overview" }))
		.toBeInTheDocument();
	await expect
		.element(screen.getByText("Monitor everything"))
		.toBeInTheDocument();
});

test("omits the subtitle when not provided", async () => {
	const screen = render(PageHeader, { title: "Nodes" });

	await expect
		.element(screen.getByRole("heading", { name: "Nodes" }))
		.toBeInTheDocument();
});
