import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Collection } from '../data/library'

interface CollectionPickerProps {
  value: string | null
  onChange: (id: string | null) => void
  collections: Collection[]
  onCreateCollection: (name: string) => Promise<Collection>
}

export function CollectionPicker({ value, onChange, collections, onCreateCollection }: CollectionPickerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    const trimmed = newName.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      const col = await onCreateCollection(trimmed)
      onChange(col.id)
      setIsCreating(false)
      setNewName('')
    } finally {
      setSaving(false)
    }
  }

  if (isCreating) {
    return (
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate() } }}
          placeholder="Collection name..."
          autoFocus
          className="flex-1 bg-bjj-bg border border-bjj-border rounded-lg px-4 py-2.5 text-white placeholder:text-bjj-textMuted/50 focus:outline-none focus:border-bjj-accent/50 transition-colors"
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim() || saving}
          className="px-4 py-2.5 bg-bjj-accent text-bjj-bg rounded-lg font-medium text-sm hover:bg-bjj-accentHover disabled:opacity-50 transition-colors"
        >
          {saving ? '...' : 'Create'}
        </button>
        <button
          onClick={() => { setIsCreating(false); setNewName('') }}
          className="p-2.5 border border-bjj-border rounded-lg text-bjj-textMuted hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="flex-1 bg-bjj-bg border border-bjj-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-bjj-accent/50 transition-colors"
      >
        <option value="">No collection</option>
        {collections.map((col) => (
          <option key={col.id} value={col.id}>
            {col.name}
          </option>
        ))}
      </select>
      <button
        onClick={() => setIsCreating(true)}
        className="flex items-center gap-1.5 px-4 py-2.5 border border-bjj-border rounded-lg text-bjj-textMuted hover:text-bjj-accent hover:border-bjj-accent/50 text-sm font-medium transition-colors"
      >
        <Plus className="w-4 h-4" />
        New
      </button>
    </div>
  )
}
