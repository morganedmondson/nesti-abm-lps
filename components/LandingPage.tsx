'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LandingPageData {
  agencyName: string
  agencyLocation: string
  agencySpecialty: string
  agencyLogoUrl: string | null
  contactName: string | null
  contactFirstName: string | null
  heroHeadline: string
  heroSubheadline: string
  painPoints: Array<{ headline: string; description: string }>
  howItWorks: Array<{ step: string; title: string; description: string }>
  features: Array<{ icon: string; title: string; description: string }>
  testimonial: { quote: string; author: string; company: string }
  ctaHeadline: string
  ctaDescription: string
  ctaUrl: string
  sourceUrl: string
  generatedAt: string
}

type SectionId =
  | 'painPoints'
  | 'howItWorks'
  | 'features'
  | 'integrations'
  | 'stats'
  | 'voices'
  | 'testimonial'
  | 'slides'
  | 'calendly'

const DEFAULT_ORDER: SectionId[] = [
  'painPoints',
  'howItWorks',
  'features',
  'integrations',
  'stats',
  'voices',
  'testimonial',
  'slides',
  'calendly',
]

const SECTION_LABELS: Record<SectionId, string> = {
  painPoints: 'Pain Points',
  howItWorks: 'How It Works',
  features: 'Features',
  integrations: 'CRM Integrations',
  stats: 'Stats',
  voices: 'Voice Examples',
  testimonial: 'Testimonial',
  slides: 'Presentation',
  calendly: 'Book a Demo',
}

// ─── Brand assets ─────────────────────────────────────────────────────────────

const NESTI_LOGO_URL = 'https://framerusercontent.com/images/JzFfiaQX72q1RYQhXynCAACR8cY.png'
const NESTI_MARK_URL = 'https://framerusercontent.com/images/ionFD7qGUhxkIz0wKQgEItnCSU.png'

// ─── Client logos ─────────────────────────────────────────────────────────────

const CLIENT_LOGOS: { name: string; logoUrl: string }[] = [
  { name: 'Fine & Country', logoUrl: 'https://devvlsnxxkrq9.cloudfront.net/prod/assets/logos/fc-logo.png' },
  { name: 'Persimmon Homes', logoUrl: 'https://www.persimmonhomes.com/media/os0ly03c/persimmon-logo-2022.png' },
  { name: 'Richard James', logoUrl: 'https://richardjames.uk/wp-content/uploads/2020/10/RJ-Logo-Blue.png' },
  { name: 'The Letting Station', logoUrl: 'https://thelettingstation.co.uk/assets/uploads/1622788844_Letting-Station-Logo.png' },
]

function ClientLogo({ name, logoUrl }: { name: string; logoUrl: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span className="text-small font-medium text-gray-40">{name}</span>
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={name}
      className="h-7 max-w-[110px] object-contain grayscale opacity-70 mix-blend-multiply"
      onError={() => setFailed(true)}
    />
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlidesEmbedUrl(raw: string): string {
  const match = raw.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) return raw
  return `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=5000&rm=minimal`
}

function toCalendlyEmbedUrl(raw: string): string {
  const base = raw.split('?')[0].replace(/\/$/, '')
  return `${base}?embed_domain=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}&embed_type=Inline&hide_gdpr_banner=1`
}

function toDriveEmbedUrl(raw: string): string {
  // Supports: /file/d/FILE_ID/view  OR  ?id=FILE_ID
  const byPath = raw.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (byPath) return `https://drive.google.com/file/d/${byPath[1]}/preview`
  const byParam = raw.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (byParam) return `https://drive.google.com/file/d/${byParam[1]}/preview`
  return raw
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const icons: Record<string, React.ReactNode> = {
  phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.17 19.79 19.79 0 01.07 .49 2 2 0 012.03 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
  star: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  zap: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  link: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  'arrow-right': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  quote: <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>,
  grip: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/></svg>,
  slides: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  pencil: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  eye: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  upload: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>,
  copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  'external-link': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  mic: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  video: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
}

function Icon({ name }: { name: string }) {
  return <>{icons[name] ?? icons.phone}</>
}

// ─── Inline editable field ────────────────────────────────────────────────────

function EditableField({ value, onSave, editMode }: { value: string; onSave: (v: string) => void; editMode: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.textContent = value
  }, [editMode, value])

  if (!editMode) return <>{value}</>

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onBlur={e => {
        const text = (e.currentTarget.textContent || '').trim()
        if (text && text !== value) onSave(text)
        else if (ref.current) ref.current.textContent = value
      }}
      className="cursor-text rounded-sm outline-dashed outline-2 outline-primary/40
        hover:outline-primary/60 focus:outline-primary focus:bg-primary/5
        px-0.5 -mx-0.5 transition-all duration-100"
    />
  )
}

