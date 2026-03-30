import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, LogIn } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/add')
    }
  }

  const inputClass = 'w-full bg-bjj-bg border border-bjj-border rounded-lg px-4 py-3 text-white placeholder-bjj-textMuted/50 focus:outline-none focus:border-bjj-accent focus:ring-1 focus:ring-bjj-accent transition-colors'

  return (
    <div className="min-h-screen bg-bjj-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-5xl text-white mb-2">ADMIN LOGIN</h1>
          <p className="text-bjj-textMuted">Sign in to manage the archive</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="text-red-400">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-bjj-surface border border-bjj-border rounded-xl p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-bjj-textMuted mb-2">Email</label>
            <input
              type="email"
              required
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-bjj-textMuted mb-2">Password</label>
            <input
              type="password"
              required
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-bjj-accent hover:bg-bjj-accentHover disabled:opacity-50 text-bjj-bg font-bold py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>
      </div>
    </div>
  )
}
