# Development build: machine setup

How to prepare a computer to build and run FarmPool as an Expo **development build** instead of
Expo Go. Video calling (FARM-40) needs this: its SDK ships native code, and Expo Go can only run the
native code already built into it. A development build is our own version of Expo Go, built from
this project, and it still reloads JavaScript instantly the way Expo Go does.

This page is written from the setup on **Amzal's machine (Windows 11, Git Bash, Android Studio,
2026-09-28)**. Your machine may differ. Each step says what to check, and
[Your machine](#your-machine-what-differs) lists what changes on macOS, Linux or a different
Windows setup.

We build **locally**, not on EAS (Expo's cloud build service). The EAS free tier is 15 Android
builds a month, with a queue that can take 90+ minutes.

## 1. Android Studio → SDK Manager

Open **Tools → SDK Manager** (Settings → Languages & Frameworks → Android SDK). Check:

| Tab | Must be installed | Why |
| --- | --- | --- |
| SDK Platforms | Android 16.0, **API 36** | Expo SDK 57 builds against it |
| SDK Tools | Android SDK Build-Tools | packages the app into an `.apk` |
| SDK Tools | Android SDK Platform-Tools | contains `adb`, which talks to phones and emulators |
| SDK Tools | Android Emulator (+ hypervisor driver on Windows) | the virtual phone |

- A blue dash (–) means "installed, newer version available". That is fine.
- You do not need to tick NDK, CMake or Command-line Tools. Gradle downloads the NDK on the first build if React Native or the call SDK needs it. If a build fails naming a missing NDK, tick **NDK (Side by side)**.
- Note the **Android SDK Location** at the top. The next step needs it.
- An emulator (for example "Medium Phone API 36") runs a development build just like a real phone. For a real phone, turn on Developer options → USB debugging.

## 2. Point the tools at the SDK: `ANDROID_HOME`

Expo finds `adb` and the rest of the SDK through the `ANDROID_HOME` environment variable.

**On Amzal's machine (Windows):**
1. Windows search → "Edit environment variables for your account" → User variables → **New**.
2. Set `ANDROID_HOME` = `C:\Users\User\AppData\Local\Android\Sdk`.
3. The user **Path** could not also take `%ANDROID_HOME%\platform-tools` (see issue 1 below). So `adb` was added for Git Bash only, in `~/.bashrc`:
   ```bash
   export ANDROID_HOME="/c/Users/User/AppData/Local/Android/Sdk"
   export PATH="$PATH:$ANDROID_HOME/platform-tools"
   ```
4. Close every terminal and VS Code window, and reopen them. Terminals only read variables when they start.

**Check (on any machine):**
```bash
echo $ANDROID_HOME     # your SDK path
adb devices            # emulator-5554   device   (or your phone's serial) — must say "device"
```

## 3. Build the development build

```bash
cd mobile
npx expo install expo-dev-client <native libraries>
git status                         # mobile/package.json + root package-lock.json modified
ls package-lock.json               # must be "No such file" — a lockfile inside mobile/ breaks the workspace
npx expo run:android               # first build 10–20 min; installs and opens the app
```

- `npx expo install` wraps npm and pins versions that match the project's Expo SDK. Run it inside `mobile/`; it has no project-root option.
- `app.json` needs `android.package` (the app's unique ID) before the first build.
- `npx expo run:android` generates `mobile/android/`. That folder is gitignored and regenerated from `app.json`. Never edit or commit it.
- Android Studio's **Build** menu is not used. The repo root is not an Android project.

**Day to day:**
- `npx expo start` opens the development build.
- `npx expo start --go` opens Expo Go instead.
- Press `s` in the terminal to switch between them.
- Rebuild only when a native library is added or upgraded. Share the new `.apk` from `mobile/android/app/build/outputs/apk/debug/app-debug.apk` with anyone who does not build locally.

## Issues hit on Amzal's machine

1. **"This environment variable is too large… up to 2047 characters"** when adding `%ANDROID_HOME%\platform-tools` to the user Path.
   - The Path was already long, so nothing was saved and the old Path was untouched.
   - Solved by keeping only `ANDROID_HOME` and adding `adb` in `~/.bashrc`. Expo does not need `adb` on the Path.
   - Do not hand-trim the Path to make room. Deleting the wrong entry breaks other tools.
   - Side effect: `adb` works only in Git Bash. In PowerShell or cmd, run `"%ANDROID_HOME%\platform-tools\adb"`.
2. **"WARNING: Found ~/.bashrc but no ~/.bash_profile"** on the first Git Bash after creating `~/.bashrc`.
   - Harmless. Git for Windows creates a `~/.bash_profile` that loads `~/.bashrc`.
   - It appears once only.
3. **Android Studio "Build Project" does nothing useful.** See step 3: build with `npx expo run:android`.
4. **Java version.** Expo's guide asks for JDK 17, and this machine has JDK 21 as `JAVA_HOME`.
   - This has not been tested yet.
   - If Gradle fails with a Java version error, set `JAVA_HOME` to Android Studio's bundled Java (`C:\Program Files\Android\Android Studio\jbr`) and reopen the terminals.

## Your machine: what differs

Check each row against your own machine; the steps above assume Amzal's.

| If you are on… | `ANDROID_HOME` is usually | Put the `export` lines in | Notes |
| --- | --- | --- | --- |
| Windows, Path has room | `C:\Users\<you>\AppData\Local\Android\Sdk` | Windows user Path: add `%ANDROID_HOME%\platform-tools` | Then `adb` works in every terminal and `~/.bashrc` is not needed |
| Windows, Path full (Amzal's case) | same | `~/.bashrc` (Git Bash) | `adb` only in Git Bash |
| Windows, PowerShell only | same | user environment variables (as above) | Git Bash steps do not apply |
| macOS | `$HOME/Library/Android/sdk` | `~/.zshrc` (zsh is the default shell) | Also builds iOS: Xcode + `npx expo run:ios`. The Simulator needs no Apple account. A real iPhone works with a free Apple ID, but the app must be re-run from Xcode every 7 days, with at most 3 devices |
| Linux | `$HOME/Android/Sdk` | `~/.bashrc` or `~/.zshrc` | Needs KVM enabled for a fast emulator |

Always confirm the real path from **SDK Manager → Android SDK Location** rather than trusting the
table. Whatever the machine, the two checks in step 2 are what prove the setup works.

## Sources (checked 2026-09-28)

- Expo, set up a local Android development build: https://docs.expo.dev/get-started/set-up-your-environment/?platform=android&device=physical&mode=development-build&buildEnv=local
- Expo CLI (`expo install`, `--go`, `--dev-client`): https://docs.expo.dev/more/expo-cli/
- Apple free vs paid accounts: https://developer.apple.com/support/compare-memberships/
- EAS pricing: https://expo.dev/pricing
