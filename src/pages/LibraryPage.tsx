import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Search, ChevronLeft, ChevronRight, FolderOpen, X } from 'lucide-react'
import { useLibraryVideos, useCollections, useTags } from '../data/library'
import { LibraryVideoCard } from '../components/LibraryVideoCard'

const PER_PAGE = 8

export function LibraryPage() {
  const { videos, loading } = useLibraryVideos()
  const { collections } = useCollections()
  const { tags: allTags } = useTags()

  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [selectedCollection, setSelectedCollection] = useState<string | 'all'>(
    searchParams.get('collection') || 'all',
  )
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(() => {
    const param = searchParams.get('tags')
    return param ? new Set(param.split(',')) : new Set()
  })
  const [page, setPage] = useState(1)

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (selectedCollection !== 'all') params.set('collection', selectedCollection)
    if (selectedTagIds.size > 0) params.set('tags', Array.from(selectedTagIds).join(','))
    setSearchParams(params, { replace: true })
  }, [searchQuery, selectedCollection, selectedTagIds, setSearchParams])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [searchQuery, selectedCollection, selectedTagIds])

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) next.delete(tagId)
      else next.add(tagId)
      return next
    })
  }

  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      // Collection filter
      if (selectedCollection === 'uncategorized' && video.collectionId !== null) return false
      if (selectedCollection !== 'all' && selectedCollection !== 'uncategorized' && video.collectionId !== selectedCollection) return false

      // Tag filter
      if (selectedTagIds.size > 0) {
        const videoTagIds = new Set(video.tags.map((t) => t.id))
        for (const tagId of selectedTagIds) {
          if (!videoTagIds.has(tagId)) return false
        }
      }

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const inTitle = video.title.toLowerCase().includes(q)
        const inDesc = video.description.toLowerCase().includes(q)
        const inNotes = video.notes.toLowerCase().includes(q)
        const inTags = video.tags.some((t) => t.name.includes(q))
        if (!inTitle && !inDesc && !inNotes && !inTags) return false
      }

      return true
    })
  }, [videos, searchQuery, selectedCollection, selectedTagIds])

  const totalPages = Math.ceil(filteredVideos.length / PER_PAGE)
  const paginatedVideos = filteredVideos.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const hasFilters = searchQuery || selectedCollection !== 'all' || selectedTagIds.size > 0

  return (
    <div className="min-h-screen bg-bjj-bg py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-5xl text-white mb-4">VIDEO LIBRARY</h1>
            <p className="text-bjj-textMuted text-lg max-w-3xl">
              Your personal collection of BJJ videos — instructionals, breakdowns, drills, and more.
            </p>
          </div>
          <Link
            to="/library/add"
            className="inline-flex items-center gap-2 bg-bjj-accent hover:bg-bjj-accentHover text-bjj-bg font-bold py-2.5 px-5 rounded-xl transition-colors shrink-0"
          >
            <Plus className="w-5 h-5" />
            Add Video
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-bjj-textMuted/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search videos, tags, techniques..."
            className="w-full bg-bjj-surface border border-bjj-border rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-bjj-textMuted/50 focus:outline-none focus:border-bjj-accent/50 transition-colors"
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-56 shrink-0">
            {/* Collections — desktop list */}
            <div className="hidden lg:block">
              <h3 className="font-heading text-sm text-bjj-textMuted mb-3 uppercase tracking-wider">Collections</h3>
              <nav className="space-y-1">
                <button
                  onClick={() => setSelectedCollection('all')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCollection === 'all'
                      ? 'bg-bjj-accent/10 text-bjj-accent border-l-2 border-bjj-accent'
                      : 'text-bjj-textMuted hover:text-white hover:bg-bjj-surfaceHover'
                  }`}
                >
                  All Videos
                </button>
                <button
                  onClick={() => setSelectedCollection('uncategorized')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCollection === 'uncategorized'
                      ? 'bg-bjj-accent/10 text-bjj-accent border-l-2 border-bjj-accent'
                      : 'text-bjj-textMuted hover:text-white hover:bg-bjj-surfaceHover'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    Uncategorized
                  </span>
                </button>
                {collections.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => setSelectedCollection(col.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCollection === col.id
                        ? 'bg-bjj-accent/10 text-bjj-accent border-l-2 border-bjj-accent'
                        : 'text-bjj-textMuted hover:text-white hover:bg-bjj-surfaceHover'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4" />
                      {col.name}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Collections — mobile dropdown */}
            <div className="lg:hidden">
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="w-full bg-bjj-surface border border-bjj-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-bjj-accent/50 transition-colors"
              >
                <option value="all">All Videos</option>
                <option value="uncategorized">Uncategorized</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
            </div>

            {/* Tags */}
            {allTags.length > 0 && (
              <div className="mt-6">
                <h3 className="font-heading text-sm text-bjj-textMuted mb-3 uppercase tracking-wider">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`text-xs rounded-full px-3 py-1 font-medium transition-colors ${
                        selectedTagIds.has(tag.id)
                          ? 'bg-bjj-accent text-bjj-bg'
                          : 'bg-bjj-bg border border-bjj-border text-bjj-textMuted hover:text-white hover:border-bjj-accent/50'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Results count */}
            <div className="mb-4 flex justify-between items-center">
              <p className="text-bjj-textMuted text-sm">
                {filteredVideos.length > 0 ? (
                  <>
                    Showing{' '}
                    <span className="text-white font-medium">
                      {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filteredVideos.length)}
                    </span>{' '}
                    of{' '}
                    <span className="text-white font-medium">{filteredVideos.length}</span>{' '}
                    videos
                  </>
                ) : (
                  loading ? 'Loading...' : `${filteredVideos.length} videos`
                )}
              </p>
              {hasFilters && filteredVideos.length === 0 && (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCollection('all'); setSelectedTagIds(new Set()) }}
                  className="flex items-center gap-1 text-bjj-accent hover:text-bjj-accentHover text-sm font-medium transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-12 text-bjj-textMuted">Loading videos...</div>
            ) : filteredVideos.length > 0 ? (
              <>
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {paginatedVideos.map((video, index) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                    >
                      <LibraryVideoCard video={video} />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <button
                      onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo(0, 0) }}
                      disabled={page === 1}
                      className="p-2 rounded-lg border border-bjj-border text-bjj-textMuted hover:text-white hover:border-bjj-accent/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => { setPage(p); window.scrollTo(0, 0) }}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                          p === page
                            ? 'bg-bjj-accent text-bjj-bg'
                            : 'border border-bjj-border text-bjj-textMuted hover:text-white hover:border-bjj-accent/50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo(0, 0) }}
                      disabled={page === totalPages}
                      className="p-2 rounded-lg border border-bjj-border text-bjj-textMuted hover:text-white hover:border-bjj-accent/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            ) : videos.length === 0 ? (
              <div className="py-20 text-center border border-bjj-border border-dashed rounded-xl bg-bjj-surface/50">
                <h3 className="font-heading text-2xl text-white mb-2">NO VIDEOS YET</h3>
                <p className="text-bjj-textMuted mb-6">
                  Start building your personal BJJ video library.
                </p>
                <Link
                  to="/library/add"
                  className="inline-flex items-center gap-2 bg-bjj-accent hover:bg-bjj-accentHover text-bjj-bg font-bold py-2.5 px-5 rounded-xl transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Video
                </Link>
              </div>
            ) : (
              <div className="py-20 text-center border border-bjj-border border-dashed rounded-xl bg-bjj-surface/50">
                <h3 className="font-heading text-2xl text-white mb-2">NO MATCHES FOUND</h3>
                <p className="text-bjj-textMuted">
                  Try adjusting your filters or search query.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
