import React from 'react'
import { Wine, GlassWater } from 'lucide-react'

interface RatingBadgeProps {
  rating: number
  size?: 'sm' | 'md' | 'lg'
}

export function RatingBadge({ rating, size = 'md' }: RatingBadgeProps) {
  const isFineWine = rating >= 8

  const sizeConfig = {
    sm: { icon: 'w-4 h-4', text: 'text-sm', badge: 'px-2 py-1 gap-1.5' },
    md: { icon: 'w-5 h-5', text: 'text-base', badge: 'px-3 py-1.5 gap-2' },
    lg: { icon: 'w-6 h-6', text: 'text-xl', badge: 'px-4 py-2 gap-2.5' },
  }

  const config = sizeConfig[size]

  const Icon = isFineWine ? Wine : GlassWater

  return (
    <div
      className={`inline-flex items-center rounded-lg font-bold ${config.badge} ${
        isFineWine
          ? 'bg-bjj-accent/15 border border-bjj-accent/40 text-bjj-accent'
          : 'bg-white/5 border border-bjj-border text-bjj-textMuted'
      }`}
    >
      <Icon className={`${config.icon} ${isFineWine ? 'text-bjj-accent' : 'text-bjj-textMuted'}`} />
      <span className={`${config.text} font-heading tracking-wide`}>
        {rating.toFixed(1)}
      </span>
      <span className={`${size === 'sm' ? 'text-[10px]' : 'text-xs'} opacity-60`}>
        /10
      </span>
    </div>
  )
}
