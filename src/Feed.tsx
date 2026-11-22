import { useEffect, useMemo, useRef, useState } from 'react'
import {
  applyFilters, countActive, dayKey, dayLabel, DEFAULT_FILTERS, filtersToQuery, KIND_LABELS, plural, queryToFilters,
  RANGES, readStore, SEVERITIES, shortDate, writeStore,
  type Alert, type Dataset, type Filters,
} from './data'
import { FilterRail } from './Filters'
import { Activity } from './Activity'

const PAGE = 80
const SEV_LABEL = Object.fromEntries(SEVERITIES.map((s) => [s.id, s.label]))

export function Feed({ data, query, now }: { data: Dataset; query: string; now: number }) {
  const filters = useMemo(() => queryToFilters(query), [query])
  const setFilters = (next: Filters) => {
    const q = filtersToQuery(next)
    // Replace rather than push so typing in search does not flood the history.
    window.history.replaceState(null, '', `#/${q ? `?${q}` : ''}`)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }
  const patch = (p: Partial<Filters>) => setFilters({ ...filters, ...p })

  const [saved, setSaved] = useState<Set<string>>(() => new Set(readStore<string[]>('saved', [])))
  const toggleSaved = (id: string) => {
    const next = new Set(saved)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSaved(next)
    writeStore('saved', [...next])
  }

  // Items first seen since the previous visit are marked as new.
  const [lastVisit] = useState(() => {
    const prev = readStore<number | null>('lastVisit', null)
    writeStore('lastVisit', Date.now())
    return prev
  })

  const { results, anyTime, counts } = useMemo(() => applyFilters(data, filters, saved, now), [data, filters, saved, now])

  const [limit, setLimit] = useState(PAGE)
  const [open, setOpen] = useState<string | null>(null)
  useEffect(() => setLimit(PAGE), [query])

  const [railOpen, setRailOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape') setRailOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const groups = useMemo(() => {
    const out: { key: string; label: string; items: Alert[] }[] = []
    for (const a of results.slice(0, limit)) {
      const key = dayKey(a.time)
      if (out.at(-1)?.key !== key) out.push({ key, label: dayLabel(a.time, now), items: [] })
      out.at(-1)!.items.push(a)
    }
    return out
  }, [results, limit, now])

  const range = RANGES.find((r) => r.id === filters.range)!
  const digitalCount = useMemo(() => results.filter((a) => a.digital).length, [results])
  const sourceCount = useMemo(() => new Set(results.map((a) => a.source)).size, [results])
  const active = countActive(filters)
  const period = range.days == null ? 'on record' : `in the last ${range.label}`

  return (
    <>
      <section className="overview" aria-labelledby="overview-h">
        <div className="overview-text">
          <h1 id="overview-h">
            {filters.lens === 'digital'
              ? `${plural(results.length, 'alert')} involving digital systems ${period}`
              : `${plural(results.length, 'medication safety alert')} ${period}`}
          </h1>
          <p className="overview-sub">
            {results.length === 0
              ? 'Nothing matches the current filters.'
              : filters.lens === 'digital'
                ? `From ${plural(sourceCount, 'source')}. Covers prescribing systems, health records, pumps, dispensing automation, software and AI.`
                : `From ${plural(sourceCount, 'source')}. ${digitalCount.toLocaleString()} involve digital systems.`}
          </p>
          <div className="lens" role="group" aria-label="Lens">
            <button aria-pressed={filters.lens === 'all'} onClick={() => patch({ lens: 'all' })}>All medication safety</button>
            <button aria-pressed={filters.lens === 'digital'} onClick={() => patch({ lens: 'digital' })}>
              <span className="lens-dot" aria-hidden="true" />
              Digital systems
            </button>
          </div>
        </div>
        <Activity alerts={anyTime} now={now} rangeDays={range.days} />
      </section>

      <div className="layout">
        <FilterRail
          data={data}
          filters={filters}
          counts={counts}
          patch={patch}
          savedCount={saved.size}
          open={railOpen}
          onClose={() => setRailOpen(false)}
          searchRef={searchRef}
        />

        <section className="results" aria-label="Alerts">
          <div className="results-bar">
            <button className="btn filters-toggle" onClick={() => setRailOpen(true)}>
              Filters{active ? ` (${active})` : ''}
            </button>
            <div className="ranges" role="group" aria-label="Time range">
              {RANGES.map((r) => (
                <button key={r.id} aria-pressed={filters.range === r.id} onClick={() => patch({ range: r.id })}>{r.label}</button>
              ))}
            </div>
            <label className="check research-toggle">
              <input type="checkbox" checked={filters.research} onChange={() => patch({ research: !filters.research })} />
              <span className="check-l">Include research papers</span>
            </label>
            {active > 0 && (
              <button className="link-btn" onClick={() => setFilters({ ...DEFAULT_FILTERS, lens: filters.lens, range: filters.range, research: filters.research })}>
                Clear filters
              </button>
            )}
          </div>

          {results.length === 0 ? (
            <div className="empty">
              <h2>No alerts match</h2>
              <p>
                {filters.saved && saved.size === 0
                  ? 'You have not saved any alerts yet. Open an alert and choose Save to keep it here.'
                  : 'Try a longer time range, remove a filter, or switch the lens back to all medication safety.'}
              </p>
              <button className="btn" onClick={() => setFilters({ ...DEFAULT_FILTERS, range: 'all' })}>Show everything</button>
            </div>
          ) : (
            groups.map((g) => (
              <section key={g.key} className="day">
                <h2 className="day-h">
                  {g.label} <span className="day-n">{g.items.length}</span>
                </h2>
                <ul className="rows">
                  {g.items.map((a) => (
                    <Row
                      key={a.id}
                      a={a}
                      data={data}
                      open={open === a.id}
                      onToggle={() => setOpen(open === a.id ? null : a.id)}
                      saved={saved.has(a.id)}
                      onSave={() => toggleSaved(a.id)}
                      isNew={lastVisit != null && Date.parse(a.firstSeen) > lastVisit}
                      onTopic={(t) => patch({ topic: [t] })}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}

          {results.length > limit && (
            <button className="btn more" onClick={() => setLimit(limit + PAGE * 2)}>
              Show more ({(results.length - limit).toLocaleString()} remaining)
            </button>
          )}
        </section>
      </div>
    </>
  )
}

function Row({ a, data, open, onToggle, saved, onSave, isNew, onTopic }: {
  a: Alert; data: Dataset; open: boolean; onToggle: () => void; saved: boolean; onSave: () => void; isNew: boolean
  onTopic: (t: string) => void
}) {
  const src = data.sourceById[a.source]
  return (
    <li className={`row sev-${a.severity}${open ? ' is-open' : ''}`}>
      <button className="row-head" aria-expanded={open} onClick={onToggle}>
        <span className="row-main">
          <span className="row-title">
            {isNew && <span className="new">New</span>}
            {a.title}
          </span>
          <span className="row-meta">
            <span className={`sev-tag sev-tag-${a.severity}`}>{SEV_LABEL[a.severity]}</span>
            <span>{KIND_LABELS[a.kind] ?? a.kind}</span>
            {a.topics.slice(0, 3).map((t) => (
              <span key={t} className="topic">{data.topics[t]}</span>
            ))}
            {saved && <span className="saved-mark">Saved</span>}
          </span>
        </span>
        <span className="row-src">
          <span className="row-org">{src.short}</span>
          <span className="row-country">{src.country}</span>
        </span>
      </button>
      {open && (
        <div className="row-body">
          {a.summary && <p className="row-summary" lang={src.lang}>{a.summary}</p>}
          <dl className="facts">
            <div><dt>Published by</dt><dd>{src.name}</dd></div>
            <div><dt>{a.dated ? 'Date' : 'First seen'}</dt><dd>{shortDate(a.published)}</dd></div>
            {src.lang !== 'en' && <div><dt>Language</dt><dd>{new Intl.DisplayNames(undefined, { type: 'language' }).of(src.lang)}</dd></div>}
          </dl>
          {a.topics.length > 0 && (
            <p className="row-topics">
              <span className="row-topics-l">Digital topics</span>
              {a.topics.map((t) => (
                <button key={t} className="topic topic-btn" onClick={() => onTopic(t)} title={`Show only ${data.topics[t]}`}>{data.topics[t]}</button>
              ))}
            </p>
          )}
          <div className="row-actions">
            <a className="btn btn-primary" href={a.url} target="_blank" rel="noopener noreferrer">
              Read at {src.short}
            </a>
            <button className="btn" aria-pressed={saved} onClick={onSave}>{saved ? 'Remove from saved' : 'Save'}</button>
          </div>
        </div>
      )}
    </li>
  )
}
