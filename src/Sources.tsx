import { newIssue, NOT_INCLUDED } from './community'
import { languageName, plural, REGIONS, shortDate, timeAgo, TYPE_LABELS, type Dataset, type Source } from './data'

const STATUS: Record<Source['status'], string> = {
  ok: 'Working',
  quiet: 'Quiet',
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
  const quiet = data.sources.filter((s) => s.status === 'quiet').length
  const countries = new Set(data.sources.map((s) => s.country)).size
  return (
    <article className="page">
      <h1>{data.sources.length} sources across {countries} countries and regions</h1>
      <p className="lede">
        Horizons checks each of these every 12 hours. Last check finished {timeAgo(data.generatedAt, now)}
        {failing.length ? `; ${plural(failing.length, 'source')} could not be reached and will be retried.` : ', and every source responded.'}{' '}
        {quiet > 0 && `${plural(quiet, 'source')} responded but had nothing in scope recently, which is normal for bodies that publish rarely. `}
        <a href="#not-included" onClick={(e) => { e.preventDefault(); document.getElementById('not-included')?.scrollIntoView() }}>See the sources we could not include</a>.
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
                        <span className="src-country">{s.country}{s.lang !== 'en' ? `, in ${languageName(s.lang)}` : ''}</span>
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
                        <span className={`status status-${s.status}`}>{STATUS[s.status]}</span>
                        {s.status === 'quiet' && <span className="src-note">{s.count ? 'Nothing in scope for four months' : 'Responding, but nothing in scope yet'}</span>}
                        {s.error && <span className="src-error">{s.error.replace(/https?:\/\/\S+:\s*/g, '')}</span>}
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

      <section className="src-region" id="not-included">
        <h2>Sources we could not include</h2>
        <p className="lede lede-small">
          We tried these {NOT_INCLUDED.length} and could not read them automatically. If you work with one of these
          organisations, or know of a public feed, API or contact we missed, please{' '}
          <a href={newIssue('suggest-a-source.yml')} target="_blank" rel="noopener noreferrer">share what you know</a>.
          You can also <a href="#/feedback">suggest a source</a> that is not listed at all.
        </p>
        <div className="table-scroll">
          <table className="src-table">
            <thead>
              <tr>
                <th scope="col">Organisation</th>
                <th scope="col">What happened when we checked</th>
              </tr>
            </thead>
            <tbody>
              {NOT_INCLUDED.map((n) => (
                <tr key={n.name}>
                  <th scope="row">
                    {n.name}
                    <span className="src-country">{n.country}</span>
                  </th>
                  <td>{n.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  )
}
