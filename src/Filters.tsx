import { useEffect, useRef, useState } from 'react'
import { KIND_LABELS, REGIONS, SEVERITIES, TYPE_LABELS, type Dataset, type FacetKey, type Filters } from './data'

interface Props {
  data: Dataset
  filters: Filters
  counts: Record<FacetKey, Record<string, number>>
  patch: (p: Partial<Filters>) => void
  savedCount: number
  /** On narrow screens the rail is a dialog; on wide screens it is always visible. */
  open: boolean
  onClose: () => void
}

const FOCUSABLE = 'button, input, select, a[href]'

export function FilterRail({ data, filters, counts, patch, savedCount, open, onClose }: Props) {
  const rail = useRef<HTMLElement>(null)
  const done = useRef<HTMLButtonElement>(null)

  // Dialog behaviour while open: move focus in, keep it in, close on Escape, stop the page scrolling behind.
  useEffect(() => {
    if (!open) return
    done.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab' || !rail.current) return
      const items = [...rail.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      const first = items[0]
      const last = items.at(-1)
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const toggle = (key: FacetKey, id: string) => {
    const cur = filters[key]
    patch({ [key]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] })
  }

  const group = (key: FacetKey, title: string, options: { id: string; label: string; help?: string }[]) => {
    const shown = options.filter((o) => counts[key][o.id] || filters[key].includes(o.id))
    if (!shown.length) return null
    return (
      <fieldset className="facet">
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

  const byCount = (key: FacetKey) => (a: { id: string; label: string }, b: { id: string; label: string }) =>
    (counts[key][b.id] ?? 0) - (counts[key][a.id] ?? 0) || a.label.localeCompare(b.label)

  const [allCountries, setAllCountries] = useState(false)
  const countryOptions = [...new Set(data.sources.map((s) => s.country))].map((c) => ({ id: c, label: c })).sort(byCount('country'))
  const visibleCountries = allCountries ? countryOptions : countryOptions.filter((o, i) => i < 8 || filters.country.includes(o.id))

  const [allSources, setAllSources] = useState(false)
  const sourceOptions = data.sources.map((s) => ({ id: s.id, label: s.short, help: s.name })).sort(byCount('source'))
  const visibleSources = allSources ? sourceOptions : sourceOptions.filter((o, i) => i < 8 || filters.source.includes(o.id))

  return (
    <>
      {open && <button className="scrim" aria-label="Close filters" onClick={onClose} />}
      <aside
        ref={rail}
        className={`rail${open ? ' is-open' : ''}`}
        aria-label="Filters"
        role={open ? 'dialog' : undefined}
        aria-modal={open ? true : undefined}
      >
        <div className="rail-head">
          <strong>Filters</strong>
          <button ref={done} className="btn" onClick={onClose}>Done</button>
        </div>

        {group('sev', 'Severity', SEVERITIES)}
        {group('topic', 'Digital topic', Object.entries(data.topics).map(([id, label]) => ({ id, label })))}
        {group('region', 'Region', REGIONS.map((r) => ({ id: r, label: r })))}
        {group('country', 'Country', visibleCountries)}
        {countryOptions.length > 8 && (
          <button className="link-btn" onClick={() => setAllCountries(!allCountries)}>
            {allCountries ? 'Show fewer countries' : `Show all ${countryOptions.length} countries`}
          </button>
        )}
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
