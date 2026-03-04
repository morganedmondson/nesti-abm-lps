import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import * as cheerio from 'cheerio'
import { v4 as uuidv4 } from 'uuid'
import { createClient } from '@supabase/supabase-js'

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set.')
  }
  return new Anthropic({ apiKey })
}

// ─── Persistent storage (Supabase) with in-memory fallback for local dev ──────

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null

// Local dev fallback
const memStore = new Map<string, { slug: string; data: LandingPageData }>()

async function storePage(id: string, slug: string, data: LandingPageData): Promise<void> {
  if (supabase) {
    await supabase.from('nesti_pages').insert({ id, slug, data })
  } else {
    memStore.set(id, { slug, data })
  }
}
async function getPage(id: string): Promise<LandingPageData | null> {
  if (supabase) {
    const { data: row } = await supabase.from('nesti_pages').select('data').eq('id', id).single()
    return (row as { data: LandingPageData } | null)?.data ?? null
  }
  return memStore.get(id)?.data ?? null
}
async function updatePage(id: string, data: LandingPageData): Promise<void> {
  if (supabase) {
    await supabase.from('nesti_pages').update({ data }).eq('id', id)
  } else {
    const existing = memStore.get(id)
    if (existing) memStore.set(id, { ...existing, data })
  }
}
async function getSlugId(slug: string): Promise<string | null> {
  if (supabase) {
    const { data: row } = await supabase.from('nesti_pages').select('id').eq('slug', slug).single()
    return (row as { id: string } | null)?.id ?? null
  }
  const entry = Array.from(memStore.entries()).find(([, v]) => v.slug === slug)
  return entry ? entry[0] : null
}
async function slugTaken(slug: string): Promise<boolean> {
  if (supabase) {
    const { count } = await supabase.from('nesti_pages').select('id', { count: 'exact', head: true }).eq('slug', slug)
    return (count ?? 0) > 0
  }
  return Array.from(memStore.values()).some(v => v.slug === slug)
}

const RESERVED_SLUGS = new Set(['api', 'preview', '_next', 'favicon.ico', 'robots.txt'])

function generateSlug(agencyName: string): string {
  return agencyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

async function uniqueSlug(base: string): Promise<string> {
  if (!RESERVED_SLUGS.has(base) && !await slugTaken(base)) return base
  let i = 2
  while (await slugTaken(`${base}-${i}`)) i++
  return `${base}-${i}`
}

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

function resolveUrl(base: URL, href: string): string | null {
  if (!href || href.startsWith('data:')) return null
  try {
    return new URL(href, base).href
  } catch {
    return null
  }
}

function extractLogoUrl(base: URL, $: ReturnType<typeof cheerio.load>): string | null {
  // 1. Apple touch icon — high-quality, purpose-built brand asset
  const apple = $('link[rel="apple-touch-icon"]').first().attr('href')
  if (apple) {
    const resolved = resolveUrl(base, apple)
    if (resolved) return resolved
  }

  // 2. OG image — usually a branded image
  const og = $('meta[property="og:image"]').attr('content')
  if (og) {
    const resolved = resolveUrl(base, og)
    if (resolved) return resolved
  }

  // 3. img tag in header/nav with "logo" in src, alt, class, or id
  let logoUrl: string | null = null
  $('header img, nav img, [class*="header"] img, [class*="nav"] img, [id*="header"] img').each((_, el) => {
    if (logoUrl) return
    const src = $(el).attr('src') || ''
    const alt = $(el).attr('alt') || ''
    const cls = $(el).attr('class') || ''
    const id = $(el).attr('id') || ''
    if (/logo/i.test(src + alt + cls + id)) {
      const resolved = resolveUrl(base, src)
      if (resolved) logoUrl = resolved
    }
  })
  if (logoUrl) return logoUrl

  // 4. Any img anywhere with "logo" in src/alt/class
  $('img').each((_, el) => {
    if (logoUrl) return
    const src = $(el).attr('src') || ''
    const alt = $(el).attr('alt') || ''
    const cls = $(el).attr('class') || ''
    if (/logo/i.test(src + alt + cls)) {
      const resolved = resolveUrl(base, src)
      if (resolved) logoUrl = resolved
    }
  })
  if (logoUrl) return logoUrl

  // 5. Favicon as last resort
  const favicon =
    $('link[rel="icon"][type="image/png"]').first().attr('href') ||
    $('link[rel="apple-touch-icon-precomposed"]').first().attr('href') ||
    $('link[rel="icon"]').first().attr('href') ||
    $('link[rel="shortcut icon"]').first().attr('href')
  if (favicon) return resolveUrl(base, favicon)

  return null
}


async function scrapeWebsite(url: string): Promise<{ content: string; logoUrl: string | null }> {
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

  const base = new URL(url)
  const $ = cheerio.load(html)

  // Extract logo before removing elements
  const logoUrl = extractLogoUrl(base, $)

  // Remove noise for text extraction
  $('script, style, noscript, nav, footer, header, iframe, img, svg, [aria-hidden="true"]').remove()

  const parts: string[] = []

  const title = $('title').text().trim()
  if (title) parts.push(`Page title: ${title}`)

  const metaDesc = $('meta[name="description"]').attr('content') || ''
  if (metaDesc) parts.push(`Meta description: ${metaDesc}`)

  const ogTitle = $('meta[property="og:title"]').attr('content') || ''
  if (ogTitle && ogTitle !== title) parts.push(`OG title: ${ogTitle}`)

  const headings: string[] = []
  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().trim()
    if (text && text.length > 2 && text.length < 200) headings.push(text)
  })
  if (headings.length) parts.push(`Headings: ${headings.slice(0, 20).join(' | ')}`)

  const paras: string[] = []
  $('p').each((_, el) => {
    const text = $(el).text().trim()
    if (text.length > 30 && text.length < 400) paras.push(text)
  })
  if (paras.length) parts.push(`Content:\n${paras.slice(0, 15).join('\n')}`)

  return { content: parts.join('\n\n').slice(0, 3000), logoUrl }
}

