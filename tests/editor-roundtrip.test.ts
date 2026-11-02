// @vitest-environment jsdom
import { Editor } from '@tiptap/core'
import { describe, expect, it } from 'vitest'
import { extractAllowedUrls, sanitizeMarkdown } from '../api/generate-article'
import { createEditorExtensions } from '../src/lib/editor-extensions'

// The editor re-serializes the whole body on the first keystroke, so whatever the model wrote has to
// come back out of the real Tiptap editor (same extension list as the page) with nothing lost.
function roundTrip(markdown: string): string {
  const element = document.createElement('div')
  document.body.appendChild(element)
  const editor = new Editor({ element, extensions: createEditorExtensions(), content: '' })
  editor.commands.setContent(markdown, { emitUpdate: false })
  const out: string = (editor.storage as any).markdown.getMarkdown()
  editor.destroy()
  return out
}

describe('Tiptap round trip keeps what the model writes', () => {
  it('keeps tables (adversarial finding: they collapsed to "StepCue1Underhook…")', () => {
    const md = '| Step | Cue |\n| --- | --- |\n| 1 | Underhook |\n| 2 | Cut knee |'
    expect(roundTrip(md).trim()).toBe(md)
  })
  it.each([
    ['h1', '# Big\n\ntext'],
    ['h2', '## Setup\n\ntext'],
    ['h4', '#### deep heading\n\ntext'],
    ['h6', '###### tiny\n\ntext'],
  ])('keeps %s headings (adversarial finding: h4 and deeper lost their marker)', (_name, md) => {
    expect(roundTrip(md)).toBe(md)
  })
  it.each([
    ['nested lists', '- a\n  - b\n- c\n\n1. one\n2. two'],
    ['quote', '> quoted\n\nafter'],
    ['code', 'use `x` and\n\n```\ncode\n```'],
    ['rule', 'a\n\n---\n\nb'],
    ['strikethrough', 'a ~~gone~~ b'],
    ['links with queries', 'x [a](https://a.com/p?x=1&y=2#frag) y'],
  ])('keeps %s byte for byte', (_name, md) => {
    expect(roundTrip(md)).toBe(md)
  })
  it('keeps an image in its own paragraph, with the caption', () => {
    const md = 'Before\n\n![underhook grip](https://img.com/g.jpg)\n\nAfter paragraph'
    expect(roundTrip(md)).toBe(md)
  })
  it('keeps [TODO] markers (escaped brackets render the same, and the publish check still sees them)', () => {
    const out = roundTrip('Step 2 [TODO: what happens to the far arm?] then go.')
    expect(out).toBe('Step 2 \\[TODO: what happens to the far arm?\\] then go.')
    expect(/\[TODO/i.test(out)).toBe(true)
  })
  it('is a fixed point: a second pass changes nothing', () => {
    for (const md of ['| a | b |\n| --- | --- |\n| 1 | 2 |', '#### h\n\n[TODO: x] and ![i](https://img.com/g.jpg)', '- a\n  - b']) {
      const once = roundTrip(md)
      expect(roundTrip(once)).toBe(once)
    }
  })
})

describe('notes URLs still reach the sanitizer allowlist after the editor serializes them', () => {
  it('bare URLs, which the editor writes as <autolinks>', () => {
    const notes = roundTrip('Video https://www.youtube.com/watch?v=abc12345678&t=1m30s and https://example.com/knee_cut_pass_v2')
    const allowed = extractAllowedUrls(notes)
    expect(allowed.has('https://www.youtube.com/watch?v=abc12345678&t=1m30s')).toBe(true)
    expect(allowed.has('https://example.com/knee_cut_pass_v2')).toBe(true)
  })
  it('a link with parentheses, so the model can write it naturally (adversarial finding)', () => {
    const notes = roundTrip('See [wiki](https://en.wikipedia.org/wiki/Knee_(anatomy)) for the joint.')
    const allowed = extractAllowedUrls(notes)
    const modelOutput = 'See [wiki](https://en.wikipedia.org/wiki/Knee_(anatomy)) for the joint.'
    expect(sanitizeMarkdown(modelOutput, allowed)).toBe(modelOutput)
  })
})
