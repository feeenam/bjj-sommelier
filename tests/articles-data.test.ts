import { beforeEach, describe, expect, it, vi } from 'vitest'

// createArticle's slug-collision retry, against a fake Supabase insert chain.
const state = { taken: new Set<string>(), inserted: [] as string[], otherError: null as null | { code: string; message: string } }

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: (row: { slug: string }) => ({
        select: () => ({
          single: async () => {
            state.inserted.push(row.slug)
            if (state.otherError) return { data: null, error: state.otherError }
            if (state.taken.has(row.slug)) return { data: null, error: { code: '23505', message: 'duplicate key' } }
            return {
              data: {
                id: 'id-1', user_id: 'u', title: 'T', slug: row.slug, excerpt: '', technique: '',
                source_markdown: '', body_markdown: '', status: 'draft', published_at: null, updated_at: 'now',
              },
              error: null,
            }
          },
        }),
      }),
    }),
  },
}))

import { createArticle } from '../src/data/articles'

const input = { title: 'T', slug: 'knee-cut', excerpt: '', technique: '', sourceMarkdown: '', bodyMarkdown: '' }

beforeEach(() => {
  state.taken = new Set()
  state.inserted = []
  state.otherError = null
})

describe('createArticle slug collisions', () => {
  it('uses the slug as-is when free', async () => {
    const a = await createArticle(input)
    expect(a.slug).toBe('knee-cut')
    expect(state.inserted).toEqual(['knee-cut'])
  })
  it('appends -2, -3 until a slug is free', async () => {
    state.taken = new Set(['knee-cut', 'knee-cut-2'])
    const a = await createArticle(input)
    expect(a.slug).toBe('knee-cut-3')
    expect(state.inserted).toEqual(['knee-cut', 'knee-cut-2', 'knee-cut-3'])
  })
  it('gives up with a clear message after 20 attempts', async () => {
    state.taken = new Set(Array.from({ length: 20 }, (_, i) => (i === 0 ? 'knee-cut' : `knee-cut-${i + 1}`)))
    await expect(createArticle(input)).rejects.toThrow(/free slug/i)
    expect(state.inserted).toHaveLength(20)
  })
  it('does not retry on errors other than a unique violation', async () => {
    state.otherError = { code: '42501', message: 'permission denied' }
    await expect(createArticle(input)).rejects.toThrow('permission denied')
    expect(state.inserted).toHaveLength(1)
  })
})
