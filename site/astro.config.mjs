// @ts-check
import { readdirSync, readFileSync } from "node:fs";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

// Sitemap <lastmod>: a post's `updated` (or `date`) frontmatter; every other
// page uses the build time.
const blogDir = new URL("./src/content/blog/", import.meta.url);
const postDates = Object.fromEntries(
  readdirSync(blogDir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => {
      const fm = readFileSync(new URL(f, blogDir), "utf8").split("---")[1] ?? "";
      const date = fm.match(/^updated:\s*(.+)$/m)?.[1] ?? fm.match(/^date:\s*(.+)$/m)?.[1];
      return [f.replace(/\.mdx$/, ""), date ? new Date(date.trim()) : undefined];
    }),
);
const built = new Date();

export default defineConfig({
  site: "https://gigaflush.com",
  trailingSlash: "never",
  devToolbar: { enabled: false },
  integrations: [
    react(),
    mdx(),
    sitemap({
      filter: (page) => !page.endsWith("/404") && !page.endsWith("/404/"),
      serialize(item) {
        const slug = item.url.match(/\/blog\/([^/]+)\/?$/)?.[1];
        item.lastmod = ((slug && postDates[slug]) || built).toISOString();
        return item;
      },
    }),
  ],
  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    },
  },
});
