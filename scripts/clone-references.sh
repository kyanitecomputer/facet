#!/usr/bin/env bash
#
# clone-references.sh — fetch third-party repos into ./3rdparty for reference.
#
# These checkouts are READ-ONLY references for best practices (WAI-ARIA
# conformance, tree-shaking, Svelte 5 rune patterns, charting, transport/proto).
# We do NOT vendor or copy their code — Facet components are written from scratch.
# The 3rdparty/ folder is git-ignored so nothing here is ever committed or
# redistributed, keeping our Apache-2.0 OR MIT licensing clean.
#
# Usage:
#   scripts/clone-references.sh           # clone/update the curated set
#   scripts/clone-references.sh --tier 1  # only the must-have references
#
# Shallow clones (--depth 1) keep this fast and small.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/3rdparty"
TIER="${2:-all}"
[ "${1:-}" = "--tier" ] || TIER="all"

# name|tier|url|why
REPOS=(
	# --- Tier 1: components & WAI-ARIA conformance (closest to our work) ---
	"bits-ui|1|https://github.com/huntabyte/bits-ui|Svelte 5 headless accessible primitives; rune patterns + ARIA"
	"shadcn-svelte|1|https://github.com/huntabyte/shadcn-svelte|In-repo copyable component structure on Tailwind"
	"melt|1|https://github.com/melt-ui/next-gen|Runes-based builder primitives; ARIA keyboard/focus logic"
	"react-spectrum|1|https://github.com/adobe/react-spectrum|react-aria: the reference WAI-ARIA behaviour/focus/keyboard impl"
	"aria-practices|1|https://github.com/w3c/aria-practices|APG: authoritative ARIA design patterns + keyboard interaction"

	# --- Tier 2: Svelte 5 runes, tree-shaking, charting ---
	"svelte|2|https://github.com/sveltejs/svelte|Rune internals, \$state/\$derived/\$effect patterns and tests"
	"runed|2|https://github.com/svecosystem/runed|Community rune utilities (watchers, resources, lifecycle)"
	"uPlot|2|https://github.com/leeoniya/uPlot|Our chart dep: examples, perf patterns, canvas API usage"
	"layerchart|2|https://github.com/techniq/layerchart|Svelte-native SVG charting + Tailwind theming (the LayerChart alt)"
	"radix-primitives|2|https://github.com/radix-ui/primitives|Unstyled accessible primitives; ARIA patterns reference"

	# --- Tier 3: transport / wire / observability (for later phases) ---
	"nats.js|3|https://github.com/nats-io/nats.js|WS reconnect, JetStream, auth-callout client patterns"
	"protobuf-es|3|https://github.com/bufbuild/protobuf-es|protoc-gen-es output shape + tree-shakable codegen"
	"protovalidate-es|3|https://github.com/bufbuild/protovalidate-es|Our validator dep: API + buf.validate usage"
	"connect-es|3|https://github.com/connectrpc/connect-es|For the future ConnectRPC adapter (deferred)"
	"opentelemetry-js|3|https://github.com/open-telemetry/opentelemetry-js|Web SDK wiring + tree-shaking reference"
	"axe-core|3|https://github.com/dequelabs/axe-core|Automated a11y checks (pairs with @axe-core/playwright)"
)

mkdir -p "$DEST"

for entry in "${REPOS[@]}"; do
	IFS='|' read -r name tier url why <<<"$entry"
	if [ "$TIER" != "all" ] && [ "$tier" != "$TIER" ]; then
		continue
	fi
	target="$DEST/$name"
	if [ -d "$target/.git" ]; then
		echo "↻ updating $name"
		git -C "$target" pull --ff-only --quiet || echo "  (skip: $name has local changes)"
	else
		echo "⬇ cloning $name — $why"
		git clone --depth 1 --quiet "$url" "$target"
	fi
done

echo "Done. References in $DEST (git-ignored)."
