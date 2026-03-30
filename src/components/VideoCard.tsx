import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Clock, Users, Film } from 'lucide-react'
import { motion } from 'framer-motion'
import { Video } from '../data/videos'
import { RatingBadge } from './RatingBadge'
interface VideoCardProps {
  video: Video
}
const rulesetColors = {
  Gi: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'No-Gi': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}
export function VideoCard({ video }: VideoCardProps) {
  const [imgError, setImgError] = useState(!video.thumbnailUrl)

  let sourceDomain: string | null = null
  try {
    if (video.sourceUrl) sourceDomain = new URL(video.sourceUrl).hostname
  } catch {}

  return (
    <motion.div
      whileHover={{
        y: -4,
      }}
      transition={{
        duration: 0.2,
      }}
      className="group flex flex-col bg-bjj-surface border border-bjj-border rounded-xl overflow-hidden h-full"
    >
      <Link
        to={`/videos/${video.id}`}
        className="relative aspect-video overflow-hidden block"
      >
        {imgError ? (
          <div className="w-full h-full bg-gradient-to-br from-bjj-surface to-bjj-bg flex flex-col items-center justify-center gap-3">
            {sourceDomain ? (
              <img
                src={`https://www.google.com/s2/favicons?domain=${sourceDomain}&sz=64`}
                alt={sourceDomain}
                className="w-10 h-10 opacity-60"
              />
            ) : (
              <Film className="w-10 h-10 text-bjj-textMuted/40" />
            )}
            <span className="text-bjj-textMuted/60 text-xs font-medium uppercase tracking-wider">
              {video.event} {video.year}
            </span>
          </div>
        ) : (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-bjj-accent flex items-center justify-center text-bjj-bg transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 ml-1 fill-current" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {video.duration}
        </div>
        <div className="absolute top-2 left-2 flex gap-2 items-center">
          <span className="bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium uppercase tracking-wider border border-white/10">
            {video.event} {video.year}
          </span>
        </div>
        {sourceDomain && (
          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm p-1.5 rounded border border-white/10">
            <img
              src={`https://www.google.com/s2/favicons?domain=${sourceDomain}&sz=16`}
              alt={sourceDomain}
              className="w-4 h-4"
            />
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2 gap-2">
          <Link
            to={`/videos/${video.id}`}
            className="hover:text-bjj-accent transition-colors"
          >
            <h3 className="font-heading text-xl leading-tight line-clamp-2">
              {video.title}
            </h3>
          </Link>
        </div>

        <div className="flex items-center gap-2 text-sm text-bjj-textMuted mb-3">
          <Users className="w-4 h-4 shrink-0" />
          <span className="truncate">{video.competitors}</span>
        </div>

        <div className="mt-auto pt-4 border-t border-bjj-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/80 bg-white/5 px-2 py-1 rounded truncate max-w-[60%]">
              {video.result}
            </span>
            <span
              className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border ${rulesetColors[video.ruleset]}`}
            >
              {video.ruleset}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <RatingBadge rating={video.ownerRating} size="sm" />
            <span className="text-xs text-bjj-textMuted">
              {video.matchType}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
