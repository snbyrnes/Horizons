const region = 'Global'

const PUBMED_QUERY = `("Medication Errors"[Mesh] OR "medication safety"[tiab] OR "medication error*"[tiab] OR "prescribing error*"[tiab] OR "dispensing error*"[tiab] OR "administration error*"[tiab]) AND ("Medical Order Entry Systems"[Mesh] OR "Electronic Prescribing"[Mesh] OR "Decision Support Systems, Clinical"[Mesh] OR "Electronic Health Records"[Mesh] OR "Infusion Pumps"[Mesh] OR CPOE[tiab] OR "computerized provider order entry"[tiab] OR "computerised physician order entry"[tiab] OR "electronic prescribing"[tiab] OR e-prescribing[tiab] OR "electronic health record*"[tiab] OR "electronic medical record*"[tiab] OR "clinical decision support"[tiab] OR "smart pump*"[tiab] OR "automated dispensing"[tiab] OR "barcode medication administration"[tiab] OR "bar-code medication administration"[tiab] OR "health information technology"[tiab] OR "alert fatigue"[tiab] OR "closed loop medication"[tiab] OR "electronic medication management"[tiab] OR "artificial intelligence"[tiab] OR "large language model*"[tiab])`

const WHO_API = 'https://www.who.int/api/news'

export const GLOBAL = [
  {
    id: 'who-alerts',
    name: 'World Health Organization medical product alerts',
    short: 'WHO Alerts',
    country: 'International',
    region,
    type: 'healthcare',
    home: 'https://www.who.int/teams/regulation-prequalification/incidents-and-SF/full-list-of-who-medical-product-alerts',
    hints: { kind: 'alert', minSeverity: 'high', publisherClass: 'WHO Medical Product Alert' },
    feeds: [{
      adapter: 'html',
      url: 'https://www.who.int/teams/regulation-prequalification/incidents-and-SF/full-list-of-who-medical-product-alerts',
      select: { item: "a.link-container[href*='medical-product-alert']", title: 'p.heading', date: 'span.timestamp' },
      exclude: 'IVD|diagnostic',
    }],
  },
  {
    id: 'who-news',
    name: 'World Health Organization news and Pharmaceuticals Newsletter',
    short: 'WHO',
    country: 'International',
    region,
    type: 'healthcare',
    home: 'https://www.who.int/news',
    filter: 'medication',
    feeds: [
      {
        adapter: 'json',
        url: `${WHO_API}/newsitems?$orderby=PublicationDateAndTime%20desc&$top=100&$select=Title,ItemDefaultUrl,PublicationDateAndTime,NewsType`,
        rows: (d) => d.value ?? [],
        map: (r) => ({ title: r.Title, url: `https://www.who.int/news/item${r.ItemDefaultUrl}`, date: r.PublicationDateAndTime, summary: r.NewsType }),
        include: 'medication|pharmac|substandard|falsified|patient safety|medicines? safety|safety of medicines|digital|artificial intelligence|adverse',
      },
      {
        adapter: 'json',
        url: `${WHO_API}/publications?$filter=contains(Title,'Pharmaceuticals%20Newsletter')&$orderby=PublicationDate%20desc&$top=8&$select=Title,ItemDefaultUrl,PublicationDate,UrlName`,
        rows: (d) => d.value ?? [],
        map: (r) => ({ title: r.Title, url: `https://www.who.int/publications/i/item${r.ItemDefaultUrl}`, date: r.PublicationDate, summary: 'Regulatory and safety information on medicines from around the world.' }),
        filter: 'all',
        hints: { kind: 'report', minSeverity: 'advisory' },
      },
    ],
  },
  {
    id: 'umc',
    name: 'Uppsala Monitoring Centre: Uppsala Reports',
    short: 'Uppsala Reports',
    country: 'International',
    region,
    type: 'safety',
    home: 'https://uppsalareports.org/',
    hints: { kind: 'report', maxSeverity: 'advisory' },
    feeds: [{
      adapter: 'html',
      url: 'https://uppsalareports.org/',
      select: { item: 'div.list-view-article', title: 'h3.title', link: "a[href^='/articles/']", date: 'p.title-sub', summary: 'p:not(.title-sub)' },
    }],
  },
  {
    id: 'pubmed',
    name: 'PubMed: new research on medication safety in digital systems',
    short: 'PubMed',
    country: 'International',
    region,
    type: 'research',
    home: 'https://pubmed.ncbi.nlm.nih.gov/',
    note: 'Peer-reviewed papers matching a fixed search on medication errors and health IT.',
    hints: { kind: 'research', maxSeverity: 'info' },
    feeds: [{ adapter: 'pubmed', query: PUBMED_QUERY, days: 180, limit: 150 }],
  },
]
