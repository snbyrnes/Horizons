// Fetch every source, classify, merge with the stored history and write the static data files.
// Usage: node pipeline/run.mjs [--only id1,id2] [--dry]
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { SOURCES } from './sources.mjs'
import { adapters } from './adapters.mjs'
import { classify, TOPIC_LABELS } from './classify.mjs'
import { hashId, mapLimit, parseDate, toPlain } from './lib.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = path.join(ROOT, 'public', 'data')
const RETAIN_DAYS = 730
const MAX_PER_SOURCE = 200
const SITE_URL = (process.env.SITE_URL || 'https://example.github.io/horizons').replace(/\/$/, '')

const args = process.argv.slice(2)
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null
const dry = args.includes('--dry')

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')) } catch { return fallback }
}

function keep(source, c) {
  switch (source.filter ?? 'all') {
    case 'digital': return c.digital
    // A generic software fault in an unrelated device (say, a wheelchair) is out of scope.
    case 'medication': return c.medication || c.topics.some((t) => t !== 'software')
    case 'medication-digital': return c.medication && c.digital
    default: return true
  }
}

async function collect(source, now) {
  const seen = new Set()
  const alerts = []
  const errors = []
  let fetched = 0
  for (const feed of source.feeds) {
    try {
      let raw = await adapters[feed.adapter ?? 'rss'](feed)
      if (feed.take) raw = raw.slice(0, feed.take)
      fetched += raw.length
      for (const r of raw) {
        const title = toPlain(r.title, 260)
        if (!title || !/^https?:\/\//i.test(r.url ?? '')) continue
        if (feed.include && !new RegExp(feed.include, 'i').test(`${title} ${r.url}`)) continue
        if (feed.exclude && new RegExp(feed.exclude, 'i').test(`${title} ${r.url}`)) continue
        const id = hashId(source.id, r.key ?? r.url.replace(/#.*$/, '').replace(/[?&]utm_[^&]*/g, '').replace(/\/$/, ''))
        if (seen.has(id)) continue
        seen.add(id)
        let summary = toPlain(r.summary)
        if (/^The post .* appeared first on /i.test(summary)) summary = '' // WordPress boilerplate
        let published = parseDate(r.date, { dayFirst: source.dayFirst ?? true })
        const dated = Boolean(published)
        if (!published || Date.parse(published) > now + 2 * 864e5) published = null
        const hints = { ...source.hints, ...feed.hints }
        const c = classify({ title, summary }, hints)
        // Some sources are digital by construction (for example a literature search on health IT).
        if (hints.digital) c.digital = true
        if (!keep({ filter: feed.filter ?? source.filter }, c)) continue
        alerts.push({
          id,
          source: source.id,
          title,
          url: r.url,
          published,
          dated,
          summary: summary === title ? '' : summary,
          severity: c.severity,
          kind: c.kind,
          digital: c.digital,
          topics: c.topics,
        })
      }
    } catch (err) {
      errors.push(`${feed.url ?? feed.adapter}: ${err.cause?.code ?? err.message}`)
    }
  }
  return { alerts, errors, fetched }
}

/** The same notice often appears in two feeds (for example FDA MedWatch and FDA Devices). Keep one. */
function notRepeat() {
  const seen = new Map()
  return (a) => {
    const key = a.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
    if (key.length < 30) return true
    const t = Date.parse(a.published)
    const prev = seen.get(key)
    if (prev != null && Math.abs(prev - t) < 10 * 864e5) return false
    seen.set(key, t)
    return true
  }
}

function buildRss(alerts, sourcesById, generatedAt) {
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch])
  const items = alerts.slice(0, 60).map((a) => `    <item>
      <title>${esc(`${sourcesById[a.source]?.short ?? a.source}: ${a.title}`)}</title>
      <link>${esc(a.url)}</link>
      <guid isPermaLink="false">${a.id}</guid>
      <pubDate>${new Date(a.published).toUTCString()}</pubDate>
      <description>${esc(a.summary || a.title)}</description>
${a.topics.map((t) => `      <category>${esc(TOPIC_LABELS[t])}</category>`).join('\n')}
    </item>`)
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Horizons: medication safety in digital systems</title>
    <link>${esc(SITE_URL)}/</link>
    <description>Medication safety alerts involving digital systems, collated from regulators, safety organisations and standards bodies worldwide.</description>
    <lastBuildDate>${new Date(generatedAt).toUTCString()}</lastBuildDate>
${items.join('\n')}
  </channel>
</rss>
`
}

async function main() {
  const now = Date.now()
  const generatedAt = new Date(now).toISOString()
  const prev = await readJson(path.join(DATA_DIR, 'alerts.json'), { alerts: [] })
  const prevStatus = await readJson(path.join(DATA_DIR, 'sources.json'), { sources: [] })
  const prevStatusById = Object.fromEntries(prevStatus.sources.map((s) => [s.id, s]))
  const byId = new Map(prev.alerts.map((a) => [a.id, a]))

  const active = SOURCES.filter((s) => !only || only.includes(s.id))
  const results = await mapLimit(active, 6, async (source) => {
    const started = Date.now()
    const res = await collect(source, now)
    const ms = Date.now() - started
    const flag = res.errors.length ? (res.alerts.length ? 'PARTIAL' : 'FAIL') : res.alerts.length ? 'ok' : 'EMPTY'
    console.log(`${flag.padEnd(8)}${source.id.padEnd(28)} kept ${String(res.alerts.length).padStart(4)} of ${String(res.fetched).padStart(4)}  ${ms}ms${res.errors.length ? `  ${res.errors.join('; ')}` : ''}`)
    return res
  })

  const statuses = []
  active.forEach((source, i) => {
    const { alerts, errors, fetched } = results[i]
    const known = prev.alerts.some((a) => a.source === source.id)
    let undatedBacklog = 0
    for (const a of alerts) {
      const old = byId.get(a.id)
      // Undated items take the time we first saw them. On a source's first load that would
      // flood "today", so the backlog is spread one per day in listing order instead.
      if (!a.published) {
        if (old) a.published = old.published
        else if (known || prevStatusById[source.id]?.lastSuccess) a.published = generatedAt
        else a.published = new Date(now - ++undatedBacklog * 864e5).toISOString()
      }
      a.firstSeen = old?.firstSeen ?? (known ? generatedAt : a.published)
      byId.set(a.id, a)
    }
    const p = prevStatusById[source.id]
    const ok = errors.length === 0 || alerts.length > 0
    statuses.push({
      id: source.id,
      name: source.name,
      short: source.short ?? source.name,
      country: source.country,
      region: source.region,
      type: source.type,
      home: source.home,
      lang: source.lang ?? 'en',
      note: source.note,
      status: errors.length ? (alerts.length ? 'partial' : 'error') : fetched ? 'ok' : 'empty',
      error: errors.join('; ') || undefined,
      lastChecked: generatedAt,
      lastSuccess: ok && fetched ? generatedAt : p?.lastSuccess ?? null,
    })
  })
  // Sources not run this time (--only) keep their previous status.
  for (const s of SOURCES) if (!statuses.some((x) => x.id === s.id) && prevStatusById[s.id]) statuses.push(prevStatusById[s.id])

  const validSources = new Set(SOURCES.map((s) => s.id))
  const cutoff = now - RETAIN_DAYS * 864e5
  const perSource = {}
  const alerts = [...byId.values()]
    .filter((a) => validSources.has(a.source) && Date.parse(a.published) >= cutoff)
    .sort((a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id))
    .filter(notRepeat())
    .filter((a) => (perSource[a.source] = (perSource[a.source] ?? 0) + 1) <= MAX_PER_SOURCE)

  for (const s of statuses) {
    const mine = alerts.filter((a) => a.source === s.id)
    s.count = mine.length
    s.digitalCount = mine.filter((a) => a.digital).length
    s.latest = mine[0]?.published ?? null
  }
  statuses.sort((a, b) => a.name.localeCompare(b.name))

  const failing = statuses.filter((s) => s.status === 'error').length
  console.log(`\n${alerts.length} alerts (${alerts.filter((a) => a.digital).length} digital) from ${statuses.filter((s) => s.count).length}/${statuses.length} sources; ${failing} failing`)
  if (dry) return

  // Refuse to overwrite good data if nearly everything failed (e.g. runner had no network).
  if (active.length > 5 && failing > active.length * 0.7) {
    console.error('Too many sources failed; leaving existing data untouched.')
    process.exit(1)
  }

  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(path.join(DATA_DIR, 'alerts.json'), JSON.stringify({ generatedAt, topics: TOPIC_LABELS, alerts }))
  await writeFile(path.join(DATA_DIR, 'sources.json'), JSON.stringify({ generatedAt, sources: statuses }, null, 1))
  const sourcesById = Object.fromEntries(statuses.map((s) => [s.id, s]))
  await writeFile(path.join(ROOT, 'public', 'feed.xml'), buildRss(alerts.filter((a) => a.digital), sourcesById, generatedAt))
}

main().catch((err) => { console.error(err); process.exit(1) })
