import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { HomePage } from './pages/HomePage'
import { CatalogPage } from './pages/CatalogPage'
import { VideoDetailPage } from './pages/VideoDetailPage'
import { AddVideoPage } from './pages/AddVideoPage'
import { EditVideoPage } from './pages/EditVideoPage'
import { LoginPage } from './pages/LoginPage'
import { AuthProvider, useAuth } from './lib/AuthContext'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-bjj-bg flex items-center justify-center text-bjj-textMuted">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="flex flex-col min-h-screen bg-bjj-bg text-bjj-text font-body">
          <Header />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/videos" element={<CatalogPage />} />
              <Route path="/videos/:id" element={<VideoDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/add" element={<ProtectedRoute><AddVideoPage /></ProtectedRoute>} />
              <Route path="/videos/:id/edit" element={<ProtectedRoute><EditVideoPage /></ProtectedRoute>} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  )
}
