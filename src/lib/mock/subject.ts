/**
 * subject.ts — NATS-style subject matching for the mock backend.
 *
 * Supports the two NATS wildcards so subscription patterns behave like the real
 * transport:
 *   `*` matches exactly one token, e.g. `telemetry.*.cpu`
 *   `>` matches one or more trailing tokens, e.g. `telemetry.>`
 */

/** Returns true when `subject` matches the subscription `pattern`. */
export function matchSubject(pattern: string, subject: string): boolean {
	if (pattern === subject) return true;

	const patternTokens = pattern.split(".");
	const subjectTokens = subject.split(".");

	for (let i = 0; i < patternTokens.length; i++) {
		const token = patternTokens[i];

		if (token === ">") {
			// `>` must be the final token and matches all remaining tokens.
			return i === patternTokens.length - 1 && subjectTokens.length > i;
		}

		if (i >= subjectTokens.length) return false;
		if (token === "*") continue;
		if (token !== subjectTokens[i]) return false;
	}

	return patternTokens.length === subjectTokens.length;
}
