// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Anonymous visitors are only granted the publishable columns (supabase-schema.sql), so the hooks must
// not ask them for user_id, and must wait for the session before choosing columns.
const h = vi.hoisted(() => ({
  auth: { user: null as null | { id: string }, loading: false },
  queries: [] as Array<{ table: string; columns: string }>,
  rows: [] as any[],
}))

vi.mock('../src/lib/AuthContext', () => ({ useAuth: () => h.auth }))
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: (columns: string) => {
        h.queries.push({ table, columns })
        const result = { data: table === 'article_sources' ? { source_markdown: 'notes' } : h.rows, error: null }
        const chain: any = {
          order: () => Promise.resolve(result),
          eq: () => chain,
          maybeSingle: () => Promise.resolve({ data: table === 'article_sources' ? result.data : h.rows[0] ?? null, error: null }),
        }
        return chain
      },
    }),
  },
}))

import { useArticle, useArticles } from '../src/data/articles'

const row = { id: 'a1', title: 'T', slug: 't', excerpt: '', technique: '', status: 'published', published_at: 'x', updated_at: 'x', body_markdown: 'b' }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

let latest: any
function Probe({ kind }: { kind: 'list' | 'article' | 'editor' }) {
  const list = useArticles()
  const one = useArticle(kind === 'editor' ? { id: 'a1' } : { slug: 't' }, { withSource: kind === 'editor' })
  latest = kind === 'list' ? list : one
  return null
}
async function render(kind: 'list' | 'article' | 'editor') {
  const root = createRoot(document.createElement('div'))
  await act(async () => {
    root.render(<Probe kind={kind} />)
    await sleep(0)
  })
  return root
}

beforeEach(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  h.auth = { user: null, loading: false }
  h.queries = []
  h.rows = [row]
})
afterEach(() => vi.restoreAllMocks())

describe('columns requested by the article hooks', () => {
  it('never ask an anonymous visitor for user_id or notes', async () => {
    await render('list')
    await render('article')
    expect(h.queries.length).toBeGreaterThan(0)
    for (const q of h.queries) {
      expect(q.columns).not.toContain('user_id')
      expect(q.columns).not.toContain('source_markdown')
    }
    expect(h.queries.some((q) => q.table === 'article_sources')).toBe(false)
  })
  it('add user_id for a signed-in user, so their own drafts and the owner check work', async () => {
    h.auth = { user: { id: 'u1' }, loading: false }
    await render('list')
    expect(h.queries[0].columns).toContain('user_id')
    expect(latest.articles[0].userId).toBeNull() // the fake row has no user_id; the mapper tolerates that
  })
  it('read the notes from the owner-only table, and only when the editor asks', async () => {
    h.auth = { user: { id: 'u1' }, loading: false }
    await render('editor')
    expect(h.queries.map((q) => q.table)).toContain('article_sources')
    expect(latest.article.sourceMarkdown).toBe('notes')
  })
  it('wait for the session before querying, so a signed-in author never gets the anonymous column set', async () => {
    h.auth = { user: null, loading: true }
    await render('list')
    await render('article')
    expect(h.queries).toEqual([])
  })
})