// ─── Agency logo ──────────────────────────────────────────────────────────────

function AgencyLogo({ logoUrl, agencyName, className = '' }: { logoUrl: string | null; agencyName: string; className?: string }) {
  if (!logoUrl) {
    const initials = agencyName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    return <div className={`bg-gray-20 border border-border rounded-lg flex items-center justify-center text-h3 font-bold text-gray-60 ${className}`}>{initials}</div>
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt={`${agencyName} logo`} className={`object-contain ${className}`}
      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
  )
}

// ─── Sortable section wrapper ─────────────────────────────────────────────────

function SortableSection({ id, label, children, editMode, onDelete }: {
  id: string; label: string; children: React.ReactNode; editMode: boolean; onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className={`relative group ${isDragging ? 'opacity-40 z-50' : ''}`}>
      <div {...attributes} {...listeners} title={`Drag to reorder "${label}"`}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-10
          opacity-0 group-hover:opacity-100 transition-opacity duration-150
          cursor-grab active:cursor-grabbing p-2 rounded-lg bg-surface border border-border shadow-sm
          text-gray-40 hover:text-gray-60 hover:border-gray-40 flex flex-col gap-0.5">
        <Icon name="grip" />
        <span className="text-caption text-gray-50 leading-none hidden group-hover:block" style={{ fontSize: '10px', marginTop: 2 }}>{label}</span>
      </div>
      {editMode && (
        <button onClick={() => onDelete(id)} title={`Remove "${label}" section`}
          className="absolute right-4 top-4 z-10
            opacity-0 group-hover:opacity-100 transition-opacity duration-150
            flex items-center gap-1 px-2.5 py-1.5 rounded-lg
            bg-surface border border-destructive/20 shadow-sm
            text-destructive/60 hover:text-destructive hover:border-destructive hover:bg-destructive/5
            transition-colors duration-150">
          <Icon name="x" />
          <span className="text-caption font-medium" style={{ fontSize: '10px' }}>Remove</span>
        </button>
      )}
      {children}
    </div>
  )
}

// ─── Iframe URL editor ────────────────────────────────────────────────────────

