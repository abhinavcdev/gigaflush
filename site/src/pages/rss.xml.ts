import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getPosts } from "../lib/blog";

export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: "Gigaflush blog",
    description: "Reclaiming disk space from node_modules, build output and developer caches.",
    site: context.site!,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.date,
      link: `/blog/${p.id}`,
      categories: p.data.tags,
    })),
  });
}
