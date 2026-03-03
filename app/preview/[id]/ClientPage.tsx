'use client'

import dynamic from 'next/dynamic'

// dynamic() with ssr:false must be called from a client component, not a
// server component — otherwise Next.js still walks the JSX tree server-side
// and chokes on event handlers (e.g. img onError).
const LandingPage = dynamic(() => import('@/components/LandingPage'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-small text-gray-50">Loading your personalised page…</p>
      </div>
    </div>
  ),
})

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

export default function ClientPage({ data, pageId }: { data: LandingPageData; pageId: string }) {
  return <LandingPage data={data} pageId={pageId} />
}
