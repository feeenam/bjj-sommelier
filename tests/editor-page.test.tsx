// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The real ArticleEditorPage with its two boundaries replaced: the data module (Supabase) and the
// Tiptap editor (a textarea that calls onChange the way RichTextEditor's onUpdate does). The point is
// control over timing: what happens to the author's keystrokes while a request is in flight.
const h = vi.hoisted(() => ({
  article: null as any,
  resolveUpdate: null as null | ((v: any) => void),
  resolveCreate: null as null | ((v: any) => void),
  generate: null as any,
  loading: false, // the real hook reports loading while it fetches a newly routed id
}))

vi.mock('../src/data/articles', () => ({
  useArticle: (lookup: { id?: string }) => ({
    article: lookup.id && !h.loading ? h.article : null,
    loading: !!lookup.id && h.loading,
    error: null,
  }),
  fetchGenerationsUsed: () => Promise.resolve(0),
  createArticle: vi.fn(() => new Promise((resolve) => (h.resolveCreate = resolve))),
  updateArticle: vi.fn(() => new Promise((resolve) => (h.resolveUpdate = resolve))),
  setArticleStatus: vi.fn(),
  deleteArticle: vi.fn(),
  generateArticle: (...args: unknown[]) => h.generate(...args),
}))
vi.mock('../src/components/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange }: any) => <textarea data-testid="rte" value={value} onChange={(e) => onChange(e.target.value)} />,
}))

import { ArticleEditorPage } from '../src/pages/ArticleEditorPage'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
function typeInto(el: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!
  setter.call(el, value)
  el.dispatchEvent(new window.Event('input', { bubbles: true }))
}
const buttons = (c: HTMLElement) => [...c.querySelectorAll('button')]
const button = (c: HTMLElement, re: RegExp) => buttons(c).find((b) => re.test(b.textContent ?? ''))!
const editor = (c: HTMLElement) => c.querySelector('[data-testid=rte]') as HTMLTextAreaElement

let root: Root
let container: HTMLElement
let path = ''
function Where() {
  path = useLocation().pathname
  return null
}
async function mount(initial: string) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[initial]}>
        <Where />
        <Routes>
          <Route path="/articles/new" element={<ArticleEditorPage />} />
          <Route path="/articles/:id/edit" element={<ArticleEditorPage />} />
          <Route path="/articles" element={<div>list</div>} />
        </Routes>
      </MemoryRouter>
    )
    await sleep(0)
  })
}

const NOTES = 'Knee cut: underhook first, then cut the knee across the thigh. Long enough to save.'
const stored = (over: Record<string, unknown> = {}) => ({
  id: 'a1', userId: 'u', title: 'Knee cut', slug: 'knee-cut', excerpt: '', technique: '', status: 'draft',
  publishedAt: null, updatedAt: 'x', sourceMarkdown: NOTES, bodyMarkdown: '', ...over,
})

beforeEach(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  document.body.innerHTML = ''
  h.article = null
  h.loading = false
  h.generate = vi.fn()
})
afterEach(async () => {
  await act(async () => root.unmount())
  vi.restoreAllMocks()
})

describe('work typed while a save is in flight (adversarial finding)', () => {
  it('survives an update, stays unsaved, and gets backed up', async () => {
    h.article = stored()
    await mount('/articles/a1/edit')
    expect(editor(container).value).toBe(NOTES)

    act(() => typeInto(editor(container), NOTES + ' Step 2: pin the hip.'))
    act(() => button(container, /Save notes/).click())
    const LATER = NOTES + ' Step 2: pin the hip. Step 3: crossface, then flatten them out.'
    act(() => typeInto(editor(container), LATER))

    await act(async () => {
      h.resolveUpdate!(stored({ sourceMarkdown: NOTES + ' Step 2: pin the hip.' })) // the server stored what was sent
      await sleep(0)
    })
    expect(editor(container).value).toBe(LATER)
    expect(button(container, /Save notes/).disabled).toBe(false) // still has unsaved work
    await act(async () => { await sleep(700) })
    expect(JSON.parse(localStorage.getItem('article-backup:a1')!).notes).toBe(LATER)
  })

  it('shows what was stored when nothing was typed meanwhile', async () => {
    h.article = stored()
    await mount('/articles/a1/edit')
    act(() => typeInto(editor(container), NOTES + ' More.'))
    act(() => button(container, /Save notes/).click())
    await act(async () => {
      h.resolveUpdate!(stored({ sourceMarkdown: NOTES + ' More.' }))
      await sleep(0)
    })
    expect(editor(container).value).toBe(NOTES + ' More.')
    expect(button(container, /Save notes/).disabled).toBe(true)
    expect(localStorage.getItem('article-backup:a1')).toBeNull()
  })

  it('survives the first save of a new article, the route change, and a refetch of the older copy', async () => {
    await mount('/articles/new')
    act(() => typeInto(editor(container), NOTES))
    act(() => button(container, /Save notes/).click())
    const LATER = NOTES + ' Typed during the save.'
    act(() => typeInto(editor(container), LATER))
    h.article = stored() // what the id route will fetch: the copy without the later typing
    h.loading = true // ...which takes a moment, during which the real hook reports loading
    await act(async () => {
      h.resolveCreate!(stored())
      await sleep(50)
    })
    expect(path).toBe('/articles/a1/edit')
    expect(container.textContent).not.toContain('Loading…') // no flash that unmounts the editor
    expect(editor(container).value).toBe(LATER)
    h.loading = false // the older copy arrives
    act(() => typeInto(editor(container), LATER + ' And more.'))
    expect(editor(container).value).toBe(LATER + ' And more.')
  })
})

