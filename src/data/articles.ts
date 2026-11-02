import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { slugCandidate } from '../lib/slug'

export interface ArticleSummary {
  id: string
  /** Only known when signed in: anonymous visitors are not allowed to read the author's id. */
  userId: string | null
  title: string
  slug: string
  excerpt: string
  technique: string
  status: 'draft' | 'published'
  publishedAt: string | null
  updatedAt: string
}

export interface Article extends ArticleSummary {
  bodyMarkdown: string
  /** The author's raw notes. Kept in a separate owner-only table, so only set where it was loaded or just saved. */
  sourceMarkdown?: string
}

interface DbArticle {
  id: string
  user_id?: string
  title: string
  slug: string
  excerpt: string
  technique: string
  body_markdown?: string
  status: 'draft' | 'published'
  published_at: string | null
  updated_at: string
}

// The columns anonymous visitors are granted (see supabase-schema.sql). user_id is added only when signed in.
const PUBLIC_COLUMNS = 'id, title, slug, excerpt, technique, status, published_at, updated_at'
const columns = (signedIn: boolean, withBody: boolean) =>
  [PUBLIC_COLUMNS, signedIn ? 'user_id' : '', withBody ? 'body_markdown' : ''].filter(Boolean).join(', ')
// Writes only happen when signed in.
const WRITE_COLUMNS = columns(true, true)

function mapSummary(row: DbArticle): ArticleSummary {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    technique: row.technique,
    status: row.status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  }
}

function mapArticle(row: DbArticle, sourceMarkdown?: string): Article {
  return { ...mapSummary(row), bodyMarkdown: row.body_markdown ?? '', ...(sourceMarkdown === undefined ? {} : { sourceMarkdown }) }
}

/**
 * Published articles for everyone. RLS also returns the signed-in user's own drafts, so the
 * caller can split the list by status.
 */
export function useArticles() {
  const { user, loading: authLoading } = useAuth()
  const signedIn = !!user
  const [articles, setArticles] = useState<ArticleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('articles')
      .select(columns(signedIn, false))
      .order('updated_at', { ascending: false })
    if (error) setError(error.message)
    else {
      setError(null)
      setArticles((data as unknown as DbArticle[]).map(mapSummary))
    }
    setLoading(false)
  }, [signedIn])

  useEffect(() => {
    // Wait for the session: a signed-in author's drafts only come back once the request carries it.
    if (!authLoading) refetch()
  }, [authLoading, refetch])

  return { articles, loading, error, refetch }
}

type Lookup = { slug: string } | { id: string }

/** One article by slug (public pages) or id (the editor, which also loads the author's notes). */
export function useArticle(lookup: Lookup, options: { withSource?: boolean } = {}) {
  const { user, loading: authLoading } = useAuth()
  const signedIn = !!user
  const withSource = !!options.withSource
  const key = 'slug' in lookup ? `slug:${lookup.slug}` : `id:${lookup.id}`
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    // The editor route for a new article has no id: nothing to fetch.
    if (('id' in lookup && !lookup.id) || ('slug' in lookup && !lookup.slug)) {
      setArticle(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    const query = supabase.from('articles').select(columns(signedIn, true))
    const filtered = 'slug' in lookup ? query.eq('slug', lookup.slug) : query.eq('id', lookup.id)
    ;(async () => {
      const { data, error } = await filtered.maybeSingle()
      if (cancelled) return
      if (error) {
        setError(error.message)
      } else if (!data) {
        setArticle(null)
      } else {
        const row = data as unknown as DbArticle
        let source: string | undefined
        if (withSource) {
          const result = await supabase.from('article_sources').select('source_markdown').eq('article_id', row.id).maybeSingle()
          if (cancelled) return
          if (result.error) {
            setError(result.error.message)
            setLoading(false)
            return
          }
          source = (result.data as { source_markdown: string } | null)?.source_markdown ?? ''
        }
        setError(null)
        setArticle(mapArticle(row, source))
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, authLoading, signedIn, withSource])

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

/** The author's raw notes live in their own owner-only table, so publishing the article never exposes them. */
async function saveSource(articleId: string, sourceMarkdown: string): Promise<void> {
  const { error } = await supabase
    .from('article_sources')
    .upsert({ article_id: articleId, source_markdown: sourceMarkdown }, { onConflict: 'article_id' })
  if (error) throw new Error(`Couldn't save your notes: ${error.message}`)
}

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
        body_markdown: input.bodyMarkdown,
        status: 'draft',
      })
      .select(WRITE_COLUMNS)
      .single()
    if (error) {
      if (error.code !== UNIQUE_VIOLATION) throw new Error(error.message)
      continue
    }
    const row = data as unknown as DbArticle
    try {
      await saveSource(row.id, input.sourceMarkdown)
    } catch (err) {
      // No half-saved article: without its notes a retry would create a second draft with a -2 slug.
      await supabase.from('articles').delete().eq('id', row.id)
      throw err
    }
    return mapArticle(row, input.sourceMarkdown)
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
      body_markdown: input.bodyMarkdown,
    })
    .eq('id', id)
    .select(WRITE_COLUMNS)
    .single()
  if (error) {
    throw new Error(error.code === UNIQUE_VIOLATION ? 'That slug is already taken. Pick another.' : error.message)
  }
  await saveSource(id, input.sourceMarkdown)
  return mapArticle(data as unknown as DbArticle, input.sourceMarkdown)
}

export async function setArticleStatus(id: string, status: 'draft' | 'published'): Promise<Article> {
  const { data, error } = await supabase.from('articles').update({ status }).eq('id', id).select(WRITE_COLUMNS).single()
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
