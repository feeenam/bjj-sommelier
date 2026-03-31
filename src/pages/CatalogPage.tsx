import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useVideos, Event, Ruleset } from '../data/videos'
import { VideoCard } from '../components/VideoCard'
import { FilterBar } from '../components/FilterBar'
export function CatalogPage() {
  const { videos, loading } = useVideos()
  const [searchParams, setSearchParams] = useSearchParams()
  // Initialize state from URL params if present
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [selectedEvent, setSelectedEvent] = useState<Event | 'All'>(
    (searchParams.get('event') as Event) || 'All',
  )
  const [selectedRuleset, setSelectedRuleset] = useState<Ruleset | 'All'>(
    (searchParams.get('ruleset') as Ruleset) || 'All',
  )
  const [sortBy, setSortBy] = useState<'newest' | 'rating'>(
    (searchParams.get('sort') as 'newest' | 'rating') || 'newest',
  )
  // Update URL params when state changes
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (selectedEvent !== 'All') params.set('event', selectedEvent)
    if (selectedRuleset !== 'All') params.set('ruleset', selectedRuleset)
    if (sortBy !== 'newest') params.set('sort', sortBy)
    setSearchParams(params, {
      replace: true,
    })
  }, [searchQuery, selectedEvent, selectedRuleset, sortBy, setSearchParams])
  const filteredAndSortedVideos = useMemo(() => {
    return videos
      .filter((video) => {
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch =
          video.title.toLowerCase().includes(searchLower) ||
          video.competitors.toLowerCase().includes(searchLower) ||
          video.event.toLowerCase().includes(searchLower)
        const matchesEvent =
          selectedEvent === 'All' || video.event === selectedEvent
        const matchesRuleset =
          selectedRuleset === 'All' || video.ruleset === selectedRuleset
        return matchesSearch && matchesEvent && matchesRuleset
      })
      .sort((a, b) => {
        if (sortBy === 'rating') {
          return b.ownerRating - a.ownerRating
        } else {
          // newest
          return (
            new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
          )
        }
      })
  }, [videos, searchQuery, selectedEvent, selectedRuleset, sortBy])
  return (
    <div className="min-h-screen bg-bjj-bg py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-heading text-5xl text-white mb-4">
            COMPETITION ARCHIVE
          </h1>
          <p className="text-bjj-textMuted text-lg max-w-3xl">
            Browse our complete library of curated Brazilian Jiu-Jitsu
            competition matches. Filter by event, ruleset, or search for
            specific competitors and tournaments.
          </p>
        </div>

        <FilterBar
          videos={videos}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedEvent={selectedEvent}
          setSelectedEvent={setSelectedEvent}
          selectedRuleset={selectedRuleset}
          setSelectedRuleset={setSelectedRuleset}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />

        <div className="mt-8 mb-4 flex justify-between items-center">
          <p className="text-bjj-textMuted">
            Showing{' '}
            <span className="text-white font-medium">
              {filteredAndSortedVideos.length}
            </span>{' '}
            matches
          </p>
          {filteredAndSortedVideos.length === 0 && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedEvent('All')
                setSelectedRuleset('All')
              }}
              className="text-bjj-accent hover:text-bjj-accentHover text-sm font-medium transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-bjj-textMuted">Loading matches...</div>
        ) : filteredAndSortedVideos.length > 0 ? (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              duration: 0.5,
            }}
          >
            {filteredAndSortedVideos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.05,
                }}
              >
                <VideoCard video={video} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="py-20 text-center border border-bjj-border border-dashed rounded-xl bg-bjj-surface/50">
            <h3 className="font-heading text-2xl text-white mb-2">
              NO MATCHES FOUND
            </h3>
            <p className="text-bjj-textMuted">
              Try adjusting your filters or search query.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
