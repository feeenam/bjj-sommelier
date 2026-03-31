import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useVideo } from '../data/videos'
import { VideoForm, VideoFormData } from '../components/VideoForm'

function extractYoutubeId(input: string): string {
  const match = input.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : input
}

export function EditVideoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { video, loading } = useVideo(id)

  if (loading) {
    return (
      <div className="min-h-screen bg-bjj-bg flex items-center justify-center">
        <p className="text-bjj-textMuted">Loading match...</p>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-bjj-bg flex flex-col items-center justify-center p-4">
        <h1 className="font-heading text-4xl text-white mb-4">MATCH NOT FOUND</h1>
        <button
          onClick={() => navigate('/videos')}
          className="bg-bjj-accent text-bjj-bg font-bold px-6 py-3 rounded-lg hover:bg-bjj-accentHover transition-colors"
        >
          BACK TO ARCHIVE
        </button>
      </div>
    )
  }

  const initialData: VideoFormData = {
    title: video.title,
    description: video.description,
    source_url: video.sourceUrl,
    youtube_id: video.youtubeId || '',
    event: video.event,
    year: video.year,
    competitors: video.competitors,
    weight_class: video.weightClass,
    match_type: video.matchType,
    ruleset: video.ruleset,
    result: video.result,
    owner_rating: video.ownerRating,
    owner_review: video.ownerReview,
    thumbnail_url: video.thumbnailUrl,
    duration: video.duration,
  }

  async function handleSubmit(data: VideoFormData) {
    const youtubeId = data.youtube_id ? extractYoutubeId(data.youtube_id) : null
    const payload = {
      ...data,
      youtube_id: youtubeId || null,
      thumbnail_url: data.thumbnail_url || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : ''),
    }

    const { error } = await supabase.from('videos').update(payload).eq('id', video!.id)
    if (!error) setTimeout(() => navigate(`/videos/${video!.id}`), 1500)
    return { error: error?.message ?? null }
  }

  return (
    <div className="min-h-screen bg-bjj-bg py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-heading text-5xl text-white mb-4">EDIT MATCH</h1>
          <p className="text-bjj-textMuted text-lg">
            Update details for {video.title}
          </p>
        </div>
        <VideoForm initialData={initialData} onSubmit={handleSubmit} mode="edit" />
      </div>
    </div>
  )
}
