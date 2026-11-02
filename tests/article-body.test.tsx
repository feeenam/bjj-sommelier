// @vitest-environment jsdom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { ArticleBody } from '../src/components/ArticleBody'
import { sanitizeMarkdown, extractAllowedUrls } from '../api/generate-article'

function render(markdown: string) {
  const el = document.createElement('div')
  document.body.appendChild(el)
  act(() => createRoot(el).render(<ArticleBody markdown={markdown} />))
  return el
}

const CLIP = 'https://youtu.be/keeTKizdZzU?si=n4Bu5UT_xKi8TXi3&t=40'

describe('ArticleBody video cards', () => {
  it('turns [caption](youtube url) into a thumbnail with the caption underneath', () => {
    const el = render(`Intro.\n\n[Eddie Cummings showing a classic single leg x](${CLIP})\n\nMore.`)
    const img = el.querySelector('figure img') as HTMLImageElement
    expect(img.src).toBe('https://i.ytimg.com/vi/keeTKizdZzU/hqdefault.jpg')
    expect(el.querySelector('figcaption')?.textContent).toBe('Eddie Cummings showing a classic single leg x')
    expect(el.querySelector('iframe')).toBeNull() // nothing from YouTube loads before a click
    expect(el.querySelector('figure a')).toBeNull()
  })
  it('a bare pasted link gets a thumbnail and no caption', () => {
    const el = render(CLIP)
    expect(el.querySelector('figure img')).not.toBeNull()
    expect(el.querySelector('figcaption')).toBeNull()
  })
  it('a video mentioned inside a sentence keeps the sentence and gets a card below it', () => {
    const el = render(`Robert explains it in this video ${CLIP} and it is worth it.`)
    expect(el.querySelector('p')?.textContent).toContain('worth it')
    expect(el.querySelector('p a')?.getAttribute('href')).toBe(CLIP)
    expect(el.querySelectorAll('figure')).toHaveLength(1)
  })
  it('the same clip linked twice in one paragraph is carded once', () => {
    const el = render(`See ${CLIP} and again ${CLIP}.`)
    expect(el.querySelectorAll('figure')).toHaveLength(1)
  })
  it('plays on click, at the start time, from the no-cookie domain', () => {
    const el = render(`[Clip](${CLIP})`)
    act(() => (el.querySelector('figure button') as HTMLButtonElement).click())
    const frame = el.querySelector('iframe') as HTMLIFrameElement
    expect(frame.src).toBe('https://www.youtube-nocookie.com/embed/keeTKizdZzU?start=40&autoplay=1')
    expect(el.querySelector('figure img')).toBeNull()
  })
  it('handles shorts links and leaves other links and non-YouTube videos as links', () => {
    const el = render(`[Gordon explaining](https://www.youtube.com/shorts/KNXbLaGiEeE)\n\n[A vimeo clip](https://vimeo.com/123)`)
    expect(el.querySelectorAll('figure')).toHaveLength(1)
    expect(el.querySelector('a')?.getAttribute('href')).toBe('https://vimeo.com/123')
  })
  it('a lookalike host gets no card', () => {
    const el = render('[x](https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ)')
    expect(el.querySelector('figure')).toBeNull()
  })
})

describe('captioned video links survive the sanitizer', () => {
  it('keeps [caption](url) for a URL from the notes, including si= and t= parameters', () => {
    const notes = `Watch ${CLIP} (Eddie showing the grip)`
    const allowed = extractAllowedUrls(notes)
    const out = sanitizeMarkdown(`[Eddie showing the grip](${CLIP})`, allowed)
    expect(out).toContain(`[Eddie showing the grip](${CLIP})`)
  })
  it('still strips a captioned link to a URL that is not in the notes', () => {
    const out = sanitizeMarkdown('[Watch](https://youtu.be/AAAAAAAAAAA)', extractAllowedUrls('nothing here'))
    expect(out).not.toContain('AAAAAAAAAAA')
  })
})
