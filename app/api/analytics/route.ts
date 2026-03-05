import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null

// In-memory fallback for local dev (resets on server restart)
const memEvents: Array<{
  page_id: string; agency_name: string; event_type: string; created_at: string
}> = []

// ─── POST /api/analytics — log an event ───────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { page_id, agency_name, event_type } = await req.json()
    if (!page_id || !event_type) return NextResponse.json({ ok: false }, { status: 400 })

    const event = {
      page_id: String(page_id),
      agency_name: String(agency_name || ''),
      event_type: String(event_type),
      created_at: new Date().toISOString(),
    }

    if (supabase) {
      await supabase.from('nesti_events').insert(event)
    } else {
      memEvents.push(event)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

// ─── GET /api/analytics — return aggregated stats (last 30 days) ──────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const filterPageId = searchParams.get('page_id')
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    let events: Array<{ page_id: string; agency_name: string; event_type: string; created_at: string }>

    if (supabase) {
      let query = supabase
        .from('nesti_events')
        .select('page_id, agency_name, event_type, created_at')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(10000)
      if (filterPageId) query = query.eq('page_id', filterPageId)
      const { data } = await query
      events = (data ?? []) as typeof events
    } else {
      events = memEvents.filter(e => e.created_at >= cutoff && (!filterPageId || e.page_id === filterPageId))
    }

    // Single-page mode: return compact stats
    if (filterPageId) {
      let views = 0, cta_clicks = 0, phone_clicks = 0, last_seen = ''
      for (const e of events) {
        if (e.event_type === 'page_view') views++
        else if (e.event_type === 'cta_click') cta_clicks++
        else if (e.event_type === 'phone_click') phone_clicks++
        if (e.created_at > last_seen) last_seen = e.created_at
      }
      return NextResponse.json({ views, cta_clicks, phone_clicks, last_seen: last_seen || null })
    }

    // Aggregate by page_id
    const pages = new Map<string, {
      page_id: string; agency_name: string
      views: number; cta_clicks: number; phone_clicks: number; last_seen: string
    }>()

    for (const event of events) {
      if (!pages.has(event.page_id)) {
        pages.set(event.page_id, {
          page_id: event.page_id,
          agency_name: event.agency_name || 'Unknown',
          views: 0, cta_clicks: 0, phone_clicks: 0,
          last_seen: event.created_at,
        })
      }
      const p = pages.get(event.page_id)!
      if (event.event_type === 'page_view') p.views++
      else if (event.event_type === 'cta_click') p.cta_clicks++
      else if (event.event_type === 'phone_click') p.phone_clicks++
      if (event.created_at > p.last_seen) p.last_seen = event.created_at
    }

    const rows = Array.from(pages.values()).sort((a, b) => b.views - a.views)

    // Summary totals
    const totals = rows.reduce(
      (acc, r) => ({ views: acc.views + r.views, cta_clicks: acc.cta_clicks + r.cta_clicks, phone_clicks: acc.phone_clicks + r.phone_clicks }),
      { views: 0, cta_clicks: 0, phone_clicks: 0 }
    )

    return NextResponse.json({ rows, totals })
  } catch {
    return NextResponse.json({ rows: [], totals: { views: 0, cta_clicks: 0, phone_clicks: 0 } })
  }
}
