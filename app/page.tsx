'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

interface RecentGenerate {
  id: string
  agencyName: string
  sourceUrl: string
  generatedAt: string
}

export default function HomePage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [linkedIn, setLinkedIn] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recents, setRecents] = useState<RecentGenerate[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('nesti-recents')
    if (stored) {
      try {
        setRecents(JSON.parse(stored))
      } catch {
        // ignore
      }
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    let parsedUrl = url.trim()
    if (!parsedUrl) return

    if (!parsedUrl.startsWith('http://') && !parsedUrl.startsWith('https://')) {
      parsedUrl = 'https://' + parsedUrl
    }

    try {
      new URL(parsedUrl)
    } catch {
      setError('Please enter a valid website URL.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: parsedUrl, linkedInUrl: linkedIn.trim() || null }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }

      // Save to recents
      const newRecent: RecentGenerate = {
        id: data.id,
        agencyName: data.agencyName,
        sourceUrl: parsedUrl,
        generatedAt: new Date().toISOString(),
      }
      const updated = [newRecent, ...recents.filter(r => r.sourceUrl !== parsedUrl)].slice(0, 8)
      setRecents(updated)
      localStorage.setItem('nesti-recents', JSON.stringify(updated))

      router.push(`/preview/${data.id}`)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-border bg-surface/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-h3 font-bold text-text tracking-tight">
            nesti
            <span className="text-primary">.</span>
          </span>
          <a
            href="https://www.nesti.io"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-small font-medium text-primary border border-primary/40 rounded-lg hover:bg-primary/5 transition-colors duration-150"
          >
            Visit nesti.io
          </a>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-subtle" />
              <span className="text-caption font-medium text-primary">AI-powered sales tool</span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-h1 font-semibold text-text text-center mb-3 leading-tight">
            Generate a personalised Nesti pitch for any estate agent
          </h1>
          <p className="text-body text-gray-60 text-center mb-10">
            Paste in an agent&apos;s website URL and we&apos;ll create a tailored landing page that shows exactly how Nesti can transform their call handling.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full">
            <div className="bg-surface border border-border rounded-xl shadow-soft p-4 flex flex-col gap-3">
              <div>
                <label htmlFor="url" className="block text-small font-medium text-text mb-1.5">
                  Agency website URL
                </label>
                <input
                  id="url"
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="e.g. www.smithandco.co.uk"
                  disabled={loading}
                  className="w-full px-3 py-2.5 border border-gray-30 rounded-lg bg-surface text-text
                    focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                    transition-all duration-150 placeholder:text-gray-50
                    disabled:opacity-50 disabled:cursor-not-allowed text-body"
                />
              </div>

              <div>
                <label htmlFor="linkedin" className="block text-small font-medium text-text mb-1.5">
                  Contact&apos;s LinkedIn URL
                  <span className="ml-1.5 text-caption font-normal text-gray-50">(optional — personalises copy with their name)</span>
                </label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-40" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/>
                  </svg>
                  <input
                    id="linkedin"
                    type="text"
                    value={linkedIn}
                    onChange={e => setLinkedIn(e.target.value)}
                    placeholder="e.g. linkedin.com/in/james-smith"
                    disabled={loading}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-30 rounded-lg bg-surface text-text
                      focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                      transition-all duration-150 placeholder:text-gray-50
                      disabled:opacity-50 disabled:cursor-not-allowed text-body"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-destructive text-small animate-slide-up">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="w-full px-4 py-2.5 bg-primary text-primary-contrast text-small font-semibold
                  rounded-lg shadow-sm hover:bg-primary-hover hover:shadow-md hover:-translate-y-px
                  active:bg-primary-active active:translate-y-0 transition-all duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analysing website &amp; generating pitch…
                  </>
                ) : (
                  <>
                    Generate Landing Page
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* How it works */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { step: '1', title: 'Paste URL', desc: 'Enter any UK estate agent website' },
              { step: '2', title: 'AI analyses', desc: 'We read their site and understand their business' },
              { step: '3', title: 'Get your pitch', desc: 'A personalised landing page ready to share' },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-caption font-semibold flex items-center justify-center mx-auto mb-2">
                  {item.step}
                </div>
                <p className="text-small font-medium text-text">{item.title}</p>
                <p className="text-caption text-gray-50 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent generates */}
        {recents.length > 0 && (
          <div className="w-full max-w-xl mt-12">
            <p className="text-caption font-medium text-gray-60 uppercase tracking-wider mb-3">
              Recent pages
            </p>
            <div className="flex flex-col gap-2">
              {recents.map(recent => (
                <a
                  key={recent.id}
                  href={`/preview/${recent.id}`}
                  className="flex items-center justify-between p-3 bg-surface border border-border rounded-xl hover:border-gray-40 hover:shadow-soft transition-all duration-150 group"
                >
                  <div>
                    <p className="text-small font-medium text-text group-hover:text-primary transition-colors">
                      {recent.agencyName}
                    </p>
                    <p className="text-caption text-gray-50 mt-0.5 truncate max-w-xs">
                      {recent.sourceUrl}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-40 group-hover:text-primary transition-colors flex-shrink-0 ml-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-caption text-gray-50">© {new Date().getFullYear()} Nesti. All rights reserved.</span>
          <a href="https://www.nesti.io" target="_blank" rel="noopener noreferrer" className="text-caption text-gray-50 hover:text-primary transition-colors">
            www.nesti.io
          </a>
        </div>
      </footer>
    </div>
  )
}
