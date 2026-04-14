import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ── Types ──────────────────────────────────────────────

export interface Collection {
  id: string
  name: string
  description: string
  createdAt: string
}

export interface Tag {
  id: string
  name: string
}

export interface LibraryVideo {
  id: string
  title: string
  sourceUrl: string
  youtubeId: string | null
  thumbnailUrl: string
  description: string
  notes: string
  collectionId: string | null
  createdAt: string
  tags: Tag[]
}

interface DbCollection {
  id: string
  name: string
  description: string
  created_at: string
}

interface DbTag {
  id: string
  name: string
}

interface DbLibraryVideo {
  id: string
  title: string
  source_url: string
  youtube_id: string | null
  thumbnail_url: string
  description: string
  notes: string
  collection_id: string | null
  created_at: string
  library_video_tags: { tags: DbTag }[]
}

// ── Mappers ────────────────────────────────────────────

function mapDbCollection(row: DbCollection): Collection {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
  }
}

function mapDbTag(row: DbTag): Tag {
  return { id: row.id, name: row.name }
}

function mapDbLibraryVideo(row: DbLibraryVideo): LibraryVideo {
  return {
    id: row.id,
    title: row.title,
    sourceUrl: row.source_url,
    youtubeId: row.youtube_id,
    thumbnailUrl: row.thumbnail_url,
    description: row.description,
    notes: row.notes,
    collectionId: row.collection_id,
    createdAt: row.created_at,
    tags: (row.library_video_tags || []).map((jt) => mapDbTag(jt.tags)),
  }
}

// ── Hooks ──────────────────────────────────────────────

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetch() {
    setLoading(true)
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .order('name')
    if (error) {
      setError(error.message)
    } else {
      setCollections((data as DbCollection[]).map(mapDbCollection))
    }
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  return { collections, loading, error, refetch: fetch }
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetch() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name')
    if (error) {
      setError(error.message)
    } else {
      setTags((data as DbTag[]).map(mapDbTag))
    }
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  return { tags, loading, error, refetch: fetch }
}

export function useLibraryVideos() {
  const [videos, setVideos] = useState<LibraryVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetch() {
    setLoading(true)
    const { data, error } = await supabase
      .from('library_videos')
      .select('*, library_video_tags(tags(*))')
      .order('created_at', { ascending: false })
    if (error) {
      setError(error.message)
    } else {
      setVideos((data as DbLibraryVideo[]).map(mapDbLibraryVideo))
    }
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  return { videos, loading, error, refetch: fetch }
}

// ── CRUD ───────────────────────────────────────────────

export async function createCollection(name: string, description = '') {
  const { data, error } = await supabase
    .from('collections')
    .insert([{ name, description }])
    .select()
    .single()
  if (error) throw error
  return mapDbCollection(data as DbCollection)
}

export async function createTag(name: string): Promise<Tag> {
  const normalized = name.trim().toLowerCase()
  const { data, error } = await supabase
    .from('tags')
    .upsert([{ name: normalized }], { onConflict: 'name' })
    .select()
    .single()
  if (error) throw error
  return mapDbTag(data as DbTag)
}

export interface LibraryVideoFormData {
  title: string
  source_url: string
  youtube_id: string
  thumbnail_url: string
  description: string
  notes: string
  collection_id: string | null
  tag_ids: string[]
}

export async function createLibraryVideo(form: LibraryVideoFormData) {
  const { tag_ids, ...videoData } = form
  const payload = {
    ...videoData,
    youtube_id: videoData.youtube_id || null,
    collection_id: videoData.collection_id || null,
  }

  const { data, error } = await supabase
    .from('library_videos')
    .insert([payload])
    .select()
    .single()
  if (error) throw error

  if (tag_ids.length > 0) {
    const junctionRows = tag_ids.map((tagId) => ({
      video_id: data.id,
      tag_id: tagId,
    }))
    const { error: tagError } = await supabase
      .from('library_video_tags')
      .insert(junctionRows)
    if (tagError) throw tagError
  }

  return data
}

export async function deleteLibraryVideo(id: string) {
  const { error } = await supabase.from('library_videos').delete().eq('id', id)
  if (error) throw error
}

export async function deleteCollection(id: string) {
  const { error } = await supabase.from('collections').delete().eq('id', id)
  if (error) throw error
}
