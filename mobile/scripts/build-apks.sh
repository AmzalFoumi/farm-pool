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
#   The folder is outside the repo on purpose: `--fresh` wipes mobile/android/, and nothing here
#   can be committed by accident.
#
# USAGE (from anywhere; the script moves itself into mobile/)
#   npm run build:apks -w mobile                      reuse mobile/android/ (code-only changes)
#   npm run build:apks -w mobile -- --fresh           wipe and regenerate it first (see below)
#   npm run build:apks -w mobile -- --only phone,phone64
#   bash mobile/scripts/build-apks.sh --help
#
# OPTIONS
#   --fresh            Delete and regenerate mobile/android/ first (`expo prebuild --clean`), then
#                      build. Slow (about 13 minutes) and asks for confirmation. Default: off, the
#                      existing mobile/android/ is reused and only Gradle runs.
#   --yes              With --fresh, do not ask for confirmation before wiping mobile/android/.
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
#      The same two values may instead come from your terminal or from .env.local; see
#      "WHERE THE VALUES COME FROM" below.
#   6. About 5 GB of free disk. A --fresh build takes about 15 minutes: it downloads the Android
#      NDK and compiles the native code (about 13 minutes for the first variant; the other two
#      reuse that work and took under a minute each). A reused build is expected to be shorter, but
#      that has not been measured yet.
#
# WHEN TO USE --fresh (and when you can skip it)
#   By default the script reuses mobile/android/ and only runs Gradle. That is right when you
#   changed JavaScript only: screens, styles, translations, api calls. The APK still carries your
#   new code, because Gradle bundles the JavaScript again.
#
#   Use --fresh whenever something the Android project is GENERATED from has changed. `prebuild`
#   is the only step that reads these, so a reused folder keeps the OLD values without any error:
#     - mobile/app.json or mobile/app.config.js (app ID, name, icon, splash, permissions, plugins)
#     - GOOGLE_MAPS_ANDROID_KEY (it goes into the native manifest at prebuild)
#     - a native library added, removed or upgraded in mobile/package.json (for example
#       react-native-agora, react-native-maps), or an Expo SDK upgrade
#     - EXPO_PUBLIC_API_URL: it is baked in when the JavaScript is bundled, and Gradle may not
#       notice that only an env value changed. Use --fresh to be sure (not verified either way)
#   Also use --fresh when:
#     - mobile/android/ does not exist yet (first build on this computer); the script says so
#     - the last build failed in a strange way and you do not trust the folder
#     - you are building the APK you will hand to testers and want a build you can fully vouch for
#   Rule of thumb: if you are unsure, use --fresh. It costs time, never correctness.
#   Automatic detection of these changes is planned for later; today the choice is yours.
#
# WHERE THE VALUES COME FROM
#   The script asks Expo's own env loader, so it checks the same values the build will use.
#   Highest priority first:
#     1. A variable already set in your terminal (for example an old `export EXPO_PUBLIC_API_URL=...`
#        left over from another session). Files never overwrite it, so check `env | grep EXPO`.
#     2. .env.<mode>.local   3. .env.local   4. .env.<mode>   5. .env
#   <mode> is "development" while `expo prebuild` runs (this decides the Maps key) and
#   "production" while Gradle bundles the JavaScript (this decides the api URL). A NODE_ENV set in
#   your terminal replaces both. The summary before the build says where each value came from.
#
# WHAT IT DOES NOT DO
#   - It never runs git commit, git push or anything else that changes git history.
#   - It never edits or prints your .env. The Maps key is only ever reported as "set" or "missing".
#   - It does not start the api or ngrok. The api must be reachable at EXPO_PUBLIC_API_URL when
#     testers use the app.
#
# DANGER
#   With --fresh, `expo prebuild --clean` DELETES and regenerates mobile/android/. That folder is
#   generated and gitignored, so nothing in git is lost, but any hand edit inside it is. The
#   script asks first (unless you pass --yes). Without --fresh nothing is deleted.
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
FRESH=0
ONLY="$ALL_VARIANTS"
OUT_PARENT="$REPO_DIR/../farmpool-apks"

usage() {
  sed -n '3,/^set -euo/p' "${BASH_SOURCE[0]}" | sed '$d' | sed 's/^# \{0,1\}//'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --fresh) FRESH=1 ;;
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

# Ask Expo itself which value a key will have, instead of re-reading .env by hand.
# Expo's rules (checked against @expo/env 2.4.x, and re-check them if Expo is upgraded):
#   - A variable already set in your terminal wins. Files never overwrite it.
#   - Otherwise the first file that has the key wins, in this order:
#       .env.<mode>.local, .env.local, .env.<mode>, .env
#   - The mode (a name Expo gives each stage) differs per stage:
#       prebuild         -> "development"  (decides GOOGLE_MAPS_ANDROID_KEY via app.config.js)
#       Gradle's bundler -> "production"   (bakes in EXPO_PUBLIC_API_URL)
#     A NODE_ENV set in your terminal replaces both.
# Usage: expo_env_value KEY MODE
# Prints "<where>:<value>", where <where> is "terminal", "files" or "unset". A value with a line
# break in it is cut at the break; fine here, because we only test for empty and for https://.
# Exits non-zero, with Expo's own message on stderr, if Expo cannot read the files.
expo_env_value() {
  local mode="${NODE_ENV:-$2}" root="$MOBILE_DIR"
  # Windows Node needs C:/... paths, not the /c/... paths Git Bash uses.
  root="$(cygpath -m "$MOBILE_DIR" 2> /dev/null || printf '%s' "$MOBILE_DIR")"
  node -e '
    const [key, mode, root] = process.argv.slice(1);
    const expoPkg = require.resolve("expo/package.json", { paths: [root] });
    const { parseProjectEnv } = require(require.resolve("@expo/env", { paths: [expoPkg] }));
    const out = (where, value) => console.log(where + ":" + String(value ?? "").split(/\r?\n/)[0]);
    if (process.env[key] !== undefined) {
      out("terminal", process.env[key]);
    } else {
      const { env } = parseProjectEnv(root, { mode, silent: true });
      env[key] === undefined ? out("unset", "") : out("files", env[key]);
    }
  ' "$1" "$mode" "$root"
}

