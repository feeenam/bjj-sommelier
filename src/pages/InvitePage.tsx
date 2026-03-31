import React, { useState } from 'react'
import { Send, Check, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function InvitePage() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError(null)
    setSuccess(null)

    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ email }),
    })

    const result = await res.json()

    if (!res.ok) {
      setError(result.error || 'Failed to send invite')
    } else {
      setSuccess(`Invite sent to ${result.email}`)
      setEmail('')
    }
    setSending(false)
  }

  const inputClass = 'w-full bg-bjj-bg border border-bjj-border rounded-lg px-4 py-3 text-white placeholder-bjj-textMuted/50 focus:outline-none focus:border-bjj-accent focus:ring-1 focus:ring-bjj-accent transition-colors'

  return (
    <div className="min-h-screen bg-bjj-bg py-12">
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-heading text-5xl text-white mb-4">INVITE USER</h1>
          <p className="text-bjj-textMuted text-lg">
            Send an invite email to give someone admin access to the archive.
          </p>
        </div>

        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400" />
            <span className="text-green-400">{success}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-bjj-surface border border-bjj-border rounded-xl p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-bjj-textMuted mb-2">Email address</label>
            <input
              type="email"
              required
              placeholder="friend@example.com"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-bjj-textMuted mt-2">
              They'll receive an email with a link to set their password and access the app.
            </p>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full bg-bjj-accent hover:bg-bjj-accentHover disabled:opacity-50 text-bjj-bg font-bold py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            {sending ? 'SENDING...' : 'SEND INVITE'}
          </button>
        </form>
      </div>
    </div>
  )
}
