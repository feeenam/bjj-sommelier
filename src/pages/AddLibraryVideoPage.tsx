import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Check, AlertCircle } from 'lucide-react'
import { useCollections, useTags, createCollection, createTag, createLibraryVideo, Tag } from '../data/library'
import { TagInput } from '../components/TagInput'
import { CollectionPicker } from '../components/CollectionPicker'

function extractYoutubeId(input: string): string {
  const match = input.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : input
}

const inputClass = 'w-full bg-bjj-bg border border-bjj-border rounded-lg px-4 py-2.5 text-white placeholder:text-bjj-textMuted/50 focus:outline-none focus:border-bjj-accent/50 transition-colors'

export function AddLibraryVideoPage() {
  const navigate = useNavigate()
  const { collections, refetch: refetchCollections } = useCollections()
  const { tags: allTags, refetch: refetchTags } = useTags()

  const [form, setForm] = useState({
    title: '',
    source_url: '',
    youtube_id: '',
    thumbnail_url: '',
    description: '',
    notes: '',
  })
  const [collectionId, setCollectionId] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleCreateCollection(name: string) {
    const col = await createCollection(name)
    await refetchCollections()
    return col
  }

  async function handleCreateTag(name: string) {
    const tag = await createTag(name)
    await refetchTags()
    return tag
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.source_url.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const youtubeId = form.youtube_id ? extractYoutubeId(form.youtube_id) : ''
      const thumbnailUrl = form.thumbnail_url || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : '')

      await createLibraryVideo({
        title: form.title,
        source_url: form.source_url,
        youtube_id: youtubeId,
        thumbnail_url: thumbnailUrl,
        description: form.description,
        notes: form.notes,
        collection_id: collectionId,
        tag_ids: selectedTags.map((t) => t.id),
      })

      setSuccess(true)
      setTimeout(() => navigate('/library'), 1500)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-bjj-bg py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-heading text-5xl text-white mb-4">ADD TO LIBRARY</h1>
          <p className="text-bjj-textMuted text-lg">
            Save a BJJ video to your personal library.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Video Info */}
          <div className="bg-bjj-surface border border-bjj-border rounded-xl p-6 space-y-5">
            <h2 className="font-heading text-2xl text-white">VIDEO INFO</h2>

            <div>
              <label className="block text-sm font-medium text-bjj-textMuted mb-1.5">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g. John Danaher — Arm Bar System"
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-bjj-textMuted mb-1.5">Source URL *</label>
              <input
                type="url"
                value={form.source_url}
                onChange={(e) => updateField('source_url', e.target.value)}
                placeholder="https://..."
                required
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-bjj-textMuted mb-1.5">YouTube Video ID</label>
              <input
                type="text"
                value={form.youtube_id}
                onChange={(e) => updateField('youtube_id', e.target.value)}
                placeholder="YouTube URL or video ID (optional)"
                className={inputClass}
              />
              <p className="text-xs text-bjj-textMuted/60 mt-1">Paste a YouTube URL or just the video ID. Used for thumbnail and embed.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-bjj-textMuted mb-1.5">Thumbnail URL</label>
              <input
                type="text"
                value={form.thumbnail_url}
                onChange={(e) => updateField('thumbnail_url', e.target.value)}
                placeholder="Auto-generated from YouTube if left blank"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-bjj-textMuted mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="What's this video about?"
                rows={3}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-bjj-textMuted mb-1.5">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Personal notes, timestamps, key takeaways..."
                rows={3}
                className={inputClass}
              />
            </div>
          </div>

          {/* Organization */}
          <div className="bg-bjj-surface border border-bjj-border rounded-xl p-6 space-y-5">
            <h2 className="font-heading text-2xl text-white">ORGANIZATION</h2>

            <div>
              <label className="block text-sm font-medium text-bjj-textMuted mb-1.5">Collection</label>
              <CollectionPicker
                value={collectionId}
                onChange={setCollectionId}
                collections={collections}
                onCreateCollection={handleCreateCollection}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-bjj-textMuted mb-1.5">Tags</label>
              <TagInput
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                allTags={allTags}
                onCreateTag={handleCreateTag}
              />
            </div>
          </div>

          {/* Alerts */}
          {success && (
            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl px-5 py-4 text-green-400">
              <Check className="w-5 h-5 flex-shrink-0" />
              <p>Video added! Redirecting to library...</p>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || success}
            className="w-full flex items-center justify-center gap-2 bg-bjj-accent hover:bg-bjj-accentHover text-bjj-bg font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-5 h-5" />
            {submitting ? 'Adding...' : 'ADD TO LIBRARY'}
          </button>
        </form>
      </div>
    </div>
  )
}