# Human wording for where a value came from.
where_label() {
  case "$1" in
    terminal) echo "from your terminal, not .env" ;;
    files) echo "from your .env files" ;;
    *) echo "not set" ;;
  esac
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
api_url=""
maps_key=""
api_where="unset"
maps_where="unset"
if [ ! -f "$ENV_FILE" ] && [ -z "${EXPO_PUBLIC_API_URL:-}" ] && [ -z "${GOOGLE_MAPS_ANDROID_KEY:-}" ]; then
  problem "mobile/.env is missing. Copy mobile/.env.example to mobile/.env and fill it in."
elif [ ! -d "$REPO_DIR/node_modules" ] || ! command -v node > /dev/null 2>&1; then
  : # already reported above; Expo cannot be asked until dependencies are installed
else
  if ! api_out="$(expo_env_value EXPO_PUBLIC_API_URL production 2>&1)"; then
    problem "Expo could not read your env files: $api_out"
  elif ! maps_out="$(expo_env_value GOOGLE_MAPS_ANDROID_KEY development 2>&1)"; then
    problem "Expo could not read your env files: $maps_out"
  else
    api_where="${api_out%%:*}"
    api_url="${api_out#*:}"
    maps_where="${maps_out%%:*}"
    maps_key="${maps_out#*:}"
    if [ -z "$api_url" ]; then
      problem "EXPO_PUBLIC_API_URL is empty (${api_where/unset/not set}). Testers need the api's public https:// address (for example your ngrok URL)."
    else
      case "$api_url" in
        https://*) ;;
        *) problem "EXPO_PUBLIC_API_URL must start with https:// for a release build, but it is '$api_url' ($(where_label "$api_where")). The app stops at launch otherwise." ;;
      esac
    fi
    [ -n "$maps_key" ] || problem "GOOGLE_MAPS_ANDROID_KEY is empty ($(where_label "$maps_where")). Without it, the create-listing map screen crashes."
  fi
fi

# 5. A lockfile inside mobile/ breaks the npm workspace.
[ ! -e "$MOBILE_DIR/package-lock.json" ] || problem "mobile/package-lock.json exists. Delete it; the only lockfile belongs at the repo root."

# 6. The classic mistake: `prebuild` run from the repo root leaves these behind.
[ ! -e "$REPO_DIR/android" ] || problem "A stray android/ folder exists at the repo root (from running prebuild in the wrong place). Delete it."
[ ! -e "$REPO_DIR/app.json" ] || problem "A stray app.json exists at the repo root (from running prebuild in the wrong place). Delete it, then run 'git restore package.json'."

# 6b. Reusing needs a folder to reuse.
if [ "$FRESH" -ne 1 ] && [ ! -x "$MOBILE_DIR/android/gradlew" ] && [ ! -f "$MOBILE_DIR/android/gradlew" ]; then
  problem "mobile/android/ does not exist yet (or is incomplete), so there is nothing to reuse. Run once with --fresh."
fi

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

if [ "$FRESH" -eq 1 ]; then BUILD_KIND="fresh"; else BUILD_KIND="reused"; fi

echo
echo "About to build: $ONLY"
echo "  mode     : $BUILD_KIND mobile/android/"
echo "  api host : $api_host ($(where_label "$api_where"))"
echo "  maps key : set ($(where_label "$maps_where"))"
echo "  output   : $OUT_DIR"
echo
if [ "$FRESH" -eq 1 ]; then
  echo "--fresh DELETES and regenerates mobile/android/ (generated and gitignored; hand edits there are lost)."
  if [ "$ASSUME_YES" -ne 1 ]; then
    read -r -p "Press Enter to continue, or Ctrl+C to stop. " _
  fi
else
  # Nothing is deleted, so there is nothing to confirm. The risk is the opposite one: a reused
  # folder silently keeps old native settings, so say it every time.
  echo "Reusing mobile/android/. Your JavaScript changes are included. Native settings are NOT"
  echo "re-applied: if app.json, app.config.js, the Maps key, the api URL or a native library"
  echo "changed since the last build, stop now and run again with --fresh."
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
# Only with --fresh: it is the slow, destructive step, and a code-only change does not need it.
cd "$MOBILE_DIR"
echo
if [ "$FRESH" -eq 1 ]; then
  echo "[2/3] Generating the Android project (expo prebuild --clean)..."
  npx expo prebuild --platform android --clean --no-install
else
  echo "[2/3] Reusing the existing Android project (skipping expo prebuild)."
fi

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
echo "[3/3] Building the APKs (a fresh project makes the first one slow; the rest reuse its work)..."
for v in $ONLY; do build_variant "$v"; done

# --- Phase 4: record and report -----------------------------------------------------------------
{
  echo "Built:    $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Branch:   $(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD 2> /dev/null || echo unknown)"
  echo "Commit:   $(git -C "$REPO_DIR" rev-parse --short HEAD 2> /dev/null || echo unknown)"
  echo "Uncommitted changes: $(git -C "$REPO_DIR" status --porcelain 2> /dev/null | wc -l | tr -d ' ') file(s)"
  echo "Android project: $BUILD_KIND"
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
