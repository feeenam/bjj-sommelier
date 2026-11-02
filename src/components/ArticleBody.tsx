import React, { useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { parseYoutube, youtubeEmbedUrl, youtubeThumbnailUrl } from '../lib/youtube'

const isHttp = (href: string | undefined) => !!href && /^https?:\/\//i.test(href)

/** A thumbnail with a play button. The player only loads (and YouTube only sees the visitor) after a click. */
function VideoCard({ href, caption }: { href: string; caption: string }) {
  const [playing, setPlaying] = useState(false)
  const ref = parseYoutube(href)
  if (!ref) return null
  return (
    <figure className="not-prose my-6">
      <div className="relative aspect-video overflow-hidden rounded-lg border border-bjj-border bg-black">
        {playing ? (
          <iframe
            src={youtubeEmbedUrl(ref, true)}
            title={caption || 'YouTube video'}
            className="h-full w-full"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={caption ? `Play video: ${caption}` : 'Play video'}
            className="group absolute inset-0 h-full w-full"
          >
            <img
              src={youtubeThumbnailUrl(ref)}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/70 text-white ring-2 ring-white/70 transition-transform group-hover:scale-110">
                <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          </button>
        )}
      </div>
      {caption && <figcaption className="mt-2 text-center text-sm italic text-bjj-textMuted">{caption}</figcaption>}
    </figure>
  )
}

type HastNode = { type: string; value?: string; tagName?: string; properties?: Record<string, unknown>; children?: HastNode[] }

const textOf = (node: HastNode): string =>
  node.type === 'text' ? (node.value ?? '') : (node.children ?? []).map(textOf).join('')

/** Link text is the caption, unless it is just the URL again (a bare pasted link). */
const captionFor = (text: string): string => {
  const t = text.trim()
  return /^https?:\/\//i.test(t) ? '' : t
}

/** The YouTube links sitting directly in a paragraph, in order, once each. */
function youtubeLinks(children: HastNode[]): Array<{ href: string; caption: string }> {
  const seen = new Set<string>()
  const out: Array<{ href: string; caption: string }> = []
  for (const child of children) {
    if (child.type !== 'element' || child.tagName !== 'a') continue
    const href = String(child.properties?.href ?? '')
    const ref = parseYoutube(href)
    if (!ref || seen.has(ref.id + ':' + ref.start)) continue
    seen.add(ref.id + ':' + ref.start)
    out.push({ href, caption: captionFor(textOf(child)) })
  }
  return out
}

const components: Components = {
  p({ node, children }) {
    const kids = (node?.children ?? []) as HastNode[]
    const videos = youtubeLinks(kids)
    if (videos.length === 0) return <p>{children}</p>
    // A paragraph that is only a YouTube link becomes the card itself, with the link text as its caption.
    if (kids.length === 1) return <VideoCard href={videos[0].href} caption={videos[0].caption} />
    // A video mentioned inside a sentence keeps its sentence and gets its card right below.
    return (
      <>
        <p>{children}</p>
        {videos.map((v) => (
          <VideoCard key={v.href} href={v.href} caption={v.caption} />
        ))}
      </>
    )
  },
  a({ href, children }) {
    if (!isHttp(href)) return <span>{children}</span>
    return (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc">
        {children}
      </a>
    )
  },
  img({ src, alt }) {
    if (typeof src !== 'string' || !/^https:\/\//i.test(src)) return null
    return (
      <img
        src={src}
        alt={alt ?? ''}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="mx-auto rounded-lg border border-bjj-border"
      />
    )
  },
}

export function ArticleBody({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-invert prose-lg max-w-none prose-headings:font-heading prose-headings:tracking-wide prose-a:text-bjj-accent prose-a:no-underline hover:prose-a:underline prose-strong:text-white">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
