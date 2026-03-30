import React from 'react'
import { Star, StarHalf } from 'lucide-react'
interface RatingBadgeProps {
  rating: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  showNumber?: boolean
}
export function RatingBadge({
  rating,
  maxRating = 5,
  size = 'md',
  showNumber = true,
}: RatingBadgeProps) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 !== 0
  const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0)
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }
  const iconClass = `${sizeClasses[size]} text-bjj-accent fill-bjj-accent`
  const emptyIconClass = `${sizeClasses[size]} text-bjj-border`
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className={iconClass} />
        ))}
        {hasHalfStar && <StarHalf className={iconClass} />}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className={emptyIconClass} />
        ))}
      </div>
      {showNumber && (
        <span
          className={`font-medium text-bjj-accent ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}`}
        >
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}
