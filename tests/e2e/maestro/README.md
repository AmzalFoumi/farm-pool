# UI end-to-end flows (Maestro)

These drive the **real app on a simulator**, tapping what a person taps. They sit beside the HTTP
tests in `tests/e2e/` and catch a different class of bug — the HTTP tests prove the api is right,
these prove the screens are wired to it.

Two bugs found by hand on 5 October 2026 are exactly what these exist to catch automatically, and
neither was visible to `tsc` or to 178 passing unit tests:

- the Place order sheet crashed on open, because a `useAuth()` inside a portal is outside
  `AuthProvider`
- the map rendered as a blank white box on iOS, because Expo Go has no Google Maps iOS SDK

## Running them

```bash
# 1. api (any port; 3000 is often taken)
PORT=3100 npm run start:dev -w api

# 2. Metro, in Expo Go mode, with the app pointed at that api
#    mobile/.env → EXPO_PUBLIC_API_URL=http://localhost:3100
npx expo start --go

# 3. the flows
~/.maestro/bin/maestro test tests/e2e/maestro
```

## Why `openLink`, not `launchApp`

Under Expo Go the app has no bundle id of its own — it runs inside Expo's container, so
`launchApp` with `com.farmpool.app` finds nothing. The Maestro React Native guide says to deep
link instead, which is what every flow here does. Against a development build or an EAS build,
`launchApp: com.farmpool.app` would be correct.

## Selectors

**Target `testID`, never visible text.** The app ships in English, Sinhala and Tamil, so a flow
matching "Send request" passes or fails depending on a setting that has nothing to do with the
thing being tested. Every element a flow touches carries a `testID`; `AppButton` and
`AppTextField` forward the prop for this purpose.

## What they assume

A signed-in **buyer** session already on the simulator, and at least one verified listing. These
flows do not sign in — the session is in `expo-secure-store` and persists between runs, and a
flow that signed in every time would be testing sign-in rather than the thing it names.
