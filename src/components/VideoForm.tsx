import React, { useState } from 'react'
import { Upload, Save, Check, AlertCircle } from 'lucide-react'
import { Event, MatchType, Ruleset } from '../data/videos'

const eventSuggestions = ['ADCC', 'Worlds', 'Pans', 'Euros', 'WNO', 'CJI']
const matchTypeSuggestions = ['Superfight', 'Final', 'Semi-Final', 'Quarter-Final', 'Round of 16', 'Absolute Final']
const rulesets: Ruleset[] = ['Gi', 'No-Gi']

export interface VideoFormData {
  title: string
  description: string
  source_url: string
  youtube_id: string
  event: Event
  year: number
  competitors: string
  weight_class: string
  match_type: MatchType
  ruleset: Ruleset
  result: string
  owner_rating: number
  owner_review: string
  thumbnail_url: string
  duration: string
}

interface VideoFormProps {
  initialData?: VideoFormData
  onSubmit: (data: VideoFormData) => Promise<{ error: string | null }>
  mode: 'add' | 'edit'
}

const defaultData: VideoFormData = {
  title: '',
  description: '',
  source_url: '',
  youtube_id: '',
  event: 'ADCC',
  year: new Date().getFullYear(),
  competitors: '',
  weight_class: '',
  match_type: 'Final',
  ruleset: 'No-Gi',
  result: '',
  owner_rating: 7.0,
  owner_review: '',
  thumbnail_url: '',
  duration: '',
}

export function VideoForm({ initialData, onSubmit, mode }: VideoFormProps) {
  const [form, setForm] = useState<VideoFormData>(initialData || defaultData)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function updateField(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const result = await onSubmit(form)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
    }
    setSubmitting(false)
  }

  const inputClass = 'w-full bg-bjj-bg border border-bjj-border rounded-lg px-4 py-3 text-white placeholder-bjj-textMuted/50 focus:outline-none focus:border-bjj-accent focus:ring-1 focus:ring-bjj-accent transition-colors'
  const labelClass = 'block text-sm font-medium text-bjj-textMuted mb-2'
  const selectClass = `${inputClass} appearance-none`

  return (
    <>
      {success && (
        <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-400" />
          <span className="text-green-400">
            {mode === 'add' ? 'Match added successfully!' : 'Match updated successfully!'} Redirecting...
          </span>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Match Info */}
        <div className="bg-bjj-surface border border-bjj-border rounded-xl p-6 space-y-6">
          <h2 className="font-heading text-2xl text-white border-b border-bjj-border pb-3">
            MATCH INFO
          </h2>

          <div>
            <label className={labelClass}>Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Gordon Ryan vs Felipe Pena"
              className={inputClass}
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Competitors</label>
            <input
              type="text"
              required
              placeholder="e.g. Gordon Ryan vs Felipe Pena"
              className={inputClass}
              value={form.competitors}
              onChange={(e) => updateField('competitors', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Event</label>
              <input
                type="text"
                required
                list="event-suggestions"
                placeholder="e.g. ADCC, Worlds, or custom"
                className={inputClass}
                value={form.event}
                onChange={(e) => updateField('event', e.target.value)}
              />
              <datalist id="event-suggestions">
                {eventSuggestions.map((ev) => (
                  <option key={ev} value={ev} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelClass}>Year</label>
              <input
                type="number"
                required
                min={1990}
                max={2030}
                className={inputClass}
                value={form.year}
                onChange={(e) => updateField('year', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Weight Class</label>
              <input
                type="text"
                required
                placeholder="e.g. -77kg"
                className={inputClass}
                value={form.weight_class}
                onChange={(e) => updateField('weight_class', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Match Type</label>
              <input
                type="text"
                required
                list="match-type-suggestions"
                placeholder="e.g. Final, or custom"
                className={inputClass}
                value={form.match_type}
                onChange={(e) => updateField('match_type', e.target.value)}
              />
              <datalist id="match-type-suggestions">
                {matchTypeSuggestions.map((mt) => (
                  <option key={mt} value={mt} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelClass}>Ruleset</label>
              <select
                className={selectClass}
                value={form.ruleset}
                onChange={(e) => updateField('ruleset', e.target.value)}
              >
                {rulesets.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Result</label>
              <input
                type="text"
                required
                placeholder="e.g. Submission (RNC)"
                className={inputClass}
                value={form.result}
                onChange={(e) => updateField('result', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Duration</label>
              <input
                type="text"
                required
                placeholder="e.g. 10:00"
                className={inputClass}
                value={form.duration}
                onChange={(e) => updateField('duration', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              required
              rows={3}
              placeholder="Brief description of the match..."
              className={inputClass}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
            />
          </div>
        </div>

        {/* Video */}
        <div className="bg-bjj-surface border border-bjj-border rounded-xl p-6 space-y-6">
          <h2 className="font-heading text-2xl text-white border-b border-bjj-border pb-3">
            VIDEO
          </h2>

          <div>
            <label className={labelClass}>Source URL</label>
            <input
              type="url"
              required
              placeholder="e.g. https://www.flograppling.com/... or https://www.youtube.com/watch?v=..."
              className={inputClass}
              value={form.source_url}
              onChange={(e) => updateField('source_url', e.target.value)}
            />
            <p className="text-xs text-bjj-textMuted mt-1">
              Link to the video page — its favicon will show on the card
            </p>
          </div>

          <div>
            <label className={labelClass}>YouTube Video ID (optional)</label>
            <input
              type="text"
              placeholder="e.g. dQw4w9WgXcQ — only if the video is on YouTube"
              className={inputClass}
              value={form.youtube_id}
              onChange={(e) => updateField('youtube_id', e.target.value)}
            />
            <p className="text-xs text-bjj-textMuted mt-1">
              If provided, the video will be embeddable in the app. Otherwise it links out to the source.
            </p>
          </div>

          <div>
            <label className={labelClass}>Thumbnail URL (optional)</label>
            <input
              type="text"
              placeholder="Leave blank to auto-generate from YouTube ID"
              className={inputClass}
              value={form.thumbnail_url}
              onChange={(e) => updateField('thumbnail_url', e.target.value)}
            />
          </div>
        </div>

        {/* Review */}
        <div className="bg-bjj-surface border border-bjj-border rounded-xl p-6 space-y-6">
          <h2 className="font-heading text-2xl text-white border-b border-bjj-border pb-3">
            YOUR REVIEW
          </h2>

          <div>
            <label className={labelClass}>Rating ({form.owner_rating.toFixed(1)})</label>
            <input
              type="range"
              min={1}
              max={10}
              step={0.1}
              className="w-full accent-bjj-accent"
              value={form.owner_rating}
              onChange={(e) => updateField('owner_rating', parseFloat(e.target.value))}
            />
            <div className="flex justify-between text-xs text-bjj-textMuted mt-1">
              <span>1.0</span>
              <span>10.0</span>
            </div>
          </div>

          <div>
            <label className={labelClass}>Review</label>
            <textarea
              required
              rows={4}
              placeholder="Your thoughts on this match..."
              className={inputClass}
              value={form.owner_review}
              onChange={(e) => updateField('owner_review', e.target.value)}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-bjj-accent hover:bg-bjj-accentHover disabled:opacity-50 disabled:cursor-not-allowed text-bjj-bg font-bold py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {mode === 'add' ? <Upload className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          {submitting
            ? (mode === 'add' ? 'ADDING MATCH...' : 'SAVING...')
            : (mode === 'add' ? 'ADD MATCH TO ARCHIVE' : 'SAVE CHANGES')
          }
        </button>
      </form>
    </>
  )
}
