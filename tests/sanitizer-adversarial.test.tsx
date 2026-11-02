import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { cleanArticle, cleanLine, extractAllowedUrls, sanitizeMarkdown } from '../api/generate-article'
import { ArticleBody } from '../src/components/ArticleBody'
import { htmlNodeCount } from './helpers/html-nodes'

// Attacks found by adversarial review of PR #1. Each model "answer" goes through the real
// cleanArticle and then the real ArticleBody, and the reader's HTML may only point at URLs the
// author's notes contained.
const NOTES =
  'Notes: https://youtu.be/abc12345678 and a grip photo https://img.com/g.jpg, the course at https://bjjfanatics.com ' +
  'and [wiki](https://en.wikipedia.org/wiki/Knee_\\(anatomy\\)). Plenty of text so it is long enough.'
const allowed = extractAllowedUrls(NOTES)

const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x3D;/g, '=')

function render(modelBody: string) {
  const article = cleanArticle({ title: 'T', excerpt: '', slug: 't', body_markdown: modelBody }, NOTES)
  return { article, html: renderToStaticMarkup(<ArticleBody markdown={article.body_markdown} />) }
}

/** Every link target and image source on the rendered page. */
function targets(html: string): string[] {
  return [...html.matchAll(/(?:href|src)="([^"]*)"/g)].map((m) => decode(m[1]))
}

function expectOnlyAuthorUrls(modelBody: string) {
  const { article, html } = render(modelBody)
  for (const target of targets(html)) {
    if (/^https:\/\/www\.youtube-nocookie\.com\/embed\/abc12345678/.test(target)) continue // the player for the author's own YouTube link
    if (target === 'https://i.ytimg.com/vi/abc12345678/hqdefault.jpg') continue // its thumbnail, derived from the id only
    let canonical = target
    try {
      canonical = new URL(target).href
    } catch {
      /* not absolute: falls through and fails the check below */
    }
    expect(allowed.has(canonical), `page links to ${target} (sanitized: ${JSON.stringify(article.body_markdown)})`).toBe(true)
  }
  // Escaped text such as `&lt;img onerror=…&gt;` or a visible "javascript:" is harmless; only real tags and
  // attributes count. Link targets are checked above, so a javascript: href would already have failed.
  const withoutOwnPlayers = html.replace(/<iframe[^>]*youtube-nocookie[^>]*><\/iframe>/g, '')
  const bad = withoutOwnPlayers.match(/<script|<iframe|<[a-z][^>]*\son[a-z]+=/i)
  expect(bad, `page contains ${bad?.[0]} (model: ${JSON.stringify(modelBody)} sanitized: ${JSON.stringify(article.body_markdown)} html: ${withoutOwnPlayers.slice(0, 600)})`).toBeNull()
  expect(htmlNodeCount(article.body_markdown)).toBe(0)
}

const ATTACKS: Record<string, string> = {
  wwwAutolink: 'Step 1. More at www.evil.com today.',
  entityTitleSingleQuote: "Read [this](https&#58;//evil.com/phish 'x') now.",
  entityNoTitle: 'Read [this](https&#58;//evil.com/phish) now.',
  backslashTitleParen: 'Read [this](https\\://evil.com/phish (x)) now.',
  escapedBracketLabel: 'Read [a\\]b](https&#58;//evil.com/phish) now.',
  refDefInBlockquote: 'Read [this][1] now.\n\n> [1]: https&#58;//evil.com/phish',
  refDefInList: 'Read [this][1] now.\n\n- [1]: https:/\\/evil.com/phish',
  refDefPlain: 'Read [this][1] now.\n\n[1]: https://evil.com/phish',
  imageEntity: "![x](https&#58;//evil.com/pixel.png 'x')",
  imagePlain: '![pixel](https://evil.com/p.gif)',
  slashEscape: "[this](https:/\\/evil.com/p 'x')",
  labelIsUrl: '[https://evil.com/phish](https://evil.com/phish)',
  labelIsWww: '[www.evil.com](https://evil.com)',
  bareEvil: 'Buy at https://evil.com/shop now',
  upperCaseScheme: 'See HTTPS://EVIL.COM/x and hTtPs://evil.com/y',
  javascriptLink: '[x](javascript:alert(1))',
  entityJavascript: '[x](&#106;avascript:alert(1))',
  dataLink: '[x](data:text/html,<script>alert(1)</script>)',
  dataImage: '![x](data:image/svg+xml,xx)',
  protocolRelative: '[x](//evil.com/x)',
  angleDestination: '[x](<https://evil.com/x>)',
  angleAutolink: 'Go to <https://evil.com/x> now',
  tagReassembly: '<<b>script>alert(1)<</b>/script>',
  tagReassemblyImg: '<<b>img src=//evil.com/t.png onerror=alert(1)>',
  rawImg: '<img src=https://evil.com/x.png onerror=alert(1)>',
  rawAnchor: '<a href="https://evil.com">click</a>',
  rawIframe: '<iframe src="https://evil.com"></iframe>',
  htmlComment: 'before <!-- https://evil.com --> after',
  hostSwapApostrophe: "Get it at https://bjjfanatics.com'@evil.com/buy today.",
  hostSwapQuote: 'Get it at https://bjjfanatics.com"@evil.com/buy today.',
  hostSwapBracket: 'Get it at https://bjjfanatics.com]@evil.com/buy today.',
  hostSwapParen: 'Get it at https://bjjfanatics.com)@evil.com/buy today.',
  hostSwapAngle: 'Get it at https://bjjfanatics.com<@evil.com/buy today.',
  allowedUrlWithExtraQuery: 'See https://youtu.be/abc12345678?x=https://evil.com',
  nestedLinkInImageAlt: '![[a](https://evil.com)](https://img.com/g.jpg)',
}

