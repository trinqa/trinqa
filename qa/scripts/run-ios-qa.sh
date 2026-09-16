#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
MOBILE_DIR="$ROOT_DIR/apps/mobile"
SCREENSHOT_DIR="$ROOT_DIR/qa/screenshots"
DEVICE_NAME="${DEVICE_NAME:-iPhone 16 Pro}"

if ! command -v xcrun >/dev/null 2>&1; then
  echo "BLOCKER: xcrun not found. iOS Simulator requires macOS + Xcode."
  exit 1
fi

mkdir -p "$SCREENSHOT_DIR"

echo "Listing available simulators..."
xcrun simctl list devices available

echo "Booting simulator: $DEVICE_NAME"
xcrun simctl boot "$DEVICE_NAME" 2>/dev/null || true
open -a Simulator

cd "$MOBILE_DIR"
npm install
npm run typecheck
npx expo-doctor

echo "Starting Expo iOS app..."
npm run ios &
EXPO_PID=$!

sleep 25

capture() {
  local name="$1"
  local path="$SCREENSHOT_DIR/${name}.png"
  xcrun simctl io booted screenshot "$path"
  echo "Saved $path"
}

capture "home"
# Manual or automated tab navigation required for remaining tabs.
# TODO: add Maestro / AppleScript tab switching once stable selectors exist.

wait "$EXPO_PID" || true
