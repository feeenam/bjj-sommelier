import { describe, expect, it } from 'vitest'
import { isValidSlug, slugCandidate, slugify } from './slug'
import { slugify as serverSlugify } from '../../api/generate-article'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Knee Cut Pass: The Deep Dive!')).toBe('knee-cut-pass-the-deep-dive')
  })
  it('strips accents', () => {
    expect(slugify('Guarda Aberta — Série')).toBe('guarda-aberta-serie')
  })
  it('trims edge hyphens and caps length without a trailing hyphen', () => {
    expect(slugify('  --hello--  ')).toBe('hello')
    const long = slugify('a '.repeat(100))
    expect(long.length).toBeLessThanOrEqual(80)
    expect(long.endsWith('-')).toBe(false)
  })
  it('returns empty for text with no usable characters', () => {
    expect(slugify('!!!')).toBe('')
  })
  it('matches the server implementation', () => {
    for (const s of ['Knee Cut Pass: The Deep Dive!', 'Guarda Aberta — Série', '  --x--  ', 'a '.repeat(100), '!!!']) {
      expect(slugify(s)).toBe(serverSlugify(s))
    }
  })
})

describe('isValidSlug', () => {
  it('accepts well-formed slugs', () => {
    expect(isValidSlug('knee-cut-pass')).toBe(true)
    expect(isValidSlug('a1')).toBe(true)
  })
  it('rejects malformed slugs', () => {
    for (const s of ['', 'Has-Caps', 'double--hyphen', '-lead', 'trail-', 'sp ace', 'a'.repeat(81), 'new']) {
      expect(isValidSlug(s)).toBe(false)
    }
  })
})

describe('slugCandidate', () => {
  it('uses the base slug first, then numbers it', () => {
    expect(slugCandidate('knee-cut', 1)).toBe('knee-cut')
    expect(slugCandidate('knee-cut', 2)).toBe('knee-cut-2')
    expect(slugCandidate('knee-cut', 13)).toBe('knee-cut-13')
  })
  it('keeps the suffixed slug within the length limit', () => {
    const base = 'a'.repeat(80)
    const candidate = slugCandidate(base, 12)
    expect(candidate.length).toBeLessThanOrEqual(80)
    expect(candidate.endsWith('-12')).toBe(true)
    expect(isValidSlug(candidate)).toBe(true)
  })
})
