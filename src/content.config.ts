import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './articles' }),
  schema: z.object({
    title: z.string().optional(),
    date: z.coerce.date().optional(),
    excerpt: z.string().optional(),
    badges: z.array(z.string()).optional(),
  }),
});

export const collections = { articles };
