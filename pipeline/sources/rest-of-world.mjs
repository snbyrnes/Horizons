const region = 'Rest of world'
const SAFETY = 'recall|safety|alert|warning|falsif|counterfeit|substandard|withdraw|adverse|pharmacovigilance|digital|electronic'

export const REST_OF_WORLD = [
  {
    id: 'nafdac',
    name: 'NAFDAC recalls and safety alerts',
    short: 'NAFDAC',
    country: 'Nigeria',
    region,
    type: 'regulator',
    home: 'https://nafdac.gov.ng/category/recalls-and-alerts/',
    filter: 'medication',
    feeds: [{ url: 'https://nafdac.gov.ng/category/recalls-and-alerts/feed/' }],
  },
  {
    id: 'sahpra',
    name: 'South African Health Products Regulatory Authority',
    short: 'SAHPRA',
    country: 'South Africa',
    region,
    type: 'regulator',
    home: 'https://www.sahpra.org.za/',
    filter: 'medication',
    feeds: [{ url: 'https://www.sahpra.org.za/feed/', include: SAFETY }],
  },
  {
    id: 'anmat',
    name: 'ANMAT alertas de medicamentos',
    short: 'ANMAT',
    country: 'Argentina',
    region,
    type: 'regulator',
    lang: 'es',
    home: 'https://www.argentina.gob.ar/anmat/alertas/medicamentos',
    hints: { kind: 'alert', minSeverity: 'high' },
    feeds: [{
      adapter: 'html',
      url: 'https://www.argentina.gob.ar/anmat/alertas/medicamentos',
      select: { item: 'a.panel.panel-default[href]', title: 'h3', date: 'time' },
    }],
  },
]
