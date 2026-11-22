import { useEffect, useMemo, useRef, useState } from 'react'
import {
  alertLink, applyFilters, countActive, dayKey, dayLabel, DEFAULT_FILTERS, download, filtersToQuery, KIND_LABELS, languageName,
  markAllRead, plural, queryToFilters, RANGES, readSeenUntil, readStore, rowDate, SEV_LABEL, SEVERITIES, shortDate, synonymsFor,
  timeAgo, toCsv, writeStore,
  type Alert, type Dataset, type Filters,
} from './data'
import { ISSUES_URL } from './community'
import { FilterRail } from './Filters'

const PAGE = 80

export function Feed({ data, query, now }: { data: Dataset; query: string; now: number }) {
  const filters = useMemo(() => queryToFilters(query), [query])

  // Discrete choices create a history entry so Back undoes them; typing and opening rows do not.
  const setFilters = (next: Filters, replace = false) => {
    const q = filtersToQuery(next)
    const url = `#/${q ? `?${q}` : ''}`
    if (replace) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }
  const patch = (p: Partial<Filters>, replace = false) => setFilters({ ...filters, ...p }, replace)

  // A reader's saved default view applies when they arrive with no filters in the address.
  const [defaultView, setDefaultView] = useState(() => readStore<string>('defaultView', ''))
  useEffect(() => {
    if (query === '' && defaultView) setFilters(queryToFilters(defaultView), true)
    // Only on first arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const viewQuery = filtersToQuery({ ...filters, open: '', q: '', fresh: false })
  const saveDefault = (q: string) => {
    writeStore('defaultView', q)
    setDefaultView(q)
  }

  const [saved, setSaved] = useState<Set<string>>(() => new Set(readStore<string[]>('saved', [])))
  const toggleSaved = (id: string) => {
    const next = new Set(saved)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSaved(next)
    writeStore('saved', [...next])
  }

  const [seenUntil, setSeenUntil] = useState(readSeenUntil)
  const { results, counts, freshCount } = useMemo(
    () => applyFilters(data, filters, saved, now, seenUntil),
    [data, filters, saved, now, seenUntil],
  )

  const listKey = filtersToQuery({ ...filters, open: '' })
  const [limit, setLimit] = useState(PAGE)
  useEffect(() => setLimit(PAGE), [listKey])

  const [railOpen, setRailOpen] = useState(false)
  const filtersBtn = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const visible = results.slice(0, limit)
  const groups = useMemo(() => {
    const out: { key: string; label: string; items: Alert[] }[] = []
    for (const a of visible) {
      const key = filters.sort === 'severity' ? a.severity : dayKey(a.time)
      if (out.at(-1)?.key !== key) out.push({ key, label: filters.sort === 'severity' ? SEV_LABEL[a.severity] : dayLabel(a.time, now), items: [] })
      out.at(-1)!.items.push(a)
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, limit, now, filters.sort])

  const linked = filters.open ? data.alertById.get(filters.open) : undefined
  const linkedOutside = linked && !visible.includes(linked)

  const range = RANGES.find((r) => r.id === filters.range)!
  const sevCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const a of results) c[a.severity] = (c[a.severity] ?? 0) + 1
    return c
  }, [results])
  const digitalCount = useMemo(() => results.filter((a) => a.digital).length, [results])
  const sourceCount = useMemo(() => new Set(results.map((a) => a.source)).size, [results])
  const failing = data.sources.filter((s) => s.status === 'error')
  const active = countActive(filters)
  const period = filters.fresh ? 'since your last visit' : filters.saved ? 'in your saved list' : range.days == null ? 'in total' : `in the last ${range.label}`
  const synonyms = synonymsFor(filters.q)

  const rowProps = (a: Alert) => ({
    a,
    data,
    now,
    open: filters.open === a.id,
    onToggle: () => patch({ open: filters.open === a.id ? '' : a.id }, true),
    saved: saved.has(a.id),
    onSave: () => toggleSaved(a.id),
    isNew: seenUntil != null && a.seen > seenUntil,
    onTopic: (t: string) => patch({ topic: [t], open: '' }),
  })

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
            {results.length > 0 && (
              <>
                {SEVERITIES.filter((s) => sevCounts[s.id]).map((s) => `${sevCounts[s.id]} ${s.label.toLowerCase()}`).join(', ')}.{' '}
                {filters.lens === 'all' && `${digitalCount.toLocaleString()} involve digital systems. `}
              </>
            )}
            From {sourceCount} of {plural(data.sources.length, 'source')}, refreshed {timeAgo(data.generatedAt, now)}.
          </p>
        </div>
        <div className="lens" role="group" aria-label="Lens">
          <button aria-pressed={filters.lens === 'all'} onClick={() => patch({ lens: 'all', open: '' })}>All medication safety</button>
          <button aria-pressed={filters.lens === 'digital'} onClick={() => patch({ lens: 'digital', open: '' })}>
            <span className="lens-dot" aria-hidden="true" />
            Digital systems
          </button>
        </div>
      </section>

      {freshCount > 0 && !filters.fresh && (
        <p className="banner banner-new">
          <strong>{plural(freshCount, 'new alert')} since your last visit.</strong>
          <button className="link-btn" onClick={() => patch({ fresh: true, open: '' })}>Show only new</button>
          <button className="link-btn" onClick={() => setSeenUntil(markAllRead())}>Mark all as read</button>
        </p>
      )}
      {filters.fresh && (
        <p className="banner banner-new">
          <strong>Showing alerts that are new since your last visit.</strong>
          <button className="link-btn" onClick={() => patch({ fresh: false })}>Show everything</button>
          <button className="link-btn" onClick={() => { setSeenUntil(markAllRead()); patch({ fresh: false }) }}>Mark all as read</button>
        </p>
      )}
      {failing.length > 0 && (
        <p className="banner banner-warn" role="status">
          {failing.length === 1 ? 'One source' : `${failing.length} sources`} could not be reached at the last check, so recent
          alerts from {failing.map((s) => s.short).join(', ')} may be missing. <a href="#/sources">See source status</a>
        </p>
      )}

      <div className="layout">
        <FilterRail
          data={data}
          filters={filters}
          counts={counts}
          patch={(p) => patch({ ...p, open: '' })}
          savedCount={saved.size}
          open={railOpen}
          onClose={() => { setRailOpen(false); filtersBtn.current?.focus() }}
        />

        <section className="results" aria-label="Alerts">
          <div className="results-bar">
            <label className="search">
              <span className="visually-hidden">Search alerts by drug, product or topic</span>
              <input
                ref={searchRef}
                type="search"
                placeholder="Search drug, product or topic"
                value={filters.q}
                onChange={(e) => patch({ q: e.target.value, open: '' }, true)}
              />
              <kbd aria-hidden="true">/</kbd>
            </label>
            <button ref={filtersBtn} className="btn filters-toggle" onClick={() => setRailOpen(true)}>
              Filters{active ? ` (${active})` : ''}
            </button>
            <div className="ranges" role="group" aria-label="Time range">
              {RANGES.map((r) => (
                <button key={r.id} aria-pressed={filters.range === r.id} onClick={() => patch({ range: r.id, open: '' })}>{r.label}</button>
              ))}
            </div>
            <label className="sort">
              <span>Sort</span>
              <select value={filters.sort} onChange={(e) => patch({ sort: e.target.value as Filters['sort'], open: '' })}>
                <option value="date">Newest first</option>
                <option value="severity">Most severe first</option>
              </select>
            </label>
          </div>

          <div className="results-tools">
            <label className="check research-toggle">
              <input type="checkbox" checked={filters.research} onChange={() => patch({ research: !filters.research, open: '' })} />
              <span className="check-l">Include research papers</span>
            </label>
            {active > 0 && (
              <button className="link-btn" onClick={() => setFilters({ ...DEFAULT_FILTERS, lens: filters.lens, range: filters.range, sort: filters.sort, research: filters.research, q: filters.q })}>
                Clear filters
              </button>
            )}
            {results.length > 0 && (
              <button className="link-btn" onClick={() => download(`horizons-alerts-${new Date(now).toISOString().slice(0, 10)}.csv`, toCsv(results, data), 'text/csv;charset=utf-8')}>
                Download these {results.length.toLocaleString()} as CSV
              </button>
            )}
            {viewQuery !== defaultView ? (
              <button className="link-btn" onClick={() => saveDefault(viewQuery)}>Make this my default view</button>
            ) : defaultView ? (
              <button className="link-btn" onClick={() => saveDefault('')}>Remove my default view</button>
            ) : null}
          </div>

          {synonyms.length > 0 && <p className="search-note">Also matching {synonyms.join(', ')}.</p>}
          <p className="visually-hidden" role="status">{plural(results.length, 'alert')} shown</p>

          {linkedOutside && (
            <section className="day linked">
              <h2 className="day-h">Linked alert</h2>
              <ul className="rows"><Row {...rowProps(linked)} /></ul>
            </section>
          )}

          {results.length === 0 ? (
            <div className="empty">
              <h2>No alerts match</h2>
              <p>
                {filters.saved && saved.size === 0
                  ? 'You have not saved any alerts yet. Open an alert and choose Save to keep it here.'
                  : filters.fresh
                    ? 'Nothing new has arrived since your last visit.'
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
                  {g.items.map((a) => <Row key={a.id} {...rowProps(a)} />)}
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

function Row({ a, data, now, open, onToggle, saved, onSave, isNew, onTopic }: {
  a: Alert; data: Dataset; now: number; open: boolean; onToggle: () => void; saved: boolean; onSave: () => void; isNew: boolean
  onTopic: (t: string) => void
}) {
  const src = data.sourceById[a.source]
  const [copied, setCopied] = useState(false)
  const link = alertLink(a.id)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      window.prompt('Copy this link', link)
    }
  }
  const mail = `mailto:?subject=${encodeURIComponent(`${src.short}: ${a.title}`)}&body=${encodeURIComponent(
    `${a.title}\n\nPublished by ${src.name}, ${shortDate(a.published)}${a.pclass ? ` (${a.pclass})` : ''}\nOriginal notice: ${a.url}\n\nVia Horizons: ${link}\n`,
  )}`
  const report = `${ISSUES_URL}/new?template=wrong-label.yml&title=${encodeURIComponent(`Label: ${a.title.slice(0, 80)}`)}&alert=${encodeURIComponent(`${a.title}\n${a.url}\nCurrently: ${SEV_LABEL[a.severity]}${a.topics.length ? `, ${a.topics.map((t) => data.topics[t]).join(', ')}` : ', no digital topic'}`)}`

  return (
    <li className={`row sev-${a.severity}${open ? ' is-open' : ''}`}>
      <div className="row-head">
        <div className="row-main">
          <h3 className="row-title">
            <button aria-expanded={open} onClick={onToggle} lang={src.lang !== 'en' ? src.lang : undefined}>
              {isNew && <span className="new">New</span>}
              {a.title}
            </button>
          </h3>
          <p className="row-meta">
            <span className={`sev-tag sev-tag-${a.severity}${a.pclass ? '' : ' sev-est'}`} title={a.pclass ? `Based on the publisher's classification: ${a.pclass}` : 'Estimated by Horizons from the wording of the notice'}>
              {SEV_LABEL[a.severity]}
            </span>
            {a.pclass && <span className="pclass">{a.pclass}</span>}
            <span>{KIND_LABELS[a.kind] ?? a.kind}</span>
            <time dateTime={a.published.slice(0, 10)}>{rowDate(a.time, now)}</time>
            {a.topics.slice(0, 3).map((t) => (
              <span key={t} className="topic">{data.topics[t]}</span>
            ))}
            {saved && <span className="saved-mark">Saved</span>}
          </p>
        </div>
        <p className="row-src">
          <span className="row-org">{src.short}</span>
          <span className="row-country">{src.country}</span>
        </p>
      </div>
      {open && (
        <div className="row-body">
          {a.summary && <p className="row-summary" lang={src.lang !== 'en' ? src.lang : undefined}>{a.summary}</p>}
          <dl className="facts">
            <div><dt>Published by</dt><dd>{src.name}</dd></div>
            <div><dt>{a.dated ? 'Date' : 'First seen'}</dt><dd>{shortDate(a.published)}</dd></div>
            <div>
              <dt>Publisher's classification</dt>
              <dd>{a.pclass ?? 'Not stated'}</dd>
            </div>
            {src.lang !== 'en' && <div><dt>Language</dt><dd>{languageName(src.lang)}</dd></div>}
          </dl>
          {!a.pclass && (
            <p className="row-note">
              "{SEV_LABEL[a.severity]}" is Horizons' estimate from the wording, not the publisher's grading. Read the notice before acting.
            </p>
          )}
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
              {a.linkLabel ?? `Read at ${src.short}`}
            </a>
            <button className="btn" onClick={copy}>{copied ? 'Link copied' : 'Copy link'}</button>
            <a className="btn" href={mail}>Email</a>
            <button className="btn" aria-pressed={saved} onClick={onSave}>{saved ? 'Remove from saved' : 'Save'}</button>
            <a className="link-btn" href={report} target="_blank" rel="noopener noreferrer">Report a wrong label</a>
          </div>
        </div>
      )}
    </li>
  )
}
