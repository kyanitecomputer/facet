/**
 * Mock backend (Layer A + B) — public surface.
 *
 * Build/dev/test selects the mock via the PUBLIC_USE_MOCK env flag (see
 * src/lib/nats.svelte.ts). It is dynamically imported so it is tree-shaken out
 * of production builds when the flag is off.
 */

export { MockTransport, type PublishedMessage } from "./mock-transport";
export {
	type CairnProfile,
	echoSerial,
	type MockScenario,
	type MockStream,
	type NodeKind,
	type NodeProfile,
	type RequestRoute,
	route,
	type SerialBridge,
	stream,
	type VeinProfile,
} from "./scenario";
export { rackMixed } from "./scenarios/rack-mixed";
export { singleBmc } from "./scenarios/single-bmc";
export { vega } from "./scenarios/vega";
export { matchSubject } from "./subject";

import { MockTransport } from "./mock-transport";
import type { MockScenario } from "./scenario";
import { rackMixed } from "./scenarios/rack-mixed";
import { singleBmc } from "./scenarios/single-bmc";
import { vega } from "./scenarios/vega";

/** Registry of selectable scenarios, keyed by name (see PUBLIC_MOCK_SCENARIO). */
export const scenarios: Record<string, MockScenario> = {
	[rackMixed.name]: rackMixed,
	[singleBmc.name]: singleBmc,
	[vega.name]: vega,
};

/** Default scenario used when none is supplied or a name is unknown. */
export const defaultScenario: MockScenario = rackMixed;

/** Resolve a scenario by name, falling back to the default (with a warning). */
export function resolveScenario(name: string): MockScenario {
	const scenario = scenarios[name];
	if (!scenario) {
		console.warn(
			`mock: unknown scenario "${name}", using "${defaultScenario.name}". ` +
				`Known: ${Object.keys(scenarios).join(", ")}.`,
		);
		return defaultScenario;
	}
	return scenario;
}

/** Create a mock transport for the given scenario (defaults to `rackMixed`). */
export function createMockTransport(
	scenario: MockScenario = defaultScenario,
): MockTransport {
	return new MockTransport(scenario);
}
