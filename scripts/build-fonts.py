#!/usr/bin/env python3
"""Builds the web fonts from the full Nunito Sans variable TTFs in public/Nunito_Sans/.

The originals are ~560 KB each and carry four axes (YTLC, opsz, wdth, wght) and every script. The
site only varies the weight, so the other axes are pinned to their defaults, and each face is cut
into two unicode-range files: Latin (with Latin Extended, for Polish and Italian names) and
Cyrillic (the consolline case study quotes Ukrainian). Browsers only fetch the file a page needs.

    python3 scripts/build-fonts.py        # writes public/fonts/nunito-sans-*.woff2

Needs fonttools and brotli (pip install fonttools brotli).
"""
from io import BytesIO
from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "Nunito_Sans"
OUT = ROOT / "public" / "fonts"

FACES = {
    "normal": SRC / "NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf",
    "italic": SRC / "NunitoSans-Italic-VariableFont_YTLC,opsz,wdth,wght.ttf",
}

# Same ranges Google Fonts uses for these subsets, plus the arrows and marks the copy uses.
RANGES = {
    "latin": "U+0000-00FF,U+0100-024F,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,"
    "U+1E00-1EFF,U+2000-206F,U+20AC,U+2122,U+2190-2199,U+2212,U+2215,U+2713,U+FEFF,U+FFFD",
    "cyrillic": "U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116",
}


def codepoints(spec: str) -> set[int]:
    out: set[int] = set()
    for part in spec.split(","):
        a, _, b = part.removeprefix("U+").partition("-")
        out.update(range(int(a, 16), int(b or a, 16) + 1))
    return out


def main() -> None:
    OUT.mkdir(exist_ok=True)
    for style, path in FACES.items():
        for name, spec in RANGES.items():
            font = TTFont(path)
            # Keep weight variable; pin the rest at the font's defaults.
            axes = {a.axisTag: a.defaultValue for a in font["fvar"].axes if a.axisTag != "wght"}
            font = instantiateVariableFont(font, axes)
            # Round-trip through bytes: the subsetter chokes on the instancer's lazily loaded tables.
            buf = BytesIO()
            font.save(buf)
            buf.seek(0)
            font = TTFont(buf)
            opts = Options()
            opts.flavor = "woff2"
            opts.layout_features = ["*"]
            opts.name_IDs = ["*"]
            opts.notdef_outline = True
            sub = Subsetter(opts)
            sub.populate(unicodes=codepoints(spec))
            sub.subset(font)
            dest = OUT / f"nunito-sans-{name}{'-italic' if style == 'italic' else ''}.woff2"
            font.flavor = "woff2"
            font.save(dest)
            print(f"{dest.relative_to(ROOT)}: {dest.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
