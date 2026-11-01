import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The handler is exercised for real. Only its two boundaries are faked: Supabase and the LLM HTTP calls.
const supabase = {
  user: { id: 'user-1' } as { id: string } | null,
  claim: { data: true, error: null } as { data: unknown; error: { message: string } | null },
  used: 2 as unknown,
  rpcCalls: [] as Array<[string, unknown]>,
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: supabase.user }, error: supabase.user ? null : { message: 'bad token' } }),
    },
    rpc: async (name: string, args: unknown) => {
      supabase.rpcCalls.push([name, args])
      if (name === 'claim_generation') return supabase.claim
      return { data: supabase.used, error: null }
    },
  }),
}))

import handler from '../api/generate-article'

interface Res {
  statusCode: number
  body: any
  status(code: number): Res
  json(body: unknown): Res
}
function makeRes(): Res {
  const res: Res = {
    statusCode: 0,
    body: undefined,
    status(code) {
      res.statusCode = code
      return res
    },
    json(body) {
      res.body = body
      return res
    },
  }
  return res
}
const NOTES = 'Knee cut pass: get the underhook, slide the knee across the thigh, watch https://youtu.be/dQw4w9WgXcQ?t=30 for the finish.'
function makeReq(over: { method?: string; auth?: string | null; body?: unknown } = {}) {
  const headers: Record<string, string> = {}
  if (over.auth !== null) headers.authorization = over.auth ?? 'Bearer good-token'
  return { method: over.method ?? 'POST', headers, body: 'body' in over ? over.body : { notes: NOTES, technique: 'Knee cut pass' } } as any
}
const run = async (req: any) => {
  const res = makeRes()
  await handler(req, res as any)
  return res
}

const geminiOk = (article: Record<string, unknown>) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(article) }] } }] }), { status: 200 })
const groqOk = (article: Record<string, unknown>) =>
  new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(article) } }] }), { status: 200 })
