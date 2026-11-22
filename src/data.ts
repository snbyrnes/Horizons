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
  /** The publisher's own classification where it states one, for example "Class 2" or "Type I". */
  pclass?: string
  kind: string
  digital: boolean
  topics: string[]
  firstSeen: string
  linkLabel?: string
  /** Derived client-side. */
  time: number
  seen: number
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
  status: 'ok' | 'quiet' | 'partial' | 'error' | 'empty'
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
  alertById: Map<string, Alert>
  sources: Source[]
  sourceById: Record<string, Source>
}

export const SEVERITIES: { id: Severity; label: string; help: string }[] = [
  { id: 'critical', label: 'Critical', help: 'Most serious recall class (Class I, Class 1, Type I), a National Patient Safety Alert, or reported deaths or serious harm' },
  { id: 'high', label: 'High', help: 'Class II or Type II recalls, letters to healthcare professionals (DHPC), and notices whose title reports a recall, warning or medication error' },
  { id: 'advisory', label: 'Advisory', help: 'Lower recall classes, safety updates, guidance, reminders and shortages' },
  { id: 'info', label: 'Information', help: 'News, reports and research' },
]
export const SEV_LABEL = Object.fromEntries(SEVERITIES.map((s) => [s.id, s.label])) as Record<Severity, string>
const SEV_RANK: Record<Severity, number> = { critical: 0, high: 1, advisory: 2, info: 3 }

export const KIND_LABELS: Record<string, string> = {
  alert: 'Safety alert',
  recall: 'Recall',
  shortage: 'Shortage',
  guidance: 'Guidance',
  report: 'Report',
  news: 'News',
  research: 'Research',
}

export const TYPE_LABELS: Record<string, string> = {
  regulator: 'Regulators',
  safety: 'Safety organisations',
  healthcare: 'Healthcare bodies',
  standards: 'Standards bodies',
  research: 'Research literature',
}

export const REGIONS = ['Global', 'UK and Ireland', 'Europe', 'North America', 'Asia-Pacific', 'Africa and Latin America']

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
      seen: Date.parse(x.firstSeen),
      hay: `${x.title} ${x.summary} ${x.pclass ?? ''} ${sourceById[x.source].name} ${sourceById[x.source].short} ${sourceById[x.source].country}`.toLowerCase(),
    }))
  return { generatedAt: a.generatedAt, topics: a.topics, alerts, alertById: new Map(alerts.map((x) => [x.id, x])), sources, sourceById }
}

/* ---------- Search synonyms ---------- */

// Brand and generic names that people use interchangeably. Searching for any name in a group
// finds alerts that mention any other. Deliberately small: common products with many alerts.
const SYNONYM_GROUPS = [
  ['semaglutide', 'ozempic', 'wegovy', 'rybelsus'],
  ['tirzepatide', 'mounjaro', 'zepbound'],
  ['liraglutide', 'victoza', 'saxenda'],
  ['dulaglutide', 'trulicity'],
  ['paracetamol', 'acetaminophen', 'tylenol', 'panadol'],
  ['adrenaline', 'epinephrine', 'epipen'],
  ['salbutamol', 'albuterol', 'ventolin'],
  ['pethidine', 'meperidine'],
  ['frusemide', 'furosemide', 'lasix'],
  ['lignocaine', 'lidocaine'],
  ['glyceryl trinitrate', 'nitroglycerin', 'gtn'],
  ['noradrenaline', 'norepinephrine'],
  ['apixaban', 'eliquis'],
  ['rivaroxaban', 'xarelto'],
  ['warfarin', 'coumadin'],
  ['valproate', 'valproic', 'epilim', 'depakote', 'depakine'],
  ['methotrexate', 'metoject'],
  ['insulin glargine', 'lantus', 'toujeo'],
  ['insulin detemir', 'levemir'],
  ['insulin aspart', 'novorapid', 'novolog', 'fiasp'],
  ['morphine', 'oramorph'],
  ['oxycodone', 'oxycontin', 'oxynorm'],
  ['fentanyl', 'durogesic', 'duragesic'],
  ['adalimumab', 'humira'],
  ['pembrolizumab', 'keytruda'],
  ['epr', 'ehr', 'emr', 'electronic health record', 'electronic patient record', 'electronic medical record'],
  ['epma', 'cpoe', 'eprescribing', 'e-prescribing', 'electronic prescribing'],
  ['adc', 'automated dispensing cabinet', 'pyxis', 'omnicell'],
  ['bcma', 'barcode medication administration'],
]
const SYNONYMS = new Map<string, string[]>()
for (const g of SYNONYM_GROUPS) for (const w of g) SYNONYMS.set(w, g)

