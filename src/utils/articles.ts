import type { CollectionEntry } from 'astro:content';

const dateFormatters = {
  short: new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }),
  long: new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }),
};

export const titleFromSlug = (slug: string) =>
  slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const formatDate = (
  value: Date | undefined,
  format: keyof typeof dateFormatters = 'short',
) => (value ? dateFormatters[format].format(value) : '');

const stripMarkdown = (content: string) =>
  content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/[*_~>-]/g, ' ')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const toWritingItem = (entry: CollectionEntry<'articles'>) => {
  const title = entry.data.title ?? titleFromSlug(entry.id);
  const fallbackExcerpt = stripMarkdown(entry.body ?? '').slice(0, 190).trim();

  return {
    title,
    date: formatDate(entry.data.date)?.toUpperCase() || 'UNDATED',
    excerpt: entry.data.excerpt ?? (fallbackExcerpt ? `${fallbackExcerpt}...` : ''),
    link: `/writing/${entry.id}/`,
    badges: entry.data.badges ?? [],
  };
};
