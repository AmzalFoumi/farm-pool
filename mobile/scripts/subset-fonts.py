#!/usr/bin/env python3
"""
Shrink the three Noto families to the characters FarmPool can actually render.

WHY: Noto Sans Latin ships 3,094 glyphs — Cyrillic, Greek, Vietnamese, the lot — for an app that
is English, Sinhala and Tamil only. At 616 KB per weight that is most of a megabyte of a user's
rural 3G connection spent on alphabets nobody here reads. Subsetting is the difference between
+1.5 MB and +0.4 MB over the Poppins/Mulish pair these replace.

RUN: python3 mobile/scripts/subset-fonts.py   (needs `pip install fonttools`)
Outputs to mobile/assets/fonts/. Re-run after bumping an @expo-google-fonts package.
"""
import subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "node_modules/@expo-google-fonts"
OUT = ROOT / "mobile/assets/fonts"

# ASCII, Latin-1 (· × ° and the accented names a farmer may type), general punctuation
# (— … ‘ ’ “ ”), and currency (₨ ₹) for prices.
LATIN = "U+0020-007E,U+00A0-00FF,U+2010-2027,U+20A0-20BF,U+2192"
SINHALA = LATIN + ",U+0D80-0DFF,U+200C-200D"   # ZWNJ/ZWJ: Sinhala needs them for conjuncts
TAMIL = LATIN + ",U+0B80-0BFF,U+200C-200D"

JOBS = [
    ("noto-sans/400Regular/NotoSans_400Regular.ttf", "NotoSans-Regular.ttf", LATIN),
    ("noto-sans/700Bold/NotoSans_700Bold.ttf", "NotoSans-Bold.ttf", LATIN),
    ("noto-sans-sinhala/400Regular/NotoSansSinhala_400Regular.ttf", "NotoSansSinhala-Regular.ttf", SINHALA),
    ("noto-sans-sinhala/700Bold/NotoSansSinhala_700Bold.ttf", "NotoSansSinhala-Bold.ttf", SINHALA),
    ("noto-sans-tamil/400Regular/NotoSansTamil_400Regular.ttf", "NotoSansTamil-Regular.ttf", TAMIL),
    ("noto-sans-tamil/700Bold/NotoSansTamil_700Bold.ttf", "NotoSansTamil-Bold.ttf", TAMIL),
]

OUT.mkdir(parents=True, exist_ok=True)
total_before = total_after = 0
for rel, out_name, unicodes in JOBS:
    src, dst = SRC / rel, OUT / out_name
    if not src.exists():
        sys.exit(f"missing {src} — run npm install first")
    subprocess.run([
        sys.executable, "-m", "fontTools.subset", str(src),
        f"--unicodes={unicodes}",
        # Keep shaping: Sinhala and Tamil are unreadable without their ligature and
        # mark-positioning tables, so layout features are explicitly retained.
        "--layout-features=*",
        "--notdef-outline", "--recommended-glyphs",
        f"--output-file={dst}",
    ], check=True)
    b, a = src.stat().st_size, dst.stat().st_size
    total_before += b; total_after += a
    print(f"{out_name:30} {b//1024:5} KB -> {a//1024:4} KB")
print(f"{'TOTAL':30} {total_before//1024:5} KB -> {total_after//1024:4} KB")
