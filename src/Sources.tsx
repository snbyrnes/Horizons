import { plural, REGIONS, shortDate, timeAgo, TYPE_LABELS, type Dataset, type Source } from './data'

const STATUS: Record<Source['status'], string> = {
  ok: 'Working',
  partial: 'Partly working',
  empty: 'No items returned',
  error: 'Not reachable',
}

const TYPE_ONE: Record<string, string> = {
  regulator: 'Regulator',
  safety: 'Safety organisation',
  healthcare: 'Healthcare body',
  standards: 'Standards body',
  research: 'Research literature',
}

export function Sources({ data, now }: { data: Dataset; now: number }) {
  const failing = data.sources.filter((s) => s.status === 'error')
  const countries = new Set(data.sources.map((s) => s.country)).size
  return (
    <article className="page">
      <h1>{data.sources.length} sources across {countries} countries and regions</h1>
      <p className="lede">
        Horizons checks each of these every six hours. Last check finished {timeAgo(data.generatedAt, now)}
        {failing.length ? `; ${plural(failing.length, 'source')} could not be reached and will be retried.` : ', and every source responded.'}
      </p>

      {REGIONS.map((region) => {
        const list = data.sources.filter((s) => s.region === region)
        if (!list.length) return null
        return (
          <section key={region} className="src-region">
            <h2>{region}</h2>
            <div className="table-scroll">
              <table className="src-table">
                <thead>
                  <tr>
                    <th scope="col">Organisation</th>
                    <th scope="col">Kind</th>
                    <th scope="col" className="num">Alerts</th>
                    <th scope="col" className="num">Digital</th>
                    <th scope="col">Latest item</th>
                    <th scope="col">Feed status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s.id}>
                      <th scope="row">
                        <a href={s.home} target="_blank" rel="noopener noreferrer">{s.name}</a>
                        <span className="src-country">{s.country}{s.lang !== 'en' ? `, in ${new Intl.DisplayNames(undefined, { type: 'language' }).of(s.lang)}` : ''}</span>
                        {s.note && <span className="src-note">{s.note}</span>}
                      </th>
                      <td>{TYPE_ONE[s.type] ?? TYPE_LABELS[s.type] ?? s.type}</td>
                      <td className="num">
                        {s.count ? <a href={`#/?range=all&research=1&source=${s.id}`}>{s.count.toLocaleString()}</a> : 0}
                      </td>
                      <td className="num">
                        {s.digitalCount ? <a href={`#/?lens=digital&range=all&research=1&source=${s.id}`}>{s.digitalCount.toLocaleString()}</a> : 0}
                      </td>
                      <td>{s.latest ? shortDate(s.latest) : 'None yet'}</td>
                      <td>
                        <span className={`status status-${s.status}`} title={s.error}>{STATUS[s.status]}</span>
                        {s.status === 'error' && s.lastSuccess && <span className="src-note">Last worked {shortDate(s.lastSuccess)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </article>
  )
}
