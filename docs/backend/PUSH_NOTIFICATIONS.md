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

| Event | Who gets it |
|-------|-------------|
| USDC arrives in an account | the account holder |
| An anchor deposit completes | the account that deposited |
| An anchor withdrawal is paid out | the account that withdrew |
| Money starts earning | the account that deposited into the vault |

Incoming payments and anchor transfers are observed by background watchers, because the
backend is otherwise request-driven and would never notice an event that lands while the app
is closed. The watchers only run for accounts that have a registered token.

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
