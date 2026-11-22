import { useEffect, useState } from 'react'
import { loadDataset, timeAgo, type Dataset } from './data'
import { Feed } from './Feed'
import { Sources } from './Sources'
import { Method } from './Method'
import { Feedback } from './Feedback'
import { REPO_URL } from './community'

type Route = { view: 'alerts' | 'sources' | 'method' | 'feedback'; query: string }

function parseHash(): Route {
  const [path, query = ''] = window.location.hash.replace(/^#\/?/, '').split('?')
  const view = path === 'sources' || path === 'method' || path === 'feedback' ? path : 'alerts'
  return { view, query }
}

function useRoute(): Route {
  const [route, setRoute] = useState(parseHash)
  useEffect(() => {
    const on = () => setRoute(parseHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

function ThemeToggle() {
  const [theme, setTheme] = useState<string>(() => {
    const set = document.documentElement.dataset.theme
    return set ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  })
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      className="ghost-btn"
      onClick={() => {
        document.documentElement.dataset.theme = next
        try { localStorage.setItem('horizon.theme', next) } catch { /* private mode */ }
        setTheme(next)
      }}
    >
      {next === 'dark' ? 'Dark' : 'Light'} theme
    </button>
  )
}

export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M7 20a9 9 0 0 1 18 0" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M3 25h26" className="logo-line" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  )
}

export default function App() {
  const route = useRoute()
  const [data, setData] = useState<Dataset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    loadDataset().then(setData, (e) => setError(String(e.message ?? e)))
  }, [])

  useEffect(() => {
    if (route.view !== 'alerts') window.scrollTo(0, 0)
  }, [route.view])

  const nav = [
    { id: 'alerts', label: 'Alerts', href: '#/' },
    { id: 'sources', label: 'Sources', href: '#/sources' },
    { id: 'method', label: 'How it works', href: '#/method' },
    { id: 'feedback', label: 'Feedback', href: '#/feedback' },
  ]

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="masthead">
        <div className="wrap masthead-in">
          <a className="brand" href="#/">
            <Logo />
            <span className="brand-name">Horizons</span>
            <span className="brand-tag">Medication safety alerts, worldwide</span>
          </a>
          <nav aria-label="Main">
            {nav.map((n) => (
              <a key={n.id} href={n.href} aria-current={route.view === n.id ? 'page' : undefined}>{n.label}</a>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main id="main" className="wrap">
        {error ? (
          <div className="notice" role="alert">
            <h1>The alert data did not load</h1>
            <p>{error}. Check your connection and reload the page.</p>
            <button className="btn" onClick={() => window.location.reload()}>Reload</button>
          </div>
        ) : !data ? (
          <p className="loading" role="status">Loading alerts</p>
        ) : route.view === 'feedback' ? (
          <Feedback />
        ) : route.view === 'sources' ? (
          <Sources data={data} now={now} />
        ) : route.view === 'method' ? (
          <Method data={data} />
        ) : (
          <Feed data={data} query={route.query} now={now} />
        )}
      </main>

      <footer className="wrap foot">
        <p>
          Horizons links to original notices and does not replace them. Always read the source before acting, and follow
          your organisation's alerting process.
        </p>
        <p>
          {data && <>Data refreshed {timeAgo(data.generatedAt, now)}. </>}
          <a href="./feed.xml">RSS feed of digital-system alerts</a>
          <span aria-hidden="true"> | </span>
          <a href="./data/alerts.json">Download the data (JSON)</a>
          <span aria-hidden="true"> | </span>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">Source code on GitHub</a>
        </p>
      </footer>
    </>
  )
}
