import React, { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { Tag } from '../data/library'

interface TagInputProps {
  selectedTags: Tag[]
  onTagsChange: (tags: Tag[]) => void
  allTags: Tag[]
  onCreateTag: (name: string) => Promise<Tag>
}

export function TagInput({ selectedTags, onTagsChange, allTags, onCreateTag }: TagInputProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selectedIds = new Set(selectedTags.map((t) => t.id))
  const normalized = query.trim().toLowerCase()

  const suggestions = allTags.filter(
    (t) => !selectedIds.has(t.id) && t.name.includes(normalized),
  )

  const exactMatch = allTags.some((t) => t.name === normalized)
  const showCreate = normalized.length > 0 && !exactMatch

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function addTag(tag: Tag) {
    onTagsChange([...selectedTags, tag])
    setQuery('')
    setOpen(false)
  }

  function removeTag(id: string) {
    onTagsChange(selectedTags.filter((t) => t.id !== id))
  }

  async function handleCreate() {
    if (!normalized || creating) return
    setCreating(true)
    try {
      const tag = await onCreateTag(normalized)
      addTag(tag)
    } finally {
      setCreating(false)
    }
  }

  async function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestions.length > 0 && !showCreate) {
        addTag(suggestions[0])
      } else if (showCreate) {
        await handleCreate()
      }
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search or create tags..."
        className="w-full bg-bjj-bg border border-bjj-border rounded-lg px-4 py-2.5 text-white placeholder:text-bjj-textMuted/50 focus:outline-none focus:border-bjj-accent/50 transition-colors"
      />

      {open && (suggestions.length > 0 || showCreate) && (
        <div className="absolute z-20 mt-1 w-full bg-bjj-surface border border-bjj-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((tag) => (
            <button
              key={tag.id}
              onClick={() => addTag(tag)}
              className="w-full text-left px-4 py-2 text-sm text-bjj-text hover:bg-bjj-surfaceHover transition-colors"
            >
              {tag.name}
            </button>
          ))}
          {showCreate && (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full text-left px-4 py-2 text-sm text-bjj-accent hover:bg-bjj-surfaceHover transition-colors"
            >
              {creating ? 'Creating...' : `Create "${normalized}"`}
            </button>
          )}
        </div>
      )}

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1.5 bg-bjj-accent/10 text-bjj-accent border border-bjj-accent/20 rounded-full px-3 py-1 text-sm"
            >
              {tag.name}
              <button
                onClick={() => removeTag(tag.id)}
                className="hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
