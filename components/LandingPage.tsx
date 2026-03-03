import React from 'react'

interface LandingPageData {
  agencyName: string
  agencyLocation: string
  agencySpecialty: string
  agencyLogoUrl: string | null
  heroHeadline: string
  heroSubheadline: string
  painPoints: Array<{ headline: string; description: string }>
  howItWorks: Array<{ step: string; title: string; description: string }>
  features: Array<{ icon: string; title: string; description: string }>
  testimonial: { quote: string; author: string; company: string }
  ctaHeadline: string
  ctaDescription: string
  sourceUrl: string
  generatedAt: string
}

// Nesti brand assets (sourced from nesti.io)
const NESTI_LOGO_URL = 'https://framerusercontent.com/images/JzFfiaQX72q1RYQhXynCAACR8cY.png'
const NESTI_MARK_URL = 'https://framerusercontent.com/images/ionFD7qGUhxkIz0wKQgEItnCSU.png'

// Inline SVG icons
const icons: Record<string, React.ReactNode> = {
  phone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 9.17 19.79 19.79 0 01.07 .49 2 2 0 012.03 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  zap: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  'arrow-right': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  ),
  quote: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
    </svg>
  ),
}

function Icon({ name }: { name: string }) {
  return <>{icons[name] ?? icons.phone}</>
}

