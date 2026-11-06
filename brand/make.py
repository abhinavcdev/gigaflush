# Gigaflush brand assets: the tap-G.
#
#   python3 brand/make.py      (from the repo root)
#
# One source for every logo file in the app and on the site. The letter is a
# softened squircle G drawn as a single centre-line with cut terminals; its top
# end runs out into a tap with a slim handle, and one drop falls into the
# aperture. The cleanup colours fill it as soft horizontal layers. The palette
# is deliberately ours (periwinkle, lavender, seafoam, rose), not the
# red/yellow/green/blue quartet people associate with Google.
#
# Writes the SVG sources; PNG/ICO/ICNS files are rendered from them by
# brand/render.mjs (run it next).
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Cleanup colours, top layer first: Node.js, Rust, Flutter/Dart, other.
# Keep in sync with --slot-* in src/styles.css and the site's --series-*.
PALETTE = {
    "light": ["#6271f5", "#9d72f0", "#1fae9d", "#e5779c"],
    "dark": ["#97a3ff", "#c4a3ff", "#5edbc9", "#ffa1bf"],
}
INK = {"light": "#1d1d1f", "dark": "#f5f5f7"}
TILE = {
    "light": {"from": "#ffffff", "to": "#f2f2f6", "glow": ("#9d72f0", 0.07), "edge": ("#000000", 0.07)},
    "dark": {"from": "#2c2d33", "to": "#141518", "glow": ("#6271f5", 0.16), "edge": ("#ffffff", 0.08)},
}


def sq(t, cx, cy, a, b, n):
    c, s = math.cos(math.radians(t)), math.sin(math.radians(t))
    return (cx + a * math.copysign(abs(c) ** (2 / n), c), cy + b * math.copysign(abs(s) ** (2 / n), s))


def fmt(p):
    return f"{p[0]:.1f} {p[1]:.1f}"


def stroke(d, color, w, cap="butt"):
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{w:g}" stroke-linecap="{cap}" stroke-linejoin="round"/>'


class Glyph:
    """Centre-line geometry of the tap-G on the 1024 grid."""

    def __init__(self, w=96, cx=500, cy=560, a=224, b=256, n=2.9, start=-80, bar_in=58, spout_r=50):
        self.w, self.cx, self.cy = w, cx, cy
        top = sq(start, cx, cy, a, b, n)
        arc = [sq(-360 + (start + 360) * i / 200, cx, cy, a, b, n) for i in range(201)]  # bar end → top end
        x1 = top[0] + 30
        self.tip = (x1 + spout_r, top[1] + spout_r + 14)
        self.body = (
            "M" + " L".join(fmt(p) for p in arc)
            + f" L{x1:.1f} {top[1]:.1f} Q{x1 + spout_r:.1f} {top[1]:.1f} {x1 + spout_r:.1f} {top[1] + spout_r:.1f} L{fmt(self.tip)}"
        )
        end = arc[0]
        self.bar = f"M{end[0] + w / 2:.1f} {end[1]:.1f} L{cx + bar_in:.1f} {end[1]:.1f}"
        hx, hy = top[0] + 22, top[1] - w / 2
        self.stem = f"M{hx:.1f} {hy + 4:.1f} L{hx:.1f} {hy - 58:.1f}"
        self.lever = f"M{hx - 44:.1f} {hy - 58:.1f} L{hx + 44:.1f} {hy - 58:.1f}"
        self.top, self.bottom = hy, cy + b + w / 2

    def letter(self, color, w=None):
        w = w or self.w
        return stroke(self.body, color, w) + stroke(self.bar, color, w)

    def handle(self, color, scale=1.0):
        return stroke(self.stem, color, 30 * scale, "round") + stroke(self.lever, color, 30 * scale, "round")

    def drop_path(self, s=26):
        x, y = self.tip[0], self.tip[1] + s * 2.3 + 18
        return (
            f"M{x:.1f} {y - s * 1.6:.1f} C{x + s * 0.3:.1f} {y - s:.1f} {x + s:.1f} {y - s * 0.4:.1f} {x + s:.1f} {y + s * 0.15:.1f} "
            f"A{s:.1f} {s:.1f} 0 0 1 {x - s:.1f} {y + s * 0.15:.1f} C{x - s:.1f} {y - s * 0.4:.1f} {x - s * 0.3:.1f} {y - s:.1f} {x:.1f} {y - s * 1.6:.1f} Z",
            (x - s * 0.42, y + s * 0.05),
        )

    def seams(self):
        """First seam on the bar's top edge; the next below the bar, so bar and stem share a layer."""
        bar_top, bar_bottom = self.cy - self.w / 2, self.cy + self.w / 2
        second = bar_bottom + self.w * 0.55
        return [bar_top, second, second + (self.bottom - second) * 0.5]


def mark(theme, uid, g=None):
    """The coloured mark (no tile) for a light or dark background."""
    g = g or Glyph()
    cols, ink = PALETTE[theme], INK[theme]
    span = g.bottom - g.top
    edges = [(y - g.top) / span for y in g.seams()]
    blend = 0.03
    stops = [f'<stop offset="0" stop-color="{cols[0]}"/>']
    for i, e in enumerate(edges):
        stops.append(f'<stop offset="{e - blend:.3f}" stop-color="{cols[i]}"/>')
        stops.append(f'<stop offset="{e + blend:.3f}" stop-color="{cols[i + 1]}"/>')
    stops.append(f'<stop offset="1" stop-color="{cols[-1]}"/>')
    drop, (hx, hy) = g.drop_path()
    return (
        f'<defs><linearGradient id="fill-{uid}" gradientUnits="userSpaceOnUse" x1="0" y1="{g.top:.1f}" x2="0" y2="{g.bottom:.1f}">{"".join(stops)}</linearGradient>'
        f'<linearGradient id="drop-{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{cols[0]}"/><stop offset="1" stop-color="{cols[1]}"/></linearGradient></defs>'
        + g.letter(f"url(#fill-{uid})")
        + g.handle(ink)
        + f'<path d="{drop}" fill="url(#drop-{uid})"/>'
        + f'<circle cx="{hx:.1f}" cy="{hy:.1f}" r="5.5" fill="#ffffff" opacity=".7"/>'
    )


