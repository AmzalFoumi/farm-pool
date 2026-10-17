#!/usr/bin/env bash
#
# Builds the three tester APKs and puts them in one new, timestamped folder.
#
# WHY THIS EXISTS
#   Giving the app to testers used to mean copy-pasting about ten commands from
#   .plans/development-build/README.md (section 4) and renaming each file by hand. Three mistakes
#   kept happening: running `prebuild` from the repo root, forgetting to copy a file out before the
#   next build overwrote it, and building with a missing .env value, which only showed up when a
#   tester's app crashed. This script checks the setup first, builds, and copies each file out
#   straight away.
#
# WHAT YOU GET
#   <repo>/../farmpool-apks/2026-10-17_2215/
#     FarmPool-test-2026-10-17-phone.apk      arm64 + 32-bit phones. Default. Every phone.
#     FarmPool-test-2026-10-17-phone64.apk    64-bit phones only. Smaller download.
#     FarmPool-test-2026-10-17-emulator.apk   Emulators on a laptop only (x86_64).
#     BUILD-INFO.txt                          when, which branch and commit, which api host.
#   The folder is outside the repo on purpose: `prebuild --clean` wipes mobile/android/, and
#   nothing here can be committed by accident.
#
# USAGE (from anywhere; the script moves itself into mobile/)
#   npm run build:apks -w mobile
#   npm run build:apks -w mobile -- --only phone,phone64
#   bash mobile/scripts/build-apks.sh --help
#
# OPTIONS
#   --yes              Do not ask for confirmation before wiping mobile/android/.
#   --only <list>      Comma-separated subset of: phone, phone64, emulator. Default: all three.
#   --out <dir>        Parent folder for the timestamped folder. Default: <repo>/../farmpool-apks
#   --help             Show this text.
#
# ONE-TIME SETUP (the script checks every item and tells you which one is missing)
#   1. Android Studio with SDK Platform "Android 16 / API 36", Build-Tools and Platform-Tools.
#      See .plans/development-build/README.md, section 1.
#   2. The ANDROID_HOME environment variable pointing at the SDK folder (README, section 2).
#   3. A JDK. JDK 21 is known to work on the main machine; Expo's guide asks for 17.
#   4. `npm install` done once at the repo root.
#   5. mobile/.env (copy mobile/.env.example) containing:
#        EXPO_PUBLIC_API_URL=https://...        must be https; a release build refuses http
#        GOOGLE_MAPS_ANDROID_KEY=...            without it, screens with a map crash
#   6. About 5 GB of free disk and 15 minutes. The first build downloads the Android NDK and takes
#      about 13 minutes; the second and third reuse the compiled code and take under a minute each.
#
# WHAT IT DOES NOT DO
#   - It never runs git commit, git push or anything else that changes git history.
#   - It never edits or prints your .env. The Maps key is only ever reported as "set" or "missing".
#   - It does not start the api or ngrok. The api must be reachable at EXPO_PUBLIC_API_URL when
#     testers use the app.
#
# DANGER
#   `expo prebuild --clean` DELETES and regenerates mobile/android/. That folder is generated and
#   gitignored, so nothing in git is lost, but any hand edit inside it is. The script asks first.
#
# The first failing command stops the run (set -e), so a broken build is never copied out as if it
# were good.

set -euo pipefail

# --- Where things are ---------------------------------------------------------------------------
# The script resolves its own location, so it works from the repo root, from mobile/, or via npm.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd "$MOBILE_DIR/.." && pwd)"
ENV_FILE="$MOBILE_DIR/.env"
RELEASE_APK="$MOBILE_DIR/android/app/build/outputs/apk/release/app-release.apk"

# --- The three variants -------------------------------------------------------------------------
# An "ABI" is a processor type. The native code (mostly Agora's video engine, ~90 MB per ABI) is
# compiled once per ABI listed, so fewer ABIs means a smaller APK.
ALL_VARIANTS="phone phone64 emulator"
abis_for() {
  case "$1" in
    phone) echo "arm64-v8a,armeabi-v7a" ;;
    phone64) echo "arm64-v8a" ;;
    emulator) echo "x86_64" ;;
  esac
}

# --- Options ------------------------------------------------------------------------------------
ASSUME_YES=0
ONLY="$ALL_VARIANTS"
OUT_PARENT="$REPO_DIR/../farmpool-apks"

