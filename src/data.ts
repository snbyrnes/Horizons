export type Severity = 'critical' | 'high' | 'advisory' | 'info'
export type Lens = 'all' | 'digital'

export interface Alert {
  id: string
  source: string
  title: string
  url: string
  published: string
  dated: boolean
  summary: string
  severity: Severity
  kind: string
  digital: boolean
  topics: string[]
  firstSeen: string
  /** Derived client-side. */
  time: number
  hay: string
}

export interface Source {
  id: string
  name: string
  short: string
  country: string
  region: string
  type: string
  home: string
  lang: string
  note?: string
  status: 'ok' | 'partial' | 'error' | 'empty'
  error?: string
  lastChecked: string
  lastSuccess: string | null
  count: number
  digitalCount: number
  latest: string | null
}

export interface Dataset {
  generatedAt: string
  topics: Record<string, string>
  alerts: Alert[]
  sources: Source[]
  sourceById: Record<string, Source>
}

export const SEVERITIES: { id: Severity; label: string; help: string }[] = [
  { id: 'critical', label: 'Critical', help: 'Urgent action, most serious recall class, or reports of death or serious harm' },
  { id: 'high', label: 'High', help: 'Recalls, warnings and reported medication errors' },
  { id: 'advisory', label: 'Advisory', help: 'Safety updates, guidance, reminders and shortages' },
  { id: 'info', label: 'Information', help: 'News, reports and research' },
]

export const KIND_LABELS: Record<string, string> = {
  alert: 'Safety alert',
  recall: 'Recall',
  shortage: 'Shortage',
  guidance: 'Guidance',
  report: 'Report',
  research: 'Research',
  news: 'News',
}

export const TYPE_LABELS: Record<string, string> = {
  regulator: 'Regulators',
  safety: 'Safety organisations',
  healthcare: 'Healthcare bodies',
  standards: 'Standards bodies',
  research: 'Research literature',
}

export const REGIONS = ['Global', 'UK and Ireland', 'Europe', 'North America', 'Asia-Pacific', 'Rest of world']

export const RANGES: { id: string; label: string; days: number | null }[] = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: '90d', label: '90 days', days: 90 },
  { id: '1y', label: '1 year', days: 365 },
  { id: 'all', label: 'All', days: null },
]

export async function loadDataset(): Promise<Dataset> {
  const base = import.meta.env.BASE_URL
  const [a, s] = await Promise.all(
    ['data/alerts.json', 'data/sources.json'].map(async (f) => {
      const res = await fetch(`${base}${f}`, { cache: 'no-cache' })
      if (!res.ok) throw new Error(`Could not load ${f} (HTTP ${res.status})`)
      return res.json()
    }),
  )
  const sources: Source[] = s.sources
  const sourceById = Object.fromEntries(sources.map((x) => [x.id, x]))
  const alerts: Alert[] = (a.alerts as Alert[])
    .filter((x) => sourceById[x.source])
    .map((x) => ({
      ...x,
      time: Date.parse(x.published),
      hay: `${x.title} ${x.summary} ${sourceById[x.source].name} ${sourceById[x.source].short} ${sourceById[x.source].country}`.toLowerCase(),
    }))
  return { generatedAt: a.generatedAt, topics: a.topics, alerts, sources, sourceById }
}

/* ---------- Filters ---------- */

export interface Filters {
  lens: Lens
  q: string
  range: string
  sev: string[]
  topic: string[]
  region: string[]
  type: string[]
  kind: string[]
  source: string[]
  saved: boolean
  /** Research papers are hidden unless asked for, so the list stays focused on notices. */
  research: boolean
}

export const DEFAULT_FILTERS: Filters = {
  lens: 'all', q: '', range: '90d', sev: [], topic: [], region: [], type: [], kind: [], source: [], saved: false, research: false,
}

const LIST_KEYS = ['sev', 'topic', 'region', 'type', 'kind', 'source'] as const
export type FacetKey = (typeof LIST_KEYS)[number]

export function filtersToQuery(f: Filters): string {
  const p = new URLSearchParams()
  if (f.lens !== DEFAULT_FILTERS.lens) p.set('lens', f.lens)
  if (f.q) p.set('q', f.q)
  if (f.range !== DEFAULT_FILTERS.range) p.set('range', f.range)
  for (const k of LIST_KEYS) if (f[k].length) p.set(k, f[k].join('~'))
  if (f.saved) p.set('saved', '1')
  if (f.research) p.set('research', '1')
  return p.toString()
}

