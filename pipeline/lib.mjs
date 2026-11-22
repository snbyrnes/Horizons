import { createHash } from 'node:crypto'
import { XMLParser } from 'fast-xml-parser'
import * as cheerio from 'cheerio'

export const USER_AGENT = 'Mozilla/5.0 (compatible; HorizonMedSafety/1.0; medication safety alert aggregator)'

const inFlight = new Map()

/** GET a URL as text. Identical URLs are fetched once per run. */
export function fetchText(url, opts) {
  if (!inFlight.has(url)) inFlight.set(url, fetchTextOnce(url, opts))
  return inFlight.get(url)
}

async function fetchTextOnce(url, { timeout = 30000, retries = 2, headers = {} } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          // Plain curl-like headers: several regulators return empty or hanging responses to
          // specific Accept or Accept-Language values.
          Accept: '*/*',
          ...headers,
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeout),
      })
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`)
        // Client errors other than 429 will not improve on retry.
        if (res.status < 500 && res.status !== 429) { err.fatal = true }
        throw err
      }
      return await res.text()
    } catch (err) {
      lastErr = err
      if (err.fatal) break
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
    }
  }
  throw lastErr
}

export async function fetchJson(url, opts) {
  return JSON.parse(await fetchText(url, opts))
}

export function hashId(...parts) {
  return createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 14)
}

/** Strip markup and collapse whitespace. */
export function toPlain(html, max = 420) {
  if (html == null) return ''
  let s = String(html)
  if (/[<&]/.test(s)) s = cheerio.load(`<div id="x">${s}</div>`)('#x').text()
  s = s.replace(/\s+/g, ' ').trim()
  if (s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, '') + '…'
  return s
}

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
  januar: 0, februar: 1, märz: 2, maerz: 2, mai: 4, juni: 5, juli: 6, oktober: 9, dezember: 11,
  janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, juin: 5, juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11, decembre: 11,
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
}

/** Parse the many date shapes regulators publish. Returns an ISO string or null. */
export function parseDate(input, { dayFirst = true } = {}) {
  if (input == null || input === '') return null
  if (typeof input === 'number') return new Date(input > 1e12 ? input : input * 1000).toISOString()
  const s = String(input).replace(/\s+/g, ' ').trim()
  let m
  // 20261122 (openFDA)
  if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/))) return iso(+m[1], +m[2] - 1, +m[3])
  // ISO-like or RFC 822
  if (/^\d{4}-\d{2}-\d{2}/.test(s) || /^[A-Za-z]{3},/.test(s)) {
    const t = Date.parse(s)
    if (!Number.isNaN(t)) return new Date(t).toISOString()
  }
  // 22/11/2026, 22.11.2026, 22-11-2026, possibly inside other text ("Publié le 22/11/2026")
  if ((m = s.match(/(?<!\d)(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?!\d)/))) {
    const [a, b] = [+m[1], +m[2]]
    const [d, mo] = (dayFirst || a > 12) && b <= 12 ? [a, b] : [b, a]
    return iso(+m[3], mo - 1, d)
  }
  // 22 November 2026 / 22nd Nov 2026 / 22. November 2026
  if ((m = s.match(/(\d{1,2})(?:st|nd|rd|th|\.|er)? (?:de )?(\p{L}{3,})\.?,? (?:de )?(\d{4})/u))) {
    const mo = month(m[2])
    if (mo != null) return iso(+m[3], mo, +m[1])
  }
  // November 22, 2026
  if ((m = s.match(/(\p{L}{3,})\.? (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})/u))) {
    const mo = month(m[1])
    if (mo != null) return iso(+m[3], mo, +m[2])
  }
  // November 2026
  if ((m = s.match(/(\p{L}{3,}) (\d{4})/u))) {
    const mo = month(m[1])
    if (mo != null) return iso(+m[2], mo, 1)
  }
  const t = Date.parse(s)
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}

function month(name) {
  const k = name.toLowerCase()
  return MONTHS[k] ?? MONTHS[k.slice(0, 3)] ?? null
}

function iso(y, m, d) {
  const t = Date.UTC(y, m, d, 12)
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
  parseTagValue: false,
  processEntities: { maxTotalExpansions: 100000, maxExpandedLength: 10_000_000 },
  htmlEntities: true,
})

const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v])
const text = (v) => (v == null ? '' : typeof v === 'object' ? (v['#text'] ?? v['@_href'] ?? '') : String(v))

/** Parse RSS 2.0, RSS 1.0 (RDF) or Atom into a uniform item list. */
export function parseFeed(body) {
  const doc = xml.parse(body)
  const out = []
  if (doc.feed) {
    for (const e of arr(doc.feed.entry)) {
      const links = arr(e.link)
      const link = links.find((l) => typeof l === 'object' && (l['@_rel'] ?? 'alternate') === 'alternate') ?? links[0]
      out.push({
        title: text(e.title),
        url: typeof link === 'object' ? link['@_href'] : text(link),
        date: text(e.updated) || text(e.published),
        summary: text(e.summary) || text(e.content),
      })
    }
    return out
  }
  const items = doc.rss?.channel?.item ?? doc['rdf:RDF']?.item ?? doc.channel?.item
  if (items === undefined && !doc.rss && !doc['rdf:RDF']) throw new Error('Not an RSS or Atom document')
  for (const i of arr(items)) {
    out.push({
      title: text(i.title),
      url: text(i.link) || text(i.guid),
      date: text(i.pubDate) || text(i['dc:date']) || text(i.date) || text(i['a10:updated']),
      summary: text(i.description) || text(i['content:encoded']),
    })
  }
  return out
}

/** Scrape a server-rendered listing page using CSS selectors from the source config. */
export function parseHtmlList(body, cfg, baseUrl) {
  const $ = cheerio.load(body)
  const out = []
  $(cfg.item).each((_, el) => {
    const $el = $(el)
    const $title = cfg.title ? $el.find(cfg.title).first() : $el
    const $link = cfg.link ? $el.find(cfg.link).first() : $title.is('a') ? $title : $title.find('a').first().length ? $title.find('a').first() : $el.is('a') ? $el : $el.find('a').first()
    const href = $link.attr('href')
    const title = $title.text().replace(/\s+/g, ' ').trim()
    if (!href || !title) return
    let date = ''
    if (cfg.date) {
      const $d = $el.find(cfg.date).first()
      // dateText: some sites ship a wrong datetime attribute beside the correct visible text.
      date = (cfg.dateText ? '' : $d.attr('datetime') || $d.attr('content')) || $d.text()
    } else if (cfg.dateFromText) {
      date = $el.text()
    }
    out.push({
      title,
      url: new URL(href, baseUrl).href,
      date: date.replace(/\s+/g, ' ').trim(),
      summary: cfg.summary ? $el.find(cfg.summary).first().text() : '',
    })
  })
  return out
}

export async function mapLimit(list, limit, fn) {
  const results = new Array(list.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, list.length) }, async () => {
      while (next < list.length) {
        const i = next++
        results[i] = await fn(list[i], i)
      }
    }),
  )
  return results
}
