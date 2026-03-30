import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, Award, Medal, Globe, Tv, Crown } from 'lucide-react'
import { Event } from '../data/videos'
interface CategoryCardProps {
  event: Event
  count: number
}
const eventIcons: Record<Event, React.ReactNode> = {
  ADCC: <Trophy className="w-8 h-8" />,
  Worlds: <Award className="w-8 h-8" />,
  Pans: <Medal className="w-8 h-8" />,
  Euros: <Globe className="w-8 h-8" />,
  WNO: <Tv className="w-8 h-8" />,
  CJI: <Crown className="w-8 h-8" />,
}
export function CategoryCard({ event, count }: CategoryCardProps) {
  return (
    <motion.div
      whileHover={{
        scale: 1.02,
      }}
      whileTap={{
        scale: 0.98,
      }}
    >
      <Link
        to={`/videos?event=${event}`}
        className="flex flex-col items-center justify-center p-6 bg-bjj-surface border border-bjj-border rounded-xl hover:border-bjj-accent/50 hover:bg-bjj-surfaceHover transition-all group"
      >
        <div className="w-16 h-16 rounded-full bg-bjj-bg flex items-center justify-center text-bjj-textMuted group-hover:text-bjj-accent group-hover:bg-bjj-accent/10 transition-colors mb-4">
          {eventIcons[event]}
        </div>
        <h3 className="font-heading text-2xl mb-1">{event}</h3>
        <span className="text-sm text-bjj-textMuted">{count} Matches</span>
      </Link>
    </motion.div>
  )
}
