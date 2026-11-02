export const MAX_SLUG_LENGTH = 80

// Mirrors slugify() in api/generate-article.ts (which can't import from src/). Keep them in sync;
// src/lib/slug.test.ts checks both give the same answers.
export function slugify(value: string, max: number = MAX_SLUG_LENGTH): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '')
}

// 'new' would collide with the /articles/new route.
const RESERVED_SLUGS = new Set(['new'])

export function isValidSlug(slug: string): boolean {
  return !RESERVED_SLUGS.has(slug) && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= MAX_SLUG_LENGTH
}

/** attempt 1 is the slug itself; attempt 2 onwards appends -2, -3, ... within the length limit. */
export function slugCandidate(base: string, attempt: number): string {
  if (attempt <= 1) return base
  const suffix = `-${attempt}`
  return base.slice(0, MAX_SLUG_LENGTH - suffix.length).replace(/-+$/g, '') + suffix
}
