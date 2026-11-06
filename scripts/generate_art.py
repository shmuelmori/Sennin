"""Draws Sennin's decorative art, app icon and splash image (spec §11, steps 9.1, 9.2).

Run from the repo root:  python scripts/generate_art.py
Needs Python 3 with Pillow. Writes:
  assets/images/dusk.jpg                       backdrop of the empty and end screens
  assets/images/icon.png                       app icon (square, full bleed)
  assets/images/android-icon-foreground.png    adaptive icon, front layer
  assets/images/android-icon-background.png    adaptive icon, back layer
  assets/images/android-icon-monochrome.png    themed (one-color) icon
  assets/images/splash-icon.png                splash screen emblem

Everything is drawn from the §11 palette, so the art stays in step with
theme/index.ts. The mood follows the reference (assets/Sennin.mp4): dusk,
teal clouds, a sunset sky, a pagoda on a misty ridge, cherry blossoms. Drawing
is seeded, so the files come out the same on every run.
"""

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

# Palette (spec §11, theme/index.ts).
DEEP_SEA_NIGHT = (14, 42, 47)
SUNSET = (224, 83, 58)
TEAL_MIST = (47, 143, 138)
CHERRY_BLOSSOM = (243, 198, 200)
BLACK = (0, 0, 0)

SS = 2  # supersampling: draw at twice the size, then scale down for smooth edges
OUT = Path(__file__).resolve().parent.parent / "assets" / "images"


