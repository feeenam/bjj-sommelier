import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type Event = 'ADCC' | 'Worlds' | 'Pans' | 'Euros' | 'WNO' | 'CJI'
export type Ruleset = 'Gi' | 'No-Gi'
export type MatchType =
  | 'Superfight'
  | 'Final'
  | 'Semi-Final'
  | 'Quarter-Final'
  | 'Round of 16'
  | 'Absolute Final'

export interface Video {
  id: string
  title: string
  description: string
  youtubeId: string | null
  event: Event
  year: number
  competitors: string
  weightClass: string
  matchType: MatchType
  ruleset: Ruleset
  result: string
  ownerRating: number
  ownerReview: string
  thumbnailUrl: string
  duration: string
  sourceUrl: string
  dateAdded: string
}

interface DbVideo {
  id: string
  title: string
  description: string
  youtube_id: string | null
  event: Event
  year: number
  competitors: string
  weight_class: string
  match_type: MatchType
  ruleset: Ruleset
  result: string
  owner_rating: number
  owner_review: string
  thumbnail_url: string
  duration: string
  source_url: string
  date_added: string
}

function mapDbVideo(row: DbVideo): Video {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    youtubeId: row.youtube_id,
    event: row.event,
    year: row.year,
    competitors: row.competitors,
    weightClass: row.weight_class,
    matchType: row.match_type,
    ruleset: row.ruleset,
    result: row.result,
    ownerRating: row.owner_rating,
    ownerReview: row.owner_review,
    thumbnailUrl: row.thumbnail_url,
    duration: row.duration,
    sourceUrl: row.source_url,
    dateAdded: row.date_added,
  }
}

export function useVideos() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchVideos() {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('date_added', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setVideos((data as DbVideo[]).map(mapDbVideo))
      }
      setLoading(false)
    }
    fetchVideos()
  }, [])

  return { videos, loading, error }
}

export function useVideo(id: string | undefined) {
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    async function fetchVideo() {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        setError(error.message)
      } else {
        setVideo(mapDbVideo(data as DbVideo))
      }
      setLoading(false)
    }
    fetchVideo()
  }, [id])

  return { video, loading, error }
}