const SYSTEM_PROMPT = `You are a persuasive B2B sales copywriter for Nesti AI, an AI-enabled call handling solution built specifically for UK estate and letting agents.

ABOUT NESTI AI:
- Nesti AI is an AI-powered call handling solution, not a generic call answering or call centre service. Always make this distinction clear.
- Nesti AI replaces missed calls, voicemail, and outsourced call centres with an intelligent AI voice agent that understands property
- The AI voice agent handles inbound calls exactly like a senior negotiator would: asking the right questions, capturing perfect information, and never missing an enquiry
- Confidence scoring: Nesti AI scores every applicant and caller so agents know who to prioritise
- Automatic call forwarding: routes calls to the right team member or department instantly
- Email summaries: after every call, staff receive a complete, accurate summary with all key details
- CRM integrations: Reapit, Alto, SME Professional, Street.co.uk, Rex, Apex27
- 50+ estate agent clients including Fine & Country, Persimmon Homes, Richard James, Smart Property Group, Quealy & Co, Hunters
- Always available. Never off sick, never on lunch, never engaged. Truly 24/7 AI-powered availability.

YOUR TASK:
Write a compelling, personalised landing page that sells Nesti AI to the specific estate or letting agency described in the scraped content. Make it feel like it was written just for them. Always refer to the product as "Nesti AI" — never just "Nesti".

TONE: Professional, confident, specific. Reference their location, property types, or scale when possible. Focus on real business outcomes (more enquiries captured, less admin, better quality applicants, buyers, sellers, vendors, landlords and tenants through the door). Make it clear that Nesti AI is an intelligent AI solution, not a call centre or generic answering service.

WRITING RULES (follow these strictly):
- Always write "Nesti AI" not just "Nesti"
- Never use em dashes (the character —) anywhere in any copy
- Never use hyphens as dashes; rewrite the sentence instead
- Never use the word "lead" or "leads"; use "applicant", "buyer", "seller", "vendor", "landlord", "tenant", or "enquiry" as appropriate to context
- Write in natural estate and letting agency language; sound like an experienced property professional, not a generic tech marketer
- Use short, punchy sentences. No waffle.
- Use sentence case for all headings and titles (capitalise only the first word and proper nouns — never Title Case Every Word)

RETURN: A single valid JSON object matching this exact schema — no markdown, no explanation, just the JSON:

{
  "agencyName": "string — the estate agency's name",
  "agencyLocation": "string — their primary location/city",
  "agencySpecialty": "string — e.g. 'residential lettings', 'sales & lettings', 'new homes'",
  "heroHeadline": "string — compelling headline (max 12 words) that mentions their name or location",
  "heroSubheadline": "string — 1-2 sentences expanding on the headline, specific to their business. Must make clear this is an AI solution.",
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
    { "icon": "settings", "title": "Deep customisation", "description": "string — 1-2 sentences about how Nesti AI can be configured to sound and behave exactly like your best negotiator, tailored to the specific agency's brand, tone, and process" }
  ],
  "testimonial": {
    "quote": "string — a compelling testimonial from a real or representative Nesti AI client",
    "author": "string — e.g. 'Sarah Mitchell, Head of Lettings'",
    "company": "string — e.g. 'Richard James Estate Agents'"
  },
  "ctaHeadline": "string — final CTA headline, specific to them",
  "ctaDescription": "string — 1-2 sentences urging them to book a demo of Nesti AI"
}`

