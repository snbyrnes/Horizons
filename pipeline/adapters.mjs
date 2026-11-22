// One adapter per feed format. Each returns raw items: { title, url, date, summary, [extra] }.
import { fetchText, fetchJson, parseFeed, parseHtmlList, toPlain } from './lib.mjs'

const daysAgo = (n) => new Date(Date.now() - n * 864e5)
const ymd = (d) => d.toISOString().slice(0, 10)

export const adapters = {
  /** RSS 2.0, RSS 1.0 or Atom. */
  async rss(feed) {
    return parseFeed(await fetchText(feed.url, feed.fetch))
  },

  /** Server-rendered listing page; selectors live in the source config. */
  async html(feed) {
    return parseHtmlList(await fetchText(feed.url, feed.fetch), feed.select, feed.url)
  },

  /** GOV.UK search API. feed.query is the query string without count/order/fields. */
  async govuk(feed) {
    const url = `https://www.gov.uk/api/search.json?${feed.query}&count=${feed.count ?? 60}&order=-public_timestamp&fields=title,link,description,public_timestamp`
    const data = await fetchJson(url)
    return (data.results ?? []).map((r) => ({
      title: r.title,
      url: new URL(r.link, 'https://www.gov.uk').href,
      date: r.public_timestamp,
      summary: r.description,
    }))
  },

  /** openFDA drug enforcement reports. feed.search is an optional openFDA search clause. */
  async openfda(feed) {
    const from = ymd(daysAgo(feed.days ?? 180)).replaceAll('-', '')
    const to = ymd(new Date()).replaceAll('-', '')
    const search = `report_date:[${from}+TO+${to}]${feed.search ? `+AND+${feed.search}` : ''}`
    const data = await openFdaGet(`https://api.fda.gov/drug/enforcement.json?search=${search}&sort=report_date:desc&limit=${feed.limit ?? 100}`)
    return (data.results ?? []).map((r) => ({
      title: `${r.classification ?? 'Recall'}: ${toPlain(r.product_description, 150)}`,
      url: `https://www.accessdata.fda.gov/scripts/ires/index.cfm?Event=${encodeURIComponent(r.event_id ?? '')}`,
      key: r.recall_number,
      date: r.report_date,
      summary: `${r.recalling_firm}. Reason: ${r.reason_for_recall}`,
    }))
  },

  /** openFDA device recalls, which carry a root cause field (used to find software-caused recalls). */
  async openfdaDevice(feed) {
    const search = `event_date_posted:[${ymd(daysAgo(feed.days ?? 365))}+TO+${ymd(new Date())}]${feed.search ? `+AND+${feed.search}` : ''}`
    const data = await openFdaGet(`https://api.fda.gov/device/recall.json?search=${search}&sort=event_date_posted:desc&limit=${feed.limit ?? 100}`)
    return (data.results ?? []).map((r) => ({
      title: `Device recall: ${toPlain(String(r.product_description ?? '').replace(/\b(?:Generic|Brand|Trade|Product) Names?:\s*/gi, ''), 150)}`,
      url: `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfRES/res.cfm?id=${encodeURIComponent(r.cfres_id ?? '')}`,
      key: r.product_res_number ?? r.cfres_id,
      date: r.event_date_posted,
      summary: `${r.recalling_firm}. ${r.reason_for_recall ?? ''} Root cause: ${r.root_cause_description ?? 'not stated'}.`,
    }))
  },

  /** Health Canada's open recalls dataset: one large JSON array, newest first. */
  async healthCanada(feed) {
    const data = await fetchJson(feed.url, { timeout: 120000 })
    const orgs = new Set(feed.organizations)
    return data
      .filter((r) => orgs.has(r.Organization))
      .slice(0, feed.limit ?? 250)
      .map((r) => ({
        title: r['Recall class'] ? `${r.Title} (${r['Recall class']})` : r.Title,
        url: r.URL,
        key: r.NID,
        date: r['Last updated'],
        summary: [r.Product, r.Issue].filter(Boolean).join('. '),
      }))
  },

  /** PubMed search via NCBI E-utilities (no key needed at this volume). */
  async pubmed(feed) {
    const base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
    const found = await fetchJson(`${base}/esearch.fcgi?db=pubmed&retmode=json&retmax=${feed.limit ?? 60}&sort=pub_date&datetype=edat&reldate=${feed.days ?? 120}&tool=horizonmedsafety&term=${encodeURIComponent(feed.query)}`)
    const ids = found.esearchresult?.idlist ?? []
    if (!ids.length) return []
    const sum = await fetchJson(`${base}/esummary.fcgi?db=pubmed&retmode=json&tool=horizonmedsafety&id=${ids.join(',')}`)
    return ids.map((id) => sum.result?.[id]).filter(Boolean).map((r) => ({
      title: r.title,
      url: `https://pubmed.ncbi.nlm.nih.gov/${r.uid}/`,
      // sortpubdate can be in the future for issue-dated papers; the Entrez date is when it appeared.
      date: (r.epubdate && r.epubdate.length > 8 ? r.epubdate : (r.sortpubdate ?? '').slice(0, 10).replaceAll('/', '-')),
      summary: `${r.fulljournalname ?? r.source ?? ''}. ${(r.authors ?? []).slice(0, 3).map((a) => a.name).join(', ')}${(r.authors ?? []).length > 3 ? ' et al.' : ''}`,
    }))
  },

  /** XML sitemap filtered by URL pattern; for sites whose listing is rendered client-side. */
  async sitemap(feed) {
    const body = await fetchText(feed.url, { timeout: 60000 })
    const out = []
    for (const m of body.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g)) {
      if (!new RegExp(feed.match).test(m[1])) continue
      out.push({ title: feed.titleFrom(m[1]), url: m[1], date: m[2] ?? '', summary: '' })
    }
    return out
  },

  /** Any JSON endpoint: feed.rows picks the array, feed.map turns a record into an item. */
  async json(feed) {
    const data = await fetchJson(feed.url, { timeout: 90000 })
    return (feed.rows ? feed.rows(data) : data).map(feed.map).filter(Boolean)
  },

  /** HPRA (Ireland) safety notices API, limited to human medicines and medical devices. */
  async hpra() {
    const api = 'https://www.hpra.ie/api'
    const taxa = (await fetchJson(`${api}/classifications/hierarchy-taxa?$select=id,title,parentid,ordinal&$filter=taxonomyid%20eq%207cd8b045-364e-499f-9f10-2e247c1dc64c`)).value ?? []
    const parents = { 'abc52ebb-e7b4-4e5b-b0eb-8fea71d5a659': 'medicines', 'd43864d2-c887-4763-b7fc-daf27b0674cb': 'medical devices' }
    const kindOf = {}
    for (const t of taxa) {
      const group = parents[t.Id] ?? parents[t.ParentId]
      if (group) kindOf[t.Id] = { group, label: t.Title }
    }
    const data = await fetchJson(`${api}/safety-notices/safetynotices?$select=id,title,date,urlname,safetynotices&$top=100&$orderby=date%20desc`)
    return (data.value ?? []).map((n) => {
      const cats = (n.safetynotices ?? []).map((id) => kindOf[id]).filter(Boolean)
      if (!cats.length) return null
      return {
        title: n.Title,
        url: `https://www.hpra.ie/safety-information/safety-notices/article/${n.UrlName}`,
        date: n.Date,
        summary: `${cats.map((c) => c.label).join(', ')} (${cats[0].group})`,
      }
    }).filter(Boolean)
  },

  /** Europe PMC literature search, newest first. */
  async europepmc(feed) {
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(feed.query)}&format=json&resultType=lite&pageSize=${feed.limit ?? 40}&sort=${encodeURIComponent('P_PDATE_D desc')}`
    const data = await fetchJson(url)
    return (data.resultList?.result ?? []).map((r) => ({
      title: r.title,
      url: r.doi ? `https://doi.org/${r.doi}` : `https://europepmc.org/article/${r.source}/${r.id}`,
      date: r.firstPublicationDate || r.pubYear,
      summary: [r.authorString, r.journalTitle].filter(Boolean).join(' '),
    }))
  },
}

async function openFdaGet(url) {
  try {
    return await fetchJson(url)
  } catch (err) {
    if (/HTTP 404/.test(err.message)) return {} // openFDA answers 404 for "no matches"
    throw err
  }
}
