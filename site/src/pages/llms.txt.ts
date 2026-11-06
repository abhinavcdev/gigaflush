// /llms.txt (https://llmstxt.org): a plain-text map of the site for AI
// assistants and answer engines, generated from the same data as the pages.
import type { APIContext } from "astro";
import { getPosts } from "../lib/blog";
import { guides, platforms } from "../data/cleanup";
import { faqs } from "../data/faq";
import { GITHUB_URL, RELEASES_URL } from "../config";

export async function GET({ site }: APIContext) {
  const url = (path: string) => new URL(path, site).href;
  const posts = await getPosts();
  const body = `# Gigaflush

> Gigaflush is a free, open-source (GPL-3.0) menu-bar / system-tray app for macOS, Windows and Linux. It finds rebuildable developer folders across your projects (node_modules, Rust target, Flutter build and .dart_tool, Python .pytest_cache/.mypy_cache/.ruff_cache, Swift .build, Gradle .gradle, Maven target), shows their sizes, and deletes the ones you choose after a review step. It also finds idle dev servers left running on localhost ports and stops them.

Folders are only matched when the project's marker file (package.json, Cargo.toml, pubspec.yaml, pyproject.toml, Package.swift, build.gradle, pom.xml) is beside them. Source code, lockfiles, virtual environments, global caches and SDKs are never touched. Deletion is permanent, not a move to Trash. There is no telemetry or account. Every build is free on GitHub Releases.

## Download
- [Download for macOS, Windows and Linux](${url("/#download")})
${platforms.map((p) => `- [Gigaflush for ${p.name}](${url(`/${p.slug}`)}): ${p.blurb}`).join("\n")}
- [All releases on GitHub](${RELEASES_URL})
- [Source code](${GITHUB_URL})

## Guides
${guides.map((g) => `- [${g.h1}](${url(`/clean/${g.slug}`)}): ${g.answer}`).join("\n")}

## Articles
${posts.map((p) => `- [${p.data.title}](${url(`/blog/${p.id}`)}): ${p.data.description}`).join("\n")}

## FAQ
${faqs.map((f) => `- **${f.q}** ${f.a}`).join("\n")}

## Optional
- [Support](${url("/support")})
- [Privacy](${url("/privacy")})
- [RSS](${url("/rss.xml")})
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
