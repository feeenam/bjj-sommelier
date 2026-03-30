import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, PlayCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useVideos, Event } from '../data/videos'
import { VideoCard } from '../components/VideoCard'
import { CategoryCard } from '../components/CategoryCard'
export function HomePage() {
  const { videos, loading } = useVideos()

  const topRatedVideos = [...videos]
    .sort((a, b) => b.ownerRating - a.ownerRating)
    .slice(0, 4)
  // Calculate event counts
  const eventCounts = videos.reduce(
    (acc, video) => {
      acc[video.event] = (acc[video.event] || 0) + 1
      return acc
    },
    {} as Record<Event, number>,
  )
  const events = Object.keys(eventCounts) as Event[]
  return (
    <div className="min-h-screen bg-bjj-bg">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-bjj-border">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1564415315949-2a0c4c811973?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-bjj-bg via-bjj-bg/80 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative pt-32 pb-24">
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.6,
            }}
            className="max-w-3xl"
          >
            <h1 className="font-heading text-6xl md:text-8xl text-white mb-6 leading-none">
              WATCH THE GREATEST{' '}
              <span className="text-bjj-accent">MATCHES</span>
            </h1>
            <p className="text-xl text-bjj-textMuted mb-10 max-w-2xl leading-relaxed">
              Curated, reviewed, and rated professional Brazilian Jiu-Jitsu
              competition footage. Relive the most iconic moments, superfights,
              and tournament finals in grappling history.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/videos"
                className="inline-flex items-center gap-2 bg-bjj-accent hover:bg-bjj-accentHover text-bjj-bg font-bold px-8 py-4 rounded-lg transition-colors"
              >
                <PlayCircle className="w-5 h-5" />
                BROWSE ARCHIVE
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Top Rated Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="font-heading text-4xl text-white mb-2">
                TOP RATED MATCHES
              </h2>
              <p className="text-bjj-textMuted">
                The highest quality competition footage, hand-picked and
                reviewed.
              </p>
            </div>
            <Link
              to="/videos?sort=rating"
              className="hidden sm:flex items-center gap-1 text-bjj-accent hover:text-bjj-accentHover font-medium transition-colors"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12 text-bjj-textMuted">Loading matches...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {topRatedVideos.map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  viewport={{
                    once: true,
                  }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1,
                  }}
                >
                  <VideoCard video={video} />
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-8 sm:hidden">
            <Link
              to="/videos?sort=rating"
              className="flex items-center justify-center gap-1 w-full bg-bjj-surface border border-bjj-border py-3 rounded-lg text-white hover:bg-bjj-surfaceHover transition-colors"
            >
              View All Top Rated <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-bjj-surface/30 border-t border-bjj-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-4xl text-white mb-2">
              BROWSE BY EVENT
            </h2>
            <p className="text-bjj-textMuted">
              Find legendary matches from specific tournaments and promotions.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {events.map((event, index) => (
              <motion.div
                key={event}
                initial={{
                  opacity: 0,
                  scale: 0.9,
                }}
                whileInView={{
                  opacity: 1,
                  scale: 1,
                }}
                viewport={{
                  once: true,
                }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.05,
                }}
              >
                <CategoryCard event={event} count={eventCounts[event]} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
