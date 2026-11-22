export const REPO_URL = 'https://github.com/snbyrnes/Horizons'
export const ISSUES_URL = `${REPO_URL}/issues`
export const newIssue = (template: string) => `${ISSUES_URL}/new?template=${template}`

/** Organisations we tried to include and could not, with what happened when we checked. */
export const NOT_INCLUDED: { name: string; country: string; reason: string }[] = [
  { name: 'ISMP (US) newsletters and alerts', country: 'United States', reason: 'Member content sits behind a login. Public articles are covered through the ECRI and ISMP feed.' },
  { name: 'ECRI alerts and Top 10 Health Technology Hazards', country: 'United States', reason: 'No public feed or listing page.' },
  { name: 'Joint Commission Sentinel Event Alerts', country: 'United States', reason: 'The list is drawn in the browser by a search widget, so there is nothing to read from the page itself, and there is no feed.' },
  { name: 'AHRQ Patient Safety Network (PSNet)', country: 'United States', reason: 'The feed responds but has not been updated since March 2025.' },
  { name: 'United States Pharmacopeia (USP)', country: 'United States', reason: 'Refuses automated readers (access denied).' },
  { name: 'ASHP drug shortages', country: 'United States', reason: 'The RSS feed has been discontinued.' },
  { name: 'CDC Health Alert Network', country: 'United States', reason: 'The feed responds but is empty.' },
  { name: 'Drug Shortages Canada', country: 'Canada', reason: 'Bot challenge on the feed, and the API needs a registered account.' },
  { name: 'NHS Specialist Pharmacy Service', country: 'United Kingdom', reason: 'Bot challenge on every page and feed we tried.' },
  { name: 'NHS England Digital: clinical safety (DCB0129 and DCB0160)', country: 'United Kingdom', reason: 'Bot challenge on news and clinical safety pages.' },
  { name: 'Patient Safety Learning hub', country: 'United Kingdom', reason: 'Bot challenge on the site and its feeds.' },
  { name: 'NHS Wales patient safety alerts and notices', country: 'United Kingdom', reason: 'We could not find a dated list of alerts or a feed.' },
  { name: 'NHS Scotland incidents and alerts (NSS IRIC)', country: 'United Kingdom', reason: 'No dated list or feed; the page points to other sites.' },
  { name: 'CBG-MEB (Medicines Evaluation Board)', country: 'Netherlands', reason: 'News is drawn in the browser and there is no feed. Lareb covers the Netherlands for now.' },
  { name: 'Norwegian Medical Products Agency (DMP)', country: 'Norway', reason: 'News is drawn in the browser and there is no feed.' },
  { name: 'ISMP Spain', country: 'Spain', reason: 'Rate-limited our first request.' },
  { name: 'NSW Clinical Excellence Commission medication safety updates', country: 'Australia', reason: 'Readable from an ordinary connection, but refuses requests from the servers that run our updates.' },
  { name: 'Australian Commission on Safety and Quality in Health Care', country: 'Australia', reason: 'The site did not answer automated requests when we checked.' },
  { name: 'Australian Digital Health Agency', country: 'Australia', reason: 'The site did not answer automated requests when we checked.' },
  { name: 'Safer Care Victoria safety alerts', country: 'Australia', reason: 'The site did not answer automated requests when we checked.' },
  { name: 'SA Health medication safety alerts and notices', country: 'Australia', reason: 'Refuses automated readers (access denied).' },
  { name: 'Hong Kong Drug Office', country: 'Hong Kong', reason: 'Readable, but its safety news re-posts notices from regulators we already read directly, and we could not separate out its own notices.' },
  { name: 'CDSCO and the Pharmacovigilance Programme of India', country: 'India', reason: 'Connections timed out or returned server errors.' },
  { name: 'ANVISA health alerts', country: 'Brazil', reason: 'The alerts service refuses automated readers and the public page is drawn in the browser.' },
  { name: 'International Medical Device Regulators Forum (IMDRF)', country: 'International', reason: 'The site did not answer automated requests when we checked.' },
  { name: 'International Medication Safety Network', country: 'International', reason: 'Reachable, but nothing new has been posted since 2023.' },
]
