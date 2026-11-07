// Open Graph cards, rendered at build time: satori lays the card out as SVG
// (text becomes paths, so no font is needed at view time) and sharp turns it
// into a PNG. The look follows the site: white page, hairline frame with "+"
// crosses, hatched rails, the app icon, and the cleanup colours of the reclaim bar.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import sharp from "sharp";
import { getPosts, readingTime, formatDate } from "./blog";
import { guides, platforms } from "../data/cleanup";

export type Card = {
  key: string; // URL path without slashes, "index" for the home page
  kicker: string;
  title: string;
  dim?: string; // second half of the headline, in grey
  breakDim?: boolean; // start the grey half on its own line
  subtitle?: string;
  chips?: string[];
  meta?: string;
  mockup?: boolean; // the app panel on the right (home card)
  size?: number; // headline size override
};

export async function cards(): Promise<Card[]> {
  const posts = await getPosts();
  return [
    {
      key: "index",
      kicker: "Free for macOS, Windows, Linux",
      title: "Your disk isn't full.",
      dim: "It's build caches.",
      breakDim: true,
      chips: ["node_modules", "target", "build", ".gradle"],
      mockup: true,
      size: 54,
    },
    { key: "guides", kicker: "Cleanup guides", title: "Is it safe to delete", dim: "that folder?", chips: guides.flatMap((g) => g.folders).filter((f, i, a) => a.indexOf(f) === i).slice(0, 5) },
    { key: "blog", kicker: "Blog", title: "Notes on disk space,", dim: "node_modules and build caches.", meta: `${posts.length} articles` },
    ...guides.map((g) => ({
      key: `clean/${g.slug}`,
      kicker: `${g.ecosystem} guide`,
      title: g.h1,
      subtitle: g.answer.split(/(?<=\.)\s/)[0],
      chips: [...g.folders, ...g.markers.slice(0, 2)],
    })),
    ...posts.map((p) => ({
      key: `blog/${p.id}`,
      kicker: "Blog",
      title: p.data.title,
      meta: `${formatDate(p.data.date)} · ${readingTime(p)} min read`,
      chips: p.data.tags.slice(0, 3),
    })),
    ...platforms.map((p) => ({ key: p.slug, kicker: `Gigaflush for ${p.name}`, title: p.h1, meta: "Free download" })),
    { key: "sitemap", kicker: "Sitemap", title: "Everything", dim: "in one place." },
    { key: "support", kicker: "Support", title: "Help installing", dim: "and using Gigaflush." },
    { key: "privacy", kicker: "Privacy", title: "No telemetry. No tracking.", dim: "No account." },
    { key: "terms", kicker: "Terms", title: "Free software,", dim: "GPL-3.0." },
  ];
}

// ── Rendering ───────────────────────────────────────────────────────

const W = 1200;
const H = 630;
const RAIL = 56; // hatched margin outside the frame
const TOP = 104; // header band height
const BOTTOM = 526; // footer band starts here

const C = {
  page: "#ffffff",
  text: "#1d1d1f",
  muted: "#6e6e73",
  dim: "#a1a1a6",
  line: "#e5e5ea",
  cross: "#c7c7cc",
  hatch: "#ededf1",
  chip: "#f2f2f5",
  accent: "#0071e3",
  slots: ["#6271f5", "#9d72f0", "#1fae9d", "#e5779c"], // cleanup colours (brand/make.py)
};

const fontDir = join(process.cwd(), "node_modules/@fontsource");
const font = (pkg: string, file: string) => readFileSync(join(fontDir, pkg, "files", file));
let fonts: Parameters<typeof satori>[1]["fonts"] | undefined;
const loadFonts = () =>
  (fonts ??= [
    { name: "Inter", data: font("inter", "inter-latin-500-normal.woff"), weight: 500, style: "normal" },
    { name: "Inter", data: font("inter", "inter-latin-600-normal.woff"), weight: 600, style: "normal" },
    { name: "Mono", data: font("jetbrains-mono", "jetbrains-mono-latin-500-normal.woff"), weight: 500, style: "normal" },
  ]);

const svgUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

// The app icon from brand/make.py, cropped to its tile.
const icon = (file: string) =>
  svgUri(
    readFileSync(join(process.cwd(), "public/brand", file), "utf8")
      .replace('viewBox="0 0 1024 1024"', 'viewBox="100 100 824 824"')
      .replace(/ width="1024" height="1024"/, ""),
  );
const MARK = icon("app-icon.svg");
const MARK_LIGHT = icon("app-icon-light.svg");

const HATCH = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${RAIL}" height="${H}">` +
    Array.from({ length: Math.ceil((H + RAIL) / 10) }, (_, i) => `<line x1="0" y1="${i * 10}" x2="${RAIL}" y2="${i * 10 - RAIL}" stroke="${C.hatch}" stroke-width="1"/>`).join("") +
    `</svg>`,
);

