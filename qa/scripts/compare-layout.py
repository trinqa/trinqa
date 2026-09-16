#!/usr/bin/env python3
"""Overlay simulator screenshot on reference for manual visual QA."""

from __future__ import annotations

import argparse
from pathlib import Path

try:
    from PIL import Image
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "Install Pillow: pip install pillow\n"
        f"Original error: {exc}"
    ) from exc


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reference", type=Path)
    parser.add_argument("screenshot", type=Path)
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("qa/screenshots/overlay.png"),
    )
    parser.add_argument(
        "--opacity",
        type=float,
        default=0.45,
        help="Screenshot opacity over reference (0-1)",
    )
    args = parser.parse_args()

    reference = Image.open(args.reference).convert("RGBA")
    screenshot = Image.open(args.screenshot).convert("RGBA")
    screenshot = screenshot.resize(reference.size, Image.Resampling.LANCZOS)
    screenshot.putalpha(int(255 * args.opacity))

    overlay = Image.alpha_composite(reference, screenshot)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    overlay.save(args.output)
    print(f"Wrote overlay: {args.output}")


if __name__ == "__main__":
    main()
