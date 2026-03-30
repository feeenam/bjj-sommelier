import React from 'react'
import { Link } from 'react-router-dom'
import { PlaySquare, Instagram, Twitter, Youtube } from 'lucide-react'
export function Footer() {
  return (
    <footer className="bg-bjj-surface border-t border-bjj-border py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-6 h-6 bg-bjj-accent rounded flex items-center justify-center text-bjj-bg">
                <PlaySquare className="w-4 h-4 fill-current" />
              </div>
              <span className="font-heading text-xl tracking-wide pt-1">
                BJJ <span className="text-bjj-accent">SOMMELIER</span>
              </span>
            </Link>
            <p className="text-bjj-textMuted text-sm text-center md:text-left max-w-xs">
              Curated Brazilian Jiu-Jitsu competition matches, reviewed and rated
              like fine wine.
            </p>
          </div>

          <div className="flex gap-4">
            <a
              href="#"
              className="w-10 h-10 rounded-full bg-bjj-bg flex items-center justify-center text-bjj-textMuted hover:text-bjj-accent hover:bg-bjj-accent/10 transition-all"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="w-10 h-10 rounded-full bg-bjj-bg flex items-center justify-center text-bjj-textMuted hover:text-bjj-accent hover:bg-bjj-accent/10 transition-all"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="w-10 h-10 rounded-full bg-bjj-bg flex items-center justify-center text-bjj-textMuted hover:text-bjj-accent hover:bg-bjj-accent/10 transition-all"
            >
              <Youtube className="w-5 h-5" />
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-bjj-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-bjj-textMuted">
          <p>
            &copy; {new Date().getFullYear()} BJJ Sommelier. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
