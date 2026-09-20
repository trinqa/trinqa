# Push notifications

Trinqa sends push through **Expo's push service**, so the backend never talks to APNs or
FCM directly: it posts to `https://exp.host/--/api/v2/push/send` with the Expo push tokens
the app registered.

## How a device becomes reachable

1. After the welcome screen, the app asks for notification permission.
2. With permission granted it fetches an Expo push token. The token is issued per **EAS
   project**, so `apps/mobile/app.json` carries `extra.eas.projectId`
   (`bca104c4-e984-41ed-a256-51afd2b3faa6`, project `@cengizhankose/trinqa`). Without that id
   no token can be issued.
3. Once onboarding has created the device's custodial wallet, the app registers the token
   against that account. The backend stores it keyed by the **Stellar account**, never by the
   wallet key.

A device that refuses permission, runs in a simulator, or fails to register stays fully
usable — every step fails soft.

## What the backend sends

| Event | Title | Opens | Fires with the app closed |
|-------|-------|-------|---------------------------|
| USDC arrives in an account | `Money arrived` | `/activity` | yes |
| An anchor deposit completes | `Money added` | `/activity` | no |
| An anchor withdrawal is paid out | `Money sent` | `/activity` | no |
| An anchor transfer fails | `Deposit/Withdrawal didn’t go through` | `/activity` | no |
| A yield deposit executes | `Your money started earning` | `/earn` | no |
| A multi-step payment finishes | `Payment sent` | `/activity` | no |

Every payload carries `data.route`, one of the deep links the app allows.

### The watcher

The backend is request-driven, so anything that happens while the app is closed is invisible
to it. The one thing that is always observable is the ledger, so
`IncomingPaymentWatcher` polls Horizon for **incoming** USDC payments to every account that
has a registered device, and notifies that account. Payments an account sent to itself, and
payments in any other asset, are ignored.

This also covers a completed anchor deposit, because the anchor credits the USDC on chain.
The anchor's own SEP-6 status is *not* polled in the background: reading it needs the user's
SEP-10 session, which only exists for the duration of a request.

A per-account Horizon paging cursor lives next to the other JSON state
(`horizon-cursors.json` in `OPERATIONS_DATA_DIR`), so a restart does not replay old payments.
The first time the watcher sees an account it pins the cursor to the account's newest payment
and notifies nothing, so a device that registers today never gets a burst about last month.

A Horizon outage, a bad cursor or an Expo error leaves a log line and the cursor untouched;
the window is simply retried on the next tick. Nothing the watcher does can fail a request.

### The other events

The remaining five are request-time hooks, fired where the backend learns the status while
serving a call — the anchor transfer-status handler, `POST /api/v1/yield/execute`, and the
last step of `POST /api/v1/payments/execute-step`. Each compares against the stored status and
fires only on a genuine transition into a terminal state, so a client polling every two
seconds gets at most one notification. Because they ride on a request, they only fire while
someone is using the app.

### Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `PUSH_WATCHER_ENABLED` | `true` (`false` under `NODE_ENV=test`) | Runs the Horizon watcher |
| `PUSH_WATCHER_INTERVAL_MS` | `15000` | Milliseconds between passes, minimum 1000 |

The watcher is off under tests, which drive a single `tick()` directly. It is stopped on the
Fastify `onClose` hook, so `SIGINT`/`SIGTERM` shut it down cleanly.

## Setup needed once, per platform

Delivery needs credentials Expo holds on the project's behalf. These steps need an Apple
or Google account, so they cannot be scripted here.

**iOS**

```bash
cd apps/mobile
npx expo prebuild -p ios --clean   # regenerates ios/ with the push entitlement
npx eas-cli credentials            # choose iOS → push key, let EAS create the APNs key
```

The app must then be rebuilt from Xcode. Two things to re-check in the regenerated project,
because prebuild overwrites `ios/`:

- the signing team (the paid individual team, so the build does not expire in 7 days),
- `ENABLE_USER_SCRIPT_SANDBOXING` must be `NO`, or the React Native bundling phase fails with
  `ip.txt: Operation not permitted`.

**Android**

```bash
npx eas-cli credentials            # choose Android → upload the FCM v1 service account key
```

Until the credentials exist, registration and sending both still work end to end; Expo simply
reports the push as undeliverable, and the backend prunes tokens it reports as
`DeviceNotRegistered`.

## Testing without a device

The send path can be exercised against a throwaway token: Expo answers a request for an
unknown token with `status: "error"` and `details.error: "DeviceNotRegistered"`, which is the
same shape the sender prunes on. A real end-to-end delivery needs a physical device, since
simulators are not issued push tokens.
