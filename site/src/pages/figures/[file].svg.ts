// Static, self-styled SVGs of every Anatomy figure, one per theme, for post
// cards and anywhere a plain image is needed. Built from the same modules as
// the live figures, so the drawings never drift apart.
import type { APIRoute } from "astro";
import parts from "../../anatomy/kit/iso-parts.css?raw";
import theme from "../../anatomy/theme.css?raw";

const modules = import.meta.glob("../../anatomy/figures/*.mjs", { eager: true }) as Record<string, any>;
const names = Object.keys(modules).map((p) => p.split("/").pop()!.replace(".mjs", ""));

// Pull the token blocks out of theme.css so the palette has one source.
const block = (selector: string) => {
  const at = theme.indexOf(selector);
  return theme.slice(theme.indexOf("{", at) + 1, theme.indexOf("}", at));
};
const LIGHT = block(".iso {");
const DARK = `${LIGHT}${block(':root[data-theme="dark"] .iso {')}`;
const PAGE = { light: "#faf9f6", dark: "#191b19" };

export function getStaticPaths() {
  return names.flatMap((name) => ["light", "dark"].map((t) => ({ params: { file: `${name}-${t}` }, props: { name, t } })));
}

export const GET: APIRoute = ({ props }) => {
  const { name, t } = props as { name: string; t: "light" | "dark" };
  const { svg } = modules[`../../anatomy/figures/${name}.mjs`].figure({ still: true });
  // Resolve every custom property to a literal so any SVG renderer (image
  // tools, link previews, older engines) draws the same picture.
  const tokens = (t === "dark" ? DARK : LIGHT).replace("var(--page)", PAGE[t]).replace("var(--mono)", "ui-monospace, Menlo, monospace");
  const values = new Map<string, string>();
  for (const [, key, value] of tokens.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) values.set(key, value.trim());
  const resolved = parts.replace(/var\((--[\w-]+)\)/g, (m, key) => values.get(key) ?? m);
  const style = `<style>${resolved}</style>`;
  const body = svg
    .replace('class="iso-svg"', 'class="iso-svg iso"')
    .replace(/(<svg[^>]*>)/, `$1${style}`)
    .replace(/ style="opacity:0"/g, "");
  return new Response(body, { headers: { "Content-Type": "image/svg+xml" } });
};