const GOOD = { title: 'Knee Cut Pass', excerpt: 'How I cut through.', slug: 'knee-cut-pass', body_markdown: 'Get the underhook.\n\nhttps://youtu.be/dQw4w9WgXcQ?t=30' }

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  supabase.user = { id: 'user-1' }
  supabase.claim = { data: true, error: null }
  supabase.used = 2
  supabase.rpcCalls = []
  process.env.VITE_SUPABASE_URL = 'https://x.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'anon'
  process.env.GEMINI_API_KEY = 'g-key'
  process.env.GROQ_API_KEY = 'q-key'
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('generate-article handler: gates before any model call', () => {
  it('rejects non-POST', async () => {
    expect((await run(makeReq({ method: 'GET' }))).statusCode).toBe(405)
  })
  it('rejects a missing token and an invalid session', async () => {
    expect((await run(makeReq({ auth: null }))).statusCode).toBe(401)
    supabase.user = null
    expect((await run(makeReq())).statusCode).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('rejects notes that are missing, too short or too long, without spending quota', async () => {
    for (const body of [{}, { notes: 'short' }, { notes: 'x'.repeat(20_001) }, { notes: 42 }, undefined]) {
      const res = await run(makeReq({ body }))
      expect(res.statusCode).toBe(400)
    }
    expect(supabase.rpcCalls.filter(([n]) => n === 'claim_generation')).toHaveLength(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('reports a missing API key before claiming quota', async () => {
    delete process.env.GEMINI_API_KEY
    const res = await run(makeReq())
    expect(res.statusCode).toBe(500)
    expect(supabase.rpcCalls).toHaveLength(0)
  })
  it('returns 429 at the daily limit and never calls the model', async () => {
    supabase.claim = { data: false, error: null }
    const res = await run(makeReq())
    expect(res.statusCode).toBe(429)
    expect(res.body.reason).toBe('daily_limit')
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('surfaces a limit-RPC failure as 500 without calling the model', async () => {
    supabase.claim = { data: null, error: { message: 'function does not exist' } }
    expect((await run(makeReq())).statusCode).toBe(500)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('generate-article handler: model calls', () => {
  it('returns a cleaned article from Gemini with the usage counter', async () => {
    fetchMock.mockResolvedValueOnce(geminiOk(GOOD))
    const res = await run(makeReq())
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ title: 'Knee Cut Pass', slug: 'knee-cut-pass', used: 2, limit: 5 })
    expect(res.body.body_markdown).toContain('https://youtu.be/dQw4w9WgXcQ?t=30')
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('generativelanguage.googleapis.com')
    const sent = JSON.parse(init.body)
    expect(sent.systemInstruction.parts[0].text).toContain('ONLY what is in the notes')
    // Notes reach the model as wrapped untrusted data, with the technique outside the block.
    expect(sent.contents[0].parts[0].text).toContain('<untrusted_text>')
    expect(sent.contents[0].parts[0].text.startsWith('Technique name: Knee cut pass')).toBe(true)
    expect(init.headers['x-goog-api-key']).toBe('g-key')
  })
  it('falls back to Groq on a Gemini 429 or 5xx', async () => {
    for (const status of [429, 503]) {
      fetchMock.mockReset()
      fetchMock.mockResolvedValueOnce(new Response('{}', { status })).mockResolvedValueOnce(groqOk(GOOD))
      const res = await run(makeReq())
      expect(res.statusCode).toBe(200)
      expect(String(fetchMock.mock.calls[1][0])).toContain('api.groq.com')
    }
  })
  it('falls back to Groq when Gemini times out', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
    fetchMock.mockRejectedValueOnce(abort).mockResolvedValueOnce(groqOk(GOOD))
    expect((await run(makeReq())).statusCode).toBe(200)
  })
  it('does not fall back on a non-retryable Gemini error', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 400 }))
    const res = await run(makeReq())
    expect(res.statusCode).toBe(502)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('returns 502 when both providers fail', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 })).mockResolvedValueOnce(new Response('{}', { status: 500 }))
    expect((await run(makeReq())).statusCode).toBe(502)
  })
  it('returns 502 without a Groq key instead of crashing', async () => {
    delete process.env.GROQ_API_KEY
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 429 }))
    expect((await run(makeReq())).statusCode).toBe(502)
  })
  it('returns 502 for unparseable or empty model output', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] }), { status: 200 }))
    expect((await run(makeReq())).statusCode).toBe(502)
    fetchMock.mockResolvedValueOnce(geminiOk({ title: '', excerpt: '', slug: '', body_markdown: '' }))
    expect((await run(makeReq())).statusCode).toBe(502)
  })
  it('sanitizes a prompt-injected model answer: invented links, HTML and non-allowlisted images', async () => {
    fetchMock.mockResolvedValueOnce(
      geminiOk({
        title: '<script>x</script>Knee Cut',
        excerpt: 'Visit https://evil.com now',
        slug: 'Knee Cut!!',
        body_markdown:
          'Real clip: https://youtu.be/dQw4w9WgXcQ?t=30\n\n[Click here](https://evil.com/login)\n\n![pixel](https://evil.com/p.gif)\n\n<img src=x onerror=alert(1)>',
      })
    )
    const res = await run(makeReq())
    expect(res.statusCode).toBe(200)
    const out = JSON.stringify(res.body)
    expect(out).not.toContain('evil.com')
    expect(out).not.toContain('<')
    expect(res.body.slug).toBe('knee-cut')
    expect(res.body.body_markdown).toContain('https://youtu.be/dQw4w9WgXcQ?t=30')
    expect(res.body.body_markdown).toContain('Click here')
  })
  it('still returns the article if the usage counter lookup returns nothing', async () => {
    supabase.used = null
    fetchMock.mockResolvedValueOnce(geminiOk(GOOD))
    const res = await run(makeReq())
    expect(res.statusCode).toBe(200)
    expect(res.body.used).toBeNull()
  })
})
