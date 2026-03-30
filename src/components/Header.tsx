import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PlaySquare, Menu, X, LogIn, LogOut } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Catalog', path: '/videos' },
    ...(user ? [{ name: 'Add Match', path: '/add' }] : []),
  ]

  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false
    return location.pathname.startsWith(path)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 bg-bjj-bg/90 backdrop-blur-md border-b border-bjj-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-bjj-accent rounded flex items-center justify-center text-bjj-bg group-hover:bg-bjj-accentHover transition-colors">
              <PlaySquare className="w-5 h-5 fill-current" />
            </div>
            <span className="font-heading text-2xl tracking-wide pt-1">
              BJJ <span className="text-bjj-accent">SOMMELIER</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-bjj-accent ${isActive(link.path) ? 'text-bjj-accent' : 'text-bjj-textMuted'}`}
              >
                {link.name}
              </Link>
            ))}
            {user ? (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-sm font-medium text-bjj-textMuted hover:text-bjj-accent transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            ) : (
              <Link
                to="/login"
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-bjj-accent ${isActive('/login') ? 'text-bjj-accent' : 'text-bjj-textMuted'}`}
              >
                <LogIn className="w-4 h-4" />
                Admin
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-bjj-textMuted hover:text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="md:hidden bg-bjj-surface border-b border-bjj-border">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive(link.path) ? 'bg-bjj-accent/10 text-bjj-accent' : 'text-bjj-textMuted hover:bg-bjj-surfaceHover hover:text-white'}`}
              >
                {link.name}
              </Link>
            ))}
            {user ? (
              <button
                onClick={() => { handleSignOut(); setIsMenuOpen(false) }}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-bjj-textMuted hover:bg-bjj-surfaceHover hover:text-white"
              >
                Sign Out
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActive('/login') ? 'bg-bjj-accent/10 text-bjj-accent' : 'text-bjj-textMuted hover:bg-bjj-surfaceHover hover:text-white'}`}
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
