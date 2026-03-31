import React from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { VideoForm, VideoFormData } from '../components/VideoForm'

function extractYoutubeId(input: string): string {
  const match = input.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : input
}

export function AddVideoPage() {
  const navigate = useNavigate()

  async function handleSubmit(data: VideoFormData) {
    const youtubeId = data.youtube_id ? extractYoutubeId(data.youtube_id) : null
    const payload = {
      ...data,
      youtube_id: youtubeId || null,
      thumbnail_url: data.thumbnail_url || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : ''),
    }

    const { error } = await supabase.from('videos').insert([payload])
    if (!error) setTimeout(() => navigate('/videos'), 1500)
    return { error: error?.message ?? null }
  }

  return (
    <div className="min-h-screen bg-bjj-bg py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-heading text-5xl text-white mb-4">ADD MATCH</h1>
          <p className="text-bjj-textMuted text-lg">
            Add a new competition match to the archive.
          </p>
        </div>
        <VideoForm onSubmit={handleSubmit} mode="add" />
      </div>
    </div>
  )
}
