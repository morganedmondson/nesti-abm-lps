import { notFound } from 'next/navigation'
import { readFile } from 'fs/promises'
import path from 'path'
import LandingPage from '@/components/LandingPage'

interface LandingPageData {
  agencyName: string
  agencyLocation: string
  agencySpecialty: string
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
  // Basic validation to prevent path traversal
  if (!/^[0-9a-f-]{36}$/.test(id)) return null

  try {
    const filePath = path.join(process.cwd(), 'data', `${id}.json`)
    const raw = await readFile(filePath, 'utf-8')
    return JSON.parse(raw) as LandingPageData
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

  if (!data) {
    notFound()
  }

  return <LandingPage data={data} />
}
