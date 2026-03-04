'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentGenerate {
  id: string
  agencyName: string
  sourceUrl: string
  generatedAt: string
}

interface BatchRow {
  url: string
  firstName: string | null
}

type BatchStatus = 'pending' | 'processing' | 'done' | 'failed'

interface BatchResult {
  url: string
  firstName: string | null
  agencyName: string
  id: string | null
  status: BatchStatus
  error?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCSV(text: string): BatchRow[] {
  const lines = text.trim().split('\n')
  const start = lines[0]?.toLowerCase().includes('url') ? 1 : 0
  return lines.slice(start).map(line => {
    const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''))
    const url = parts[0] || ''
    const firstName = parts[1] ? parts[1].trim() : null
    return { url, firstName: firstName || null }
  }).filter(r => r.url && r.url.length > 3)
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single')

  // Single form state
  const [url, setUrl] = useState('')
  const [contactFirstName, setContactFirstName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recents, setRecents] = useState<RecentGenerate[]>([])

  // Batch state
  const [batchRows, setBatchRows] = useState<BatchRow[]>([])
  const [batchResults, setBatchResults] = useState<BatchResult[]>([])
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchIndex, setBatchIndex] = useState(0)
  const stopRef = useRef(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nesti-recents')
      if (stored) setRecents(JSON.parse(stored))
    } catch { /* ignore */ }
    try {
      const stored = localStorage.getItem('nesti-batch-results')
      if (stored) setBatchResults(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  // ─── Single generation ─────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    let parsedUrl = url.trim()
    if (!parsedUrl) return
    if (!parsedUrl.startsWith('http://') && !parsedUrl.startsWith('https://')) parsedUrl = 'https://' + parsedUrl
    try { new URL(parsedUrl) } catch { setError('Please enter a valid website URL.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: parsedUrl, contactFirstName: contactFirstName.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong. Please try again.'); return }

      const newRecent: RecentGenerate = { id: data.id, agencyName: data.agencyName, sourceUrl: parsedUrl, generatedAt: new Date().toISOString() }
      const updated = [newRecent, ...recents.filter(r => r.sourceUrl !== parsedUrl)].slice(0, 8)
      setRecents(updated)
      localStorage.setItem('nesti-recents', JSON.stringify(updated))
      router.push(`/preview/${data.id}?edit`)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Batch generation ──────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = evt => {
      const text = evt.target?.result as string
      const rows = parseCSV(text)
      setBatchRows(rows)
      setBatchResults([])
    }
    reader.readAsText(file)
  }

  async function runBatch() {
    if (!batchRows.length || batchRunning) return
    stopRef.current = false
    setBatchRunning(true)
    setBatchIndex(0)

    const results: BatchResult[] = batchRows.map(r => ({ ...r, agencyName: '', id: null, status: 'pending' as BatchStatus }))
    setBatchResults([...results])

    for (let i = 0; i < batchRows.length; i++) {
      if (stopRef.current) {
        results[i] = { ...results[i], status: 'failed', error: 'Stopped by user' }
        setBatchResults([...results])
        break
      }
      setBatchIndex(i)
      results[i] = { ...results[i], status: 'processing' }
      setBatchResults([...results])

      let parsedUrl = batchRows[i].url.trim()
      if (!parsedUrl.startsWith('http://') && !parsedUrl.startsWith('https://')) parsedUrl = 'https://' + parsedUrl

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: parsedUrl, contactFirstName: batchRows[i].firstName }),
        })
        const data = await res.json()
        if (!res.ok) {
          results[i] = { ...results[i], status: 'failed', error: data.error || 'Generation failed' }
        } else {
          results[i] = { ...results[i], agencyName: data.agencyName, id: data.id, status: 'done' }
        }
      } catch (err) {
        results[i] = { ...results[i], status: 'failed', error: err instanceof Error ? err.message : 'Network error' }
      }

      setBatchResults([...results])
    }

    const allResults = [...results, ...batchResults].slice(0, 100)
    localStorage.setItem('nesti-batch-results', JSON.stringify(allResults))
    setBatchRunning(false)
  }

  function downloadBatchResults() {
    const header = 'id,agencyName,sourceUrl,previewUrl,status\n'
    const rows = batchResults.map(r =>
      `"${r.id || ''}","${r.agencyName || ''}","${r.url}","${r.id ? `${window.location.origin}/preview/${r.id}` : ''}","${r.status}"`
    ).join('\n')
    downloadCSV(header + rows, 'nesti-batch-results.csv')
  }

  function downloadTemplate() {
    downloadCSV(
      'website_url,contact_first_name\nhttps://www.example-agent.co.uk,James\nhttps://www.anotheragent.co.uk,\n',
      'nesti-batch-template.csv'
    )
  }

  async function copyLink(id: string) {
    try { await navigator.clipboard.writeText(`${window.location.origin}/preview/${id}`) } catch { /* ignore */ }
  }

  const doneCount = batchResults.filter(r => r.status === 'done').length
  const failedCount = batchResults.filter(r => r.status === 'failed').length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-border bg-surface/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-h3 font-bold text-text tracking-tight">nesti<span className="text-primary">.</span></span>
          <a href="https://www.nesti.io" target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 text-small font-medium text-primary border border-primary/40 rounded-lg hover:bg-primary/5 transition-colors duration-150">
            Visit nesti.io
          </a>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-subtle" />
              <span className="text-caption font-medium text-primary">AI-powered sales tool</span>
            </div>
          </div>
          <h1 className="text-h1 font-semibold text-text text-center mb-3 leading-tight">
            Generate personalised Nesti pitches for any estate agent
          </h1>
          <p className="text-body text-gray-60 text-center mb-8">
            Paste a website URL or upload a CSV list — Nesti generates a tailored landing page for every agency.
          </p>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-gray-10 border border-border rounded-xl mb-6 w-fit mx-auto">
            <button onClick={() => setActiveTab('single')}
              className={`px-5 py-2 text-small font-medium rounded-lg transition-all duration-150 ${activeTab === 'single' ? 'bg-surface shadow-soft text-text' : 'text-gray-60 hover:text-text'}`}>
              Single page
            </button>
            <button onClick={() => setActiveTab('batch')}
              className={`px-5 py-2 text-small font-medium rounded-lg transition-all duration-150 ${activeTab === 'batch' ? 'bg-surface shadow-soft text-text' : 'text-gray-60 hover:text-text'}`}>
              Batch CSV
            </button>
          </div>

          {/* ─── SINGLE TAB ─── */}
          {activeTab === 'single' && (
            <>
              <form onSubmit={handleSubmit} className="w-full">
                <div className="bg-surface border border-border rounded-xl shadow-soft p-4 flex flex-col gap-3">
                  <div>
                    <label htmlFor="url" className="block text-small font-medium text-text mb-1.5">Agency website URL</label>
                    <input id="url" type="text" value={url} onChange={e => setUrl(e.target.value)}
                      placeholder="e.g. www.smithandco.co.uk" disabled={loading}
                      className="w-full px-3 py-2.5 border border-gray-30 rounded-lg bg-surface text-text
                        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                        transition-all duration-150 placeholder:text-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-body" />
                  </div>
                  <div>
                    <label htmlFor="contactFirstName" className="block text-small font-medium text-text mb-1.5">
                      Contact&apos;s first name
                      <span className="ml-1.5 text-caption font-normal text-gray-50">(optional — personalises the copy directly to them)</span>
                    </label>
                    <input id="contactFirstName" type="text" value={contactFirstName} onChange={e => setContactFirstName(e.target.value)}
                      placeholder="e.g. James" disabled={loading}
                      className="w-full px-3 py-2.5 border border-gray-30 rounded-lg bg-surface text-text
                        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                        transition-all duration-150 placeholder:text-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-body" />
                  </div>
                  {error && (
                    <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-destructive text-small animate-slide-up">{error}</div>
                  )}
                  <button type="submit" disabled={loading || !url.trim()}
                    className="w-full px-4 py-2.5 bg-primary text-primary-contrast text-small font-semibold
                      rounded-lg shadow-sm hover:bg-primary-hover hover:shadow-md hover:-translate-y-px
                      active:bg-primary-active active:translate-y-0 transition-all duration-150
                      disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
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
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-caption font-semibold flex items-center justify-center mx-auto mb-2">{item.step}</div>
                    <p className="text-small font-medium text-text">{item.title}</p>
                    <p className="text-caption text-gray-50 mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Recent generates */}
              {recents.length > 0 && (
                <div className="mt-10">
                  <p className="text-caption font-medium text-gray-60 uppercase tracking-wider mb-3">Recent pages</p>
                  <div className="flex flex-col gap-2">
                    {recents.map(recent => (
                      <a key={recent.id} href={`/preview/${recent.id}?edit`}
                        className="flex items-center justify-between p-3 bg-surface border border-border rounded-xl hover:border-gray-40 hover:shadow-soft transition-all duration-150 group">
                        <div>
                          <p className="text-small font-medium text-text group-hover:text-primary transition-colors">{recent.agencyName}</p>
                          <p className="text-caption text-gray-50 mt-0.5 truncate max-w-xs">{recent.sourceUrl}</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-40 group-hover:text-primary transition-colors flex-shrink-0 ml-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── BATCH TAB ─── */}
          {activeTab === 'batch' && (
            <div className="flex flex-col gap-5">
              {/* Upload */}
              <div className="bg-surface border border-border rounded-xl shadow-soft p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-small font-semibold text-text">1. Upload your CSV</h2>
                  <button onClick={downloadTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-caption font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download template
                  </button>
                </div>
                <p className="text-caption text-gray-50 mb-3">
                  Two columns: <code className="bg-gray-10 px-1 py-0.5 rounded text-text font-mono">website_url</code> and <code className="bg-gray-10 px-1 py-0.5 rounded text-text font-mono">contact_first_name</code> (optional)
                </p>
                <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/40 hover:bg-gray-10 transition-all duration-150">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-gray-40">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                  {batchRows.length > 0 ? (
                    <div className="text-center">
                      <p className="text-small font-semibold text-text">{batchRows.length} {batchRows.length === 1 ? 'row' : 'rows'} loaded</p>
                      <p className="text-caption text-gray-50">Click to upload a different file</p>
                    </div>
                  ) : (
                    <p className="text-small text-gray-50 text-center">Click to upload a .csv file</p>
                  )}
                  <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="sr-only" />
                </label>
              </div>

              {/* Preview table */}
              {batchRows.length > 0 && (
                <div className="bg-surface border border-border rounded-xl shadow-soft overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <h2 className="text-small font-semibold text-text">2. Preview — {batchRows.length} {batchRows.length === 1 ? 'agency' : 'agencies'}</h2>
                    {batchRows.length > 20 && (
                      <span className="text-caption text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        ~{Math.ceil(batchRows.length * 10 / 60)} min estimated
                      </span>
                    )}
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-10 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-2 text-caption font-medium text-gray-60 w-8">#</th>
                          <th className="text-left px-4 py-2 text-caption font-medium text-gray-60">Website URL</th>
                          <th className="text-left px-4 py-2 text-caption font-medium text-gray-60 w-28">First name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchRows.map((row, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-4 py-2 text-caption text-gray-40">{i + 1}</td>
                            <td className="px-4 py-2 text-caption text-text truncate max-w-[300px]">{row.url}</td>
                            <td className="px-4 py-2 text-caption text-gray-60">{row.firstName || <span className="text-gray-40 italic">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Generate button */}
              {batchRows.length > 0 && (
                <div className="flex gap-3">
                  <button onClick={runBatch} disabled={batchRunning}
                    className="flex-1 px-4 py-3 bg-primary text-primary-contrast text-small font-semibold rounded-lg shadow-sm
                      hover:bg-primary-hover hover:shadow-md hover:-translate-y-px active:bg-primary-active active:translate-y-0
                      transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                      flex items-center justify-center gap-2">
                    {batchRunning ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                        Generating {batchIndex + 1} of {batchRows.length}…
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        Generate all {batchRows.length} pages
                      </>
                    )}
                  </button>
                  {batchRunning && (
                    <button onClick={() => { stopRef.current = true }}
                      className="px-4 py-3 text-small font-medium text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/5 transition-colors">
                      Stop
                    </button>
                  )}
                </div>
              )}

              {/* Progress bar */}
              {batchRunning && (
                <div>
                  <div className="flex items-center justify-between text-caption text-gray-50 mb-1.5">
                    <span>Progress</span>
                    <span>{batchIndex + 1} / {batchRows.length}</span>
                  </div>
                  <div className="w-full bg-gray-20 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((batchIndex + 1) / batchRows.length) * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Results */}
              {batchResults.length > 0 && (
                <div className="bg-surface border border-border rounded-xl shadow-soft overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-small font-semibold text-text">Results</h2>
                      {doneCount > 0 && <span className="text-caption font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">{doneCount} done</span>}
                      {failedCount > 0 && <span className="text-caption font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">{failedCount} failed</span>}
                    </div>
                    {doneCount > 0 && (
                      <button onClick={downloadBatchResults}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-caption font-medium text-gray-60 border border-border rounded-lg hover:bg-gray-10 transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Download CSV
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-border">
                    {batchResults.map((result, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          result.status === 'done' ? 'bg-green-100 text-green-600'
                          : result.status === 'failed' ? 'bg-red-100 text-red-600'
                          : result.status === 'processing' ? 'bg-primary/10 text-primary'
                          : 'bg-gray-10 text-gray-40'
                        }`}>
                          {result.status === 'done' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                          {result.status === 'failed' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                          {result.status === 'processing' && <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                          {result.status === 'pending' && <span className="w-1.5 h-1.5 bg-gray-40 rounded-full block" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-small font-medium text-text truncate">{result.agencyName || result.url}</p>
                          {result.error && <p className="text-caption text-destructive truncate">{result.error}</p>}
                          {!result.error && <p className="text-caption text-gray-50 truncate">{result.url}</p>}
                        </div>
                        {result.status === 'done' && result.id && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => copyLink(result.id!)} title="Copy link"
                              className="p-1.5 text-gray-40 hover:text-primary border border-transparent hover:border-border rounded-lg transition-all">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                            </button>
                            <a href={`/preview/${result.id}?edit`} target="_blank" rel="noopener noreferrer" title="Open page"
                              className="p-1.5 text-gray-40 hover:text-primary border border-transparent hover:border-border rounded-lg transition-all">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-caption text-gray-50">© {new Date().getFullYear()} Nesti. All rights reserved.</span>
          <a href="https://www.nesti.io" target="_blank" rel="noopener noreferrer" className="text-caption text-gray-50 hover:text-primary transition-colors">www.nesti.io</a>
        </div>
      </footer>
    </div>
  )
}