const CROSS = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15"><path d="M7.5 0v15M0 7.5h15" stroke="${C.cross}" stroke-width="1.2"/></svg>`);

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: unknown[]): Node => ({
  type,
  props: { style: { display: "flex", ...style }, children: children.flat().filter((c) => c !== undefined && c !== false) },
});
const img = (src: string, style: Record<string, unknown>): Node => ({ type: "img", props: { src, style } });
const abs = (style: Record<string, unknown>, ...children: unknown[]) => h("div", { position: "absolute", ...style }, ...children);

const typeset = (text: string) => text.replace(/'/g, "\u2019");
const words = (text?: string) => (text ? typeset(text).split(/\s+/) : []);

// Headline size steps down with length so long post titles still fit.
const headlineSize = (len: number) => (len <= 30 ? 84 : len <= 48 ? 72 : len <= 66 ? 62 : 54);

// The app's panel in light mode, as on the site's hero: drawn from the same
// numbers and colours, running off the bottom of the card.
const ROWS = [
  { name: "atlas-mobile", path: "~/Developer/atlas-mobile/build", size: "3.0 GB", on: true },
  { name: "studio-web", path: "~/Developer/studio-web/node_modules", size: "935.6 MB" },
  { name: "search-index", path: "~/Developer/search-index/target", size: "745.8 MB" },
  { name: "billing-api", path: "~/Developer/billing-api/.gradle", size: "398.6 MB" },
];

function mockup(): Node {
  const label = (text: string, style: Record<string, unknown> = {}) => h("div", { fontSize: 14, color: C.muted, ...style }, text);
  return abs(
    {
      left: 668,
      top: 132,
      width: 412, // + padding and border = 460, ending inside the frame
      boxSizing: "content-box",
      height: 560,
      flexDirection: "column",
      padding: "24px 24px 0",
      background: "#fbfbfd",
      border: `1px solid ${C.line}`,
      borderRadius: 24,
      boxShadow: "0 2px 6px rgba(0,0,0,0.04), 0 30px 60px -24px rgba(0,0,0,0.22)",
    },
    // Titlebar: icon, segmented control.
    h(
      "div",
      { alignItems: "center", justifyContent: "space-between" },
      h("div", { alignItems: "center", gap: 10 }, img(MARK_LIGHT, { width: 32, height: 32 })),
      h(
        "div",
        { padding: 3, borderRadius: 10, background: "#ececf0", fontSize: 14, fontWeight: 600 },
        h("div", { padding: "5px 18px", borderRadius: 8, background: "#ffffff", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }, "Files"),
        h("div", { padding: "5px 18px", color: C.muted }, "Servers"),
      ),
      h("div", { width: 32 }),
    ),
    // Total.
    h(
      "div",
      { marginTop: 22, justifyContent: "space-between", alignItems: "flex-end" },
      h("div", { flexDirection: "column" }, h("div", { fontSize: 46, fontWeight: 600, letterSpacing: -1.6, lineHeight: 1 }, "5.1 GB"), label("Estimated reclaimable", { marginTop: 6 })),
      h("div", { flexDirection: "column", alignItems: "flex-end" }, h("div", { fontSize: 24, fontWeight: 600 }, "4"), label("folders", { fontSize: 13 })),
    ),
    // Reclaim bar and legend.
    h("div", { marginTop: 18, gap: 3, height: 10 }, [0.58, 0.18, 0.16, 0.08].map((w, i) => h("div", { width: `${w * 100}%`, height: 10, borderRadius: 5, background: C.slots[i] }))),
    h(
      "div",
      { marginTop: 12, gap: 16 },
      ["Flutter", "Node.js", "Rust", "Gradle"].map((t, i) => h("div", { alignItems: "center", gap: 6, fontSize: 13, color: C.muted }, h("div", { width: 9, height: 9, borderRadius: 3, background: C.slots[i] }), t)),
    ),
    // List.
    h("div", { marginTop: 20, height: 1, background: C.line }),
    h("div", { marginTop: 16, justifyContent: "space-between", alignItems: "center" }, h("div", { fontSize: 15, fontWeight: 600 }, "Generated files"), label("largest first", { fontSize: 13 })),
    h(
      "div",
      { marginTop: 10, flexDirection: "column", gap: 6 },
      ROWS.map((r) =>
        h(
          "div",
          { alignItems: "center", gap: 14, padding: "11px 14px", borderRadius: 12, background: r.on ? "#eaf3ff" : "#ffffff", border: `1px solid ${r.on ? "#d3e5ff" : "#efeff3"}` },
          h("div", { width: 18, height: 18, borderRadius: 5, background: r.on ? C.accent : "#ffffff", border: r.on ? "none" : "1.5px solid #c7c7cc" }),
          h(
            "div",
            { flexDirection: "column", flexGrow: 1 },
            h("div", { fontSize: 15, fontWeight: 600 }, r.name),
            h("div", { fontFamily: "Mono", fontSize: 11.5, color: C.muted, marginTop: 2 }, r.path),
          ),
          h("div", { fontSize: 15, fontWeight: 600 }, r.size),
        ),
      ),
    ),
  );
}

function layout(card: Card): Node {
  const headline = card.dim ? `${card.title} ${card.dim}` : card.title;
  const size = card.size ?? headlineSize(headline.length + (card.subtitle ? 14 : 0));
  const textWidth = card.mockup ? 540 : 1000;
  const url = `gigaflush.com${card.key === "index" ? "" : `/${card.key}`}`;
  const crosses = [
    [RAIL, TOP],
    [W - RAIL, TOP],
    [RAIL, BOTTOM],
    [W - RAIL, BOTTOM],
  ];

  return h(
    "div",
    { position: "relative", width: W, height: H, background: C.page, fontFamily: "Inter", color: C.text },

    // Rails, frame and the full-bleed hairlines.
    img(HATCH, { position: "absolute", left: 0, top: 0, width: RAIL, height: H }),
    img(HATCH, { position: "absolute", right: 0, top: 0, width: RAIL, height: H }),
    abs({ left: RAIL, top: 0, width: 1, height: H, background: C.line }),
    abs({ right: RAIL, top: 0, width: 1, height: H, background: C.line }),
    abs({ left: 0, top: TOP, width: W, height: 1, background: C.line }),
    abs({ left: 0, top: BOTTOM, width: W, height: 1, background: C.line }),
    crosses.map(([x, y]) => img(CROSS, { position: "absolute", left: x - 7, top: y - 7, width: 15, height: 15 })),

    // Header: mark, wordmark, URL.
    abs(
      { left: RAIL + 40, right: RAIL + 40, top: 0, height: TOP, alignItems: "center", justifyContent: "space-between" },
      h(
        "div",
        { alignItems: "center", gap: 14 },
        img(MARK, { width: 44, height: 44 }),
        h("div", { fontSize: 28, fontWeight: 600, letterSpacing: -0.6 }, "Gigaflush"),
      ),
      h("div", { fontFamily: "Mono", fontSize: 19, color: C.muted, letterSpacing: -0.2 }, url),
    ),

    // Kicker, headline, subtitle.
    abs(
      { left: RAIL + 40, right: RAIL + 40, top: TOP, height: BOTTOM - TOP, flexDirection: "column", justifyContent: "center" },
      h("div", { fontSize: 24, fontWeight: 600, color: C.accent, letterSpacing: -0.3 }, card.kicker),
      h(
        "div",
        { flexWrap: "wrap", marginTop: 18, maxWidth: textWidth, fontSize: size, fontWeight: 600, lineHeight: 1.04, letterSpacing: -size * 0.035 },
        // One span per word, so wrapping never carries an indent onto a new line.
        words(card.title).map((w) => h("span", { marginRight: size * 0.24 }, w)),
        card.breakDim ? h("div", { width: "100%", height: 0 }) : undefined,
        words(card.dim).map((w) => h("span", { marginRight: size * 0.24, color: C.dim }, w)),
      ),
      card.subtitle ? h("div", { marginTop: 22, maxWidth: 940, fontSize: 28, fontWeight: 500, lineHeight: 1.3, color: C.muted, letterSpacing: -0.4 }, typeset(card.subtitle)) : undefined,
    ),

    // Footer: chips or meta on the left, the reclaim bar on the right.
    abs(
      { left: RAIL + 40, right: RAIL + 40, top: BOTTOM, height: H - BOTTOM, alignItems: "center", justifyContent: "space-between" },
      h(
        "div",
        { alignItems: "center", gap: 10 },
        card.meta ? h("div", { fontSize: 22, fontWeight: 500, color: C.muted, marginRight: card.chips?.length ? 8 : 0 }, card.meta) : undefined,
        (card.chips ?? []).map((c) =>
          h("div", { fontFamily: "Mono", fontSize: 18, color: C.text, background: C.chip, borderRadius: 8, padding: "7px 12px" }, c),
        ),
      ),
      h(
        "div",
        { gap: 4, width: 220, height: 10 },
        [0.38, 0.24, 0.3, 0.08].map((w, i) => h("div", { width: `${w * 100}%`, height: 10, borderRadius: 5, background: C.slots[i] })),
      ),
    ),
    // The app panel sits over the frame and footer.
    card.mockup ? mockup() : undefined,
  );
}

export async function renderCard(card: Card) {
  const svg = await satori(layout(card) as any, { width: W, height: H, fonts: loadFonts() });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

// Card image for a page path; pages without a card fall back to the home card.
export async function ogImageFor(pathname: string) {
  const key = pathname.replace(/^\/|\/$/g, "") || "index";
  const keys = new Set((await cards()).map((c) => c.key));
  return `/og/${keys.has(key) ? key : "index"}.png`;
}
