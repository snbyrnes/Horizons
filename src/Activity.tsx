import { useMemo } from 'react'
import type { Alert } from './data'

const WEEKS = 26
const WEEK = 7 * 864e5
const fmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })

/** Weekly alert volume for the last six months; the digital share is drawn in the accent colour. */
export function Activity({ alerts, now, rangeDays }: { alerts: Alert[]; now: number; rangeDays: number | null }) {
  const weeks = useMemo(() => {
    const bins = Array.from({ length: WEEKS }, (_, i) => ({ start: now - (WEEKS - i) * WEEK, total: 0, digital: 0 }))
    for (const a of alerts) {
      const i = WEEKS - 1 - Math.floor((now - a.time) / WEEK)
      if (i < 0 || i >= WEEKS) continue
      bins[i].total++
      if (a.digital) bins[i].digital++
    }
    return bins
  }, [alerts, now])

  const max = Math.max(1, ...weeks.map((w) => w.total))
  const H = 84
  const BW = 10
  const GAP = 4
  const W = WEEKS * (BW + GAP) - GAP
  const total = weeks.reduce((n, w) => n + w.total, 0)
  const digital = weeks.reduce((n, w) => n + w.digital, 0)

  return (
    <figure className="activity">
      <figcaption>
        Alerts per week, last six months
        <span className="activity-key">
          <span className="key key-all" /> All
          <span className="key key-digital" /> Digital systems
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${total} alerts in the last six months, ${digital} involving digital systems. Busiest week had ${max}.`} preserveAspectRatio="none">
        {weeks.map((w, i) => {
          const h = Math.round((w.total / max) * (H - 2))
          const dh = Math.round((w.digital / max) * (H - 2))
          const x = i * (BW + GAP)
          const inRange = rangeDays == null || now - (w.start + WEEK) < rangeDays * 864e5
          return (
            <g key={i} opacity={inRange ? 1 : 0.35}>
              <title>{`Week of ${fmt.format(w.start)}: ${w.total} alerts, ${w.digital} digital`}</title>
              <rect x={x} y={0} width={BW} height={H} fill="transparent" />
              <rect className="bar-all" x={x} y={H - Math.max(h, 1)} width={BW} height={Math.max(h, 1)} rx={1.5} />
              {dh > 0 && <rect className="bar-digital" x={x} y={H - dh} width={BW} height={dh} rx={1.5} />}
            </g>
          )
        })}
      </svg>
      <div className="activity-axis" aria-hidden="true">
        <span>{fmt.format(weeks[0].start)}</span>
        <span>Busiest week: {max}</span>
        <span>This week</span>
      </div>
    </figure>
  )
}
