# Horizon

Medication safety alerts from regulators, safety organisations, healthcare bodies and standards bodies worldwide, with a lens on **medication safety in digital systems** (ePrescribing, health records, decision support, infusion pumps, dispensing automation, barcoding, interoperability, software and AI).

Horizon is a static site. A scheduled GitHub Actions job gathers the alerts, commits the refreshed data, and redeploys GitHub Pages. There is no server and no API key.

## How it works

```
GitHub Actions (every 6 hours)
  └─ npm run fetch        pipeline/run.mjs reads every source in pipeline/sources/
       ├─ adapters.mjs    RSS/Atom, HTML listings, GOV.UK, openFDA, Health Canada, PubMed, ...
       ├─ classify.mjs    keyword rules: digital topics, severity, type of notice
       └─ writes          public/data/alerts.json, public/data/sources.json, public/feed.xml
  └─ git commit           the data files (history is kept for two years)
  └─ npm run build        Vite + React + TypeScript
  └─ deploy               GitHub Pages
```

- A source that fails keeps its previous alerts and is shown as "Not reachable" on the Sources page. If most sources fail at once the run leaves the existing data untouched.
- Text is the publisher's own title and extract. Nothing is rewritten by a model.
- Severity and digital topics are assigned by transparent keyword rules in [pipeline/classify.mjs](pipeline/classify.mjs), explained in the app under "How it works".

## Run it locally

```bash
npm install
npm run fetch     # gather alerts (takes about a minute)
npm run dev       # open the site
npm test          # pipeline tests
npm run build     # production build in dist/
```

Useful while working on sources: `node pipeline/run.mjs --dry --only mhra,tga` fetches just those sources and prints counts without writing files.

## Add a source

Add an entry to the right file in [pipeline/sources/](pipeline/sources/):

```js
{
  id: 'example',                 // stable, unique
  name: 'Example Medicines Agency',
  short: 'EMA-X',                // shown in the alert list
  country: 'Exampleland',
  region: 'Europe',              // Global | UK and Ireland | Europe | North America | Asia-Pacific | Rest of world
  type: 'regulator',             // regulator | safety | healthcare | standards | research
  home: 'https://example.org/',
  lang: 'en',
  filter: 'medication',          // all | medication | medication-digital | digital
  feeds: [{ url: 'https://example.org/alerts.rss' }],
}
```

For a page with no feed, use the `html` adapter with CSS selectors:

```js
feeds: [{ adapter: 'html', url: '...', select: { item: 'li.alert', title: 'h3 a', date: 'time', summary: 'p' } }]
```

Check it with `node pipeline/run.mjs --dry --only example` before committing.

## Deploy on GitHub Pages

1. Push this repository to GitHub.
2. In **Settings > Pages**, set **Source** to **GitHub Actions**.
3. Run the **Update alerts and deploy** workflow once from the Actions tab. After that it runs every six hours and on every push to `main`.

The build uses relative paths, so it works at `https://<user>.github.io/<repo>/` without configuration.

## Important

Horizon is a scanning aid. It links to original notices and does not replace them, and it is not a substitute for formal alerting channels such as a national central alerting system. Classification is automated and will sometimes be wrong.