describe('local backup (adversarial finding)', () => {
  it('keeps backing up new typing while the "unsaved work found" banner is showing', async () => {
    localStorage.setItem('article-backup:new', JSON.stringify({ notes: 'old notes from yesterday' }))
    await mount('/articles/new')
    expect(container.textContent).toMatch(/Unsaved work from an earlier session/)
    const FRESH = 'Brand new notes about the toreando pass, typed for twenty minutes and not saved yet.'
    act(() => typeInto(editor(container), FRESH))
    await act(async () => { await sleep(700) })
    expect(JSON.parse(localStorage.getItem('article-backup:new')!).notes).toBe(FRESH)
  })

  it('asks before Restore replaces newer typing, and keeps it when declined', async () => {
    localStorage.setItem('article-backup:new', JSON.stringify({ notes: 'old notes from yesterday' }))
    await mount('/articles/new')
    act(() => typeInto(editor(container), 'newer typing that Restore would erase'))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    act(() => button(container, /^Restore$/).click())
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(editor(container).value).toBe('newer typing that Restore would erase')
    confirm.mockReturnValue(true)
    act(() => button(container, /^Restore$/).click())
    expect(editor(container).value).toBe('old notes from yesterday')
  })

  it('restores without asking when nothing was typed', async () => {
    localStorage.setItem('article-backup:new', JSON.stringify({ notes: 'old notes from yesterday' }))
    await mount('/articles/new')
    const confirm = vi.spyOn(window, 'confirm')
    act(() => button(container, /^Restore$/).click())
    expect(confirm).not.toHaveBeenCalled()
    expect(editor(container).value).toBe('old notes from yesterday')
  })
})

describe('regenerate (adversarial finding)', () => {
  it('asks before replacing the body of an article that was loaded from the database', async () => {
    h.article = stored({ bodyMarkdown: 'A body I hand-edited in an earlier session.', title: 'Mine' })
    h.generate = vi.fn().mockResolvedValue({ title: 'NEW', excerpt: '', slug: 'new-slug', body_markdown: 'generated', used: 1, limit: 5 })
    await mount('/articles/a1/edit')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await act(async () => { button(container, /Regenerate/).click(); await sleep(0) })
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(h.generate).not.toHaveBeenCalled()
    expect((container.querySelector('#title') as HTMLInputElement).value).toBe('Mine')

    confirm.mockReturnValue(true)
    await act(async () => { button(container, /Regenerate/).click(); await sleep(0) })
    expect(h.generate).toHaveBeenCalledTimes(1)
    expect((container.querySelector('#title') as HTMLInputElement).value).toBe('NEW')
  })

  it('does not ask again right after generating, until the body is edited', async () => {
    await mount('/articles/new')
    h.generate = vi.fn().mockResolvedValue({ title: 'T', excerpt: '', slug: 't', body_markdown: 'generated body', used: 1, limit: 5 })
    act(() => typeInto(editor(container), NOTES))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await act(async () => { button(container, /Generate article/).click(); await sleep(0) })
    await act(async () => { button(container, /Regenerate/).click(); await sleep(0) })
    expect(confirm).not.toHaveBeenCalled()
    act(() => typeInto(editor(container), 'generated body, then I edited it'))
    await act(async () => { button(container, /Regenerate/).click(); await sleep(0) })
    expect(confirm).toHaveBeenCalledTimes(1)
  })
})
