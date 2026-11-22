import { useState, type RefObject } from 'react'
import { KIND_LABELS, REGIONS, SEVERITIES, TYPE_LABELS, type Dataset, type FacetKey, type Filters } from './data'

interface Props {
  data: Dataset
  filters: Filters
  counts: Record<FacetKey, Record<string, number>>
  patch: (p: Partial<Filters>) => void
  savedCount: number
  open: boolean
  onClose: () => void
  searchRef: RefObject<HTMLInputElement | null>
}

export function FilterRail({ data, filters, counts, patch, savedCount, open, onClose, searchRef }: Props) {
  const toggle = (key: FacetKey, id: string) => {
    const cur = filters[key]
    patch({ [key]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] })
  }

  const group = (key: FacetKey, title: string, options: { id: string; label: string; help?: string }[], extraClass = '') => {
    const shown = options.filter((o) => counts[key][o.id] || filters[key].includes(o.id))
    if (!shown.length) return null
    return (
      <fieldset className={`facet ${extraClass}`}>
        <legend>{title}</legend>
        {shown.map((o) => (
          <label key={o.id} className="check" title={o.help}>
            <input type="checkbox" checked={filters[key].includes(o.id)} onChange={() => toggle(key, o.id)} />
            <span className={`check-l ${key === 'sev' ? `sev-dot sev-dot-${o.id}` : ''}`}>{o.label}</span>
            <span className="check-n">{(counts[key][o.id] ?? 0).toLocaleString()}</span>
          </label>
        ))}
      </fieldset>
    )
  }

  const [allSources, setAllSources] = useState(false)
  const sourceOptions = data.sources
    .map((s) => ({ id: s.id, label: s.short, help: s.name }))
    .sort((a, b) => (counts.source[b.id] ?? 0) - (counts.source[a.id] ?? 0) || a.label.localeCompare(b.label))
  const visibleSources = allSources ? sourceOptions : sourceOptions.filter((o, i) => i < 8 || filters.source.includes(o.id))

  return (
    <>
      {open && <div className="scrim" onClick={onClose} />}
      <aside className={`rail${open ? ' is-open' : ''}`} aria-label="Filters">
        <div className="rail-head">
          <strong>Filters</strong>
          <button className="btn" onClick={onClose}>Done</button>
        </div>

        <label className="search">
          <span className="visually-hidden">Search alerts</span>
          <input
            ref={searchRef}
            type="search"
            placeholder="Search alerts, for example insulin pump"
            value={filters.q}
            onChange={(e) => patch({ q: e.target.value })}
          />
          <kbd aria-hidden="true">/</kbd>
        </label>

        {group('sev', 'Severity', SEVERITIES)}
        {group('topic', 'Digital topic', Object.entries(data.topics).map(([id, label]) => ({ id, label })), 'facet-topic')}
        {group('region', 'Region', REGIONS.map((r) => ({ id: r, label: r })))}
        {group('type', 'Published by', Object.entries(TYPE_LABELS).map(([id, label]) => ({ id, label })))}
        {group('kind', 'Type of notice', Object.entries(KIND_LABELS).map(([id, label]) => ({ id, label })))}
        {group('source', 'Organisation', visibleSources)}
        {sourceOptions.length > 8 && (
          <button className="link-btn" onClick={() => setAllSources(!allSources)}>
            {allSources ? 'Show fewer organisations' : `Show all ${sourceOptions.length} organisations`}
          </button>
        )}

        <fieldset className="facet">
          <legend>Your list</legend>
          <label className="check">
            <input type="checkbox" checked={filters.saved} onChange={() => patch({ saved: !filters.saved })} />
            <span className="check-l">Saved alerts only</span>
            <span className="check-n">{savedCount}</span>
          </label>
        </fieldset>
      </aside>
    </>
  )
}
