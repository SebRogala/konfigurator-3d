"""Builds the WebP texture tiers and the low-res HDR the scene loads progressively.

Usage (from frontend/): python3 scripts/perf-check/texture-variants.py assets-src/textures public/textures
The source dir holds the original JPEGs (<wood>/{color,normal,roughness}.jpg), outside public/ so they are not served.
The 1k HDRI is read from public/textures, where it is served as the desktop environment.
Writes into public/textures:
  color.webp (source size, desktop), color-1k.webp (phones), normal.webp, roughness.webp (1024 px, both tiers)
  low/{color,normal,roughness}.webp (256 px, the first-frame tier)
and studio_small_09_256.hdr (first frame) and studio_small_09_512.hdr (phones): box-averaged copies of the 1k HDRI, flat RGBE.
Needs Pillow with WebP support.
"""
import math
import sys
from pathlib import Path

from PIL import Image

LOW_PX = 256
PHONE_PX = 1024
QUALITY = {'color': 82, 'normal': 90, 'roughness': 85}
LOW_QUALITY = 72


def save_webp(img: Image.Image, path: Path, quality: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, 'WEBP', quality=quality, method=6)
    print(f'{path} {img.size[0]}px {path.stat().st_size // 1024} KB')


def resized(img: Image.Image, px: int) -> Image.Image:
    return img if img.size[0] <= px else img.resize((px, px), Image.LANCZOS)


def wood_variants(src_folder: Path, folder: Path) -> None:
    for name, quality in QUALITY.items():
        src = Image.open(src_folder / f'{name}.jpg').convert('RGB')
        save_webp(src, folder / f'{name}.webp', quality)
        if name == 'color':
            save_webp(resized(src, PHONE_PX), folder / 'color-1k.webp', quality)
        save_webp(resized(src, LOW_PX), folder / 'low' / f'{name}.webp', LOW_QUALITY)


def read_rgbe(path: Path) -> tuple[int, int, list[list[float]]]:
    data = path.read_bytes()
    header_end = data.index(b'\n\n') + 2
    size_end = data.index(b'\n', header_end)
    _, h, _, w = data[header_end:size_end].split()
    h, w = int(h), int(w)
    pos = size_end + 1
    rows = []
    for _ in range(h):
        if data[pos] != 2 or data[pos + 1] != 2:
            raise ValueError('only new-style RLE scanlines are supported')
        pos += 4
        channels = []
        for _ in range(4):
            out = bytearray()
            while len(out) < w:
                n = data[pos]
                pos += 1
                if n > 128:
                    out += bytes([data[pos]]) * (n - 128)
                    pos += 1
                else:
                    out += data[pos:pos + n]
                    pos += n
            channels.append(out)
        r, g, b, e = channels
        row = []
        for x in range(w):
            f = math.ldexp(1.0, e[x] - 136) if e[x] else 0.0
            row.append((r[x] * f, g[x] * f, b[x] * f))
        rows.append(row)
    return w, h, rows


def to_rgbe(c: tuple[float, float, float]) -> bytes:
    m = max(c)
    if m < 1e-32:
        return b'\0\0\0\0'
    mant, exp = math.frexp(m)
    scale = mant * 256.0 / m
    return bytes([int(c[0] * scale), int(c[1] * scale), int(c[2] * scale), exp + 128])


def hdr_downsampled(w: int, h: int, rows: list, dst: Path, out_w: int) -> None:
    k = w // out_w
    out_h = h // k
    body = bytearray()
    for oy in range(out_h):
        for ox in range(out_w):
            acc = [0.0, 0.0, 0.0]
            for y in range(oy * k, oy * k + k):
                for px in rows[y][ox * k:ox * k + k]:
                    acc[0] += px[0]; acc[1] += px[1]; acc[2] += px[2]
            n = k * k
            body += to_rgbe((acc[0] / n, acc[1] / n, acc[2] / n))
    header = f'#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y {out_h} +X {out_w}\n'.encode()
    dst.write_bytes(header + body)
    print(f'{dst} {out_w}x{out_h} {dst.stat().st_size // 1024} KB')


if __name__ == '__main__':
    src_root, root = Path(sys.argv[1]), Path(sys.argv[2])
    for src_folder in sorted(p for p in src_root.iterdir() if p.is_dir()):
        wood_variants(src_folder, root / src_folder.name)
    hdr = read_rgbe(root / 'studio_small_09_1k.hdr')
    for out_w in (256, 512):
        hdr_downsampled(*hdr, root / f'studio_small_09_{out_w}.hdr', out_w)
