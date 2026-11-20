# Testing on a real device

Steps to run Sonora on your own phone and execute the Maestro auth flow. Nothing here creates cloud
resources unless you choose the EAS build option.

## 1. Prerequisites (one time)

1. **Bundle identifiers** (open question Q7/Q15). Add them to `apps/mobile/app.json`:
   ```json
   "ios": { "bundleIdentifier": "<your.bundle.id>" },
   "android": { "package": "<your.package.name>" }
   ```
2. **A development build.** `react-native-track-player` (M4) and other native modules mean Expo Go is not enough. Pick one:
   - **Android, local:** install Android Studio (SDK + platform tools), enable USB debugging on the phone, connect it, then
     `pnpm --filter @sonora/mobile android`.
   - **iOS, local:** needs a Mac with Xcode: `pnpm --filter @sonora/mobile ios --device`.
   - **EAS (cloud build):** `npx eas-cli@latest build --profile development --platform android|ios`. This uses your Expo account; check the free-tier limits first.
3. **Maestro:** `curl -fsSL "https://get.maestro.mobile.dev" | bash` (needs Java 17+).

## 2. Run the API where the phone can reach it

```bash
docker compose -f infra/docker-compose.dev.yml up -d
pnpm --filter @sonora/api db:migrate
pnpm --filter @sonora/api dev            # listens on 0.0.0.0:3000
```

In `apps/mobile/.env`, point the app at your computer's LAN IP (phone and computer on the same Wi-Fi):

```bash
EXPO_PUBLIC_API_URL=http://192.168.x.y:3000
```

Then restart the dev server: `pnpm --filter @sonora/mobile start --clear`.

> Plain HTTP to a LAN IP is for development only. iOS may require an App Transport Security exception for it in a dev build; production uses HTTPS through Caddy.

## 3. Automated flow (Maestro)

```bash
maestro test -e APP_ID=<your.bundle.id> apps/mobile/.maestro/auth.yaml
```

The flow signs up a new `maestro-<timestamp>@example.com` account, lands on Início, relaunches the app (still signed in), opens Biblioteca and signs out back to the Welcome screen.

## 4. Manual checklist (M2 screens)

| Check                | How                                                                                 | Expected                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Login error          | Wrong password                                                                      | Short horizontal shake; red border and “⚠ E-mail ou senha incorretos” under the password field     |
| Reduce Motion        | iOS: Settings › Accessibility › Motion › Reduce Motion · Android: Remove animations | Shake and screen pushes become a quick fade                                                        |
| VoiceOver / TalkBack | Swipe through Welcome, Login and Sign up                                            | Every control is announced with label, role and state; errors are read out; order is top to bottom |
| Text at 200%         | Largest accessibility text size                                                     | No clipped text; screens scroll                                                                    |
| Keyboard             | Focus each field                                                                    | Content stays visible; “próximo” moves to the next field                                           |
| Session              | Sign in, kill the app, reopen                                                       | Opens on Início without asking for the password                                                    |
| Offline launch       | Airplane mode, reopen while signed in                                               | Still signed in (cached profile)                                                                   |
| Glass                | Tab bar on iOS 26+ and with Reduce Transparency on                                  | Liquid Glass; solid fallback when transparency is reduced and on Android                           |

## 5. Player checklist (M4)

| Check               | How                                                                      | Expected                                                   |
| ------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Play                | Tap a track on Início or Buscar                                          | Mini player appears above the tab bar; audio starts        |
| Background          | Lock the phone / switch apps                                             | Audio keeps playing                                        |
| Lock screen         | Use play/pause, next, previous, ±15 s on the lock screen or notification | Each control works; artwork and title shown                |
| Interruptions       | Receive a call / start another audio app                                 | Playback pauses and resumes as the OS decides              |
| Silent switch (iOS) | Turn on silent mode                                                      | Music still plays                                          |
| Long session        | Play for more than 15 minutes, then skip                                 | The next track loads (access token is refreshed per track) |
| Queue               | Player › Fila: drag the handle, swipe left to remove, VoiceOver actions  | Order changes; removed rows animate out                    |
| History             | Listen to a track for 30 s                                               | It shows up in “Continuar ouvindo” on Início               |
| New Architecture    | Any of the above failing at the native level                             | Report it: see open question Q18 (RNTP vs expo-audio)      |

Please note the device, OS version and any failure (with a screenshot) so it can be fixed.