/** Each search word must match, either itself or one of its synonyms. */
export function searchMatcher(q: string): ((hay: string) => boolean) | null {
  const text = q.toLowerCase().trim()
  if (!text) return null
  const whole = SYNONYMS.get(text)
  if (whole) return (hay) => whole.some((w) => hay.includes(w))
  const groups = text.split(/\s+/).map((t) => SYNONYMS.get(t) ?? [t])
  return (hay) => groups.every((g) => g.some((w) => hay.includes(w)))
}

export function synonymsFor(q: string): string[] {
  const text = q.toLowerCase().trim()
  const all = new Set<string>()
  for (const t of [text, ...text.split(/\s+/)]) for (const w of SYNONYMS.get(t) ?? []) if (w !== t) all.add(w)
  return [...all]
}

/* ---------- Filters ---------- */

export interface Filters {
  lens: Lens
  q: string
  range: string
  sort: 'date' | 'severity'
  sev: string[]
  topic: string[]
  region: string[]
  country: string[]
  type: string[]
  kind: string[]
  source: string[]
  saved: boolean
  /** Research papers are hidden unless asked for, so the list stays focused on notices. */
  research: boolean
  /** Only alerts first seen since the reader's previous visit. */
  fresh: boolean
  /** Id of the alert opened by a shared link. */
  open: string
}

export const DEFAULT_FILTERS: Filters = {
  lens: 'all', q: '', range: '30d', sort: 'date', sev: [], topic: [], region: [], country: [], type: [], kind: [], source: [],
  saved: false, research: false, fresh: false, open: '',
}

const LIST_KEYS = ['sev', 'topic', 'region', 'country', 'type', 'kind', 'source'] as const
export type FacetKey = (typeof LIST_KEYS)[number]

export function filtersToQuery(f: Filters): string {
  const p = new URLSearchParams()
  if (f.lens !== DEFAULT_FILTERS.lens) p.set('lens', f.lens)
  if (f.q) p.set('q', f.q)
  if (f.range !== DEFAULT_FILTERS.range) p.set('range', f.range)
  if (f.sort !== DEFAULT_FILTERS.sort) p.set('sort', f.sort)
  for (const k of LIST_KEYS) if (f[k].length) p.set(k, f[k].join('~'))
  if (f.saved) p.set('saved', '1')
  if (f.research) p.set('research', '1')
  if (f.fresh) p.set('new', '1')
  if (f.open) p.set('open', f.open)
  return p.toString()
}

export function queryToFilters(query: string): Filters {
  const p = new URLSearchParams(query)
  const f: Filters = { ...DEFAULT_FILTERS }
  if (p.get('lens') === 'digital') f.lens = 'digital'
  f.q = p.get('q') ?? ''
  const range = p.get('range')
  if (range && RANGES.some((r) => r.id === range)) f.range = range
  if (p.get('sort') === 'severity') f.sort = 'severity'
  for (const k of LIST_KEYS) f[k] = p.get(k)?.split('~').filter(Boolean) ?? []
  f.saved = p.get('saved') === '1'
  f.research = p.get('research') === '1'
  f.fresh = p.get('new') === '1'
  f.open = p.get('open') ?? ''
  return f
}

export function countActive(f: Filters): number {
  return LIST_KEYS.reduce((n, k) => n + f[k].length, 0) + (f.saved ? 1 : 0) + (f.fresh ? 1 : 0)
}

