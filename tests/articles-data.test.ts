import { beforeEach, describe, expect, it, vi } from 'vitest'

// createArticle / updateArticle against a fake Supabase: slug-collision retry, the private notes table,
// and not leaving a half-saved article behind.
const state = {
  taken: new Set<string>(),
  inserted: [] as string[],
  selectedColumns: [] as string[],
  sources: [] as Array<{ row: any; options: any }>,
  deleted: [] as string[],
  insertError: null as null | { code: string; message: string },
  sourceError: null as null | { message: string },
  updateError: null as null | { code: string; message: string },
}

const articleRow = (slug: string) => ({
  id: 'id-1', user_id: 'u', title: 'T', slug, excerpt: '', technique: '', body_markdown: 'body',
  status: 'draft', published_at: null, updated_at: 'now',
})

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'article_sources') {
        return {
          upsert: async (row: any, options: any) => {
            state.sources.push({ row, options })
            return { error: state.sourceError }
          },
        }
      }
      return {
        insert: (row: { slug: string }) => ({
          select: (columns: string) => ({
            single: async () => {
              state.inserted.push(row.slug)
              state.selectedColumns.push(columns)
              if (state.insertError) return { data: null, error: state.insertError }
              if (state.taken.has(row.slug)) return { data: null, error: { code: '23505', message: 'duplicate key' } }
              return { data: articleRow(row.slug), error: null }
            },
          }),
        }),
        update: (patch: { slug?: string }) => ({
          eq: () => ({
            select: () => ({
              single: async () =>
                state.updateError ? { data: null, error: state.updateError } : { data: articleRow(patch.slug ?? 'kept'), error: null },
            }),
          }),
        }),
        delete: () => ({
          eq: async (_col: string, id: string) => {
            state.deleted.push(id)
            return { error: null }
          },
        }),
      }
    },
  },
}))
vi.mock('../src/lib/AuthContext', () => ({ useAuth: () => ({ user: null, loading: false }) }))

import { createArticle, updateArticle } from '../src/data/articles'

const input = { title: 'T', slug: 'knee-cut', excerpt: '', technique: '', sourceMarkdown: 'my raw notes', bodyMarkdown: 'body' }

beforeEach(() => {
  state.taken = new Set()
  state.inserted = []
  state.selectedColumns = []
  state.sources = []
  state.deleted = []
  state.insertError = null
  state.sourceError = null
  state.updateError = null
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
    expect(state.sources).toHaveLength(0)
  })
  it('does not retry on errors other than a unique violation', async () => {
    state.insertError = { code: '42501', message: 'permission denied' }
    await expect(createArticle(input)).rejects.toThrow('permission denied')
    expect(state.inserted).toHaveLength(1)
  })
})

describe('the author notes live in their own table (adversarial finding)', () => {
  it('never sends the notes with the article row, and saves them once, keyed by article', async () => {
    const a = await createArticle(input)
    expect(state.selectedColumns[0]).not.toContain('source_markdown')
    expect(state.sources).toEqual([{ row: { article_id: 'id-1', source_markdown: 'my raw notes' }, options: { onConflict: 'article_id' } }])
    expect(a.sourceMarkdown).toBe('my raw notes')
  })
  it('removes the article again when its notes cannot be saved, so a retry does not leave a duplicate draft', async () => {
    state.sourceError = { message: 'boom' }
    await expect(createArticle(input)).rejects.toThrow(/Couldn't save your notes: boom/)
    expect(state.deleted).toEqual(['id-1'])
  })
  it('saves the notes on update too, and reports a failure instead of pretending it worked', async () => {
    const a = await updateArticle('id-1', { ...input, sourceMarkdown: 'edited notes' }, true)
    expect(state.sources[0].row).toEqual({ article_id: 'id-1', source_markdown: 'edited notes' })
    expect(a.sourceMarkdown).toBe('edited notes')
    state.sourceError = { message: 'offline' }
    await expect(updateArticle('id-1', input, true)).rejects.toThrow(/offline/)
  })
  it('does not touch the notes when the article update itself fails', async () => {
    state.updateError = { code: '23505', message: 'dup' }
    await expect(updateArticle('id-1', input, true)).rejects.toThrow(/slug is already taken/i)
    expect(state.sources).toHaveLength(0)
  })
})