describe('model output can only link to URLs the author wrote', () => {
  for (const [name, body] of Object.entries(ATTACKS)) {
    it(name, () => expectOnlyAuthorUrls(body))
  }

  it('holds for random combinations of attacks, filler and allowed links', () => {
    const fragments = [...Object.values(ATTACKS), 'See https://youtu.be/abc12345678 now', '![grip](https://img.com/g.jpg)', '[wiki](https://en.wikipedia.org/wiki/Knee_(anatomy))']
    const filler = ['', ' ', '\n\n', ' and ', '**', '_', '> ', '- ', '1. ', '\n']
    // FUZZ_ITER / FUZZ_SEED let a human run a much bigger sweep: FUZZ_ITER=20000 FUZZ_SEED=7 npx vitest run tests/sanitizer-adversarial
    let seed = Number(process.env.FUZZ_SEED ?? 12345)
    const next = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed % n
    }
    for (let i = 0; i < Number(process.env.FUZZ_ITER ?? 400); i++) {
      const parts = Array.from({ length: 2 + next(3) }, () => filler[next(filler.length)] + fragments[next(fragments.length)])
      expectOnlyAuthorUrls(parts.join(filler[next(filler.length)]))
    }
  }, 900_000)
})

describe('what the author wrote survives', () => {
  it('keeps a link the author wrote, with parentheses, when the model writes it naturally', () => {
    const { html } = render('See [wiki](https://en.wikipedia.org/wiki/Knee_(anatomy)) for the joint.')
    expect(targets(html)).toContain('https://en.wikipedia.org/wiki/Knee_(anatomy)')
    expect(html).not.toContain('for the joint.)')
  })
  it('keeps allowed links, images and a reference link to an allowed URL', () => {
    const { html } = render('Clip: https://youtu.be/abc12345678\n\n![grip](https://img.com/g.jpg)\n\nSee [the site][1].\n\n[1]: https://bjjfanatics.com')
    expect(targets(html)).toEqual(expect.arrayContaining(['https://youtu.be/abc12345678', 'https://img.com/g.jpg', 'https://bjjfanatics.com']))
  })
  it('keeps a [TODO]: line instead of treating it as a reference definition', () => {
    const { article } = render('Step 3\n[TODO]: describe the finish\n\nNext')
    expect(article.body_markdown).toContain('[TODO]: describe the finish')
  })
  it('keeps text that merely looks like a tag, as inert text', () => {
    const { article, html } = render('Keep hips low when angle A<B and C>D holds.')
    expect(article.body_markdown).toContain('B and C')
    expect(html).toContain('A&lt;B and C&gt;D')
    expect(htmlNodeCount(article.body_markdown)).toBe(0)
  })
  it('keeps formatting, lists and [TODO] markers byte for byte when nothing is wrong', () => {
    const body = '## Setup\n\n- grip the **sleeve**\n- step [TODO: far arm]\n\n1. first\n2. second'
    expect(sanitizeMarkdown(body, allowed)).toBe(body)
  })
})

describe('title and excerpt cleaning', () => {
  it('does not rebuild a tag from nested input', () => {
    expect(cleanLine('<<b>script>alert(1)<</b>/script>', 150)).not.toMatch(/<\/?script/i)
    expect(cleanLine('<<<b>b>script>x', 150)).not.toMatch(/<[a-z]/i)
  })
})
