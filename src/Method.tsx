import { SEVERITIES, type Dataset } from './data'

const TOPIC_EXAMPLES: Record<string, string> = {
  eprescribing: 'ePrescribing and order entry, electronic medication charts, order sets, drop-down selection errors',
  ehr: 'Electronic health records, pharmacy and GP systems, patient portals, downtime',
  cds: 'Clinical decision support, interaction and allergy alerts, alert fatigue, overrides',
  pumps: 'Smart infusion pumps and drug libraries, syringe drivers, insulin pumps, glucose monitors',
  dispensing: 'Automated dispensing cabinets, pharmacy robots, compounding devices, dispensing software',
  barcode: 'Barcode medication administration, product barcodes, scanning, serialisation',
  interop: 'Drug databases and terminologies, interfaces, data migration, transfer-of-care messages, standards',
  software: 'Software defects and updates, firmware, apps, cybersecurity, algorithms',
  ai: 'AI and machine learning tools, scribes, chatbots, predictive models',
  telehealth: 'Telehealth, remote and online prescribing, online pharmacies',
}

export function Method({ data }: { data: Dataset }) {
  return (
    <article className="page prose">
      <h1>How Horizon works</h1>
      <p className="lede">
        Horizon gathers medication safety notices from {data.sources.length} feeds published by regulators, safety
        organisations, healthcare bodies and standards bodies, and highlights the ones that involve digital systems. It runs without anyone
        curating it, so it is a scanning aid and not a substitute for your formal alerting channels.
      </p>

      <h2>Where the alerts come from</h2>
      <p>
        Every six hours an automated job reads each organisation's public feed or listing page, keeps the title, date,
        link and a short extract, and publishes the result as a static file that this site reads. Nothing is rewritten
        or summarised by a model: the text you see is the publisher's own. Alerts are kept for two years.
      </p>
      <p>
        Feeds that cover more than medicines, such as general device recalls or news, are filtered so that only items
        about medicines or digital systems come through. The <a href="#/sources">sources page</a> shows which feeds
        responded at the last check.
      </p>

      <h2>How an alert is marked as digital</h2>
      <p>
        Each title and extract is matched against a published list of terms for ten topics. An alert joins the digital
        lens when it contains at least one specific term, for example "infusion pump", "ePrescribing" or "software
        defect". General words such as "electronic" or "system" do not qualify on their own.
      </p>
      <table className="plain-table">
        <thead><tr><th scope="col">Topic</th><th scope="col">Covers</th></tr></thead>
        <tbody>
          {Object.entries(data.topics).map(([id, label]) => (
            <tr key={id}><th scope="row">{label}</th><td>{TOPIC_EXAMPLES[id]}</td></tr>
          ))}
        </tbody>
      </table>

      <h2>How severity is assigned</h2>
      <p>
        Severity is Horizon's own triage label, derived from the wording of the notice. It is not the publisher's
        classification, and a notice can be more or less serious than its label suggests.
      </p>
      <table className="plain-table">
        <thead><tr><th scope="col">Label</th><th scope="col">Assigned when the notice mentions</th></tr></thead>
        <tbody>
          {SEVERITIES.map((s) => (
            <tr key={s.id}>
              <th scope="row"><span className={`sev-tag sev-tag-${s.id}`}>{s.label}</span></th>
              <td>{s.help}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Limits you should know about</h2>
      <ul>
        <li>Matching is by keyword, so some alerts will be mislabelled and some digital issues will be missed when the publisher's extract does not mention the system involved.</li>
        <li>Coverage depends on what each organisation publishes openly. Some respected bodies have no public feed or block automated readers, and are not included.</li>
        <li>Notices in other languages are shown in their original language and are matched with a smaller term list.</li>
        <li>Saved alerts and the "New" marker are stored in this browser only.</li>
      </ul>

      <h2>Take the data with you</h2>
      <p>
        Subscribe to the <a href="./feed.xml">RSS feed of digital-system alerts</a>, or download the complete dataset
        as <a href="./data/alerts.json">JSON</a>. Filtered views can be shared by copying the page address.
      </p>
    </article>
  )
}
