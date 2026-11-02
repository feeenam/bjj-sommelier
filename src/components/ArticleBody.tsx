import React from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { parseYoutube, youtubeEmbedUrl } from '../lib/youtube'

const isHttp = (href: string | undefined) => !!href && /^https?:\/\//i.test(href)

function YoutubeEmbed({ href }: { href: string }) {
  const ref = parseYoutube(href)
  if (!ref) return null
  return (
    <div className="not-prose my-6 aspect-video overflow-hidden rounded-lg border border-bjj-border bg-black">
      <iframe
        src={youtubeEmbedUrl(ref)}
        title="YouTube video"
        className="h-full w-full"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

/**
 * Markdown only: raw HTML is never rendered (react-markdown skips it by default). Images load
 * over https only, links open safely, and a paragraph that is just a YouTube link becomes a player.
 */
const components: Components = {
  p({ node, children }) {
    const only = node?.children.length === 1 ? node.children[0] : null
    if (only && only.type === 'element' && only.tagName === 'a') {
      const href = String(only.properties?.href ?? '')
      if (parseYoutube(href)) return <YoutubeEmbed href={href} />
    }
    return <p>{children}</p>
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
