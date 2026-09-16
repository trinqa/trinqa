# iOS Simulator QA Blocker

**Date:** 2026-09-16  
**Status:** TASK NOT COMPLETE — simulator QA blocked

## Environment

| Check | Result |
|---|---|
| OS | Linux 6.12.94+ (x86_64) |
| `xcrun` | Not found |
| `/Applications/Xcode.app` | Not present |
| iOS Simulator | **Unavailable** |

## Required to unblock

1. macOS machine with Xcode installed
2. Run:

```bash
xcrun simctl list devices available
cd apps/mobile
npm install
npm run ios
```

3. Navigate Home / Pay / Earn / Activity tabs
4. Capture screenshots:

```bash
mkdir -p qa/screenshots
xcrun simctl io booted screenshot qa/screenshots/home.png
# switch tabs, repeat for pay, earn, activity
```

5. Compare against `references/phase1-ui-reference.jpeg`

## QA script

See `qa/scripts/run-ios-qa.sh` (macOS only).
