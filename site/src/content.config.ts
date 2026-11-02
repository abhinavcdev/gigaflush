import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),
    accent: z.string().default("#68aeff"),
    featured: z.boolean().default(false),
    figure: z.string().optional(),
  }),
});

export const collections = { blog };
