import React from 'react'
import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { LibraryVideo } from '../data/library'

interface LibraryVideoCardProps {
  video: LibraryVideo
}

export function LibraryVideoCard({ video }: LibraryVideoCardProps) {
  const thumbnail = video.thumbnailUrl ||
    (video.youtubeId ? `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg` : null)

  return (
    <motion.a
      href={video.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-bjj-surface border border-bjj-border rounded-xl overflow-hidden group"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-bjj-bg overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-bjj-textMuted">
            <ExternalLink className="w-10 h-10" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-heading text-lg text-white mb-1 line-clamp-1">{video.title}</h3>
        {video.description && (
          <p className="text-bjj-textMuted text-sm line-clamp-2 mb-3">{video.description}</p>
        )}

        {video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {video.tags.map((tag) => (
              <span
                key={tag.id}
                className="text-xs bg-bjj-accent/10 text-bjj-accent border border-bjj-accent/20 rounded-full px-2 py-0.5"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.a>
  )
}
