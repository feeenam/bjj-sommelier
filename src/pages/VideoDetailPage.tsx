import React, { useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  Users,
  Calendar,
  ShieldCheck,
  Quote,
  Trophy,
  Scale,
  Swords,
  ExternalLink,
  Film,
  Pencil,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useVideo, useVideos } from '../data/videos'
import { useAuth } from '../lib/AuthContext'
import { RatingBadge } from '../components/RatingBadge'
import { VideoCard } from '../components/VideoCard'
const rulesetColors = {
  Gi: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'No-Gi': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}
export function VideoDetailPage() {
  const { id } = useParams<{
    id: string
  }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { video, loading } = useVideo(id)
  const { videos } = useVideos()

  // Scroll to top when ID changes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

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
        <h1 className="font-heading text-4xl text-white mb-4">
          MATCH NOT FOUND
        </h1>
        <p className="text-bjj-textMuted mb-8">
          The match you're looking for doesn't exist or has been removed.
        </p>
        <button
          onClick={() => navigate('/videos')}
          className="bg-bjj-accent text-bjj-bg font-bold px-6 py-3 rounded-lg hover:bg-bjj-accentHover transition-colors"
        >
          BACK TO ARCHIVE
        </button>
      </div>
    )
  }
  const relatedVideos = videos
    .filter(
      (v) =>
        v.id !== video.id &&
        (v.event === video.event ||
          v.competitors.includes(video.competitors.split(' vs ')[0])),
    )
    .slice(0, 4)
  return (
    <div className="min-h-screen bg-bjj-bg pb-20">
      {/* Top Navigation Bar */}
      <div className="border-b border-bjj-border bg-bjj-surface/50 backdrop-blur-sm sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <Link
            to="/videos"
            className="inline-flex items-center gap-2 text-sm font-medium text-bjj-textMuted hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Archive
          </Link>
          {user && (
            <Link
              to={`/videos/${video.id}/edit`}
              className="inline-flex items-center gap-2 text-sm font-medium bg-bjj-accent/10 border border-bjj-accent/30 text-bjj-accent px-4 py-2 rounded-lg hover:bg-bjj-accent/20 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit Match
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Video Player / Source Link */}
            {video.youtubeId ? (
              <div className="bg-black rounded-xl overflow-hidden shadow-2xl border border-bjj-border aspect-video relative">
                <iframe
                  src={`https://www.youtube.com/embed/${video.youtubeId}?rel=0`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full"
                ></iframe>
              </div>
            ) : (
              <a
                href={video.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-bjj-surface rounded-xl overflow-hidden shadow-2xl border border-bjj-border aspect-video relative group hover:border-bjj-accent/50 transition-colors"
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  {video.sourceUrl ? (
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${new URL(video.sourceUrl).hostname}&sz=64`}
                      alt=""
                      className="w-16 h-16 opacity-60 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <Film className="w-16 h-16 text-bjj-textMuted/40" />
                  )}
                  <div className="flex items-center gap-2 bg-bjj-accent/10 border border-bjj-accent/30 text-bjj-accent px-5 py-3 rounded-lg font-medium group-hover:bg-bjj-accent/20 transition-colors">
                    <ExternalLink className="w-5 h-5" />
                    Watch on {video.sourceUrl ? new URL(video.sourceUrl).hostname.replace('www.', '') : 'source'}
                  </div>
                </div>
              </a>
            )}

            {/* Video Info Header */}
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="bg-bjj-surface border border-bjj-border px-3 py-1 rounded text-xs font-medium uppercase tracking-wider text-white">
                  {video.event} {video.year}
                </span>
                <span
                  className={`text-xs uppercase tracking-wider font-bold px-3 py-1 rounded border ${rulesetColors[video.ruleset]}`}
                >
                  {video.ruleset}
                </span>
                <span className="bg-bjj-accent/10 text-bjj-accent border border-bjj-accent/20 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">
                  {video.matchType}
                </span>
              </div>

              <h1 className="font-heading text-4xl md:text-5xl text-white mb-4 leading-tight">
                {video.title}
              </h1>

              <div className="flex flex-wrap items-center gap-6 text-sm text-bjj-textMuted pb-6 border-b border-bjj-border">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="text-white font-medium">
                    {video.competitors}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{video.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Added{' '}
                    {new Date(video.dateAdded).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-heading text-2xl text-white mb-3">
                ABOUT THIS MATCH
              </h3>
              <p className="text-bjj-textMuted leading-relaxed text-lg">
                {video.description}
              </p>
            </div>
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-8">
            {/* Match Details Card */}
            <div className="bg-bjj-surface border border-bjj-border rounded-xl p-6">
              <h3 className="font-heading text-xl text-white mb-6 border-b border-bjj-border pb-3">
                MATCH DETAILS
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-bjj-textMuted">
                    <Trophy className="w-4 h-4" />
                    <span className="text-sm">Event</span>
                  </div>
                  <span className="text-white font-medium">
                    {video.event} {video.year}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-bjj-textMuted">
                    <Scale className="w-4 h-4" />
                    <span className="text-sm">Weight Class</span>
                  </div>
                  <span className="text-white font-medium">
                    {video.weightClass}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-bjj-textMuted">
                    <Swords className="w-4 h-4" />
                    <span className="text-sm">Result</span>
                  </div>
                  <span className="text-bjj-accent font-bold text-right max-w-[60%]">
                    {video.result}
                  </span>
                </div>
              </div>
            </div>

            {/* Owner Review Card */}
            <motion.div
              initial={{
                opacity: 0,
                x: 20,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                duration: 0.5,
                delay: 0.2,
              }}
              className="bg-gradient-to-br from-bjj-surface to-bjj-bg border border-bjj-accent/30 rounded-2xl p-6 relative overflow-hidden shadow-lg shadow-bjj-accent/5"
            >
              {/* Decorative background element */}
              <div className="absolute -top-10 -right-10 text-bjj-accent/5">
                <Quote className="w-40 h-40" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <ShieldCheck className="w-6 h-6 text-bjj-accent" />
                  <h3 className="font-heading text-2xl text-white tracking-wide">
                    CURATOR'S REVIEW
                  </h3>
                </div>

                <div className="mb-6">
                  <div className="text-sm text-bjj-textMuted mb-2 uppercase tracking-wider font-semibold">
                    Match Rating
                  </div>
                  <div className="bg-black/40 inline-flex px-4 py-2 rounded-lg border border-bjj-border">
                    <RatingBadge rating={video.ownerRating} size="lg" />
                  </div>
                </div>

                <div className="relative">
                  <Quote className="w-8 h-8 text-bjj-accent/20 absolute -top-2 -left-2" />
                  <p className="text-white/90 italic leading-relaxed relative z-10 pl-4 border-l-2 border-bjj-accent/50 py-1">
                    "{video.ownerReview}"
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-bjj-accent/20 flex items-center justify-center border border-bjj-accent/30">
                    <span className="font-heading text-xl text-bjj-accent pt-1">
                      BS
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      BJJ Sommelier
                    </div>
                    <div className="text-xs text-bjj-textMuted">
                      Verified Review
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Quick Stats/Tags */}
            <div className="bg-bjj-surface border border-bjj-border rounded-xl p-6">
              <h3 className="font-heading text-xl text-white mb-4">
                MATCH TAGS
              </h3>
              <div className="flex flex-wrap gap-2">
                {video.competitors.split(' vs ').map((name, i) => (
                  <span
                    key={i}
                    className="bg-bjj-bg border border-bjj-border text-bjj-textMuted px-3 py-1 rounded-full text-sm"
                  >
                    #{name.split(' ').pop()?.toLowerCase()}
                  </span>
                ))}
                <span className="bg-bjj-bg border border-bjj-border text-bjj-textMuted px-3 py-1 rounded-full text-sm">
                  #{video.event.toLowerCase()}
                  {video.year}
                </span>
                <span className="bg-bjj-bg border border-bjj-border text-bjj-textMuted px-3 py-1 rounded-full text-sm">
                  #{video.ruleset.toLowerCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Videos Section */}
        {relatedVideos.length > 0 && (
          <div className="mt-20 pt-12 border-t border-bjj-border">
            <h2 className="font-heading text-3xl text-white mb-8">
              SIMILAR MATCHES
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedVideos.map((relatedVideo, index) => (
                <motion.div
                  key={relatedVideo.id}
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
                    duration: 0.4,
                    delay: index * 0.1,
                  }}
                >
                  <VideoCard video={relatedVideo} />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