def tile(theme, uid):
    t = TILE[theme]
    glow, glow_o = t["glow"]
    edge, edge_o = t["edge"]
    return (
        f'<defs><linearGradient id="tile-{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{t["from"]}"/><stop offset="1" stop-color="{t["to"]}"/></linearGradient>'
        f'<radialGradient id="glow-{uid}" cx="0.3" cy="0.18" r="0.75"><stop offset="0" stop-color="{glow}" stop-opacity="{glow_o}"/><stop offset="1" stop-color="{glow}" stop-opacity="0"/></radialGradient></defs>'
        f'<rect x="100" y="100" width="824" height="824" rx="186" fill="url(#tile-{uid})"/>'
        f'<rect x="100" y="100" width="824" height="824" rx="186" fill="url(#glow-{uid})"/>'
        f'<rect x="100.5" y="100.5" width="823" height="823" rx="185.5" fill="none" stroke="{edge}" stroke-opacity="{edge_o}"/>'
    )


def tray_shapes(color="#000"):
    """One-colour menu-bar mark: heavier strokes so it holds at 18 px. No drop:
    at that size it merges with the bar, and the tap already reads."""
    g = Glyph()
    return stroke(g.body, color, 112) + stroke(g.bar, color, 112) + g.handle(color, 1.4)


ICON_VB = "0 0 1024 1024"
MARK_VB = "148 160 704 704"  # square crop around the bare mark
TRAY_VB = "150 150 724 724"


def svg(body, vb, size=None, extra=""):
    wh = f' width="{size}" height="{size}"' if size else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg"{wh} viewBox="{vb}"{extra}>{body}</svg>\n'


def write(rel, text):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        fh.write(text)
    print("wrote", rel)


icon_dark = svg(tile("dark", "d") + mark("dark", "d"), ICON_VB, 1024)
icon_light = svg(tile("light", "l") + mark("light", "l"), ICON_VB, 1024)
mark_dark = svg(mark("dark", "md"), MARK_VB, 512)  # for dark backgrounds
mark_light = svg(mark("light", "ml"), MARK_VB, 512)  # for light backgrounds
tray = svg(tray_shapes(), TRAY_VB, 1024)

# Favicon: the tile follows the browser's colour scheme.
fav_light = f'<g class="l">{tile("light", "fl")}{mark("light", "fl")}</g>'
fav_dark = f'<g class="d">{tile("dark", "fd")}{mark("dark", "fd")}</g>'
favicon = svg(
    "<style>.d{display:none}@media (prefers-color-scheme:dark){.l{display:none}.d{display:inline}}</style>" + fav_light + fav_dark,
    "100 100 824 824",
)

for rel, text in [
    ("brand/app-icon.svg", icon_dark),
    ("brand/app-icon-light.svg", icon_light),
    ("brand/mark-dark.svg", mark_dark),
    ("brand/mark-light.svg", mark_light),
    ("brand/tray.svg", tray),
    # The app's own copies (titlebar and onboarding marks).
    ("src/brand/app-icon.svg", icon_dark),
    ("src/brand/app-icon-light.svg", icon_light),
    # The site's copies.
    ("site/public/brand/app-icon.svg", icon_dark),
    ("site/public/brand/app-icon-light.svg", icon_light),
    ("site/public/brand/mark-dark.svg", mark_dark),
    ("site/public/brand/mark-light.svg", mark_light),
    ("site/public/favicon.svg", favicon),
]:
    write(rel, text)

# Inline one-colour mark for HTML that draws a menu bar (uses currentColor).
write("site/src/components/TrayMark.astro", "---\n// Generated by brand/make.py: the one-colour menu-bar mark.\n---\n\n" + svg(tray_shapes("currentColor"), TRAY_VB, extra=' aria-hidden="true"'))

# Board: dark and light icons, small sizes, and the bare marks.
parts = []
for k, theme in enumerate(("light", "dark")):
    x0 = 40 + k * 820
    page, ink = ("#ffffff", "#1d1d1f") if theme == "light" else ("#1c1c1e", "#f5f5f7")
    parts.append(f'<rect x="{x0}" y="40" width="800" height="360" rx="24" fill="{page}"/>')
    parts.append(f'<svg x="{x0 + 30}" y="70" width="300" height="300" viewBox="{ICON_VB}">{tile(theme, "b" + theme)}{mark(theme, "b" + theme)}</svg>')
    for size, dx in ((96, 0), (48, 120), (32, 186), (16, 236)):
        parts.append(f'<svg x="{x0 + 360 + dx}" y="{100 + (96 - size) / 2}" width="{size}" height="{size}" viewBox="{ICON_VB}">{tile(theme, f"s{size}{theme}")}{mark(theme, f"s{size}{theme}")}</svg>')
    parts.append(f'<svg x="{x0 + 352}" y="236" width="96" height="96" viewBox="{MARK_VB}">{mark(theme, "lk" + theme)}</svg>')
    parts.append(f'<text x="{x0 + 452}" y="300" font-family="Helvetica" font-weight="700" font-size="46" letter-spacing="-1.2" fill="{ink}">Gigaflush</text>')
write("brand/board.svg", svg(f'<rect width="100%" height="100%" fill="#f5f5f7"/>{"".join(parts)}', "0 0 1680 440", extra=' width="1680" height="440"'))