def mix(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def rgba(color, alpha=1.0):
    return (*color, round(255 * alpha))


# Derived tones, all mixes of the palette.
NIGHT_DARK = mix(DEEP_SEA_NIGHT, BLACK, 0.35)
BRANCH = mix(mix(DEEP_SEA_NIGHT, SUNSET, 0.18), BLACK, 0.45)
BLOSSOM_DEEP = mix(CHERRY_BLOSSOM, SUNSET, 0.28)
BLOSSOM_HEART = mix(SUNSET, BLACK, 0.15)


# --- Shapes -----------------------------------------------------------------


def vertical_gradient(size, stops):
    """stops: list of (y fraction, color), top to bottom."""
    w, h = size
    column = Image.new("RGB", (1, h))
    px = column.load()
    for y in range(h):
        f = y / (h - 1)
        for (f0, c0), (f1, c1) in zip(stops, stops[1:]):
            if f0 <= f <= f1:
                t = (f - f0) / (f1 - f0) if f1 > f0 else 0
                t = t * t * (3 - 2 * t)  # smoothstep, for soft bands
                px[0, y] = mix(c0, c1, t)
                break
        else:
            px[0, y] = stops[-1][1] if f > stops[-1][0] else stops[0][1]
    return column.resize(size)


def ridge_points(rng, width, base_y, peaks, jag):
    """A mountain ridge line: a few main peaks plus small crags (ukiyo-e style)."""
    points = []
    steps = 160
    for i in range(steps + 1):
        x = width * i / steps
        y = base_y
        for px, height, spread in peaks:
            d = (x - px) / spread
            y -= height * math.exp(-d * d) if abs(d) < 3 else 0
        points.append([x, y])
    # Midpoint-style crags, larger near the top of each peak.
    for i in range(1, steps):
        points[i][1] += rng.uniform(-jag, jag) * (1 if i % 2 else 0.4)
    return [tuple(p) for p in points]


def fill_ridge(draw, points, bottom, color):
    draw.polygon([*points, (points[-1][0], bottom), (points[0][0], bottom)], fill=color)


def soft_band(size, center_y, half_height, color, alpha):
    """A horizontal mist band that fades out above and below."""
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rectangle([0, center_y - half_height / 2, size[0], center_y + half_height / 2],
                fill=rgba(color, alpha))
    return layer.filter(ImageFilter.GaussianBlur(half_height / 2))


def spiral(cx, cy, r0, turns, clockwise=True, start=0.0):
    points = []
    n = 90
    for i in range(n + 1):
        t = i / n
        a = start + (1 if clockwise else -1) * t * turns * 2 * math.pi
        r = r0 * (1 - 0.82 * t)
        points.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return points


def stroke(draw, points, color, width):
    draw.line(points, fill=color, width=round(width), joint="curve")
    r = width / 2
    for x, y in (points[0], points[-1]):
        draw.ellipse([x - r, y - r, x + r, y + r], fill=color)


def cloud(size, x0, x1, y, thickness, fill, line, seed, curl_left=True, curl_right=True):
    """A stylized ukiyo-e cloud on its own layer: a flat-bottomed band with
    round lobes on top, outlined, ending in curls."""
    rng = random.Random(seed)
    mask = Image.new("L", size, 0)
    md = ImageDraw.Draw(mask)
    r = thickness / 2
    md.rounded_rectangle([x0, y - r * 0.4, x1, y + r], radius=r, fill=255)
    x = x0 + r
    while x < x1 - r:
        lr = r * rng.uniform(0.85, 1.35)
        md.ellipse([x - lr, y - lr * 0.95, x + lr, y + lr * 0.6], fill=255)
        x += lr * rng.uniform(1.1, 1.5)
    lw = max(2, round(thickness * 0.07))
    inner = mask.filter(ImageFilter.MinFilter(2 * lw + 1))
    outline = ImageChops.subtract(mask, inner)
    layer = Image.new("RGBA", size, rgba(fill[:3], 0))
    layer.putalpha(mask.point(lambda v: round(v * fill[3] / 255)))
    line_layer = Image.new("RGBA", size, rgba(line[:3], 0))
    line_layer.putalpha(outline.point(lambda v: round(v * line[3] / 255)))
    layer.alpha_composite(line_layer)
    d = ImageDraw.Draw(layer)
    if curl_left:
        stroke(d, spiral(x0 + r * 1.1, y, r * 0.75, 1.2, clockwise=False, start=math.pi), line, lw)
    if curl_right:
        stroke(d, spiral(x1 - r * 1.1, y, r * 0.75, 1.2, clockwise=True, start=0), line, lw)
    return layer


def pagoda(draw, cx, base_y, height, color):
    """A five-tier pagoda silhouette with upturned eaves."""
    tiers = 5
    tier_h = height * 0.78 / tiers
    width = height * 0.6
    y = base_y
    for i in range(tiers):
        w = width * (1 - 0.13 * i)
        body_w = w * 0.55
        draw.rectangle([cx - body_w / 2, y - tier_h * 0.55, cx + body_w / 2, y], fill=color)
        roof_y = y - tier_h * 0.55
        lift = tier_h * 0.28
        draw.polygon([
            (cx - w / 2 - lift * 0.6, roof_y - lift),
            (cx - w * 0.36, roof_y - tier_h * 0.08),
            (cx - w * 0.22, roof_y - tier_h * 0.45),
            (cx + w * 0.22, roof_y - tier_h * 0.45),
            (cx + w * 0.36, roof_y - tier_h * 0.08),
            (cx + w / 2 + lift * 0.6, roof_y - lift),
            (cx + w * 0.30, roof_y + tier_h * 0.06),
            (cx - w * 0.30, roof_y + tier_h * 0.06),
        ], fill=color)
        y -= tier_h
    spire_w = max(2, width * 0.035)
    draw.rectangle([cx - spire_w / 2, y - height * 0.22, cx + spire_w / 2, y], fill=color)
    for k in range(4):
        ry = y - height * (0.04 + 0.04 * k)
        rw = spire_w * 2.2
        draw.ellipse([cx - rw, ry - spire_w * 0.7, cx + rw, ry + spire_w * 0.7], fill=color)


def bezier(p0, p1, p2, n=60):
    return [
        ((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
         (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1])
        for t in (i / n for i in range(n + 1))
    ]


def branch(draw, p0, p1, p2, w0, w1, color):
    """A tapered branch along a curve. Returns the curve, for placing flowers."""
    points = bezier(p0, p1, p2, 120)
    for i, (x, y) in enumerate(points):
        r = (w0 + (w1 - w0) * i / (len(points) - 1)) / 2
        draw.ellipse([x - r, y - r, x + r, y + r], fill=color)
    return points


def ellipse_points(cx, cy, a, b, angle, n=36):
    ca, sa = math.cos(angle), math.sin(angle)
    return [(cx + a * math.cos(t) * ca - b * math.sin(t) * sa,
             cy + a * math.cos(t) * sa + b * math.sin(t) * ca)
            for t in (2 * math.pi * i / n for i in range(n))]


def petal(draw, cx, cy, r, angle, color):
    """One sakura petal pointing out from (cx, cy): an oval with a small notch
    at its tip, made by two round lobes."""
    ca, sa = math.cos(angle), math.sin(angle)

    def at(u, v):
        return cx + u * ca - v * sa, cy + u * sa + v * ca

    draw.polygon(ellipse_points(*at(0.48 * r, 0), 0.42 * r, 0.30 * r, angle), fill=color)
    for side in (-1, 1):
        lx, ly = at(0.74 * r, side * 0.13 * r)
        lr = 0.19 * r
        draw.ellipse([lx - lr, ly - lr, lx + lr, ly + lr], fill=color)


def blossom(draw, cx, cy, r, angle, petal_color, heart_color):
    for k in range(5):
        petal(draw, cx, cy, r, angle + k * 2 * math.pi / 5, petal_color)
    hr = r * 0.17
    draw.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=heart_color)
    for k in range(5):
        a = angle + math.pi / 5 + k * 2 * math.pi / 5
        sx, sy = cx + r * 0.33 * math.cos(a), cy + r * 0.33 * math.sin(a)
        dr = r * 0.055
        draw.ellipse([sx - dr, sy - dr, sx + dr, sy + dr], fill=heart_color)


def loose_petal(draw, cx, cy, r, angle, color):
    petal(draw, cx - 0.5 * r * math.cos(angle), cy - 0.5 * r * math.sin(angle), r, angle, color)


def flowers_along(draw, rng, curve, count, r_range, start=0.25):
    for _ in range(count):
        i = int(rng.uniform(start, 1.0) * (len(curve) - 1))
        x, y = curve[i]
        r = rng.uniform(*r_range)
        ox, oy = rng.uniform(-r, r), rng.uniform(-r, r)
        color = CHERRY_BLOSSOM if rng.random() < 0.7 else BLOSSOM_DEEP
        if rng.random() < 0.18:
            br = r * 0.35
            draw.ellipse([x + ox - br, y + oy - br, x + ox + br, y + oy + br], fill=BLOSSOM_DEEP)
        else:
            blossom(draw, x + ox, y + oy, r, rng.uniform(0, 2 * math.pi), color, BLOSSOM_HEART)


def save(img, name, size, **kwargs):
    img.resize(size, Image.LANCZOS).save(OUT / name, **kwargs)
    print("wrote", OUT / name)


# --- Dusk backdrop (empty and end screens) ----------------------------------


def dusk_scene():
    """Portrait backdrop. The middle third stays plain dark sky for the text."""
    W, H = 1080 * SS, 2160 * SS
    rng = random.Random(7)
    sky_glow = mix(DEEP_SEA_NIGHT, SUNSET, 0.5)
    img = vertical_gradient((W, H), [
        (0.0, NIGHT_DARK),
        (0.30, DEEP_SEA_NIGHT),
        (0.56, DEEP_SEA_NIGHT),
        (0.72, sky_glow),
        (1.0, sky_glow),
    ]).convert("RGBA")

    # Sun, low behind the far ridge, with a soft halo.
    sun_c, sun_r = (0.66 * W, 0.705 * H), 0.12 * W
    halo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hd = ImageDraw.Draw(halo)
    hr = sun_r * 1.9
    hd.ellipse([sun_c[0] - hr, sun_c[1] - hr, sun_c[0] + hr, sun_c[1] + hr], fill=rgba(SUNSET, 0.35))
    img.alpha_composite(halo.filter(ImageFilter.GaussianBlur(sun_r * 0.6)))
    d = ImageDraw.Draw(img)
    d.ellipse([sun_c[0] - sun_r, sun_c[1] - sun_r, sun_c[0] + sun_r, sun_c[1] + sun_r], fill=SUNSET)

    # Swirling clouds: high in the sky, and one band drifting across the sun.
    size = (W, H)
    high_fill, high_line = rgba(TEAL_MIST, 0.20), rgba(TEAL_MIST, 0.55)
    for layer in (
        cloud(size, -0.12 * W, 0.40 * W, 0.115 * H, 0.05 * W, high_fill, high_line, 1,
              curl_left=False),
        cloud(size, 0.10 * W, 0.52 * W, 0.19 * H, 0.04 * W, high_fill, high_line, 2),
        cloud(size, 0.02 * W, 0.26 * W, 0.255 * H, 0.03 * W, rgba(TEAL_MIST, 0.14),
              rgba(TEAL_MIST, 0.4), 3),
        cloud(size, 0.46 * W, 1.12 * W, 0.675 * H, 0.05 * W,
              rgba(mix(TEAL_MIST, DEEP_SEA_NIGHT, 0.35), 0.9), rgba(TEAL_MIST, 0.95), 4,
              curl_right=False),
        cloud(size, -0.10 * W, 0.12 * W, 0.70 * H, 0.032 * W, rgba(TEAL_MIST, 0.35),
              rgba(TEAL_MIST, 0.7), 5, curl_left=False),
    ):
        img.alpha_composite(layer)

    # Far ridge with the pagoda, hazy in the evening light.
    far = mix(mix(DEEP_SEA_NIGHT, TEAL_MIST, 0.45), SUNSET, 0.18)
    far_pts = ridge_points(rng, W, 0.76 * H,
                           [(0.24 * W, 0.075 * H, 0.16 * W), (0.55 * W, 0.04 * H, 0.12 * W),
                            (0.92 * W, 0.06 * H, 0.14 * W)], 0.003 * H)
    d = ImageDraw.Draw(img)
    pagoda(d, 0.24 * W, 0.697 * H, 0.09 * H, far)
    fill_ridge(d, far_pts, H, far)
    img.alpha_composite(soft_band((W, H), 0.765 * H, 0.04 * H, TEAL_MIST, 0.35))

    # Middle and near ridges, darker as they come closer.
    d = ImageDraw.Draw(img)
    mid = mix(DEEP_SEA_NIGHT, TEAL_MIST, 0.3)
    fill_ridge(d, ridge_points(rng, W, 0.84 * H,
                               [(0.08 * W, 0.05 * H, 0.15 * W), (0.48 * W, 0.075 * H, 0.17 * W),
                                (0.85 * W, 0.045 * H, 0.12 * W)], 0.004 * H), H, mid)
    img.alpha_composite(soft_band((W, H), 0.85 * H, 0.035 * H, TEAL_MIST, 0.28))
    d = ImageDraw.Draw(img)
    fill_ridge(d, ridge_points(rng, W, 0.93 * H,
                               [(0.30 * W, 0.045 * H, 0.2 * W), (0.78 * W, 0.07 * H, 0.18 * W)],
                               0.004 * H), H, NIGHT_DARK)

    # Cherry branches: one reaching in from the top corner, one low in front.
    d = ImageDraw.Draw(img)
    top = branch(d, (1.04 * W, 0.015 * H), (0.82 * W, 0.11 * H), (0.50 * W, 0.135 * H),
                 0.035 * W, 0.006 * W, BRANCH)
    twig = branch(d, (0.80 * W, 0.085 * H), (0.74 * W, 0.04 * H), (0.62 * W, 0.03 * H),
                  0.014 * W, 0.004 * W, BRANCH)
    twig2 = branch(d, (0.66 * W, 0.128 * H), (0.62 * W, 0.18 * H), (0.56 * W, 0.215 * H),
                   0.012 * W, 0.004 * W, BRANCH)
    low = branch(d, (-0.04 * W, 0.975 * H), (0.12 * W, 0.90 * H), (0.36 * W, 0.885 * H),
                 0.03 * W, 0.006 * W, BRANCH)
    flowers_along(d, rng, top, 22, (0.022 * W, 0.034 * W), start=0.2)
    flowers_along(d, rng, twig, 7, (0.018 * W, 0.026 * W), start=0.3)
    flowers_along(d, rng, twig2, 6, (0.018 * W, 0.026 * W), start=0.3)
    flowers_along(d, rng, low, 14, (0.022 * W, 0.032 * W), start=0.3)

    # A few loose petals drifting down, kept clear of the text in the middle.
    placed = 0
    while placed < 16:
        x, y = rng.uniform(0.04, 0.96) * W, rng.uniform(0.2, 0.9) * H
        if 0.30 * H < y < 0.62 * H and 0.12 * W < x < 0.88 * W:
            continue
        color = CHERRY_BLOSSOM if rng.random() < 0.6 else BLOSSOM_DEEP
        loose_petal(d, x, y, rng.uniform(0.008, 0.014) * W, rng.uniform(0, 2 * math.pi), color)
        placed += 1

    save(img.convert("RGB"), "dusk.jpg", (1080, 2160), quality=88, optimize=True)


# --- Icon and splash ---------------------------------------------------------


def emblem(size, rng, transparent_sky):
    """Sun over misty ridges with a cherry sprig: the icon and splash motif.

    Kept inside the middle ~60% so the adaptive icon mask never cuts it.
    """
    S = size
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    if not transparent_sky:
        img = vertical_gradient((S, S), [
            (0.0, NIGHT_DARK), (0.45, DEEP_SEA_NIGHT), (1.0, mix(DEEP_SEA_NIGHT, SUNSET, 0.25)),
        ]).convert("RGBA")
    d = ImageDraw.Draw(img)
    sun_c, sun_r = (0.5 * S, 0.47 * S), 0.17 * S
    d.ellipse([sun_c[0] - sun_r, sun_c[1] - sun_r, sun_c[0] + sun_r, sun_c[1] + sun_r], fill=SUNSET)
    img.alpha_composite(cloud((S, S), 0.36 * S, 0.80 * S, 0.515 * S, 0.05 * S,
                              rgba(mix(TEAL_MIST, DEEP_SEA_NIGHT, 0.35)), rgba(TEAL_MIST), 6,
                              curl_right=False))
    d = ImageDraw.Draw(img)
    far = mix(DEEP_SEA_NIGHT, TEAL_MIST, 0.55)
    fill_ridge(d, ridge_points(rng, S, 0.66 * S,
                               [(0.36 * S, 0.12 * S, 0.11 * S), (0.66 * S, 0.07 * S, 0.1 * S)],
                               0.002 * S), S, far)
    fill_ridge(d, ridge_points(rng, S, 0.74 * S,
                               [(0.55 * S, 0.075 * S, 0.14 * S), (0.2 * S, 0.04 * S, 0.1 * S)],
                               0.002 * S), S, mix(DEEP_SEA_NIGHT, TEAL_MIST, 0.25))
    fill_ridge(d, ridge_points(rng, S, 0.82 * S, [(0.42 * S, 0.04 * S, 0.2 * S)], 0.002 * S),
               S, NIGHT_DARK)
    sprig = branch(d, (0.73 * S, 0.255 * S), (0.67 * S, 0.32 * S), (0.56 * S, 0.32 * S),
                   0.022 * S, 0.007 * S, BRANCH)
    for t, r, color in ((0.5, 0.055, CHERRY_BLOSSOM), (0.92, 0.042, BLOSSOM_DEEP),
                        (0.2, 0.04, CHERRY_BLOSSOM)):
        x, y = sprig[int(t * (len(sprig) - 1))]
        blossom(d, x, y, r * S, t * 3, color, BLOSSOM_HEART)
    return img


def circle_mask(size, inset=0.0):
    mask = Image.new("L", (size, size), 0)
    r0, r1 = size * inset, size * (1 - inset)
    ImageDraw.Draw(mask).ellipse([r0, r0, r1, r1], fill=255)
    return mask


def icons():
    S = 1024 * SS

    # Legacy square icon: the whole emblem, full bleed.
    save(emblem(S, random.Random(3), transparent_sky=False), "icon.png", (1024, 1024))

    # Adaptive icon: the sky is the back layer, sun, ridges and sprig the front.
    back = vertical_gradient((S, S), [
        (0.0, NIGHT_DARK), (0.45, DEEP_SEA_NIGHT), (1.0, mix(DEEP_SEA_NIGHT, SUNSET, 0.25)),
    ])
    save(back, "android-icon-background.png", (1024, 1024))
    front = emblem(S, random.Random(3), transparent_sky=True)
    save(front, "android-icon-foreground.png", (1024, 1024))

    # Themed icon: one flat color (Android tints it). Sun and ridges as a
    # single silhouette, the sun cut by a thin line of sky above the ridges.
    mono = Image.new("L", (S, S), 0)
    md = ImageDraw.Draw(mono)
    rng = random.Random(3)
    sun_c, sun_r = (0.5 * S, 0.47 * S), 0.17 * S
    md.ellipse([sun_c[0] - sun_r, sun_c[1] - sun_r, sun_c[0] + sun_r, sun_c[1] + sun_r], fill=255)
    ridge = ridge_points(rng, S, 0.66 * S,
                         [(0.36 * S, 0.12 * S, 0.11 * S), (0.66 * S, 0.07 * S, 0.1 * S)], 0)
    gap = [(x, y - 0.025 * S) for x, y in ridge]
    fill_ridge(md, gap, S, 0)
    fill_ridge(md, ridge, S, 255)
    mono = ImageChops.multiply(mono, circle_mask(S, 0.2))
    white = Image.new("RGBA", (S, S), (255, 255, 255, 0))
    white.putalpha(mono)
    save(white, "android-icon-monochrome.png", (1024, 1024))

    # Splash: the emblem in a round medallion on the Deep Sea Night screen.
    medal = emblem(S, random.Random(3), transparent_sky=False)
    medal.putalpha(circle_mask(S, 0.04))
    save(medal, "splash-icon.png", (1024, 1024))


if __name__ == "__main__":
    dusk_scene()
    icons()
