// Rule-based classification: digital-system topics, severity, kind, and medication relevance.
// Deliberately transparent (no model calls) so every tag can be explained on the Method page.

const rx = (parts, flags = 'i') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${parts.join('|')})`, flags + 'u')

const either = (...res) => ({ test: (s) => res.some((re) => re.test(s)) })

/** Each topic: strong patterns score 3, weak patterns score 1. A title hit is doubled. */
export const TOPICS = [
  {
    id: 'eprescribing',
    label: 'Electronic prescribing',
    strong: rx([
      'e-?prescri\\w*', 'electronic(?:ally)? prescri\\w*', 'EPMA\\b', 'CPOE\\b', 'eMAR\\b', 'e-?MAR\\b',
      'computeri[sz]ed (?:physician|provider|prescriber) order entry', 'order entry', 'order sets?\\b',
      'electronic medic(?:ation|ines) (?:management|administration|record|chart)\\w*',
      'prescribing (?:system|software|platform|module)s?', 'electronic (?:transfer of )?prescriptions?',
      'elektronische[ns]? (?:rezept|verordnung)\\w*', 'e-rezept', 'prescription [ée]lectronique', 'receta electr[óo]nica',
      'logiciels? d[’\']aide [àa] la prescription',
    ]),
    weak: rx(['drop-?down', 'pick-?list', 'free-?text', 'default dose', 'pre-?populated', 'auto-?populat\\w*', 'selection error']),
  },
  {
    id: 'ehr',
    label: 'Electronic health records',
    strong: rx([
      'EHRs?\\b', 'EMRs?\\b', 'EPRs?\\b', 'electronic (?:health|medical|patient|care) records?', 'health IT\\b',
      'health information technology', 'clinical information systems?', 'patient administration system',
      'digital (?:health )?records?', 'electronic records?', 'clinical systems?\\b', 'GP (?:clinical )?systems?',
      'pharmacy (?:information|management|dispensing|computer) systems?', 'patient portal', 'my health record',
      'summary care record', 'shared care record', 'laboratory information system', 'dossier patient informatis[ée]',
    ]),
    weak: rx(['wrong[- ]patient', 'copy(?: and |-| & )paste', 'downtime', 'system outage', 'clinical safety officer', 'DCB ?0(?:129|160)']),
  },
  {
    id: 'cds',
    label: 'Decision support and alerts',
    strong: rx([
      'clinical decision support', 'decision[- ]support', 'alert fatigue', 'alert overrides?', 'override\\w* (?:of )?alerts?',
      '(?:interaction|allergy|dose|dosing|duplicate|drug) (?:alert|warning|check)(?:s|ing)?\\b(?= (?:in|within|by|on|fired|from) (?:the )?(?:system|software|EHR|EMR|electronic))',
      'dose[- ]range check\\w*', 'drug[- ]interaction (?:software|database|checker)', 'computeri[sz]ed alerts?', 'electronic alerts?',
      'best practice advisor(?:y|ies)', 'hard stops?\\b', 'soft stops?\\b', 'interruptive alerts?',
    ]),
    weak: rx(['overrid\\w+', 'dose calculat\\w+', 'calculators?\\b']),
  },
  {
    id: 'pumps',
    label: 'Infusion pumps and connected devices',
    strong: rx([
      'smart (?:infusion )?pumps?', 'infusion pumps?', 'infusion systems?', 'syringe (?:pumps?|drivers?)', 'volumetric pumps?',
      'drug librar(?:y|ies)', 'dose error reduction', 'DERS\\b', 'PCA pumps?', 'insulin pumps?', 'pump software',
      'automated insulin (?:delivery|dosing)', 'closed[- ]loop', 'continuous glucose monitor\\w*', 'CGMs?\\b', 'glucose (?:meter|monitoring system|sensor)s?',
      'connected (?:insulin )?pens?', 'smart pens?', 'enteral feeding pumps?', 'ambulatory pumps?', 'infusionspumpen?', 'pompes? [àa] perfusion',
      'pompes? [àa] insuline', 'insulinpumpen?', 'bombas? de (?:infusi[óo]n|insulina)',
    ]),
    weak: rx(['pumps?\\b', 'infusion rate', 'over-?infusion', 'under-?infusion', 'bolus']),
  },
  {
    id: 'dispensing',
    label: 'Automated dispensing and compounding',
    strong: rx([
      'automated dispensing', 'dispensing cabinets?', 'Pyxis', 'Omnicell', 'dispensing robots?', 'pharmacy robot\\w*',
      'robotic (?:dispensing|compounding)', 'automated compound\\w+', 'compounding (?:device|system|software|robot)s?', 'unit[- ]dose (?:system|packag\\w+ (?:machine|system))',
      'dose administration aid\\w* (?:machine|software|packing)', 'automated (?:medication )?(?:storage|packag\\w+|dose)', 'dispensing (?:system|software|label\\w* software)s?',
      'IV workflow', 'gravimetric', 'kommissionierautomat\\w*',
    ]),
    weak: rx(['cabinets?\\b', 'robot\\w*', 'label print\\w+', 'labelling software']),
  },
  {
    id: 'barcode',
    label: 'Barcode and scanning',
    strong: rx([
      'bar-?cod\\w+', 'BCMA\\b', '(?:2D|data ?matrix) (?:bar)?codes?', 'data ?matrix', 'GS1\\b', 'GTINs?\\b', 'scann(?:ing|ed|er|ers) (?:of )?(?:medic\\w+|product|pack|wristband|patient)',
      'closed[- ]loop medic\\w+', 'serialisation|serialization', 'falsified medicines directive', 'track and trace', 'codes?-barres?', 'c[óo]digos? de barras',
    ]),
    weak: rx(['scann(?:ing|ed|er|ers)\\b', 'wristbands?', 'QR codes?']),
  },
  {
    id: 'interop',
    label: 'Data, terminology and interoperability',
    strong: rx([
      'interoperab\\w+', 'data migration', 'system (?:upgrade|update|migration|integration|interface)s?', 'interfac(?:e|es|ing) (?:error|issue|problem|between|with)\\w*',
      'dm\\+d\\b', 'SNOMED', 'RxNorm', 'FHIR\\b', 'HL7\\b', 'IDMP\\b', 'drug (?:database|dictionar\\w+|file|catalogue|catalog)s?', 'medic(?:ines|ation) (?:terminolog\\w+|database|catalogue|catalog)',
      'mapping (?:error|issue)s?', 'data (?:transfer|exchange) ', 'discharge summar(?:y|ies)', 'transfer of care', 'health informatics', 'electronic (?:transfer|transmission|messag\\w+)',
      'electronic product information', 'ePI\\b', 'structured (?:product label\\w+|dose|dosing)', 'medicines? (?:list|reconciliation) (?:software|system|tool|app)',
      'units? of measure\\w*', 'ISO/?TC ?215', 'ISO ?\\d{5}', 'IEC ?(?:62304|82304|80001|60601)',
    ]),
    weak: rx(['interfaces?\\b', 'terminolog\\w+', 'standards?\\b', 'transcription errors?', 'reconciliation']),
  },
  {
    id: 'software',
    label: 'Software, apps and cybersecurity',
    strong: rx([
      'software (?:defect|error|bug|update|issue|fault|glitch|anomal\\w+|problem|malfunction|failure|version|correction|patch|upgrade|recall|design)s?',
      '(?:defect|error|bug|issue|fault|anomal\\w+|problem|malfunction|failure|vulnerabilit\\w+) (?:in|with|of|affecting) (?:the )?(?:\\w+ )?(?:software|firmware|app\\b|application)',
      'firmware', 'cyber-?\\s?security', 'cyber-?(?:attack|incident|threat)s?', 'ransomware', '(?:security|software|cyber\w*) vulnerabilit(?:y|ies)', 'software as a medical device', 'SaMD\\b',
      'medical device software', 'mobile (?:medical )?app(?:lication)?s?', 'health apps?', 'dosing apps?', 'digital therapeutics?', 'algorithm\\w*',
      'IT (?:system|incident|failure|outage)s?', 'digital (?:system|tool|solution|technolog\\w+|medic\\w+|clinical safety|health|transformation|prescri\\w+)s?',
      'computer (?:system|error|glitch)s?', 'logiciels?\\b', 'softwarefehler', 'software-?(?:problem|update|version|aktualisierung|anomalie)\\w*', 'mise [àa] jour (?:du )?logiciel', 'software-?\\w*fehler', 'programvar\\w+', 'ciberseguridad',
    ]),
    weak: rx(['software', 'apps?\\b', 'digital\\w*', 'electronic\\w*', 'automat\\w+', 'technolog\\w+', 'display(?:s|ed)? (?:incorrect|wrong)\\w*']),
  },
  {
    id: 'ai',
    label: 'AI and machine learning',
    strong: either(
      rx([
        'artificial intelligence', 'machine[- ]learning', 'large language models?', 'generative AI', 'chatbots?', 'ChatGPT',
        'ambient (?:scribe|voice|documentation)\w*', 'predictive (?:model|algorithm)s?', 'intelligence artificielle', 'k[üu]nstliche intelligenz',
      ]),
      // Case-sensitive: "ai" and "llm" in lower case are ordinary words or noise in several languages.
      rx(['AI[- ](?:enabled|based|powered|driven|assisted|scribes?|tools?|systems?|models?)', 'LLMs?\b'], ''),
    ),
    weak: rx(['AI\b'], ''),
  },
  {
    id: 'telehealth',
    label: 'Telehealth and online supply',
    strong: rx([
      'tele-?(?:health|medicine|pharmacy|care|consult\\w+)', 'online (?:pharmac\\w+|prescri\\w+|prescriber|clinic|consultation|supply|sale)s?', 'remote (?:prescri\\w+|consult\\w+|monitoring)',
      'internet pharmac\\w+', 'virtual (?:ward|care|clinic)s?', 'websites? selling', 'sold online',
    ]),
    weak: rx(['online\\b', 'websites?']),
  },
]

export const TOPIC_LABELS = Object.fromEntries(TOPICS.map((t) => [t.id, t.label]))

const MEDICATION = rx([
  'medic(?:ation|ine|ines|inal|ament\\w*)s?', 'drugs?\\b', 'dos(?:e|es|ing|age)\\b', 'prescri\\w+', 'pharmac\\w+', 'infusion\\w*', 'insulin\\w*', 'opioid\\w*',
  'vaccin\\w+', 'tablets?', 'capsules?', 'inject\\w+', 'dispens\\w+', 'anticoag\\w+', 'antibiotic\\w*', 'formulation\\w*', 'syringe\\w*', 'inhaler\\w*',
  'chemotherap\\w+', 'adverse (?:drug )?(?:reaction|event)s?', 'overdos\\w+', 'intravenous', 'oral solution', 'ampoules?', 'vials?\\b', 'pre-?filled',
  'arzneimittel\\w*', 'm[ée]dicament\\w*', 'medicamento\\w*', 'l[äa]kemedel\\w*', 'farmac\\w+', 'geneesmiddel\\w*', 'legemid\\w+', 'l[æa]gemid\\w+',
])

const SEVERITY = [
  ['critical', rx([
    'class (?:I|1)\\b(?! ?I)', 'type (?:I|1)\\b(?! ?I)', 'national patient safety alert', 'death\\w*', 'died\\b', 'fatal\\w*', 'life[- ]threatening', 'urgent\\w*', 'immediate(?:ly)? (?:action|stop|cease|quarantine)',
    'serious (?:injur\\w+|harm)', 'do not use', 'stop using', 'never events?', 'most serious', 'black triangle', 'boxed warning', 'sentinel event', 'falsified', 'counterfeit',
  ])],
  ['high', rx([
    'recall\\w*', 'type (?:II|2)\\b', 'safety alert', 'warning\\w*', 'field safety (?:notice|corrective action)s?', 'class (?:II|2)\\b', 'contaminat\\w+', 'overdos\\w+', 'serious\\w*', 'risk of', 'risks?\\b', 'withdraw\\w+',
    'harm\\w*', 'hazard\\w*', 'defect\\w*', 'malfunction\\w*', 'medication errors?', 'dosing errors?', 'wrong (?:dose|drug|patient|route|strength)', 'mix-?ups?', 'quarantine', 'suspen(?:d|ded|sion)',
    'correction\\b', 'alert\\b', 'r[üu]ckruf\\w*', 'rappel\\w*', 'retrait\\w*', 'retirada', 'chargenr[üu]ckruf', 'rote-hand-brief', 'sicherheitsinformation\\w*', 'DHPC\\b', 'direct healthcare professional communication',
  ])],
  ['advisory', rx([
    'safety (?:communication|update|notice|information|advice|bulletin|review)', 'advice\\b', 'reminder', 'caution\\w*', 'precaution\\w*', 'guidance', 'bulletin', 'shortage\\w*', 'supply (?:issue|disruption|problem)s?',
    'discontinu\\w+', 'label(?:l)?ing (?:change|update)s?', 'recommendation\\w*', 'look-?alike', 'sound-?alike', 'monitoring', 'update\\w*', 'information for (?:healthcare|health) professionals',
  ])],
]

const KIND = [
  ['recall', rx(['recall\\w*', 'defect notification', '\\(type (?:I{1,3}|[123])\\)', 'withdraw\\w+', 'field safety', 'market action', 'correction\\b', 'r[üu]ckruf\\w*', 'rappel de', 'retrait\\w*', 'quarantine'])],
  ['shortage', rx(['shortage\\w*', 'supply (?:issue|disruption|problem|constraint)s?', 'discontinu\\w+', 'out of stock', 'lieferengp\\w+', 'rupture de stock'])],
  ['research', rx(['systematic review', 'cohort study', 'randomi[sz]ed', 'cross-sectional', 'qualitative study', 'retrospective', 'scoping review', 'meta-analysis'])],
  ['guidance', rx(['guidance', 'guideline\\w*', 'standard\\w*', 'best practices?', 'recommendation\\w*', 'framework', 'toolkit', 'consultation', 'position statement', 'specification'])],
  ['report', rx(['investigation\\w*', 'report\\b', 'annual report', 'review of', 'analysis of', 'lessons', 'learning from', 'case stud(?:y|ies)', 'newsletter', 'bulletin'])],
  ['alert', rx(['alert\\w*', 'warning\\w*', 'safety (?:communication|notice|update|information|advice)', 'urgent', 'risk of', 'dear (?:healthcare|doctor)', 'DHPC\\b', 'rote-hand-brief'])],
]

const SEVERITY_ORDER = ['info', 'advisory', 'high', 'critical']

function scoreTopics(title, body) {
  const topics = []
  let total = 0
  for (const t of TOPICS) {
    let s = 0
    if (t.strong.test(title)) s += 6
    else if (t.strong.test(body)) s += 3
    if (t.weak) {
      if (t.weak.test(title)) s += 2
      else if (t.weak.test(body)) s += 1
    }
    if (s >= 3) topics.push({ id: t.id, s })
    total += s
  }
  topics.sort((a, b) => b.s - a.s)
  return { score: total, topics: topics.map((t) => t.id) }
}

/**
 * @param {{title: string, summary?: string}} item
 * @param {{kind?: string, minSeverity?: string, maxSeverity?: string}} [hints] source-level defaults
 */
export function classify(item, hints = {}) {
  const title = item.title || ''
  const body = `${title}. ${item.summary || ''}`

  const { score, topics } = scoreTopics(title, body)
  // "Digital" needs one strong topic hit; a pile of weak words alone does not qualify.
  const digital = topics.length > 0

  let severity = 'info'
  for (const [level, re] of SEVERITY) {
    if (re.test(title) || (level !== 'critical' && re.test(body))) { severity = level; break }
  }
  // "Critical" terms appearing only in the body (not the title) count as high.
  if (severity !== 'critical' && SEVERITY[0][1].test(body)) severity = maxSev(severity, 'high')
  if (hints.minSeverity) severity = maxSev(severity, hints.minSeverity)
  if (hints.maxSeverity && SEVERITY_ORDER.indexOf(severity) > SEVERITY_ORDER.indexOf(hints.maxSeverity)) severity = hints.maxSeverity

  let kind = hints.kind || null
  if (!kind) {
    kind = 'news'
    for (const [k, re] of KIND) if (re.test(title)) { kind = k; break }
    if (kind === 'news') for (const [k, re] of KIND) if (k !== 'research' && k !== 'report' && re.test(body)) { kind = k; break }
  }

  return {
    digital,
    digitalScore: score,
    topics,
    severity,
    kind,
    medication: MEDICATION.test(body),
  }
}

function maxSev(a, b) {
  return SEVERITY_ORDER.indexOf(a) >= SEVERITY_ORDER.indexOf(b) ? a : b
}
