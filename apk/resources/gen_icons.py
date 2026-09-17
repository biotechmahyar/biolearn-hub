"""Render Genova launcher icons from the embedded DNA logo geometry.

Usage: gen_icons.py --size 192 --out path/to/ic_launcher.png
"""
import argparse
import os
import struct
import zlib

SCALE = 16  # svg user unit (64) -> 1024px
HALF = 1.7 * SCALE  # stroke width 3.4 / 2
BG = (11, 17, 32)  # #0b1120


def curve_points(p0, c1, c2, p3, n=40):
    pts = []
    for i in range(n + 1):
        t = i / n
        mt = 1 - t
        x = mt**3 * p0[0] + 3 * mt**2 * t * c1[0] + 3 * mt * t**2 * c2[0] + t**3 * p3[0]
        y = mt**3 * p0[1] + 3 * mt**2 * t * c1[1] + 3 * mt * t**2 * c2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts


C1 = curve_points((22, 14), (22, 26), (42, 38), (42, 50))
C2 = curve_points((42, 14), (42, 26), (22, 38), (22, 50))

SEGS = []
for i in range(len(C1) - 1):
    SEGS.append((C1[i][0], C1[i][1], C1[i + 1][0], C1[i + 1][1], (94, 234, 212), 0.55))
    SEGS.append((C2[i][0], C2[i][1], C2[i + 1][0], C2[i + 1][1], (125, 211, 252), 0.55))
for y, x0, x1 in [(22, 22, 42), (32, 21, 43), (42, 22, 42)]:
    SEGS.append((x0, y, x1, y, (94, 234, 212), 1.0))

DOTS = [(22, 14, (94, 234, 212)), (42, 50, (125, 211, 252))]
DOT_R = 3.4 * SCALE


def in_rounded(cx, cy, rad):
    r = rad * SCALE
    lim = 64 * SCALE
    if cx < r and cy < r:
        return (cx - r) ** 2 + (cy - r) ** 2 <= r * r
    if cx > lim - r and cy < r:
        return (cx - lim + r) ** 2 + (cy - r) ** 2 <= r * r
    if cx < r and cy > lim - r:
        return (cx - r) ** 2 + (cy - lim + r) ** 2 <= r * r
    if cx > lim - r and cy > lim - r:
        return (cx - lim + r) ** 2 + (cy - lim + r) ** 2 <= r * r
    return True


def dist_to_seg(px_, py_, ax, ay, bx, by):
    ax, ay, bx, by = ax * SCALE, ay * SCALE, bx * SCALE, by * SCALE
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy
    if L2 == 0:
        return ((px_ - ax) ** 2 + (py_ - ay) ** 2) ** 0.5
    t = max(0.0, min(1.0, ((px_ - ax) * dx + (py_ - ay) * dy) / L2))
    cx, cy = ax + t * dx, ay + t * dy
    return ((px_ - cx) ** 2 + (py_ - cy) ** 2) ** 0.5


def sample(u, v):
    """u, v in svg units 0..64 -> rgba tuple."""
    sx, sy = u * SCALE, v * SCALE
    if not in_rounded(sx + 0.5, sy + 0.5, 16):
        return (0, 0, 0, 0)
    best_a = 0.0
    col = (0, 0, 0)
    for ax, ay, bx, by, rgb, op in SEGS:
        d = dist_to_seg(sx + 0.5, sy + 0.5, ax, ay, bx, by)
        if d <= HALF:
            cov = 1.0 if d <= HALF - 1 else HALF - d
            a = cov * op
            if a > best_a:
                best_a, col = a, rgb
    for cx, cy, rgb in DOTS:
        d = ((sx + 0.5 - cx * SCALE) ** 2 + (sy + 0.5 - cy * SCALE) ** 2) ** 0.5
        if d <= DOT_R:
            a = 1.0 if d <= DOT_R - 1 else (DOT_R - d) / SCALE
            if a > best_a:
                best_a, col = a, rgb
    if best_a <= 0:
        return (*BG, 255)
    r = int(col[0] * best_a + BG[0] * (1 - best_a))
    g = int(col[1] * best_a + BG[1] * (1 - best_a))
    b = int(col[2] * best_a + BG[2] * (1 - best_a))
    return (r, g, b, 255)


def chunk(tag, data):
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def make_png(size, out, rounded=True):
    raw = b""
    for y in range(size):
        row = b"\x00"
        for x in range(size):
            r, g, b, a = sample(x * 64 / size, y * 64 / size)
            if not rounded and a == 0:
                a = 255
                r, g, b = BG
            row += bytes((r, g, b, a))
        raw += row
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "wb") as f:
        f.write(png)
    print("wrote", out, f"{size}x{size}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--size", type=int, default=192)
    ap.add_argument("--out", required=True)
    ap.add_argument("--square", action="store_true", help="opaque square background (splash)")
    args = ap.parse_args()
    make_png(args.size, args.out, rounded=not args.square)
