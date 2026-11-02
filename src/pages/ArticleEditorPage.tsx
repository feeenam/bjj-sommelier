import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, Check, Eye, FileText, Loader2, RotateCcw, Save, Send, Sparkles, Trash2, Undo2 } from 'lucide-react'
import {
  createArticle,
  deleteArticle,
  fetchGenerationsUsed,
  generateArticle,
  setArticleStatus,
  updateArticle,
  useArticle,
  type Article,
} from '../data/articles'
import { RichTextEditor } from '../components/RichTextEditor'
import { ArticleBody } from '../components/ArticleBody'
import { isValidSlug, slugify } from '../lib/slug'

const DAILY_LIMIT = 5
const MIN_NOTES = 40

const inputClass =
  'w-full bg-bjj-bg border border-bjj-border rounded-lg px-4 py-2.5 text-white placeholder:text-bjj-textMuted/50 focus:outline-none focus:border-bjj-accent/60 transition-colors disabled:opacity-60'

interface Fields {
  notes: string
  technique: string
  title: string
  excerpt: string
  slug: string
  body: string
}

const EMPTY: Fields = { notes: '', technique: '', title: '', excerpt: '', slug: '', body: '' }

function fieldsFrom(article: Article): Fields {
  return {
    notes: article.sourceMarkdown ?? '',
    technique: article.technique,
    title: article.title,
    excerpt: article.excerpt,
    slug: article.slug,
    body: article.bodyMarkdown,
  }
}

const sameFields = (a: Fields, b: Fields) => JSON.stringify(a) === JSON.stringify(b)
const backupKey = (id: string | undefined) => `article-backup:${id ?? 'new'}`

function readBackup(id: string | undefined): Fields | null {
  try {
    const raw = localStorage.getItem(backupKey(id))
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : null
  } catch {
    return null
  }
}