export function queryToFilters(query: string): Filters {
  const p = new URLSearchParams(query)
  const f: Filters = { ...DEFAULT_FILTERS }
  if (p.get('lens') === 'digital') f.lens = 'digital'
  f.q = p.get('q') ?? ''
  const range = p.get('range')
  if (range && RANGES.some((r) => r.id === range)) f.range = range
  for (const k of LIST_KEYS) f[k] = p.get(k)?.split('~').filter(Boolean) ?? []
  f.saved = p.get('saved') === '1'
  f.research = p.get('research') === '1'
  return f
}

export function countActive(f: Filters): number {
  return LIST_KEYS.reduce((n, k) => n + f[k].length, 0) + (f.q ? 1 : 0) + (f.saved ? 1 : 0)
}

function facetValue(a: Alert, key: FacetKey, ds: Dataset): string | string[] {
  switch (key) {
    case 'sev': return a.severity
    case 'topic': return a.topics
    case 'region': return ds.sourceById[a.source].region
    case 'type': return ds.sourceById[a.source].type
    case 'kind': return a.kind
    case 'source': return a.source
  }
}

function passesFacet(a: Alert, key: FacetKey, selected: string[], ds: Dataset): boolean {
  if (!selected.length) return true
  const v = facetValue(a, key, ds)
  return Array.isArray(v) ? v.some((x) => selected.includes(x)) : selected.includes(v)
}

export interface FilterResult {
  /** Matches every filter. */
  results: Alert[]
  /** Matches everything except the time range (drives the activity chart). */
  anyTime: Alert[]
  /** For each facet, counts of each value with all other filters applied. */
  counts: Record<FacetKey, Record<string, number>>
}

export function applyFilters(ds: Dataset, f: Filters, saved: Set<string>, now: number): FilterResult {
  const days = RANGES.find((r) => r.id === f.range)?.days ?? null
  const since = days == null ? -Infinity : now - days * 864e5
  const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean)
  const counts = Object.fromEntries(LIST_KEYS.map((k) => [k, {}])) as FilterResult['counts']
  const results: Alert[] = []
  const anyTime: Alert[] = []

  for (const a of ds.alerts) {
    if (f.lens === 'digital' && !a.digital) continue
    if (f.saved && !saved.has(a.id)) continue
    if (a.kind === 'research' && !f.research && !f.kind.includes('research') && !f.saved) continue
    if (terms.length && !terms.every((t) => a.hay.includes(t))) continue
    const pass = LIST_KEYS.map((k) => passesFacet(a, k, f[k], ds))
    const failed = pass.filter((p) => !p).length
    const inRange = a.time >= since
    if (failed === 0) anyTime.push(a)
    if (!inRange) continue
    if (failed === 0) results.push(a)
    // A facet's counts ignore that facet's own selection.
    LIST_KEYS.forEach((k, i) => {
      if (failed === 0 || (failed === 1 && !pass[i])) {
        const v = facetValue(a, k, ds)
        for (const x of Array.isArray(v) ? v : [v]) counts[k][x] = (counts[k][x] ?? 0) + 1
      }
    })
  }
  return { results, anyTime, counts }
}

/* ---------- Formatting ---------- */

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
const dayYearFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
const shortFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export const dayKey = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function dayLabel(t: number, now: number): string {
  const startOfDay = (x: number) => new Date(x).setHours(0, 0, 0, 0)
  const diff = Math.round((startOfDay(now) - startOfDay(t)) / 864e5)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return new Date(t).getFullYear() === new Date(now).getFullYear() ? dayFmt.format(t) : dayYearFmt.format(t)
}

export const shortDate = (iso: string | null) => (iso ? shortFmt.format(new Date(iso)) : 'never')

export function timeAgo(iso: string, now: number): string {
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 6e4))
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`

/* ---------- Local storage (per-browser conveniences only) ---------- */

export function readStore<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(`horizon.${key}`)
    return v == null ? fallback : (JSON.parse(v) as T)
  } catch {
    return fallback
  }
}

export function writeStore(key: string, value: unknown) {
  try { localStorage.setItem(`horizon.${key}`, JSON.stringify(value)) } catch { /* private mode */ }
}
