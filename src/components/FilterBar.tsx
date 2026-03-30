import React from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Event, Ruleset } from '../data/videos'
interface FilterBarProps {
  searchQuery: string
  setSearchQuery: (q: string) => void
  selectedEvent: Event | 'All'
  setSelectedEvent: (e: Event | 'All') => void
  selectedRuleset: Ruleset | 'All'
  setSelectedRuleset: (r: Ruleset | 'All') => void
  sortBy: 'newest' | 'rating'
  setSortBy: (s: 'newest' | 'rating') => void
}
const events: (Event | 'All')[] = [
  'All',
  'ADCC',
  'Worlds',
  'Pans',
  'Euros',
  'WNO',
  'CJI',
]
const rulesets: (Ruleset | 'All')[] = ['All', 'Gi', 'No-Gi']
export function FilterBar({
  searchQuery,
  setSearchQuery,
  selectedEvent,
  setSelectedEvent,
  selectedRuleset,
  setSelectedRuleset,
  sortBy,
  setSortBy,
}: FilterBarProps) {
  return (
    <div className="bg-bjj-surface border border-bjj-border rounded-xl p-4 space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-bjj-textMuted" />
          </div>
          <input
            type="text"
            placeholder="Search competitors, events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 border border-bjj-border rounded-lg bg-bjj-bg text-white placeholder-bjj-textMuted focus:outline-none focus:ring-2 focus:ring-bjj-accent focus:border-transparent transition-all"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="h-5 w-5 text-bjj-textMuted" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'rating')}
            className="block w-full py-2.5 pl-3 pr-10 border border-bjj-border rounded-lg bg-bjj-bg text-white focus:outline-none focus:ring-2 focus:ring-bjj-accent focus:border-transparent appearance-none cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between pt-4 border-t border-bjj-border">
        {/* Events */}
        <div className="flex flex-wrap gap-2">
          {events.map((evt) => (
            <button
              key={evt}
              onClick={() => setSelectedEvent(evt)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedEvent === evt ? 'bg-bjj-accent text-bjj-bg' : 'bg-bjj-bg border border-bjj-border text-bjj-textMuted hover:border-bjj-accent/50 hover:text-white'}`}
            >
              {evt}
            </button>
          ))}
        </div>

        {/* Ruleset */}
        <div className="flex flex-wrap gap-2">
          {rulesets.map((rule) => (
            <button
              key={rule}
              onClick={() => setSelectedRuleset(rule)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectedRuleset === rule ? 'bg-white/10 text-white border border-white/20' : 'bg-bjj-bg border border-bjj-border text-bjj-textMuted hover:border-white/30 hover:text-white'}`}
            >
              {rule}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
