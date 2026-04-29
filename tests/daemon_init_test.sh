#!/usr/bin/env bash
# tests/daemon_init_test.sh — TDD test for Task 3: daemon package init
# Verifies daemon/ directory structure and package setup

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DAEMON_DIR="$ROOT_DIR/daemon"

passed=0
failed=0

assert() {
  local desc="$1"
  local condition="$2"
  if eval "$condition"; then
    echo "  PASS: $desc"
    passed=$((passed + 1))
  else
    echo "  FAIL: $desc"
    failed=$((failed + 1))
  fi
}

echo "--- daemon_init tests ---"

# Task 3-A: daemon directory and package files exist
assert "daemon/ directory exists" "[ -d '$DAEMON_DIR' ]"
assert "daemon/package.json exists" "[ -f '$DAEMON_DIR/package.json' ]"
assert "daemon/tsconfig.json exists" "[ -f '$DAEMON_DIR/tsconfig.json' ]"
assert "daemon/src/index.ts exists" "[ -f '$DAEMON_DIR/src/index.ts' ]"

# package.json name is @claude-loom/daemon
assert "daemon package name is @claude-loom/daemon" \
  "node -e \"const p=require('$DAEMON_DIR/package.json'); process.exit(p.name === '@claude-loom/daemon' ? 0 : 1)\""

# package.json type is module
assert "daemon package type is module" \
  "node -e \"const p=require('$DAEMON_DIR/package.json'); process.exit(p.type === 'module' ? 0 : 1)\""

# daemon/tsconfig.json extends ../tsconfig.base.json
assert "daemon tsconfig extends ../tsconfig.base.json" \
  "node -e \"const t=require('$DAEMON_DIR/tsconfig.json'); process.exit(t.extends === '../tsconfig.base.json' ? 0 : 1)\""

# Task 3-C: Dependencies installed (node_modules present)
assert "daemon/node_modules/@trpc/server installed" "[ -d '$DAEMON_DIR/node_modules/@trpc/server' ]"
assert "daemon/node_modules/fastify installed" "[ -d '$DAEMON_DIR/node_modules/fastify' ]"
assert "daemon/node_modules/drizzle-orm installed" "[ -d '$DAEMON_DIR/node_modules/drizzle-orm' ]"
assert "daemon/node_modules/nanoid installed" "[ -d '$DAEMON_DIR/node_modules/nanoid' ]"
assert "daemon/node_modules/vitest installed" "[ -d '$DAEMON_DIR/node_modules/vitest' ]"
assert "daemon/node_modules/tsx installed" "[ -d '$DAEMON_DIR/node_modules/tsx' ]"
assert "daemon/node_modules/better-sqlite3 installed" "[ -d '$DAEMON_DIR/node_modules/better-sqlite3' ]"
assert "daemon/node_modules/zod installed" "[ -d '$DAEMON_DIR/node_modules/zod' ]"

echo ""
echo "daemon_init: Passed=$passed Failed=$failed"
[ "$failed" -eq 0 ]