usage() {
  sed -n '3,/^set -euo/p' "${BASH_SOURCE[0]}" | sed '$d' | sed 's/^# \{0,1\}//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --yes) ASSUME_YES=1 ;;
    --only)
      [ $# -ge 2 ] || { echo "--only needs a value, e.g. --only phone,phone64" >&2; exit 2; }
      ONLY="${2//,/ }"
      shift
      ;;
    --out)
      [ $# -ge 2 ] || { echo "--out needs a folder path" >&2; exit 2; }
      OUT_PARENT="$2"
      shift
      ;;
    --help | -h) usage; exit 0 ;;
    *) echo "Unknown option: $1 (try --help)" >&2; exit 2 ;;
  esac
  shift
done

for v in $ONLY; do
  case " $ALL_VARIANTS " in
    *" $v "*) ;;
    *) echo "Unknown variant '$v'. Choose from: $ALL_VARIANTS" >&2; exit 2 ;;
  esac
done

# --- Phase 1: preflight -------------------------------------------------------------------------
# Run EVERY check, then report all problems together, so you fix them in one go rather than
# discovering them one failed run at a time.
PROBLEMS=()
WARNINGS=()
problem() { PROBLEMS+=("$1"); }
warn() { WARNINGS+=("$1"); }

# Read one KEY=value from .env without loading the whole file into the shell (a .env is not
# guaranteed to be valid shell). Strips surrounding quotes and spaces. Prints nothing if absent.
env_value() {
  [ -f "$ENV_FILE" ] || return 0
  grep -E "^[[:space:]]*$1[[:space:]]*=" "$ENV_FILE" | tail -n 1 | sed -E "s/^[^=]*=[[:space:]]*//; s/[[:space:]]+\$//; s/^[\"']//; s/[\"']\$//" || true
}

echo "Checking your setup..."

# 1. Right project?
[ -f "$MOBILE_DIR/app.json" ] || problem "mobile/app.json not found. This script must stay inside mobile/scripts/."

# 2. Tools.
for tool in node npm npx; do
  command -v "$tool" > /dev/null 2>&1 || problem "'$tool' is not on your PATH. Install Node.js and reopen the terminal."
done
if command -v java > /dev/null 2>&1; then
  java_major="$(java -version 2>&1 | sed -nE '1s/.*version "([0-9]+).*/\1/p')"
  case "$java_major" in
    17 | 21) ;;
    *) warn "Java $java_major found. 17 and 21 are known to work. If Gradle fails with a Java error, point JAVA_HOME at Android Studio's bundled Java (...\\Android Studio\\jbr)." ;;
  esac
else
  problem "'java' is not on your PATH. Install a JDK (21 works) or set JAVA_HOME, then reopen the terminal."
fi

# 3. Android SDK. Expo finds it through ANDROID_HOME. adb is only needed for installing, not building.
if [ -z "${ANDROID_HOME:-}" ]; then
  problem "ANDROID_HOME is not set. Set it to your Android SDK folder (see .plans/development-build/README.md, section 2), then reopen the terminal."
elif [ ! -d "$ANDROID_HOME" ]; then
  problem "ANDROID_HOME points at '$ANDROID_HOME', which does not exist."
elif [ ! -d "$ANDROID_HOME/platforms/android-36" ]; then
  warn "SDK Platform API 36 not found under ANDROID_HOME. If the build fails, install it in Android Studio > SDK Manager."
fi
command -v adb > /dev/null 2>&1 || warn "'adb' is not on your PATH. Building works without it; you will need it only to install onto a device."

# 4. mobile/.env values that are baked into the app at build time.
if [ ! -f "$ENV_FILE" ]; then
  problem "mobile/.env is missing. Copy mobile/.env.example to mobile/.env and fill it in."
else
  api_url="$(env_value EXPO_PUBLIC_API_URL)"
  maps_key="$(env_value GOOGLE_MAPS_ANDROID_KEY)"
  if [ -z "$api_url" ]; then
    problem "EXPO_PUBLIC_API_URL is empty in mobile/.env. Testers need the api's public https:// address (for example your ngrok URL)."
  else
    case "$api_url" in
      https://*) ;;
      *) problem "EXPO_PUBLIC_API_URL must start with https:// for a release build (it is '$api_url'). The app stops at launch otherwise." ;;
    esac
  fi
  [ -n "$maps_key" ] || problem "GOOGLE_MAPS_ANDROID_KEY is empty in mobile/.env. Without it, the create-listing map screen crashes."
fi

# 5. A lockfile inside mobile/ breaks the npm workspace.
[ ! -e "$MOBILE_DIR/package-lock.json" ] || problem "mobile/package-lock.json exists. Delete it; the only lockfile belongs at the repo root."

# 6. The classic mistake: `prebuild` run from the repo root leaves these behind.
[ ! -e "$REPO_DIR/android" ] || problem "A stray android/ folder exists at the repo root (from running prebuild in the wrong place). Delete it."
[ ! -e "$REPO_DIR/app.json" ] || problem "A stray app.json exists at the repo root (from running prebuild in the wrong place). Delete it, then run 'git restore package.json'."

