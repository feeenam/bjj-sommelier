import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Runs the articles block of supabase-schema.sql on a real Postgres engine (PGlite), with Supabase's
// auth.uid() and the anon/authenticated roles stubbed, and checks row security, column grants, the
// slug-lock trigger and the daily generation limit as each kind of caller.

const schema = readFileSync(new URL('../../supabase-schema.sql', import.meta.url), 'utf8')
const banner = schema.lastIndexOf('-- ====', schema.indexOf('-- Technique articles (LLM-assisted blog posts)'))
const articlesBlock = schema.slice(banner)

const A = '00000000-0000-0000-0000-00000000000a'
const B = '00000000-0000-0000-0000-00000000000b'

let db: PGlite

type Result = { rows?: any[]; error?: any }
async function as(role: 'anon' | 'authenticated', uid: string | null, sql: string, params: unknown[] = []): Promise<Result> {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false)`)
  try {
    return { rows: (await db.query(sql, params)).rows }
  } catch (error) {
    return { error }
  } finally {
    await db.exec('reset role')
  }
}
const insert = (uid: string, slug: string) =>
  as('authenticated', uid, `insert into articles (title, slug) values ('T', $1) returning id, user_id, published_at, status`, [slug])

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create schema cron;
    create function cron.schedule(text, text, text) returns bigint language sql as $$ select 1::bigint $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on sequences to anon, authenticated;
    alter default privileges in schema public grant execute on functions to anon, authenticated;
  `)
  await db.exec(articlesBlock)
  await db.exec(`insert into auth.users values ('${A}'), ('${B}')`)
}, 60_000)
afterAll(() => db.close())

let draftId: string

describe('articles: constraints and ownership', () => {
  it('lets the owner insert a draft, with user_id defaulting to the caller', async () => {
    const r = await insert(A, 'knee-cut')
    expect(r.error).toBeUndefined()
    expect(r.rows![0]).toMatchObject({ user_id: A, status: 'draft', published_at: null })
    draftId = r.rows![0].id
  })
  it.each(['Bad Slug', 'double--hyphen', '-lead', 'trail-', ''])('rejects the slug %j', async (slug) => {
    expect((await insert(A, slug)).error?.message).toMatch(/check/i)
  })
  it('rejects an unknown status', async () => {
    expect((await as('authenticated', A, `insert into articles (title, slug, status) values ('T','ok','weird')`)).error).toBeDefined()
  })
  it("refuses a row owned by someone else, and any insert by an anonymous caller", async () => {
    expect((await as('authenticated', A, `insert into articles (title, slug, user_id) values ('T','spoof','${B}')`)).error).toBeDefined()
    expect((await as('anon', null, `insert into articles (title, slug) values ('T','anon-try')`)).error).toBeDefined()
  })
  it("hides drafts from everyone but the owner", async () => {
    expect((await as('anon', null, `select id, slug from articles`)).rows).toEqual([])
    expect((await as('authenticated', B, `select id from articles`)).rows).toEqual([])
    expect((await as('authenticated', A, `select id from articles`)).rows).toHaveLength(1)
  })
  it("stops another user updating or deleting the owner's article", async () => {
    expect((await as('authenticated', B, `update articles set title='x' where id=$1 returning id`, [draftId])).rows).toEqual([])
    expect((await as('authenticated', B, `delete from articles where id=$1 returning id`, [draftId])).rows).toEqual([])
  })
  it('keeps user_id fixed even if the owner tries to hand the row over', async () => {
    const r = await as('authenticated', A, `update articles set user_id='${B}' where id=$1 returning user_id`, [draftId])
    expect(r.rows?.[0]?.user_id ?? A).toBe(A)
  })
})

describe('articles: publishing and the slug lock', () => {
  it('lets the slug change while unpublished, then stamps published_at on first publish', async () => {
    const renamed = await as('authenticated', A, `update articles set slug='knee-cut-pass' where id=$1 returning slug`, [draftId])
    expect(renamed.rows![0].slug).toBe('knee-cut-pass')
    const published = await as('authenticated', A, `update articles set status='published' where id=$1 returning published_at`, [draftId])
    expect(published.rows![0].published_at).not.toBeNull()
  })
  it('locks the slug after publishing', async () => {
    expect((await as('authenticated', A, `update articles set slug='renamed' where id=$1`, [draftId])).error?.message).toMatch(/locked/)
  })
  it('does not let the owner clear published_at to unlock the slug (adversarial finding)', async () => {
    const before = (await as('authenticated', A, `select published_at from articles where id=$1`, [draftId])).rows![0].published_at
    // Clearing it, alone or together with going back to draft, is ignored...
    const cleared = await as('authenticated', A, `update articles set published_at=null where id=$1 returning published_at`, [draftId])
    expect(String(cleared.rows![0].published_at)).toBe(String(before))
    const draftAndCleared = await as('authenticated', A, `update articles set status='draft', published_at=null where id=$1 returning published_at`, [draftId])
    expect(String(draftAndCleared.rows![0].published_at)).toBe(String(before))
    // ...so the rename that followed in the attack is still refused.
    expect((await as('authenticated', A, `update articles set slug='renamed' where id=$1`, [draftId])).error?.message).toMatch(/locked/)
    expect((await as('authenticated', A, `update articles set slug='renamed', status='published' where id=$1`, [draftId])).error?.message).toMatch(/locked/)
  })
  it('ignores a published_at chosen by the client on insert', async () => {
    const r = await as('authenticated', A, `insert into articles (title, slug, published_at) values ('T','forged-date','2001-01-01') returning published_at`)
    expect(r.rows![0].published_at).toBeNull()
  })
  it('shows an unpublished article to nobody but the owner, and keeps its published_at on republish', async () => {
    const stamp = (await as('authenticated', A, `select published_at from articles where id=$1`, [draftId])).rows![0].published_at
    await as('authenticated', A, `update articles set status='draft' where id=$1`, [draftId])
    expect((await as('anon', null, `select id from articles where slug='knee-cut-pass'`)).rows).toEqual([])
    const again = await as('authenticated', A, `update articles set status='published' where id=$1 returning published_at`, [draftId])
    expect(String(again.rows![0].published_at)).toBe(String(stamp))
  })
  it('refuses a slug that another author already uses, with a unique violation the client retries on', async () => {
    const r = await insert(B, 'knee-cut-pass')
    expect(r.error?.code).toBe('23505')
    expect((await insert(B, 'knee-cut-pass-2')).error).toBeUndefined()
  })
})