export function ArticleEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const { article, loading: loadingArticle, error: loadError } = useArticle({ id: id ?? '' }, { withSource: true })

  const [fields, setFields] = useState<Fields>(EMPTY)
  const [saved, setSaved] = useState<Fields>(EMPTY) // what the database has
  const [generatedBody, setGeneratedBody] = useState('') // last model output, to spot hand edits
  const [record, setRecord] = useState<Article | null>(null)
  const [stage, setStage] = useState<'input' | 'draft'>('input')
  const [preview, setPreview] = useState(false)
  const [backup, setBackup] = useState<Fields | null>(null)
  const [used, setUsed] = useState<number | null>(null)
  const [busy, setBusy] = useState<null | 'generate' | 'save' | 'publish' | 'delete'>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const slugLocked = !!record?.publishedAt
  const dirty = !sameFields(fields, saved)
  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => setFields((f) => ({ ...f, [key]: value }))

  // Load the article being edited, or start blank.
  useEffect(() => {
    if (isNew) {
      setBackup(readBackup(undefined))
      return
    }
    if (!article) return
    // Already holding this article (we just saved it as new and the route changed to its id): the
    // state here is newer than the copy that was fetched, so keep it.
    if (record?.id === article.id) return
    const loaded = fieldsFrom(article)
    setRecord(article)
    setFields(loaded)
    setSaved(loaded)
    // Nothing here was generated in this session, so Regenerate asks before replacing the body.
    setGeneratedBody('')
    setStage(loaded.body ? 'draft' : 'input')
    const found = readBackup(article.id)
    setBackup(found && !sameFields(found, loaded) ? found : null)
  }, [isNew, article, record?.id])

  useEffect(() => {
    fetchGenerationsUsed().then(setUsed)
  }, [])

  // Local backup while there are unsaved changes, so a closed tab doesn't lose a long set of notes.
  useEffect(() => {
    if (!dirty) return
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(backupKey(record?.id), JSON.stringify(fields))
      } catch {
        /* storage unavailable: the explicit Save button still works */
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [fields, dirty, record?.id])

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  function clearBackup(forId: string | undefined) {
    try {
      localStorage.removeItem(backupKey(forId))
    } catch {
      /* ignore */
    }
  }

  function restoreBackup() {
    if (!backup) return
    if (dirty && !window.confirm('Restoring will replace what you have typed since opening this page. Continue?')) return
    setFields(backup)
    setStage(backup.body ? 'draft' : 'input')
    setBackup(null)
  }

  function discardBackup() {
    clearBackup(record?.id)
    setBackup(null)
  }

  const left = used === null ? null : Math.max(0, DAILY_LIMIT - used)
  const bodyEdited = useMemo(() => fields.body.trim() !== '' && fields.body !== generatedBody, [fields.body, generatedBody])

  async function handleGenerate() {
    setError(null)
    setNotice(null)
    if (fields.notes.trim().length < MIN_NOTES) {
      setError('Add a bit more to your notes first.')
      return
    }
    if (bodyEdited && !window.confirm('Regenerating will replace your edits to the article body. Continue?')) return
    setBusy('generate')
    try {
      const result = await generateArticle(fields.notes, fields.technique)
      setFields((f) => ({
        ...f,
        title: result.title,
        excerpt: result.excerpt,
        body: result.body_markdown,
        // Keep an existing slug (it may be shared or locked); only fill it in when empty.
        slug: f.slug || result.slug,
      }))
      setGeneratedBody(result.body_markdown)
      setUsed(result.used)
      setStage('draft')
      setPreview(false)
    } catch (err: any) {
      setError(err.message || 'Article generation failed')
      fetchGenerationsUsed().then(setUsed)
    } finally {
      setBusy(null)
    }
  }

  /** Saves the current fields. Returns the stored article, or null if saving failed. */
  const save = useCallback(async (): Promise<Article | null> => {
    const sent = fields
    const title = sent.title.trim() || sent.technique.trim() || 'Untitled draft'
    const slug = slugLocked ? sent.slug : slugify(sent.slug || title) || 'untitled-article'
    if (!slugLocked && !isValidSlug(slug)) {
      setError('The slug can only use lowercase letters, numbers and single hyphens (and cannot be "new").')
      return null
    }
    const input = {
      title,
      slug,
      excerpt: sent.excerpt.trim(),
      technique: sent.technique.trim(),
      sourceMarkdown: sent.notes,
      bodyMarkdown: sent.body,
    }
    const stored = record ? await updateArticle(record.id, input, !slugLocked) : await createArticle(input)
    const next = fieldsFrom(stored)
    clearBackup(record?.id)
    clearBackup(undefined)
    setRecord(stored)
    setSaved(next)
    // The editor stays editable while the request runs. If nothing changed meanwhile, show what was
    // stored; otherwise keep what was typed since (it stays unsaved, so it is backed up and the page
    // still warns before closing), adopting only a slug the server adjusted.
    setFields((current) =>
      current === sent ? next : { ...current, slug: current.slug === sent.slug ? next.slug : current.slug }
    )
    return stored
  }, [fields, record, slugLocked])

  async function handleSave() {
    setError(null)
    setNotice(null)
    setBusy('save')
    try {
      const stored = await save()
      if (!stored) return
      setNotice('Draft saved.')
      if (isNew) navigate(`/articles/${stored.id}/edit`, { replace: true })
    } catch (err: any) {
      setError(err.message || 'Could not save')
    } finally {
      setBusy(null)
    }
  }

  async function handlePublish() {
    setError(null)
    setNotice(null)
    if (!fields.title.trim() || !fields.body.trim()) {
      setError('Generate or write a title and body before publishing.')
      return
    }
    if (/\[TODO/i.test(fields.body) && !window.confirm('Your article still has [TODO] markers. Publish anyway?')) return
    setBusy('publish')
    try {
      const stored = await save()
      if (!stored) return
      const published = await setArticleStatus(stored.id, 'published')
      navigate(`/articles/${published.slug}`)
    } catch (err: any) {
      setError(err.message || 'Could not publish')
    } finally {
      setBusy(null)
    }
  }

  async function handleUnpublish() {
    if (!record || !window.confirm('Unpublish this article? Its public link will stop working until you publish it again.')) return
    setError(null)
    setBusy('publish')
    try {
      const stored = await setArticleStatus(record.id, 'draft')
      setRecord(stored)
      setNotice('Unpublished. This article is a draft again.')
    } catch (err: any) {
      setError(err.message || 'Could not unpublish')
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete() {
    if (!record || !window.confirm('Delete this article permanently? This cannot be undone.')) return
    setBusy('delete')
    try {
      await deleteArticle(record.id)
      clearBackup(record.id)
      setSaved(fields) // nothing left to warn about
      navigate('/articles')
    } catch (err: any) {
      setError(err.message || 'Could not delete')
      setBusy(null)
    }
  }

  if (!isNew && loadingArticle && !record) {
    return <div className="min-h-screen bg-bjj-bg py-12 text-center text-bjj-textMuted">Loading…</div>
  }
  // Not found only when we hold nothing: right after the first save we have the article before the refetch lands.
  if (!isNew && !record && (loadError || !article)) {
    return (
      <div className="min-h-screen bg-bjj-bg py-12">
        <div className="mx-auto max-w-3xl px-4">
          <h1 className="font-heading text-5xl text-white">NOT FOUND</h1>
          <p className="mt-3 text-bjj-textMuted">{loadError ?? "That article doesn't exist or isn't yours."}</p>
          <Link to="/articles" className="mt-4 inline-block text-bjj-accent hover:underline">Back to articles</Link>
        </div>
      </div>
    )
  }

  const working = busy !== null
  const counter =
    left === null ? null : (
      <span className="text-sm text-bjj-textMuted">
        {left} of {DAILY_LIMIT} generations left today
      </span>
    )

  return (
    <div className="min-h-screen bg-bjj-bg py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-5xl text-white">{stage === 'input' ? 'WRITE AN ARTICLE' : record?.status === 'published' ? 'EDIT ARTICLE' : 'EDIT DRAFT'}</h1>
        <p className="mt-2 text-bjj-textMuted">
          {stage === 'input'
            ? 'Dump everything you know about one technique: notes, details, links to images and videos. The AI cleans it up into an article using only what you wrote.'
            : record?.status === 'published'
              ? 'This article is live. Changes show up once you save.'
              : 'Review the draft, fix anything, then save or publish. Gaps are marked [TODO].'}
        </p>

        {backup && (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-bjj-accent/40 bg-bjj-accent/10 px-4 py-3 text-sm text-bjj-accent">
            <span className="flex-1">Unsaved work from an earlier session was found in this browser.</span>
            <button onClick={restoreBackup} className="rounded bg-bjj-accent px-3 py-1 font-medium text-bjj-bg hover:bg-bjj-accentHover">Restore</button>
            <button onClick={discardBackup} className="rounded border border-bjj-accent/40 px-3 py-1 hover:bg-bjj-accent/10">Discard</button>
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {notice && !error && (
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-300" role="status">
            <Check className="h-4 w-4" />
            {notice}
          </div>
        )}

        {stage === 'input' ? (
          <div className="mt-8 space-y-6">
            <div>
              <label htmlFor="technique" className="mb-2 block text-sm font-medium text-bjj-textMuted">Technique name <span className="text-bjj-textMuted/60">(optional)</span></label>
              <input
                id="technique"
                className={inputClass}
                value={fields.technique}
                maxLength={100}
                placeholder="e.g. Knee cut pass"
                onChange={(e) => set('technique', e.target.value)}
              />
            </div>
            <div>
              <span className="mb-2 block text-sm font-medium text-bjj-textMuted">Your notes</span>
              <RichTextEditor
                value={fields.notes}
                onChange={(v) => set('notes', v)}
                placeholder="Setup, grips, steps, mistakes, what you drill… Add image links with the image button and paste YouTube links on their own line. The AI doesn't see the images, so caption them."
                minHeightClass="min-h-[360px]"
              />
              <p className="mt-2 text-xs text-bjj-textMuted">{fields.notes.length.toLocaleString('en-US')} / 20,000 characters</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={handleGenerate}
                disabled={working || left === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-bjj-accent px-6 py-3 font-medium text-bjj-bg transition-colors hover:bg-bjj-accentHover disabled:opacity-60"
              >
                {busy === 'generate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {busy === 'generate' ? 'Writing…' : 'Generate article'}
              </button>
              <button
                onClick={handleSave}
                disabled={working || !dirty}
                className="inline-flex items-center gap-2 rounded-lg border border-bjj-border px-5 py-3 text-bjj-textMuted transition-colors hover:border-bjj-accent/50 hover:text-white disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Save notes
              </button>
              {fields.body && (
                <button onClick={() => setStage('draft')} className="text-sm text-bjj-textMuted hover:text-white">
                  Back to draft
                </button>
              )}
              {counter}
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <div>
              <label htmlFor="title" className="mb-2 block text-sm font-medium text-bjj-textMuted">Title</label>
              <input id="title" className={inputClass} value={fields.title} maxLength={150} onChange={(e) => set('title', e.target.value)} />
            </div>
            <div>
              <label htmlFor="excerpt" className="mb-2 block text-sm font-medium text-bjj-textMuted">Excerpt</label>
              <textarea id="excerpt" rows={2} className={inputClass} value={fields.excerpt} maxLength={300} onChange={(e) => set('excerpt', e.target.value)} />
            </div>
            <div>
              <label htmlFor="slug" className="mb-2 block text-sm font-medium text-bjj-textMuted">URL slug</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-bjj-textMuted">/articles/</span>
                <input
                  id="slug"
                  className={inputClass}
                  value={fields.slug}
                  maxLength={80}
                  disabled={slugLocked}
                  onChange={(e) => set('slug', e.target.value.toLowerCase())}
                  onBlur={() => !slugLocked && set('slug', slugify(fields.slug))}
                />
              </div>
              {slugLocked && <p className="mt-1 text-xs text-bjj-textMuted">Locked because this article has been published, so shared links keep working.</p>}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-bjj-textMuted">Article</span>
                <button onClick={() => setPreview((p) => !p)} className="inline-flex items-center gap-1.5 text-sm text-bjj-textMuted hover:text-white">
                  {preview ? <FileText className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {preview ? 'Back to editor' : 'Preview'}
                </button>
              </div>
              {preview ? (
                <div className="rounded-lg border border-bjj-border bg-bjj-bg px-6 py-5">
                  <ArticleBody markdown={fields.body} />
                </div>
              ) : (
                <RichTextEditor value={fields.body} onChange={(v) => set('body', v)} minHeightClass="min-h-[420px]" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSave}
                disabled={working || !dirty}
                className="inline-flex items-center gap-2 rounded-lg border border-bjj-border px-5 py-3 text-white transition-colors hover:border-bjj-accent/50 disabled:opacity-50"
              >
                {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {record?.status === 'published' ? 'Save changes' : 'Save draft'}
              </button>
              {record?.status === 'published' ? (
                <button
                  onClick={handleUnpublish}
                  disabled={working}
                  className="inline-flex items-center gap-2 rounded-lg border border-bjj-border px-5 py-3 text-bjj-textMuted transition-colors hover:text-white disabled:opacity-50"
                >
                  <Undo2 className="h-4 w-4" />
                  Unpublish
                </button>
              ) : (
                <button
                  onClick={handlePublish}
                  disabled={working}
                  className="inline-flex items-center gap-2 rounded-lg bg-bjj-accent px-6 py-3 font-medium text-bjj-bg transition-colors hover:bg-bjj-accentHover disabled:opacity-60"
                >
                  {busy === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Publish
                </button>
              )}
              <button
                onClick={handleGenerate}
                disabled={working || left === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-bjj-border px-5 py-3 text-bjj-textMuted transition-colors hover:border-bjj-accent/50 hover:text-white disabled:opacity-50"
              >
                {busy === 'generate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                {busy === 'generate' ? 'Writing…' : 'Regenerate'}
              </button>
              <button onClick={() => setStage('input')} className="text-sm text-bjj-textMuted hover:text-white">
                Edit notes
              </button>
              {counter}
              {record && (
                <button
                  onClick={handleDelete}
                  disabled={working}
                  className="ml-auto inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
