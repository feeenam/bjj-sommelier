import React, { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useArticle } from '../data/articles'
import { useAuth } from '../lib/AuthContext'
import { ArticleBody } from '../components/ArticleBody'
import { formatDate } from './ArticlesPage'

export function ArticlePage() {
  const { slug = '' } = useParams()
  const { user } = useAuth()
  const { article, loading, error } = useArticle({ slug })

  useEffect(() => {
    if (!article) return
    const previous = document.title
    document.title = `${article.title} | BJJ Sommelier`
    return () => {
      document.title = previous
    }
  }, [article])

  // Anonymous visitors get no author id back, so an owner needs both a session and a match.
  const isOwner = !!user && !!article && user.id === article.userId

  return (
    <div className="min-h-screen bg-bjj-bg py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link to="/articles" className="mb-8 inline-flex items-center gap-2 text-sm text-bjj-textMuted transition-colors hover:text-bjj-accent">
          <ArrowLeft className="h-4 w-4" />
          All articles
        </Link>

        {loading ? (
          <p className="text-bjj-textMuted">Loading…</p>
        ) : error ? (
          <p className="text-red-400">Couldn't load this article: {error}</p>
        ) : !article ? (
          <div>
            <h1 className="font-heading text-5xl text-white">NOT FOUND</h1>
            <p className="mt-3 text-bjj-textMuted">This article doesn't exist or isn't published.</p>
          </div>
        ) : (
          <article>
            {article.status === 'draft' && (
              <div className="mb-6 rounded-lg border border-bjj-accent/40 bg-bjj-accent/10 px-4 py-3 text-sm text-bjj-accent">
                Draft preview. Only you can see this until you publish it.
              </div>
            )}
            <p className="text-sm uppercase tracking-wider text-bjj-textMuted">
              BJJ Sommelier{article.publishedAt ? ` · ${formatDate(article.publishedAt)}` : ''}
            </p>
            <h1 className="mt-3 font-heading text-5xl leading-tight text-white md:text-6xl">{article.title}</h1>
            {article.excerpt && <p className="mt-4 text-xl text-bjj-textMuted">{article.excerpt}</p>}
            {isOwner && (
              <Link
                to={`/articles/${article.id}/edit`}
                className="mt-5 inline-flex items-center gap-2 rounded-lg border border-bjj-border px-3 py-1.5 text-sm text-bjj-textMuted transition-colors hover:border-bjj-accent/50 hover:text-white"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            )}
            <div className="mt-10">
              <ArticleBody markdown={article.bodyMarkdown} />
            </div>
          </article>
        )}
      </div>
    </div>
  )
}
