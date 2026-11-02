import { describe, expect, it } from 'vitest'
import { parseStartTime, parseYoutube, youtubeEmbedUrl } from './youtube'

describe('parseYoutube', () => {
  it('reads the id from the common link shapes', () => {
    const id = 'dQw4w9WgXcQ'
    for (const href of [
      `https://www.youtube.com/watch?v=${id}`,
      `https://youtube.com/watch?v=${id}&feature=share`,
      `https://m.youtube.com/watch?v=${id}`,
      `https://youtu.be/${id}`,
      `https://www.youtube.com/shorts/${id}`,
      `https://www.youtube.com/embed/${id}`,
    ]) {
      expect(parseYoutube(href)?.id).toBe(id)
    }
  })
  it('reads start times', () => {
    expect(parseYoutube('https://youtu.be/dQw4w9WgXcQ?t=90')?.start).toBe(90)
    expect(parseYoutube('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s')?.start).toBe(90)
    expect(parseYoutube('https://youtu.be/dQw4w9WgXcQ')?.start).toBe(0)
  })
  it('rejects anything that is not a YouTube video link', () => {
    for (const href of [
      'https://example.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=short',
      'https://www.youtube.com/@channel',
      'javascript:alert(1)',
      'not a url',
      'https://evil.com/?u=https://youtu.be/dQw4w9WgXcQ',
    ]) {
      expect(parseYoutube(href)).toBeNull()
    }
  })
})

describe('parseStartTime', () => {
  it('handles seconds and h/m/s forms, and garbage', () => {
    expect(parseStartTime('45')).toBe(45)
    expect(parseStartTime('1h2m3s')).toBe(3723)
    expect(parseStartTime('2m')).toBe(120)
    expect(parseStartTime('abc')).toBe(0)
    expect(parseStartTime(null)).toBe(0)
  })
})

describe('youtubeEmbedUrl', () => {
  it('uses the privacy-enhanced domain and adds start only when set', () => {
    expect(youtubeEmbedUrl({ id: 'dQw4w9WgXcQ', start: 0 })).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(youtubeEmbedUrl({ id: 'dQw4w9WgXcQ', start: 90 })).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90')
  })
})
