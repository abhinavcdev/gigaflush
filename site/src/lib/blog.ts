import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"blog">;

export async function getPosts() {
  const posts = await getCollection("blog");
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function readingTime(post: Post) {
  const words = (post.body ?? "").replace(/<[^>]+>|import .+/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 230));
}

export const formatDate = (d: Date) => d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

export function related(post: Post, all: Post[], n = 3) {
  return all
    .filter((p) => p.id !== post.id)
    .map((p) => ({ p, score: p.data.tags.filter((t) => post.data.tags.includes(t)).length }))
    .sort((a, b) => b.score - a.score || b.p.data.date.valueOf() - a.p.data.date.valueOf())
    .slice(0, n)
    .map((x) => x.p);
}
