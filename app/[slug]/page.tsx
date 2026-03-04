import { notFound } from 'next/navigation'
import ClientPage from './ClientPage'

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

async function getPageDataBySlug(slug: string): Promise<{ id: string; data: LandingPageData } | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/generate?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' })
    if (!res.ok) return null
    const { id, ...data } = await res.json()
    if (!id) return null
    return { id, data: data as LandingPageData }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const result = await getPageDataBySlug(params.slug)
  if (!result) return { title: 'Not Found' }
  return {
    title: `Nesti × ${result.data.agencyName} — Personalised Pitch`,
    description: result.data.heroSubheadline,
  }
}

export default async function SlugPage({ params }: { params: { slug: string } }) {
  const result = await getPageDataBySlug(params.slug)
  if (!result) notFound()
  return <ClientPage data={result.data} pageId={result.id} />
}
