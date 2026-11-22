const region = 'Global'

const PUBMED_QUERY = `("Medication Errors"[Mesh] OR "medication safety"[tiab] OR "medication error*"[tiab] OR "prescribing error*"[tiab] OR "dispensing error*"[tiab] OR "administration error*"[tiab]) AND ("Medical Order Entry Systems"[Mesh] OR "Electronic Prescribing"[Mesh] OR "Decision Support Systems, Clinical"[Mesh] OR "Electronic Health Records"[Mesh] OR "Infusion Pumps"[Mesh] OR CPOE[tiab] OR "computerized provider order entry"[tiab] OR "computerised physician order entry"[tiab] OR "electronic prescribing"[tiab] OR e-prescribing[tiab] OR "electronic health record*"[tiab] OR "electronic medical record*"[tiab] OR "clinical decision support"[tiab] OR "smart pump*"[tiab] OR "automated dispensing"[tiab] OR "barcode medication administration"[tiab] OR "bar-code medication administration"[tiab] OR "health information technology"[tiab] OR "alert fatigue"[tiab] OR "closed loop medication"[tiab] OR "electronic medication management"[tiab] OR "artificial intelligence"[tiab] OR "large language model*"[tiab])`

export const GLOBAL = [
  {
    id: 'pubmed',
    name: 'PubMed: new research on medication safety in digital systems',
    short: 'PubMed',
    country: 'International',
    region,
    type: 'research',
    home: 'https://pubmed.ncbi.nlm.nih.gov/',
    note: 'Peer-reviewed papers matching a fixed search on medication errors and health IT.',
    hints: { kind: 'research', maxSeverity: 'info', digital: true },
    feeds: [{ adapter: 'pubmed', query: PUBMED_QUERY, days: 180, limit: 150 }],
  },
]
