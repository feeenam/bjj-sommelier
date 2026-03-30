import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { HomePage } from './pages/HomePage'
import { CatalogPage } from './pages/CatalogPage'
import { VideoDetailPage } from './pages/VideoDetailPage'
import { AddVideoPage } from './pages/AddVideoPage'
export function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-bjj-bg text-bjj-text font-body">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/videos" element={<CatalogPage />} />
            <Route path="/videos/:id" element={<VideoDetailPage />} />
            <Route path="/add" element={<AddVideoPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}
