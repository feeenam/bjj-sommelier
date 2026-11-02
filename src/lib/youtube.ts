export interface YoutubeRef {
  id: string
  start: number
}

const ID = /^[a-zA-Z0-9_-]{11}$/

/** "90", "90s", "1m30s", "1h2m3s" -> seconds. Anything else -> 0. */
export function parseStartTime(value: string | null): number {
  if (!value) return 0
  if (/^\d+$/.test(value)) return Number(value)
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)
  if (!match || !match[0]) return 0
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)
}

/** Recognises watch, youtu.be, shorts and embed links, with an optional start time. */
export function parseYoutube(href: string): YoutubeRef | null {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '')

  let id: string | null = null
  if (host === 'youtu.be') {
    id = url.pathname.slice(1).split('/')[0] || null
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v')
    else {
      const m = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)
      id = m ? m[1] : null
    }
  }
  if (!id || !ID.test(id)) return null
  return { id, start: parseStartTime(url.searchParams.get('t') ?? url.searchParams.get('start')) }
}

export function youtubeEmbedUrl(ref: YoutubeRef, autoplay = false): string {
  const params = [ref.start > 0 ? `start=${ref.start}` : '', autoplay ? 'autoplay=1' : ''].filter(Boolean).join('&')
  return `https://www.youtube-nocookie.com/embed/${ref.id}${params ? `?${params}` : ''}`
}

/** The video's still frame. The id is validated by parseYoutube, so it is safe to put in a URL. */
export function youtubeThumbnailUrl(ref: YoutubeRef): string {
  return `https://i.ytimg.com/vi/${ref.id}/hqdefault.jpg`
}
