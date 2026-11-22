import { REPO_URL } from './community'
import { SEVERITIES, type Dataset } from './data'

const RULES_URL = `${REPO_URL}/blob/main/pipeline/classify.mjs`

const TOPIC_EXAMPLES: Record<string, string> = {
  eprescribing: 'ePrescribing and order entry, electronic medication charts, order sets, drop-down selection errors',
  ehr: 'Electronic health records, pharmacy and GP systems, patient portals, downtime',
  cds: 'Clinical decision support, interaction and allergy alerts, alert fatigue, overrides',
  pumps: 'Smart infusion pumps and drug libraries, syringe drivers, insulin pumps, glucose sensors. Hardware faults such as batteries are listed under this topic but kept out of the digital lens',
  dispensing: 'Automated dispensing cabinets, pharmacy robots, compounding devices, dispensing software',
  barcode: 'Barcode medication administration, product barcodes, scanning, serialisation',
  interop: 'Drug databases and terminologies, interfaces, data migration, transfer-of-care messages',
  software: 'Software defects and updates, firmware, apps, cybersecurity, algorithms',
  ai: 'AI and machine learning tools, scribes, chatbots, predictive models',
  telehealth: 'Telehealth, remote and online prescribing, online pharmacies',
}

const PUBLISHER_CLASSES = [
  ['National Patient Safety Alert (England)', 'Critical'],
  ['Class I or Class 1 recall (FDA, MHRA), Type I (Health Canada)', 'Critical'],
  ['Class II or Class 2 recall, Type II', 'High'],
  ['Direct healthcare professional communication (DHPC), Rote-Hand-Brief, WHO Medical Product Alert', 'High'],
  ['Class III or Class 3 recall, Type III, Class 4 defect notification, Field Safety Notice, FDA Drug Safety Communication', 'Advisory'],
]

export function Method({ data }: { data: Dataset }) {
  return (
    <article className="page prose">
      <h1>How Horizons works</h1>
      <p className="lede">
        Horizons gathers medication safety notices from {data.sources.length} feeds published by regulators, safety
        organisations and healthcare bodies, and highlights the ones that involve digital systems. It runs without
        anyone curating it, so it is a scanning aid and not a substitute for your formal alerting channels.
      </p>

      <h2>Where the alerts come from</h2>
      <p>
        Every six hours an automated job reads each organisation's public feed or listing page, keeps the title, date,
        link and a short extract, and publishes the result as a static file that this site reads. Nothing is rewritten
        or summarised by a model: the text you see is the publisher's own, in the publisher's language. Alerts are
        kept for two years, although most sources only expose their last few months.
      </p>
      <p>
        Feeds that cover more than medicines, such as general device recalls or news, are filtered so that only items
        about medicines or digital systems come through. When the same notice appears in two feeds it is shown once.
        The <a href="#/sources">sources page</a> shows which feeds responded at the last check and which organisations
        we could not include.
      </p>

      <h2>How severity is assigned</h2>
      <p>
        Where a publisher grades its own notice, Horizons shows that grade beside the alert and uses it to set the
        severity, as below. These alerts carry a filled severity label.
      </p>
      <table className="plain-table">
        <thead><tr><th scope="col">Publisher's classification</th><th scope="col">Horizons severity</th></tr></thead>
        <tbody>
          {PUBLISHER_CLASSES.map(([cls, sev]) => (
            <tr key={cls}><th scope="row">{cls}</th><td>{sev}</td></tr>
          ))}
        </tbody>
      </table>
      <p>
        Most notices carry no grade. For those, Horizons estimates severity from the wording of the title and extract,
        and shows the label as an outline to mark it as an estimate. An estimate can be wrong in either direction, so
        read the notice before acting on it.
      </p>
      <table className="plain-table">
        <thead><tr><th scope="col">Label</th><th scope="col">Used for</th></tr></thead>
        <tbody>
          {SEVERITIES.map((s) => (
            <tr key={s.id}>
              <th scope="row"><span className={`sev-tag sev-tag-${s.id}`}>{s.label}</span></th>
              <td>{s.help}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>How an alert is marked as digital</h2>
      <p>
        Each title and extract is matched against a list of terms for ten topics. An alert joins the digital lens when
        it contains at least one specific term, for example "ePrescribing", "drug library" or "software defect".
        General words such as "electronic" or "system" do not qualify on their own. The complete term lists and
        severity rules are public: <a href={RULES_URL} target="_blank" rel="noopener noreferrer">read the rules on GitHub</a>.
      </p>
      <table className="plain-table">
        <thead><tr><th scope="col">Topic</th><th scope="col">Covers</th></tr></thead>
        <tbody>
          {Object.entries(data.topics).map(([id, label]) => (
            <tr key={id}><th scope="row">{label}</th><td>{TOPIC_EXAMPLES[id]}</td></tr>
          ))}
        </tbody>
      </table>

      <h2>Limits you should know about</h2>
      <ul>
        <li>Matching is by keyword on a short extract, so some alerts are mislabelled and some digital issues are missed when the extract does not mention the system involved. Use "Report a wrong label" on any alert to tell us.</li>
        <li>Coverage depends on what each organisation publishes openly. Several bodies that publish important digital medication safety material block automated readers or have no public feed, and are not included.</li>
        <li>Notices in other languages are shown in their original language and are matched with a smaller term list. Searching in English will not find them.</li>
        <li>Search matches the words in the title and extract, plus a short list of brand and generic names that are used interchangeably.</li>
        <li>Saved alerts, your default view and the "New" marker are stored in this browser only.</li>
      </ul>

      <h2>Keep up without visiting</h2>
      <p>
        Subscribe to the <a href="./feed.xml">RSS feed of digital-system alerts</a> or the{' '}
        <a href="./feed-all.xml">RSS feed of all alerts</a> in a feed reader, or use a feed-to-email service to receive
        them as a digest. You can also download the complete dataset as <a href="./data/alerts.json">JSON</a>, or use
        "Download as CSV" on the alerts page for the list you are looking at. Any filtered view, and any single alert,
        can be shared by copying its link.
      </p>

      <h2>About this project</h2>
      <p>
        Horizons is an open-source project. The code, the source list and every classification rule are public on{' '}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">GitHub</a>, where changes are recorded as they are
        made. Horizons republishes only titles, dates, links and short extracts, and always links to the original
        notice, which remains the authoritative version. To suggest a source, report a problem or get in touch, use
        the <a href="#/feedback">feedback page</a>.
      </p>
    </article>
  )
}
