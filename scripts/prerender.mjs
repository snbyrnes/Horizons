// Runs after `vite build`. Search engines and link previews read HTML, not the app's JavaScript,
// so this writes real pages from the same data the app uses:
//   - a readable snapshot of the latest alerts inside index.html (React replaces it on load)
//   - one page per digital topic and per region, listing current alerts
//   - sitemap.xml and robots.txt
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const SITE = (process.env.SITE_URL || 'https://snbyrnes.github.io/Horizons').replace(/\/$/, '')

// Shared with the app, which links to these pages from its footer.
const { topics: TOPIC_PAGES, regions: REGION_PAGES } = JSON.parse(await readFile(path.join(ROOT, 'src', 'static-pages.json'), 'utf8'))

const SEV = { critical: 'Critical', high: 'High', advisory: 'Advisory', info: 'Information' }
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

const alertsFile = JSON.parse(await readFile(path.join(DIST, 'data', 'alerts.json'), 'utf8'))
const sourcesFile = JSON.parse(await readFile(path.join(DIST, 'data', 'sources.json'), 'utf8'))
const sourceById = Object.fromEntries(sourcesFile.sources.map((s) => [s.id, s]))
const notices = alertsFile.alerts.filter((a) => a.kind !== 'research' && sourceById[a.source])
const updated = dateFmt.format(new Date(alertsFile.generatedAt))
const countries = new Set(sourcesFile.sources.map((s) => s.country)).size

const shell = await readFile(path.join(DIST, 'index.html'), 'utf8')
const cssHref = shell.match(/href="\.\/(assets\/[^"]+\.css)"/)?.[1]
if (!cssHref) throw new Error('Could not find the built stylesheet in dist/index.html')

function alertList(items) {
  if (!items.length) return '<p class="lede lede-small">No current alerts. New alerts appear here within 12 hours of publication.</p>'
  return `<ul class="rows">${items.map((a) => {
    const s = sourceById[a.source]
    return `<li class="row sev-${a.severity}"><div class="row-head"><span class="row-main"><a class="row-title" href="${esc(a.url)}" rel="noopener"${s.lang !== 'en' ? ` lang="${esc(s.lang)}"` : ''}>${esc(a.title)}</a><span class="row-meta"><span class="sev-tag sev-tag-${a.severity}${a.pclass ? '' : ' sev-est'}">${SEV[a.severity]}</span>${a.pclass ? `<span class="pclass">${esc(a.pclass)}</span>` : ''}<time datetime="${a.published.slice(0, 10)}">${dateFmt.format(new Date(a.published))}</time>${a.topics.map((t) => `<span class="topic">${esc(alertsFile.topics[t])}</span>`).join('')}</span></span><span class="row-src"><span class="row-org">${esc(s.short)}</span><span class="row-country">${esc(s.country)}</span></span></div></li>`
  }).join('')}</ul>`
}

function browseLinks(up) {
  const topics = Object.values(TOPIC_PAGES).map((t) => `<li><a href="${up}topics/${t.slug}/">${esc(t.name)}</a></li>`).join('')
  const regions = Object.entries(REGION_PAGES).map(([name, slug]) => `<li><a href="${up}regions/${slug}/">${esc(name)}</a></li>`).join('')
  return `<nav class="browse" aria-label="Browse alerts"><div><h2>Digital medication safety topics</h2><ul>${topics}</ul></div><div><h2>Medication safety alerts by region</h2><ul>${regions}</ul></div></nav>`
}

function page({ up, urlPath, title, description, h1, intro, body, appHref }) {
  const canonical = `${SITE}/${urlPath}`
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: h1,
    description,
    url: canonical,
    dateModified: alertsFile.generatedAt,
    isPartOf: { '@type': 'WebSite', name: 'Horizons', url: `${SITE}/` },
  }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Horizons">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="color-scheme" content="light dark">
