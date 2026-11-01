import React from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus } from 'lucide-react'
import { useArticles, type ArticleSummary } from '../data/articles'
import { useAuth } from '../lib/AuthContext'

export function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function PublishedCard({ article }: { article: ArticleSummary }) {
  return (
    <Link
      to={`/articles/${article.slug}`}
      className="group block rounded-xl border border-bjj-border bg-bjj-surface p-6 transition-colors hover:border-bjj-accent/50 hover:bg-bjj-surfaceHover"
    >
      <p className="text-xs uppercase tracking-wider text-bjj-textMuted">{formatDate(article.publishedAt)}</p>
      <h2 className="mt-2 font-heading text-3xl leading-tight text-white group-hover:text-bjj-accent transition-colors">
        {article.title}
      </h2>
      {article.excerpt && <p className="mt-3 text-bjj-textMuted line-clamp-3">{article.excerpt}</p>}
    </Link>
  )
}

function DraftRow({ article }: { article: ArticleSummary }) {
  return (
    <Link
      to={`/articles/${article.id}/edit`}
      className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-bjj-border bg-bjj-surface/50 px-4 py-3 transition-colors hover:border-bjj-accent/50"
    >
      <div className="min-w-0">
        <span className="mr-2 rounded bg-bjj-accent/15 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-bjj-accent">Draft</span>
        <span className="text-white">{article.title || 'Untitled draft'}</span>
        <span className="ml-3 text-xs text-bjj-textMuted">Edited {formatDate(article.updatedAt)}</span>
      </div>
      <Pencil className="h-4 w-4 shrink-0 text-bjj-textMuted" />
    </Link>
  )
}

export function ArticlesPage() {
  const { user } = useAuth()
  const { articles, loading, error } = useArticles()
  const published = articles
    .filter((a) => a.status === 'published')
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
  const drafts = articles.filter((a) => a.status === 'draft' && a.userId === user?.id)

  return (
    <div className="min-h-screen bg-bjj-bg py-12">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-5xl text-white md:text-6xl">TECHNIQUE ARTICLES</h1>
            <p className="mt-3 max-w-2xl text-lg text-bjj-textMuted">Deep dives into single techniques: the setup, the details, and the common mistakes.</p>
          </div>
          {user && (
            <Link
              to="/articles/new"
              className="inline-flex items-center gap-2 rounded-lg bg-bjj-accent px-5 py-2.5 font-medium text-bjj-bg transition-colors hover:bg-bjj-accentHover"
            >
              <Plus className="h-4 w-4" />
              Write article
            </Link>
          )}
        </div>

        {drafts.length > 0 && (
          <section className="mb-10 space-y-2" aria-label="Your drafts">
            <h2 className="font-heading text-2xl text-bjj-textMuted">YOUR DRAFTS</h2>
            {drafts.map((a) => (
              <DraftRow key={a.id} article={a} />
            ))}
          </section>
        )}

        {loading ? (
          <p className="text-bjj-textMuted">Loading…</p>
        ) : error ? (
          <p className="text-red-400">Couldn't load articles: {error}</p>
        ) : published.length === 0 ? (
          <p className="text-bjj-textMuted">No articles published yet.</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {published.map((a) => (
              <PublishedCard key={a.id} article={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
