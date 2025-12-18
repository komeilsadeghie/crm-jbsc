#!/bin/sh
# Cross-platform script to run vite build
# This script finds vite and runs it

set -e

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Try to find vite
VITE_PATH=""

# Method 1: Check if vite is in node_modules/.bin (symlink)
if [ -f "$PROJECT_ROOT/node_modules/.bin/vite" ]; then
  VITE_PATH="$PROJECT_ROOT/node_modules/.bin/vite"
# Method 2: Check if vite.js is in node_modules/vite/bin
elif [ -f "$PROJECT_ROOT/node_modules/vite/bin/vite.js" ]; then
  VITE_PATH="$PROJECT_ROOT/node_modules/vite/bin/vite.js"
# Method 3: Check if vite cli is in node_modules/vite/dist/node/cli.js
elif [ -f "$PROJECT_ROOT/node_modules/vite/dist/node/cli.js" ]; then
  VITE_PATH="$PROJECT_ROOT/node_modules/vite/dist/node/cli.js"
else
  echo "Error: Could not find vite executable" >&2
  echo "Searched in: $PROJECT_ROOT" >&2
  exit 1
fi

# Run vite with node
cd "$PROJECT_ROOT"
exec node "$VITE_PATH" "$@"

