import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { slugCandidate } from '../lib/slug'

export interface ArticleSummary {
  id: string
  userId: string
  title: string
  slug: string
  excerpt: string
  technique: string
  status: 'draft' | 'published'
  publishedAt: string | null
  updatedAt: string
}

export interface Article extends ArticleSummary {
  sourceMarkdown: string
  bodyMarkdown: string
}

interface DbArticle {
  id: string
  user_id: string
  title: string
  slug: string
  excerpt: string
  technique: string
  source_markdown: string
  body_markdown: string
  status: 'draft' | 'published'
  published_at: string | null
  updated_at: string
}

const SUMMARY_COLUMNS = 'id, user_id, title, slug, excerpt, technique, status, published_at, updated_at'
const FULL_COLUMNS = `${SUMMARY_COLUMNS}, source_markdown, body_markdown`

function mapSummary(row: DbArticle): ArticleSummary {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    technique: row.technique,
    status: row.status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  }
}

function mapArticle(row: DbArticle): Article {
  return { ...mapSummary(row), sourceMarkdown: row.source_markdown, bodyMarkdown: row.body_markdown }
}

/**
 * Published articles for everyone. RLS also returns the signed-in user's own drafts, so the
 * caller can split the list by status.
 */
export function useArticles() {
  const [articles, setArticles] = useState<ArticleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('articles')
      .select(SUMMARY_COLUMNS)
      .order('updated_at', { ascending: false })
    if (error) setError(error.message)
    else {
      setError(null)
      setArticles((data as DbArticle[]).map(mapSummary))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { articles, loading, error, refetch }
}

type Lookup = { slug: string } | { id: string }

export function useArticle(lookup: Lookup) {
  const key = 'slug' in lookup ? `slug:${lookup.slug}` : `id:${lookup.id}`
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const query = supabase.from('articles').select(FULL_COLUMNS)
    const filtered = 'slug' in lookup ? query.eq('slug', lookup.slug) : query.eq('id', lookup.id)
    filtered.maybeSingle().then(({ data, error }) => {
      if (cancelled) return
      if (error) setError(error.message)
      else setArticle(data ? mapArticle(data as unknown as DbArticle) : null)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { article, loading, error }
}

export interface ArticleInput {
  title: string
  slug: string
  excerpt: string
  technique: string
  sourceMarkdown: string
  bodyMarkdown: string
}

const UNIQUE_VIOLATION = '23505'
const MAX_SLUG_ATTEMPTS = 20

/** Inserts a new draft. A taken slug gets -2, -3, ... appended until one is free. */
export async function createArticle(input: ArticleInput): Promise<Article> {
  for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
    const { data, error } = await supabase
      .from('articles')
      .insert({
        title: input.title,
        slug: slugCandidate(input.slug, attempt),
        excerpt: input.excerpt,
        technique: input.technique,
        source_markdown: input.sourceMarkdown,
        body_markdown: input.bodyMarkdown,
        status: 'draft',
      })
      .select(FULL_COLUMNS)
      .single()
    if (!error) return mapArticle(data as unknown as DbArticle)
    if (error.code !== UNIQUE_VIOLATION) throw new Error(error.message)
  }
  throw new Error('Could not find a free slug. Edit the slug and try again.')
}

/** Updates an article. The slug is only sent while the article is still unpublished (it is locked after). */
export async function updateArticle(id: string, input: ArticleInput, includeSlug: boolean): Promise<Article> {
  const { data, error } = await supabase
    .from('articles')
    .update({
      title: input.title,
      ...(includeSlug ? { slug: input.slug } : {}),
      excerpt: input.excerpt,
      technique: input.technique,
      source_markdown: input.sourceMarkdown,
      body_markdown: input.bodyMarkdown,
    })
    .eq('id', id)
    .select(FULL_COLUMNS)
    .single()
  if (error) {
    throw new Error(error.code === UNIQUE_VIOLATION ? 'That slug is already taken. Pick another.' : error.message)
  }
  return mapArticle(data as unknown as DbArticle)
}

export async function setArticleStatus(id: string, status: 'draft' | 'published'): Promise<Article> {
  const { data, error } = await supabase.from('articles').update({ status }).eq('id', id).select(FULL_COLUMNS).single()
  if (error) throw new Error(error.message)
  return mapArticle(data as unknown as DbArticle)
}

export async function deleteArticle(id: string): Promise<void> {
  const { error } = await supabase.from('articles').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export interface GeneratedArticle {
  title: string
  excerpt: string
  slug: string
  body_markdown: string
  used: number | null
  limit: number
}

export async function generateArticle(notes: string, technique: string): Promise<GeneratedArticle> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const res = await fetch('/api/generate-article', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify({ notes, technique }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Article generation failed')
  return body as GeneratedArticle
}

export async function fetchGenerationsUsed(): Promise<number | null> {
  const { data, error } = await supabase.rpc('generations_used_today')
  return error || typeof data !== 'number' ? null : data
}