export async function POST(req: NextRequest) {
  try {
    const { url, contactFirstName } = await req.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'A URL is required.' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format.' }, { status: 400 })
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Only HTTP and HTTPS URLs are supported.' }, { status: 400 })
    }

    let scraped: { content: string; logoUrl: string | null }
    try {
      scraped = await scrapeWebsite(url)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (msg.includes('abort') || msg.includes('timeout')) {
        return NextResponse.json({ error: 'The website took too long to respond. Please try another URL.' }, { status: 400 })
      }
      return NextResponse.json({ error: `Could not fetch that website: ${msg}` }, { status: 400 })
    }

    if (!scraped.content || scraped.content.length < 50) {
      return NextResponse.json({
        error: 'Could not extract enough content from that website. It may require JavaScript to render or block automated access.',
      }, { status: 400 })
    }

    const firstName: string | null = (typeof contactFirstName === 'string' && contactFirstName.trim())
      ? contactFirstName.trim()
      : null

    const contactLine = firstName
      ? `\n\nCONTACT PERSON:\nFirst name: ${firstName}\n\nPersonalise the copy directly to ${firstName}. Address them by first name in the heroHeadline (e.g. "${firstName}, here's how Nesti AI can transform [Agency Name]") and reference them by first name in the ctaHeadline.`
      : ''

    const message = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here is the content scraped from ${url}:\n\n${scraped.content}${contactLine}\n\nGenerate the personalised Nesti landing page JSON for this agency. Return ONLY valid JSON, no other text.`,
        },
      ],
    })

    const rawContent = message.content[0]
    if (rawContent.type !== 'text') throw new Error('Unexpected response type from Claude')

    let pageData: Omit<LandingPageData, 'agencyLogoUrl' | 'contactName' | 'contactFirstName' | 'sourceUrl' | 'generatedAt'>
    try {
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
      agencyLogoUrl: scraped.logoUrl,
      contactName: firstName,
      contactFirstName: firstName,
      ctaUrl: 'https://calendly.com/d/cr85-n67-nt9/nesti-ai-demo',
      sourceUrl: url,
      generatedAt: new Date().toISOString(),
    }

    const id = uuidv4()
    const slug = await uniqueSlug(generateSlug(fullData.agencyName))
    await storePage(id, slug, fullData)

    return NextResponse.json({ id, slug, agencyName: fullData.agencyName })
  } catch (err) {
    console.error('[/api/generate]', err)
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (slug) {
    const resolvedId = await getSlugId(slug)
    if (!resolvedId) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    const data = await getPage(resolvedId)
    if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    return NextResponse.json({ id: resolvedId, ...data })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 })
  }
  const data = await getPage(id)
  if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 })
  }
  const existing = await getPage(id)
  if (!existing) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }
  try {
    const updates = await req.json()
    // Only allow updating editable content fields
    const allowed: (keyof LandingPageData)[] = [
      'heroHeadline', 'heroSubheadline', 'agencyName', 'agencyLocation', 'agencySpecialty',
      'painPoints', 'howItWorks', 'features', 'testimonial', 'ctaHeadline', 'ctaDescription', 'ctaUrl',
    ]
    const filtered: Partial<LandingPageData> = {}
    for (const key of allowed) {
      if (key in updates) (filtered as Record<string, unknown>)[key] = updates[key]
    }
    await updatePage(id, { ...existing, ...filtered } as LandingPageData)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
}
