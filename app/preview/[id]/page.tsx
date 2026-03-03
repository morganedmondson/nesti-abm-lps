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
  sourceUrl: string
  generatedAt: string
}

async function getPageData(id: string): Promise<LandingPageData | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/generate?id=${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const data = await getPageData(params.id)
  if (!data) return { title: 'Not Found' }
  return {
    title: `Nesti × ${data.agencyName} — Personalised Pitch`,
    description: data.heroSubheadline,
  }
}

export default async function PreviewPage({ params }: { params: { id: string } }) {
  const data = await getPageData(params.id)
  if (!data) notFound()
  return <ClientPage data={data} pageId={params.id} />
}
