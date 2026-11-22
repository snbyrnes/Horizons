import { ISSUES_URL, newIssue, REPO_URL } from './community'

const ASKS = [
  {
    title: 'Suggest a source',
    body: 'Tell us about an organisation that publishes medication safety alerts, especially anything on digital systems. A link to its feed or alerts page is the most useful thing you can send.',
    action: 'Suggest a source',
    href: newIssue('suggest-a-source.yml'),
  },
  {
    title: 'Help us reach a blocked source',
    body: 'Several respected organisations block automated readers or have no public feed. If you work with one of them, or know of a feed or API we missed, we would like to hear from you.',
    action: 'Share what you know',
    href: newIssue('suggest-a-source.yml'),
    more: { label: 'See the sources we could not include', href: '#/sources' },
  },
  {
    title: 'Report a wrong label',
    body: 'Alerts are tagged by keyword rules, so some are mislabelled and some digital issues are missed. Send us the alert and what it should have been, and we will adjust the rules.',
    action: 'Report a wrong label',
    href: newIssue('wrong-label.yml'),
  },
  {
    title: 'Share an idea or a problem',
    body: 'Anything else: a feature you need for your alerting process, something confusing, or something broken.',
    action: 'Send feedback',
    href: newIssue('feedback.yml'),
  },
]

export function Feedback() {
  return (
    <article className="page">
      <h1>Help make Horizons more useful</h1>
      <p className="lede">
        Horizons is an open project and it gets better when the people who use it say what is missing. Feedback goes
        through GitHub issues, so it is public and anyone can add to it. You need a free GitHub account to post.
      </p>

      <ul className="asks">
        {ASKS.map((a) => (
          <li key={a.title} className="ask">
            <h2>{a.title}</h2>
            <p>{a.body}</p>
            <div className="ask-actions">
              <a className="btn btn-primary" href={a.href} target="_blank" rel="noopener noreferrer">{a.action}</a>
              {a.more && <a className="ask-more" href={a.more.href}>{a.more.label}</a>}
            </div>
          </li>
        ))}
      </ul>

      <div className="prose">
        <h2>See what others have raised</h2>
        <p>
          Browse the <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer">open issues</a> to add your voice to
          an existing request, or read the <a href={REPO_URL} target="_blank" rel="noopener noreferrer">code and source list</a>.
          Adding a source is usually one short entry, and contributions are welcome.
        </p>
      </div>
    </article>
  )
}