describe('articles: what the public can read (adversarial finding)', () => {
  it('lets anonymous visitors read the publishable columns of published articles', async () => {
    const r = await as('anon', null, `select id, title, slug, excerpt, technique, body_markdown, status, published_at, created_at, updated_at from articles`)
    expect(r.error).toBeUndefined()
    expect(r.rows!.map((row) => row.slug)).toEqual(['knee-cut-pass'])
  })
  it("hides the author's id from anonymous visitors", async () => {
    const r = await as('anon', null, `select user_id from articles`)
    expect(r.error?.message).toMatch(/permission denied/i)
  })
  it('never exposes raw notes to anonymous visitors: they live in a table anon cannot touch', async () => {
    await as('authenticated', A, `insert into article_sources (article_id, source_markdown) values ($1, 'PRIVATE ROUGH NOTES')`, [draftId])
    expect((await as('anon', null, `select source_markdown from article_sources`)).error?.message).toMatch(/permission denied/i)
    expect((await as('anon', null, `select * from articles`)).error?.message).toMatch(/permission denied/i)
  })
  it("keeps one author's notes from other signed-in users", async () => {
    expect((await as('authenticated', B, `select source_markdown from article_sources`)).rows).toEqual([])
    expect((await as('authenticated', A, `select source_markdown from article_sources`)).rows).toEqual([{ source_markdown: 'PRIVATE ROUGH NOTES' }])
  })
  it("refuses notes attached to someone else's article, and updates to them", async () => {
    expect((await as('authenticated', B, `insert into article_sources (article_id, source_markdown) values ($1, 'planted')`, [draftId])).error).toBeDefined()
    expect((await as('authenticated', B, `update article_sources set source_markdown='x' returning article_id`)).rows).toEqual([])
  })
  it('lets the owner replace their notes, and removes them with the article', async () => {
    const up = await as('authenticated', A, `update article_sources set source_markdown='new notes' where article_id=$1 returning source_markdown`, [draftId])
    expect(up.rows).toEqual([{ source_markdown: 'new notes' }])
    await as('authenticated', A, `delete from articles where id=$1`, [draftId])
    expect((await db.query(`select count(*)::int as n from article_sources`)).rows[0]).toEqual({ n: 0 })
  })
})

describe('generation limit', () => {
  const claim = (uid: string, limit = 5) => as('authenticated', uid, `select claim_generation($1) as ok`, [limit])
  it('allows exactly 5, then refuses, per user', async () => {
    const results: boolean[] = []
    for (let i = 0; i < 6; i++) results.push((await claim(A)).rows![0].ok)
    expect(results).toEqual([true, true, true, true, true, false])
    expect((await claim(B)).rows![0].ok).toBe(true)
  })
  it('counts only the caller', async () => {
    expect((await as('authenticated', A, `select generations_used_today() as n`)).rows![0].n).toBe(5)
  })
  it('is not callable by anonymous visitors', async () => {
    expect((await as('anon', null, `select claim_generation(5)`)).error?.message).toMatch(/permission denied/i)
    expect((await as('anon', null, `select generations_used_today()`)).error?.message).toMatch(/permission denied/i)
  })
  it('cannot be reset or dodged by writing the log directly', async () => {
    expect((await as('authenticated', A, `select * from generation_log`)).rows).toEqual([])
    expect((await as('authenticated', A, `insert into generation_log (user_id) values ('${A}')`)).error).toBeDefined()
    expect((await as('authenticated', A, `delete from generation_log where user_id='${A}' returning id`)).rows).toEqual([])
  })
  it('uses a rolling 24 hour window', async () => {
    await db.exec(`update generation_log set created_at = now() - interval '25 hours' where user_id = '${A}'`)
    expect((await claim(A)).rows![0].ok).toBe(true)
  })
})