<link rel="icon" type="image/svg+xml" href="${up}favicon.svg">
<link rel="alternate" type="application/rss+xml" title="Horizons: medication safety in digital systems" href="${up}feed.xml">
<link rel="alternate" type="application/rss+xml" title="Horizons: all medication safety alerts" href="${up}feed-all.xml">
<link rel="stylesheet" href="${up}${cssHref}">
<script>try{var t=localStorage.getItem('horizon.theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body>
<header class="masthead"><div class="wrap masthead-in">
<a class="brand" href="${up}"><svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><path d="M7 20a9 9 0 0 1 18 0" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M3 25h26" class="logo-line" stroke-width="2.8" stroke-linecap="round"/></svg><span class="brand-name">Horizons</span><span class="brand-tag">Medication safety alerts, worldwide</span></a>
<nav aria-label="Main"><a href="${up}">Alerts</a><a href="${up}#/sources">Sources</a><a href="${up}#/method">How it works</a><a href="${up}#/feedback">Feedback</a></nav>
</div></header>
<main class="wrap"><article class="page">
<h1>${esc(h1)}</h1>
<p class="lede">${intro}</p>
<p class="static-actions"><a class="btn btn-primary" href="${appHref}">Open in Horizons to filter and search</a><span class="static-updated">Updated ${updated}</span></p>
${body}
${browseLinks(up)}
</article></main>
<footer class="wrap foot"><p>Horizons links to original notices and does not replace them. Always read the source before acting, and follow your organisation's alerting process.</p></footer>
</body>
</html>
`
}

async function write(rel, html) {
  const file = path.join(DIST, rel)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, html)
}

const urls = [{ loc: `${SITE}/`, priority: '1.0' }]

for (const [id, t] of Object.entries(TOPIC_PAGES)) {
  const items = notices.filter((a) => a.topics.includes(id)).slice(0, 60)
  const urlPath = `topics/${t.slug}/`
  await write(`${urlPath}index.html`, page({
    up: '../../',
    urlPath,
    title: `${t.name}: medication safety alerts | Horizons`,
    description: `Latest medication safety alerts, recalls and guidance about ${t.about}, collated from regulators and safety organisations worldwide. Updated every 12 hours.`,
    h1: `${t.name}: medication safety alerts`,
    intro: `Safety alerts, recalls, investigations and guidance about ${esc(t.about)}, gathered from regulators, safety organisations and healthcare bodies in ${countries} countries and regions.`,
    body: alertList(items),
    appHref: `../../#/?lens=digital&range=all&topic=${id}`,
  }))
  urls.push({ loc: `${SITE}/${urlPath}`, priority: '0.8' })
}

for (const [region, slug] of Object.entries(REGION_PAGES)) {
  const label = region
  const items = notices.filter((a) => sourceById[a.source].region === region).slice(0, 60)
  const orgs = sourcesFile.sources.filter((s) => s.region === region && s.count).map((s) => s.short)
  const urlPath = `regions/${slug}/`
  await write(`${urlPath}index.html`, page({
    up: '../../',
    urlPath,
    title: `Medication safety alerts: ${label} | Horizons`,
    description: `Latest medication safety alerts, medicine recalls and safety communications from ${orgs.slice(0, 6).join(', ')}${orgs.length > 6 ? ' and others' : ''}. Updated every 12 hours.`,
    h1: `Medication safety alerts: ${label}`,
    intro: `The most recent medicine safety alerts, recalls and safety communications from ${esc(orgs.join(', '))}.`,
    body: alertList(items),
    appHref: `../../#/?range=all&region=${encodeURIComponent(region)}`,
  }))
  urls.push({ loc: `${SITE}/${urlPath}`, priority: '0.7' })
}

// Snapshot inside the app shell. React's createRoot replaces it as soon as the script runs.
const latest = notices.slice(0, 40)
const digital = notices.filter((a) => a.digital).slice(0, 15)
const snapshot = `<div class="wrap"><article class="page">
<h1>Medication safety alerts from around the world</h1>
<p class="lede">Horizons collates medication safety alerts, recalls and guidance from ${sourcesFile.sources.length} feeds published by regulators, safety organisations and healthcare bodies in ${countries} countries and regions, and highlights the ones that involve digital systems such as ePrescribing, electronic health records, infusion pumps and dispensing automation. Updated ${updated}.</p>
<h2>Latest alerts involving digital systems</h2>
${alertList(digital)}
<h2>Latest medication safety alerts</h2>
${alertList(latest)}
${browseLinks('./')}
</article></div>`
if (!shell.includes('<div id="root"></div>')) throw new Error('Unexpected app shell')
await writeFile(path.join(DIST, 'index.html'), shell.replace('<div id="root"></div>', `<div id="root">${snapshot}</div>`).replaceAll('__SITE_URL__', SITE))

await writeFile(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${alertsFile.generatedAt.slice(0, 10)}</lastmod><changefreq>daily</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`)
await writeFile(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`)

console.log(`Prerendered ${urls.length} pages and sitemap for ${SITE}`)