function IframeSection({ id, icon, title, description, placeholder, urlValue, onSave, toEmbedUrl, aspectRatio = '56.25%' }: {
  id: string; icon: string; title: string; description: string; placeholder: string
  urlValue: string; onSave: (url: string) => void; toEmbedUrl: (url: string) => string; aspectRatio?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(urlValue)
  const embedUrl = urlValue ? toEmbedUrl(urlValue) : ''

  function handleSave() { onSave(draft.trim()); setEditing(false) }
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setDraft(urlValue); setEditing(false) }
  }

  return (
    <section className="py-20 px-6 bg-surface border-y border-border">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4"><Icon name={icon} /></div>
          <h2 className="text-h1 font-semibold text-text">{title}</h2>
          <p className="text-body text-gray-60 mt-2">{description}</p>
        </div>
        {embedUrl && !editing ? (
          <div className="relative rounded-xl overflow-hidden border border-border shadow-elevated">
            <div style={{ paddingBottom: aspectRatio, position: 'relative', height: 0 }}>
              <iframe src={embedUrl} className="absolute inset-0 w-full h-full" frameBorder="0" allowFullScreen allow="autoplay" loading="lazy" />
            </div>
            <button onClick={() => { setDraft(urlValue); setEditing(true) }}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5
                bg-surface/90 backdrop-blur-sm border border-border rounded-lg
                text-caption font-medium text-gray-60 hover:text-text hover:border-gray-40 shadow-sm transition-all duration-150">
              <Icon name="pencil" />Edit URL
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-border rounded-xl p-12 text-center bg-gray-10">
            {editing ? (
              <div className="max-w-lg mx-auto">
                <p className="text-small font-medium text-text mb-3">Paste your {title} URL</p>
                <div className="flex gap-2">
                  <input autoFocus type="url" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder}
                    className="flex-1 px-3 py-2 border border-gray-30 rounded-lg bg-surface text-text text-small focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-gray-50 transition-all duration-150" />
                  <button onClick={handleSave} disabled={!draft.trim()}
                    className="px-4 py-2 bg-primary text-primary-contrast text-small font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5">
                    <Icon name="check" />Save
                  </button>
                  <button onClick={() => { setDraft(urlValue); setEditing(false) }}
                    className="px-3 py-2 text-small text-gray-60 border border-border rounded-lg hover:bg-gray-10 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-body text-gray-50 mb-4">{placeholder}</p>
                <button onClick={() => { setDraft(''); setEditing(true) }}
                  className="px-5 py-2.5 bg-primary text-primary-contrast text-small font-semibold rounded-lg shadow-sm hover:bg-primary-hover hover:shadow-md hover:-translate-y-px active:bg-primary-active active:translate-y-0 transition-all duration-150 flex items-center gap-2 mx-auto">
                  <Icon name={icon} />Add {title}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Single Drive embed (used in Voices section) ──────────────────────────────

function DriveEmbed({ label, urlValue, onSave }: { label: string; urlValue: string; onSave: (u: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(urlValue)
  const embedUrl = urlValue ? toDriveEmbedUrl(urlValue) : ''

  function handleSave() { onSave(draft.trim()); setEditing(false) }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-small font-semibold text-text text-center">{label}</p>
      {embedUrl && !editing ? (
        <div className="relative rounded-xl overflow-hidden border border-border shadow-soft">
          <div style={{ paddingBottom: '56.25%', position: 'relative', height: 0 }}>
            <iframe src={embedUrl} className="absolute inset-0 w-full h-full" frameBorder="0" allowFullScreen loading="lazy" />
          </div>
          <button onClick={() => { setDraft(urlValue); setEditing(true) }}
            className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5
              bg-surface/90 backdrop-blur-sm border border-border rounded-lg
              text-caption font-medium text-gray-60 hover:text-text hover:border-gray-40 shadow-sm transition-all duration-150">
            <Icon name="pencil" />Edit
          </button>
        </div>
      ) : editing ? (
        <div className="border border-border rounded-xl p-4 bg-gray-10">
          <p className="text-small font-medium text-text mb-2">Paste Google Drive video URL</p>
          <div className="flex gap-2">
            <input autoFocus type="url" value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setDraft(urlValue); setEditing(false) } }}
              placeholder="e.g. drive.google.com/file/d/…/view"
              className="flex-1 px-3 py-2 border border-gray-30 rounded-lg bg-surface text-text text-small focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-gray-50" />
            <button onClick={handleSave} disabled={!draft.trim()}
              className="px-3 py-2 bg-primary text-primary-contrast text-small font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-50 flex items-center gap-1">
              <Icon name="check" />Save
            </button>
            <button onClick={() => { setDraft(urlValue); setEditing(false) }}
              className="px-3 py-2 text-small text-gray-60 border border-border rounded-lg hover:bg-gray-10">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setDraft(''); setEditing(true) }}
          className="border-2 border-dashed border-border rounded-xl p-10 text-center bg-gray-10 hover:bg-gray-20 transition-colors flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Icon name="video" /></div>
          <span className="text-small text-gray-50">Add Google Drive video</span>
        </button>
      )}
    </div>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CRM_LOGOS: { name: string; logoUrl: string }[] = [
  { name: 'Reapit', logoUrl: 'https://cdn.prod.website-files.com/65cc1dfdc4913d1034befe43/65cd4892e588ed11b16e33d7_Reapit%20logo(1).svg' },
  { name: 'Alto', logoUrl: 'https://alto.co.uk/wp-content/uploads/2020/07/Alto-Logo_transparent-black.png' },
  { name: 'Street.co.uk', logoUrl: 'https://cdn.prod.website-files.com/626a7c1738d51884ec5ac9d7/67336c2f745666127d1710be_Street-Logo-Vector.svg' },
  { name: 'Rex', logoUrl: 'https://cdn.prod.website-files.com/692cf39461ea1001ff1f070f/694758e9bcfc762a504d4d91_logo-rex%20logo%20form%20top.svg' },
  { name: 'Apex27', logoUrl: 'https://apex27.co.uk/img/logo_navy.png' },
  { name: 'SME Professional', logoUrl: '' },
]

// ─── Main component ───────────────────────────────────────────────────────────

export default function LandingPage({ data, pageId }: { data: LandingPageData; pageId: string }) {
  const [isEditor, setIsEditor] = useState(false)
  const [sections, setSections] = useState<SectionId[]>(
    DEFAULT_ORDER.filter(id => id !== 'stats' && id !== 'testimonial')
  )
  const [hiddenSections, setHiddenSections] = useState<Set<SectionId>>(
    new Set<SectionId>(['stats', 'testimonial'] as SectionId[])
  )
  const [slidesUrl, setSlidesUrl] = useState('')
  const [calendlyUrl, setCalendlyUrl] = useState('https://calendly.com/d/cr85-n67-nt9/nesti-ai-demo')
  const [voiceUrl1, setVoiceUrl1] = useState('https://drive.google.com/file/d/13kdAzjktAMOfc_2r2E7XIoqpwK3Y_3Pt/view?usp=sharing')
  const [voiceUrl2, setVoiceUrl2] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editedData, setEditedData] = useState<LandingPageData>(() => ({
    ...data,
    ctaUrl: data.ctaUrl || 'https://www.nesti.io',
  }))
  const [publishStatus, setPublishStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showSharePanel, setShowSharePanel] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showRestoreMenu, setShowRestoreMenu] = useState(false)
  const [ctaUrlEditing, setCtaUrlEditing] = useState(false)
  const [ctaUrlDraft, setCtaUrlDraft] = useState(editedData.ctaUrl)

  const storageKey = `nesti-page-${pageId}`

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.sections) setSections(parsed.sections)
        if (parsed.hiddenSections) setHiddenSections(new Set(parsed.hiddenSections))
        if (parsed.slidesUrl) setSlidesUrl(parsed.slidesUrl)
        if (parsed.calendlyUrl) setCalendlyUrl(parsed.calendlyUrl)
        if (parsed.voiceUrl1) setVoiceUrl1(parsed.voiceUrl1)
        if (parsed.voiceUrl2) setVoiceUrl2(parsed.voiceUrl2)
      }
    } catch { /* ignore */ }
  }, [storageKey])

  useEffect(() => {
    setIsEditor(new URLSearchParams(window.location.search).has('edit'))
  }, [])

  const persist = useCallback((updates: Partial<{
    sections: SectionId[]; hiddenSections: SectionId[]
    slidesUrl: string; calendlyUrl: string; voiceUrl1: string; voiceUrl2: string
  }>) => {
    try {
      const current = JSON.parse(localStorage.getItem(storageKey) || '{}')
      localStorage.setItem(storageKey, JSON.stringify({ ...current, ...updates }))
    } catch { /* ignore */ }
  }, [storageKey])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragStart(event: DragStartEvent) { setActiveId(event.active.id as string) }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (over && active.id !== over.id) {
      setSections(prev => {
        const next = arrayMove(prev, prev.indexOf(active.id as SectionId), prev.indexOf(over.id as SectionId))
        persist({ sections: next })
        return next
      })
    }
  }

  function handleDeleteSection(id: string) {
    setSections(prev => { const next = prev.filter(s => s !== id); persist({ sections: next }); return next })
    setHiddenSections(prev => { const next = new Set(prev); next.add(id as SectionId); persist({ hiddenSections: Array.from(next) }); return next })
  }

  function handleRestoreSection(id: SectionId) {
    setSections(prev => {
      const next = [...prev]
      const defaultPos = DEFAULT_ORDER.indexOf(id)
      let insertAt = next.length
      for (let i = defaultPos + 1; i < DEFAULT_ORDER.length; i++) {
        const idx = next.indexOf(DEFAULT_ORDER[i])
        if (idx !== -1) { insertAt = idx; break }
      }
      next.splice(insertAt, 0, id)
      persist({ sections: next })
      return next
    })
    setHiddenSections(prev => { const next = new Set(prev); next.delete(id); persist({ hiddenSections: Array.from(next) }); return next })
    setShowRestoreMenu(false)
  }

  function updateData<K extends keyof LandingPageData>(field: K, value: LandingPageData[K]) {
    setEditedData(prev => ({ ...prev, [field]: value }))
  }
  function updatePainPoint(i: number, key: 'headline' | 'description', value: string) {
    setEditedData(prev => { const updated = [...prev.painPoints]; updated[i] = { ...updated[i], [key]: value }; return { ...prev, painPoints: updated } })
  }
  function updateHowItWorks(i: number, key: 'title' | 'description', value: string) {
    setEditedData(prev => { const updated = [...prev.howItWorks]; updated[i] = { ...updated[i], [key]: value }; return { ...prev, howItWorks: updated } })
  }
  function updateFeature(i: number, key: 'title' | 'description', value: string) {
    setEditedData(prev => { const updated = [...prev.features]; updated[i] = { ...updated[i], [key]: value }; return { ...prev, features: updated } })
  }
  function updateTestimonial(key: 'quote' | 'author' | 'company', value: string) {
    setEditedData(prev => ({ ...prev, testimonial: { ...prev.testimonial, [key]: value } }))
  }

  async function handlePublish() {
    setPublishStatus('saving')
    try {
      const res = await fetch(`/api/generate?id=${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedData),
      })
      if (!res.ok) throw new Error('Failed to publish')
      setPublishStatus('saved')
      setShowSharePanel(true)
      setTimeout(() => { setPublishStatus('idle'); setShowSharePanel(false) }, 10000)
    } catch {
      setPublishStatus('error')
      setTimeout(() => setPublishStatus('idle'), 4000)
    }
  }

  async function handleCopyLink() {
    const url = `${window.location.origin}/preview/${pageId}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const generatedDate = new Date(data.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  function ef(value: string, onSave: (v: string) => void) {
    return <EditableField value={value} onSave={onSave} editMode={editMode} />
  }

  // ─── Section renderers ───────────────────────────────────────────────────────

  function renderSection(id: SectionId) {
    switch (id) {
      case 'painPoints':
        return (
          <section className="py-20 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-caption font-medium text-primary uppercase tracking-wider mb-2">Sound familiar?</p>
                <h2 className="text-h1 font-semibold text-text">The challenges holding {ef(editedData.agencyName, v => updateData('agencyName', v))} back</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {editedData.painPoints.map((pain, i) => (
                  <div key={i} className="bg-surface border border-border rounded-xl p-6 shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200">
                    <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center mb-4">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <h3 className="text-h3 font-semibold text-text mb-2">{ef(pain.headline, v => updatePainPoint(i, 'headline', v))}</h3>
                    <p className="text-body text-gray-60">{ef(pain.description, v => updatePainPoint(i, 'description', v))}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )

      case 'howItWorks':
        return (
          <section className="py-20 px-6 bg-surface border-y border-border">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-caption font-medium text-primary uppercase tracking-wider mb-2">Simple to get started</p>
                <h2 className="text-h1 font-semibold text-text">How Nesti works</h2>
                <p className="text-body text-gray-60 mt-3 max-w-xl mx-auto">Up and running in days, not months. No complicated setup, no IT headaches.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {editedData.howItWorks.map((step, i) => (
                  <div key={i} className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-5">
                      <span className="text-h3 font-bold text-primary">{step.step}</span>
                    </div>
                    <h3 className="text-h3 font-semibold text-text mb-2">{ef(step.title, v => updateHowItWorks(i, 'title', v))}</h3>
                    <p className="text-body text-gray-60">{ef(step.description, v => updateHowItWorks(i, 'description', v))}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )

      case 'features':
        return (
          <section className="py-20 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <p className="text-caption font-medium text-primary uppercase tracking-wider mb-2">Everything you need</p>
                <h2 className="text-h1 font-semibold text-text">Powerful features for {ef(editedData.agencyLocation, v => updateData('agencyLocation', v))} agents</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {editedData.features.map((feature, i) => (
                  <div key={i} className="bg-surface border border-border rounded-xl p-6 shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200 group">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors duration-200">
                      <Icon name={feature.icon} />
                    </div>
                    <h3 className="text-h3 font-semibold text-text mb-2">{ef(feature.title, v => updateFeature(i, 'title', v))}</h3>
                    <p className="text-body text-gray-60">{ef(feature.description, v => updateFeature(i, 'description', v))}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )

      case 'integrations':
        return (
          <section className="py-16 px-6 bg-gray-10 border-y border-border">
            <div className="max-w-6xl mx-auto text-center">
              <p className="text-caption font-medium text-gray-50 uppercase tracking-wider mb-6">Seamless CRM integrations</p>
              <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
                {CRM_LOGOS.map(c => <ClientLogo key={c.name} name={c.name} logoUrl={c.logoUrl} />)}
              </div>
              <p className="text-body text-gray-50 mt-6">Nesti pushes call data, notes, and applicant scores directly into your existing CRM. No double data entry.</p>
            </div>
          </section>
        )

      case 'stats':
        return (
          <section className="py-20 px-6 bg-surface border-b border-border">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
                {[
                  { stat: '50+', label: 'Estate agency clients' },
                  { stat: '100%', label: 'Of calls answered, every time' },
                  { stat: '24/7', label: 'Always-on call handling' },
                  { stat: '< 5 days', label: 'Average time to go live' },
                ].map(item => (
                  <div key={item.stat} className="flex flex-col items-center">
                    <span className="text-display font-bold text-primary leading-none mb-2">{item.stat}</span>
                    <span className="text-small text-gray-60">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )

      case 'voices':
        if (!voiceUrl1 && !isEditor) return null
        return (
          <section className="py-20 px-6 bg-surface border-y border-border">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4"><Icon name="mic" /></div>
                <p className="text-caption font-medium text-primary uppercase tracking-wider mb-2">Hear it in action</p>
                <h2 className="text-h1 font-semibold text-text">Real examples of Nesti&apos;s AI voice agent</h2>
                <p className="text-body text-gray-60 mt-3 max-w-xl mx-auto">Listen to how Nesti handles real inbound calls — just like a senior negotiator would.</p>
              </div>
              <div className="max-w-3xl mx-auto">
                <DriveEmbed label="Example call" urlValue={voiceUrl1} onSave={url => { setVoiceUrl1(url); persist({ voiceUrl1: url }) }} />
              </div>
            </div>
          </section>
        )

      case 'testimonial':
        return (
          <section className="py-20 px-6">
            <div className="max-w-3xl mx-auto">
              <div className="bg-surface border border-border rounded-xl p-10 shadow-elevated text-center">
                <div className="text-primary/30 flex justify-center mb-6"><Icon name="quote" /></div>
                <blockquote className="text-sub font-medium text-text mb-6 leading-relaxed">
                  &ldquo;{ef(editedData.testimonial.quote, v => updateTestimonial('quote', v))}&rdquo;
                </blockquote>
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold text-body flex items-center justify-center mb-3">{editedData.testimonial.author.charAt(0)}</div>
                  <p className="text-small font-semibold text-text">{ef(editedData.testimonial.author, v => updateTestimonial('author', v))}</p>
                  <p className="text-caption text-gray-50 mt-0.5">{ef(editedData.testimonial.company, v => updateTestimonial('company', v))}</p>
                </div>
              </div>
            </div>
          </section>
        )

      case 'slides':
        if (!slidesUrl && !isEditor) return null
        return (
          <IframeSection id="slides" icon="slides" title="Watch Our Presentation"
            description={`See exactly how Nesti transforms call handling for agencies like ${editedData.agencyName}.`}
            placeholder="Paste your Google Slides share URL here"
            urlValue={slidesUrl} onSave={url => { setSlidesUrl(url); persist({ slidesUrl: url }) }}
            toEmbedUrl={toSlidesEmbedUrl} aspectRatio="56.25%" />
        )

      case 'calendly':
        if (!calendlyUrl && !isEditor) return null
        return (
          <IframeSection id="calendly" icon="calendar" title="Book a Demo"
            description={`Schedule a personalised demo for ${editedData.agencyName}. Takes just 20 minutes.`}
            placeholder="Paste your Calendly URL here (e.g. https://calendly.com/your-name/nesti-demo)"
            urlValue={calendlyUrl} onSave={url => { setCalendlyUrl(url); persist({ calendlyUrl: url }) }}
            toEmbedUrl={toCalendlyEmbedUrl} aspectRatio="100%" />
        )
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const ctaUrl = editedData.ctaUrl || 'https://www.nesti.io'

  return (
    <div className="min-h-screen bg-background font-sans">

      {/* ─── NAVBAR ─── */}
      <nav className="border-b border-border bg-surface/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={NESTI_LOGO_URL} alt="Nesti" className="h-7 w-auto" />
          <div className="flex items-center gap-3">
            {data.agencyLogoUrl && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-10 border border-border rounded-full">
                <AgencyLogo logoUrl={data.agencyLogoUrl} agencyName={editedData.agencyName} className="h-5 w-auto max-w-[80px]" />
              </div>
            )}
            <a href={ctaUrl} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2 bg-primary text-primary-contrast text-small font-semibold rounded-lg shadow-sm hover:bg-primary-hover hover:shadow-md hover:-translate-y-px active:bg-primary-active active:translate-y-0 transition-all duration-150">
              Book a Demo
            </a>
          </div>
        </div>
      </nav>

      {/* ─── EDIT TOOLBAR (editor only) ─── */}
      {isEditor && <div className="sticky top-14 z-10 bg-surface/95 backdrop-blur-sm border-b border-border px-4 py-2">
        <div className="max-w-6xl mx-auto flex flex-col gap-2">
          {/* Top row: edit controls + publish */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {editMode ? (
                <>
                  <span className="flex items-center gap-1.5 text-caption font-medium text-primary"><Icon name="pencil" />Edit mode — click any text</span>
                  <button onClick={() => setEditMode(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-caption font-medium text-gray-60 border border-border rounded-lg hover:bg-gray-10 transition-colors">
                    <Icon name="eye" />Preview
                  </button>
                </>
              ) : (
                <button onClick={() => setEditMode(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-caption font-medium text-gray-60 border border-border rounded-lg hover:bg-gray-10 hover:text-text transition-colors">
                  <Icon name="pencil" />Edit Page
                </button>
              )}

              {/* CTA URL editor */}
              <div className="flex items-center gap-1.5">
                <span className="text-caption text-gray-50 hidden sm:inline">CTA link:</span>
                {ctaUrlEditing ? (
                  <div className="flex items-center gap-1">
                    <input autoFocus type="url" value={ctaUrlDraft} onChange={e => setCtaUrlDraft(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { updateData('ctaUrl', ctaUrlDraft.trim() || 'https://www.nesti.io'); setCtaUrlEditing(false) }
                        if (e.key === 'Escape') { setCtaUrlDraft(ctaUrl); setCtaUrlEditing(false) }
                      }}
                      placeholder="https://..."
                      className="w-48 px-2 py-1 border border-gray-30 rounded-lg bg-surface text-text text-caption focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    <button onClick={() => { updateData('ctaUrl', ctaUrlDraft.trim() || 'https://www.nesti.io'); setCtaUrlEditing(false) }}
                      className="p-1.5 bg-primary text-primary-contrast rounded-lg hover:bg-primary-hover"><Icon name="check" /></button>
                    <button onClick={() => { setCtaUrlDraft(ctaUrl); setCtaUrlEditing(false) }}
                      className="p-1.5 border border-border rounded-lg text-gray-60 hover:bg-gray-10"><Icon name="x" /></button>
                  </div>
                ) : (
                  <button onClick={() => { setCtaUrlDraft(ctaUrl); setCtaUrlEditing(true) }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-caption text-gray-60 border border-border rounded-lg hover:bg-gray-10 hover:text-text transition-colors max-w-[180px] truncate">
                    <Icon name="link" />
                    <span className="truncate max-w-[120px]">{ctaUrl.replace(/^https?:\/\//, '')}</span>
                    <Icon name="pencil" />
                  </button>
                )}
              </div>

              {/* Restore deleted sections */}
              {hiddenSections.size > 0 && (
                <div className="relative">
                  <button onClick={() => setShowRestoreMenu(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-caption font-medium text-gray-60 border border-border rounded-lg hover:bg-gray-10 hover:text-text transition-colors">
                    <Icon name="plus" />Restore ({hiddenSections.size})
                  </button>
                  {showRestoreMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowRestoreMenu(false)} />
                      <div className="absolute left-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-elevated z-50 py-1 min-w-[180px]">
                        {Array.from(hiddenSections).map(id => (
                          <button key={id} onClick={() => handleRestoreSection(id)}
                            className="w-full text-left px-4 py-2.5 text-small text-text hover:bg-gray-10 flex items-center gap-2 transition-colors">
                            <Icon name="plus" />{SECTION_LABELS[id]}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Publish button */}
            <button onClick={handlePublish} disabled={publishStatus === 'saving'}
              className={`flex items-center gap-2 px-4 py-2 text-small font-semibold rounded-lg shadow-sm transition-all duration-150
                ${publishStatus === 'saved' ? 'bg-green-500 text-white cursor-default'
                  : publishStatus === 'error' ? 'bg-destructive text-white'
                  : 'bg-primary text-primary-contrast hover:bg-primary-hover hover:shadow-md hover:-translate-y-px active:bg-primary-active active:translate-y-0'}
                disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0`}>
              {publishStatus === 'saving' ? (<><svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Saving…</>)
                : publishStatus === 'saved' ? (<><Icon name="check" />Published!</>)
                : publishStatus === 'error' ? <>Error — try again</>
                : (<><Icon name="upload" />Publish Changes</>)}
            </button>
          </div>

          {/* Share panel — shown after successful publish */}
          {showSharePanel && (
            <div className="flex items-center gap-3 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl">
              <Icon name="check" />
              <span className="text-caption font-medium text-green-800 flex-1 truncate">
                Page published. Share this link with your contact:
                <span className="ml-2 font-mono text-green-700">{typeof window !== 'undefined' ? `${window.location.origin}/preview/${pageId}` : ''}</span>
              </span>
              <button onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-200 rounded-lg text-caption font-medium text-green-800 hover:bg-green-50 transition-colors flex-shrink-0">
                <Icon name="copy" />{copied ? 'Copied!' : 'Copy link'}
              </button>
              <a href={`/preview/${pageId}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-200 rounded-lg text-caption font-medium text-green-800 hover:bg-green-50 transition-colors flex-shrink-0">
                <Icon name="external-link" />Open
              </a>
              <button onClick={() => setShowSharePanel(false)} className="text-green-600 hover:text-green-800 transition-colors flex-shrink-0">
                <Icon name="x" />
              </button>
            </div>
          )}
        </div>
      </div>}

      {/* ─── HERO ─── */}
      <section className="bg-surface border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="flex items-center justify-center gap-4 mb-8">
            <AgencyLogo logoUrl={data.agencyLogoUrl} agencyName={editedData.agencyName} className="h-10 w-auto max-w-[120px]" />
            <span className="text-gray-40 text-h2 font-light">×</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={NESTI_MARK_URL} alt="Nesti" className="h-10 w-auto" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-caption font-medium text-primary">
              {editedData.contactFirstName ? `For ${editedData.contactFirstName} at ` : 'Built for '}{editedData.agencyName} · {editedData.agencySpecialty}
            </span>
          </div>
          <h1 className="text-display font-semibold text-text max-w-3xl mx-auto mb-6 leading-tight">
            {ef(editedData.heroHeadline, v => updateData('heroHeadline', v))}
          </h1>
          <p className="text-sub text-gray-60 max-w-2xl mx-auto mb-10">
            {ef(editedData.heroSubheadline, v => updateData('heroSubheadline', v))}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href={ctaUrl} target="_blank" rel="noopener noreferrer"
              className="px-6 py-3 bg-primary text-primary-contrast text-body font-semibold rounded-lg shadow-sm hover:bg-primary-hover hover:shadow-md hover:-translate-y-px active:bg-primary-active active:translate-y-0 transition-all duration-150 flex items-center gap-2 w-full sm:w-auto justify-center">
              Book a Free Demo <Icon name="arrow-right" />
            </a>
            <a href={ctaUrl} target="_blank" rel="noopener noreferrer"
              className="px-6 py-3 text-body font-medium text-text bg-surface border border-border rounded-lg hover:bg-gray-10 hover:border-gray-40 hover:shadow-sm hover:-translate-y-px active:bg-gray-20 active:translate-y-0 transition-all duration-150 w-full sm:w-auto text-center">
              See How It Works
            </a>
          </div>
          {/* Trusted-by strip with real logos */}
          <div className="mt-14 pt-8 border-t border-border">
            <p className="text-caption font-medium text-gray-50 uppercase tracking-wider mb-6">Trusted by 50+ UK estate &amp; letting agents</p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {CLIENT_LOGOS.map(c => <ClientLogo key={c.name} name={c.name} logoUrl={c.logoUrl} />)}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Drag hint (editor only) ─── */}
      {isEditor && (
        <div className="flex items-center justify-center gap-2 py-2 bg-gray-10 border-b border-border">
          <Icon name="grip" />
          <span className="text-caption text-gray-50">Hover over any section to drag, edit, or remove it</span>
        </div>
      )}

      {/* ─── SECTIONS ─── */}
      {isEditor ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={sections} strategy={verticalListSortingStrategy}>
            {sections.map(id => (
              <SortableSection key={id} id={id} label={SECTION_LABELS[id]} editMode={editMode} onDelete={handleDeleteSection}>
                {renderSection(id)}
              </SortableSection>
            ))}
          </SortableContext>
          <DragOverlay>
            {activeId ? (
              <div className="bg-surface border-2 border-primary rounded-xl shadow-xl px-6 py-4 flex items-center gap-3 opacity-90">
                <Icon name="grip" /><span className="text-small font-semibold text-text">{SECTION_LABELS[activeId as SectionId]}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <>{sections.map(id => renderSection(id))}</>
      )}

      {/* ─── FOOTER ─── */}
      <footer className="bg-surface border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={NESTI_LOGO_URL} alt="Nesti" className="h-6 w-auto" />
            {data.agencyLogoUrl && (<><span className="text-gray-40">×</span><AgencyLogo logoUrl={data.agencyLogoUrl} agencyName={editedData.agencyName} className="h-6 w-auto max-w-[80px]" /></>)}
          </div>
          <div className="flex items-center gap-4 text-caption text-gray-50">
            <a href={ctaUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">www.nesti.io</a>
            <span>·</span>
            <span>Generated {generatedDate} for {editedData.contactFirstName ? `${editedData.contactFirstName} at ` : ''}{editedData.agencyName}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