// Agency logo with graceful fallback to initials
function AgencyLogo({ logoUrl, agencyName, className = '' }: { logoUrl: string | null; agencyName: string; className?: string }) {
  if (!logoUrl) {
    const initials = agencyName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    return (
      <div className={`bg-gray-20 border border-border rounded-lg flex items-center justify-center text-h3 font-bold text-gray-60 ${className}`}>
        {initials}
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={`${agencyName} logo`}
      className={`object-contain ${className}`}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
    />
  )
}

const CLIENTS = ['Fine & Country', 'Persimmon Homes', 'Richard James', 'Smart Property Group']
const CRM_LOGOS = ['Reapit', 'Alto', 'Street.co.uk', 'Rex', 'Apex27', 'SME Professional']

export default function LandingPage({ data }: { data: LandingPageData }) {
  const generatedDate = new Date(data.generatedAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-background font-sans">

      {/* ─── NAVBAR ─── */}
      <nav className="border-b border-border bg-surface/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Nesti logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={NESTI_LOGO_URL} alt="Nesti" className="h-7 w-auto" />

          <div className="flex items-center gap-3">
            {/* Agency logo pill */}
            {data.agencyLogoUrl && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-10 border border-border rounded-full">
                <AgencyLogo logoUrl={data.agencyLogoUrl} agencyName={data.agencyName} className="h-5 w-auto max-w-[80px]" />
              </div>
            )}
            <a
              href="https://www.nesti.io"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-primary text-primary-contrast text-small font-semibold rounded-lg
                shadow-sm hover:bg-primary-hover hover:shadow-md hover:-translate-y-px
                active:bg-primary-active active:translate-y-0 transition-all duration-150"
            >
              Book a Demo
            </a>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="bg-surface border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">

          {/* Agency × Nesti partnership mark */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <AgencyLogo logoUrl={data.agencyLogoUrl} agencyName={data.agencyName} className="h-10 w-auto max-w-[120px]" />
            <span className="text-gray-40 text-h2 font-light">×</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={NESTI_MARK_URL} alt="Nesti" className="h-10 w-auto" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-caption font-medium text-primary">
              Built for {data.agencyName} · {data.agencySpecialty}
            </span>
          </div>

          <h1 className="text-display font-semibold text-text max-w-3xl mx-auto mb-6 leading-tight">
            {data.heroHeadline}
          </h1>
          <p className="text-sub text-gray-60 max-w-2xl mx-auto mb-10">
            {data.heroSubheadline}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://www.nesti.io"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-primary text-primary-contrast text-body font-semibold rounded-lg
                shadow-sm hover:bg-primary-hover hover:shadow-md hover:-translate-y-px
                active:bg-primary-active active:translate-y-0 transition-all duration-150
                flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              Book a Free Demo
              <Icon name="arrow-right" />
            </a>
            <a
              href="https://www.nesti.io"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 text-body font-medium text-text bg-surface border border-border rounded-lg
                hover:bg-gray-10 hover:border-gray-40 hover:shadow-sm hover:-translate-y-px
                active:bg-gray-20 active:translate-y-0 transition-all duration-150
                w-full sm:w-auto text-center"
            >
              See How It Works
            </a>
          </div>

          {/* Trust strip */}
          <div className="mt-14 pt-8 border-t border-border">
            <p className="text-caption font-medium text-gray-50 uppercase tracking-wider mb-4">
              Trusted by 50+ UK estate &amp; letting agents
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
              {CLIENTS.map(client => (
                <span key={client} className="text-small font-medium text-gray-50">{client}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── PAIN POINTS ─── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-caption font-medium text-primary uppercase tracking-wider mb-2">Sound familiar?</p>
            <h2 className="text-h1 font-semibold text-text">
              The challenges holding {data.agencyName} back
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.painPoints.map((pain, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl p-6 shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <h3 className="text-h3 font-semibold text-text mb-2">{pain.headline}</h3>
                <p className="text-body text-gray-60">{pain.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-20 px-6 bg-surface border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-caption font-medium text-primary uppercase tracking-wider mb-2">Simple to get started</p>
            <h2 className="text-h1 font-semibold text-text">How Nesti works</h2>
            <p className="text-body text-gray-60 mt-3 max-w-xl mx-auto">
              Up and running in days, not months. No complicated setup, no IT headaches.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {data.howItWorks.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-5">
                  <span className="text-h3 font-bold text-primary">{step.step}</span>
                </div>
                <h3 className="text-h3 font-semibold text-text mb-2">{step.title}</h3>
                <p className="text-body text-gray-60">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-caption font-medium text-primary uppercase tracking-wider mb-2">Everything you need</p>
            <h2 className="text-h1 font-semibold text-text">
              Powerful features for {data.agencyLocation} agents
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.features.map((feature, i) => (
              <div key={i} className="bg-surface border border-border rounded-xl p-6 shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200 group">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors duration-200">
                  <Icon name={feature.icon} />
                </div>
                <h3 className="text-h3 font-semibold text-text mb-2">{feature.title}</h3>
                <p className="text-body text-gray-60">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CRM INTEGRATIONS ─── */}
      <section className="py-16 px-6 bg-gray-10 border-y border-border">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-caption font-medium text-gray-50 uppercase tracking-wider mb-6">Seamless CRM integrations</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {CRM_LOGOS.map(crm => (
              <div key={crm} className="px-4 py-2 bg-surface border border-border rounded-lg text-small font-medium text-gray-60 shadow-sm">
                {crm}
              </div>
            ))}
          </div>
          <p className="text-body text-gray-50 mt-6">
            Nesti pushes call data, notes, and applicant scores directly into your existing CRM — no double data entry.
          </p>
        </div>
      </section>

      {/* ─── STATS ─── */}
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

      {/* ─── TESTIMONIAL ─── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-surface border border-border rounded-xl p-10 shadow-elevated text-center">
            <div className="text-primary/30 flex justify-center mb-6">
              <Icon name="quote" />
            </div>
            <blockquote className="text-sub font-medium text-text mb-6 leading-relaxed">
              &ldquo;{data.testimonial.quote}&rdquo;
            </blockquote>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold text-body flex items-center justify-center mb-3">
                {data.testimonial.author.charAt(0)}
              </div>
              <p className="text-small font-semibold text-text">{data.testimonial.author}</p>
              <p className="text-caption text-gray-50 mt-0.5">{data.testimonial.company}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 px-6 bg-primary">
        <div className="max-w-3xl mx-auto text-center">
          {/* Agency logo on CTA section */}
          {data.agencyLogoUrl && (
            <div className="flex items-center justify-center gap-3 mb-8">
              <AgencyLogo logoUrl={data.agencyLogoUrl} agencyName={data.agencyName} className="h-8 w-auto max-w-[100px] brightness-0 invert opacity-70" />
              <span className="text-primary-contrast/50 text-h3 font-light">×</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={NESTI_MARK_URL} alt="Nesti" className="h-8 w-auto brightness-0 invert opacity-70" />
            </div>
          )}

          <h2 className="text-h1 font-semibold text-primary-contrast mb-4">
            {data.ctaHeadline}
          </h2>
          <p className="text-body text-primary-contrast/80 mb-10 max-w-xl mx-auto">
            {data.ctaDescription}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://www.nesti.io"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 bg-primary-contrast text-primary text-body font-semibold rounded-lg
                shadow-md hover:shadow-lg hover:-translate-y-px active:translate-y-0
                transition-all duration-150 flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              Book a Free Demo
              <Icon name="arrow-right" />
            </a>
            <a
              href="https://www.nesti.io"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 text-body font-medium text-primary-contrast border border-primary-contrast/30
                rounded-lg hover:bg-primary-contrast/10 transition-colors duration-150
                w-full sm:w-auto text-center"
            >
              Learn More
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
            {['No long-term contracts', 'Free setup support', 'Live in under a week'].map(item => (
              <div key={item} className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-primary-contrast/70">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="text-caption text-primary-contrast/70">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-surface border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={NESTI_LOGO_URL} alt="Nesti" className="h-6 w-auto" />
            {data.agencyLogoUrl && (
              <>
                <span className="text-gray-40">×</span>
                <AgencyLogo logoUrl={data.agencyLogoUrl} agencyName={data.agencyName} className="h-6 w-auto max-w-[80px]" />
              </>
            )}
          </div>
          <div className="flex items-center gap-4 text-caption text-gray-50">
            <a href="https://www.nesti.io" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">www.nesti.io</a>
            <span>·</span>
            <span>Generated {generatedDate} for {data.agencyName}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