# 7. Dependencies installed.
[ -d "$REPO_DIR/node_modules" ] || problem "node_modules is missing. Run 'npm install' at the repo root."

# 8. Disk space (df -Pk: available kilobytes, 4th column).
free_kb="$(df -Pk "$REPO_DIR" 2> /dev/null | awk 'NR==2 {print $4}')"
if [ -n "${free_kb:-}" ] && [ "$free_kb" -lt 5000000 ]; then
  warn "Less than 5 GB free on this drive. The first build downloads a lot and may fail."
fi

for w in ${WARNINGS[@]+"${WARNINGS[@]}"}; do echo "  warning: $w"; done
if [ ${#PROBLEMS[@]} -gt 0 ]; then
  echo
  echo "Cannot build yet. Fix these first:"
  for p in "${PROBLEMS[@]}"; do echo "  x $p"; done
  exit 1
fi
echo "  ok"

# --- Where the files go -------------------------------------------------------------------------
STAMP="$(date +%Y-%m-%d_%H%M)"
DATE="$(date +%Y-%m-%d)"
OUT_DIR="$OUT_PARENT/$STAMP"
suffix=2
# Two builds in the same minute must not overwrite each other.
while [ -e "$OUT_DIR" ]; do
  OUT_DIR="$OUT_PARENT/$STAMP-b$suffix"
  suffix=$((suffix + 1))
done

api_host="$(printf '%s' "$api_url" | sed -E 's#^https://([^/]+).*#\1#')"

echo
echo "About to build: $ONLY"
echo "  api host : $api_host"
echo "  maps key : set"
echo "  output   : $OUT_DIR"
echo
echo "This DELETES and regenerates mobile/android/ (generated and gitignored; hand edits there are lost)."
if [ "$ASSUME_YES" -ne 1 ]; then
  read -r -p "Press Enter to continue, or Ctrl+C to stop. " _
fi

# --- Phase 2: shared package + prebuild ---------------------------------------------------------
# The app imports @farm-pool/shared through its built copy in packages/shared/dist, so rebuild it
# or the APK could carry stale types and schemas.
echo
echo "[1/3] Building the shared package..."
(cd "$REPO_DIR" && npm run build -w @farm-pool/shared)

# `prebuild` turns app.json and app.config.js (which injects the Maps key from .env) into the
# android/ project. It must run inside mobile/: from the repo root it would treat the whole repo
# as a new empty app. --no-install: dependencies are already installed.
echo
echo "[2/3] Generating the Android project (expo prebuild)..."
cd "$MOBILE_DIR"
npx expo prebuild --platform android --clean --no-install

# --- Phase 3: build each variant ----------------------------------------------------------------
mkdir -p "$OUT_DIR"
cd "$MOBILE_DIR/android"

# Every Gradle build writes to the same app-release.apk, so each result is copied out immediately.
# The old file is deleted first so a failed build can never be mistaken for a fresh one.
build_variant() {
  local name="$1" abis out
  abis="$(abis_for "$name")"
  out="$OUT_DIR/FarmPool-test-$DATE-$name.apk"
  echo
  echo "  building '$name' ($abis)..."
  rm -f "$RELEASE_APK"
  ./gradlew assembleRelease "-PreactNativeArchitectures=$abis"
  [ -s "$RELEASE_APK" ] || { echo "Gradle finished but $RELEASE_APK is missing or empty." >&2; exit 1; }
  cp "$RELEASE_APK" "$out"
  echo "  -> $out"
}

echo
echo "[3/3] Building the APKs (the first one is slow; the rest reuse its work)..."
for v in $ONLY; do build_variant "$v"; done

# --- Phase 4: record and report -----------------------------------------------------------------
{
  echo "Built:    $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Branch:   $(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD 2> /dev/null || echo unknown)"
  echo "Commit:   $(git -C "$REPO_DIR" rev-parse --short HEAD 2> /dev/null || echo unknown)"
  echo "Uncommitted changes: $(git -C "$REPO_DIR" status --porcelain 2> /dev/null | wc -l | tr -d ' ') file(s)"
  echo "Api host: $api_host"
  echo "Variants: $ONLY"
} > "$OUT_DIR/BUILD-INFO.txt"

echo
echo "Done. Files in $OUT_DIR:"
ls -lh "$OUT_DIR" | awk 'NR>1 {print "  " $5 "  " $9}'
echo
echo "Install on a running emulator or a USB-connected phone:"
echo "  adb install -r \"$OUT_DIR/FarmPool-test-$DATE-<variant>.apk\""
echo "Reminder: the api must be reachable at $api_host while testers use the app."