function facetValue(a: Alert, key: FacetKey, ds: Dataset): string | string[] {
  switch (key) {
    case 'sev': return a.severity
    case 'topic': return a.topics
    case 'region': return ds.sourceById[a.source].region
    case 'country': return ds.sourceById[a.source].country
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
  results: Alert[]
  /** For each facet, counts of each value with all other filters applied. */
  counts: Record<FacetKey, Record<string, number>>
  /** How many alerts in the current lens were first seen since the last visit (ignores other filters). */
  freshCount: number
}

export function applyFilters(ds: Dataset, f: Filters, saved: Set<string>, now: number, seenUntil: number | null): FilterResult {
  const days = RANGES.find((r) => r.id === f.range)?.days ?? null
  const since = days == null ? -Infinity : now - days * 864e5
  const match = searchMatcher(f.q)
  const counts = Object.fromEntries(LIST_KEYS.map((k) => [k, {}])) as FilterResult['counts']
  const results: Alert[] = []
  let freshCount = 0

  for (const a of ds.alerts) {
    if (f.lens === 'digital' && !a.digital) continue
    const background = a.kind === 'research' && !f.research && !f.kind.includes('research') && !f.saved
    const isFresh = seenUntil != null && a.seen > seenUntil
    if (isFresh && !background) freshCount++
    if (background) continue
    if (f.saved && !saved.has(a.id)) continue
    if (f.fresh && !isFresh) continue
    if (match && !match(a.hay)) continue
    // "New since last visit" and saved lists are about the reader, not a date window.
    if (!f.fresh && !f.saved && a.time < since) continue
    const pass = LIST_KEYS.map((k) => passesFacet(a, k, f[k], ds))
    const failed = pass.filter((p) => !p).length
    if (failed === 0) results.push(a)
    // A facet's counts ignore that facet's own selection.
    LIST_KEYS.forEach((k, i) => {
      if (failed === 0 || (failed === 1 && !pass[i])) {
        const v = facetValue(a, k, ds)
        for (const x of Array.isArray(v) ? v : [v]) counts[k][x] = (counts[k][x] ?? 0) + 1
      }
    })
  }
  if (f.sort === 'severity') results.sort((x, y) => SEV_RANK[x.severity] - SEV_RANK[y.severity] || y.time - x.time)
  return { results, counts, freshCount }
}

/* ---------- Export and sharing ---------- */

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`

export function toCsv(alerts: Alert[], ds: Dataset): string {
  const head = ['Date', 'Title', 'Organisation', 'Country', 'Publisher class', 'Horizons severity', 'Type of notice', 'Digital topics', 'Link', 'Extract']
  const rows = alerts.map((a) => {
    const s = ds.sourceById[a.source]
    return [
      a.published.slice(0, 10), a.title, s.name, s.country, a.pclass ?? '', SEV_LABEL[a.severity], KIND_LABELS[a.kind] ?? a.kind,
      a.topics.map((t) => ds.topics[t]).join('; '), a.url, a.summary,
    ].map(csvCell).join(',')
  })
  // The byte order mark makes Excel read the file as UTF-8.
  return `﻿${head.map(csvCell).join(',')}\r\n${rows.join('\r\n')}\r\n`
}

export function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function alertLink(id: string): string {
  return `${window.location.origin}${window.location.pathname}#/?open=${id}`
}

/* ---------- Formatting ---------- */

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
const dayYearFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
const shortFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const rowFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })

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
export const rowDate = (t: number, now: number) =>
  new Date(t).getFullYear() === new Date(now).getFullYear() ? rowFmt.format(t) : shortFmt.format(t)

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

export const languageName = (code: string) => {
  try { return new Intl.DisplayNames(undefined, { type: 'language' }).of(code) ?? code } catch { return code }
}

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

/**
 * When the reader last caught up. Held for the whole browser session so that moving between
 * pages or reloading does not clear the "new" markers; it advances only on "Mark all as read"
 * or at the start of the next session.
 */
export function readSeenUntil(): number | null {
  try {
    const session = sessionStorage.getItem('horizon.seenUntil')
    if (session != null) return session === 'none' ? null : Number(session)
    const prev = readStore<number | null>('lastVisit', null)
    sessionStorage.setItem('horizon.seenUntil', prev == null ? 'none' : String(prev))
    writeStore('lastVisit', Date.now())
    return prev
  } catch {
    return null
  }
}

export function markAllRead(): number {
  const now = Date.now()
  try { sessionStorage.setItem('horizon.seenUntil', String(now)) } catch { /* private mode */ }
  writeStore('lastVisit', now)
  return now
}
