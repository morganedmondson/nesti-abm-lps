import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import * as cheerio from 'cheerio'
import { v4 as uuidv4 } from 'uuid'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const DATA_DIR = path.join(process.cwd(), 'data')

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

async function scrapeWebsite(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)

  let html: string
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NestiBot/1.0; +https://nesti.io)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    html = await res.text()
  } finally {
    clearTimeout(timeout)
  }

  const $ = cheerio.load(html)

  // Remove noise
  $('script, style, noscript, nav, footer, header, iframe, img, svg, [aria-hidden="true"]').remove()

  const parts: string[] = []

  // Title
  const title = $('title').text().trim()
  if (title) parts.push(`Page title: ${title}`)

  // Meta description
  const metaDesc = $('meta[name="description"]').attr('content') || ''
  if (metaDesc) parts.push(`Meta description: ${metaDesc}`)

  // OG title / description
  const ogTitle = $('meta[property="og:title"]').attr('content') || ''
  if (ogTitle && ogTitle !== title) parts.push(`OG title: ${ogTitle}`)

  // Headings
  const headings: string[] = []
  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().trim()
    if (text && text.length > 2 && text.length < 200) {
      headings.push(text)
    }
  })
  if (headings.length) parts.push(`Headings: ${headings.slice(0, 20).join(' | ')}`)

  // Paragraphs
  const paras: string[] = []
  $('p').each((_, el) => {
    const text = $(el).text().trim()
    if (text.length > 30 && text.length < 400) {
      paras.push(text)
    }
  })
  if (paras.length) parts.push(`Content:\n${paras.slice(0, 15).join('\n')}`)

  const combined = parts.join('\n\n')

  // Truncate to ~3000 chars for the prompt
  return combined.slice(0, 3000)
}

const SYSTEM_PROMPT = `You are a persuasive B2B sales copywriter for Nesti — an AI call-handling platform built specifically for UK estate and letting agents.

ABOUT NESTI:
- Nesti replaces call centres, voicemail, and missed calls with an intelligent AI voice agent
- The AI voice agent handles inbound calls exactly like a senior negotiator would: it asks the right questions, captures perfect information, and never misses a lead
- Confidence scoring: the AI scores every applicant and caller so agents know who to prioritise
- Automatic call forwarding: routes calls to the right team member or department instantly
- Email summaries: after every call, staff receive a complete, accurate summary
- CRM integrations: Reapit, Alto, SME Professional, Street.co.uk, Rex, Apex27
- 50+ estate agent clients including Fine & Country, Persimmon Homes, Richard James, Smart Property Group
- Always available — never off sick, never on lunch, never engaged

YOUR TASK:
Write a compelling, personalised landing page that sells Nesti to the specific estate or letting agency described in the scraped content. Make it feel like it was written just for them.

TONE: Professional, confident, specific. Reference their location, property types, or scale when possible. Focus on real business outcomes (more leads captured, less admin, better quality applicants through the door).

RETURN: A single valid JSON object matching this exact schema — no markdown, no explanation, just the JSON:

{
  "agencyName": "string — the estate agency's name",
  "agencyLocation": "string — their primary location/city",
  "agencySpecialty": "string — e.g. 'residential lettings', 'sales & lettings', 'new homes'",
  "heroHeadline": "string — compelling headline (max 12 words) that mentions their name or location",
  "heroSubheadline": "string — 1-2 sentences expanding on the headline, specific to their business",
  "painPoints": [
    { "headline": "string", "description": "string — 1-2 sentences" },
    { "headline": "string", "description": "string — 1-2 sentences" },
    { "headline": "string", "description": "string — 1-2 sentences" }
  ],
  "howItWorks": [
    { "step": "01", "title": "string", "description": "string — 1 sentence" },
    { "step": "02", "title": "string", "description": "string — 1 sentence" },
    { "step": "03", "title": "string", "description": "string — 1 sentence" }
  ],
  "features": [
    { "icon": "phone", "title": "string", "description": "string — 1-2 sentences" },
    { "icon": "star", "title": "string", "description": "string — 1-2 sentences" },
    { "icon": "zap", "title": "string", "description": "string — 1-2 sentences" },
    { "icon": "mail", "title": "string", "description": "string — 1-2 sentences" },
    { "icon": "link", "title": "string", "description": "string — 1-2 sentences" },
    { "icon": "clock", "title": "string", "description": "string — 1-2 sentences" }
  ],
  "testimonial": {
    "quote": "string — a compelling testimonial from a real or representative Nesti client",
    "author": "string — e.g. 'Sarah Mitchell, Head of Lettings'",
    "company": "string — e.g. 'Richard James Estate Agents'"
  },
  "ctaHeadline": "string — final CTA headline, specific to them",
  "ctaDescription": "string — 1-2 sentences urging them to book a demo"
}`

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'A URL is required.' }, { status: 400 })
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format.' }, { status: 400 })
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Only HTTP and HTTPS URLs are supported.' }, { status: 400 })
    }

    // Scrape the website
    let scrapedContent: string
    try {
      scrapedContent = await scrapeWebsite(url)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (msg.includes('abort') || msg.includes('timeout')) {
        return NextResponse.json({ error: 'The website took too long to respond. Please try another URL.' }, { status: 400 })
      }
      return NextResponse.json({ error: `Could not fetch that website: ${msg}` }, { status: 400 })
    }

    if (!scrapedContent || scrapedContent.length < 50) {
      return NextResponse.json({
        error: 'Could not extract enough content from that website. It may require JavaScript to render or block automated access.',
      }, { status: 400 })
    }

    // Call Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here is the content scraped from ${url}:\n\n${scrapedContent}\n\nGenerate the personalised Nesti landing page JSON for this agency. Return ONLY valid JSON, no other text.`,
        },
      ],
    })

    const rawContent = message.content[0]
    if (rawContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    let pageData: Omit<LandingPageData, 'sourceUrl' | 'generatedAt'>
    try {
      // Strip any accidental markdown fences
      const jsonText = rawContent.text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()
      pageData = JSON.parse(jsonText)
    } catch {
      throw new Error('Failed to parse Claude response as JSON')
    }

    const fullData: LandingPageData = {
      ...pageData,
      sourceUrl: url,
      generatedAt: new Date().toISOString(),
    }

    // Persist to disk
    const id = uuidv4()
    await mkdir(DATA_DIR, { recursive: true })
    await writeFile(path.join(DATA_DIR, `${id}.json`), JSON.stringify(fullData, null, 2))

    return NextResponse.json({ id, agencyName: fullData.agencyName })
  } catch (err) {
    console.error('[/api/generate]', err)
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
