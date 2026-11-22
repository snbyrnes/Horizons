import test from 'node:test'
import assert from 'node:assert/strict'
import { classify } from './classify.mjs'
import { parseDate, parseFeed, toPlain } from './lib.mjs'

const c = (title, summary = '') => classify({ title, summary })

test('digital topics are detected from specific terms', () => {
  assert.deepEqual(c('Class I recall: infusion pump software defect may cause over-infusion').topics.slice(0, 2).sort(), ['pumps', 'software'])
  assert.ok(c('Risk of selecting the wrong medicine from drop-down lists in electronic prescribing systems').topics.includes('eprescribing'))
  assert.ok(c('Automated dispensing cabinet overrides and removal of wrong medication').topics.includes('dispensing'))
  assert.ok(c('Barcode medication administration workarounds').topics.includes('barcode'))
  assert.ok(c('AI-enabled scribes and medication documentation').topics.includes('ai'))
  assert.ok(c('Alert fatigue and clinical decision support').topics.includes('cds'))
})

test('general words alone do not make an alert digital', () => {
  assert.equal(c('Recall of paracetamol 500 mg tablets due to contamination').digital, false)
  assert.equal(c('New system for reporting adverse reactions to vaccines').digital, false)
  assert.equal(c('Antibody-drug conjugates (ADC) and risk of neutropenia').topics.includes('dispensing'), false)
  assert.equal(c('Valproate: updated electronic leaflet available').digital, false)
})

test('severity follows the wording', () => {
  assert.equal(c('Class I recall: insulin pump may deliver incorrect dose').severity, 'critical')
  assert.equal(c('Class II recall: metformin tablets').severity, 'high')
  assert.equal(c('National Patient Safety Alert: potassium permanganate').severity, 'critical')
  assert.equal(c('Reminder on monitoring for patients taking lithium').severity, 'advisory')
  assert.equal(c('Annual conference programme announced').severity, 'info')
})

test('kind and medication relevance', () => {
  assert.equal(c('Recall of amoxicillin oral suspension').kind, 'recall')
  assert.equal(c('Shortage of salbutamol nebules').kind, 'shortage')
  assert.equal(c('Board meeting minutes').medication, false)
  assert.equal(c('Tenfold dosing errors with methotrexate').medication, true)
  assert.equal(classify({ title: 'Anything' }, { kind: 'research', maxSeverity: 'info' }).kind, 'research')
})

test('dates in the shapes regulators use', () => {
  assert.equal(parseDate('20261122').slice(0, 10), '2026-11-22')
  assert.equal(parseDate('22/11/2026').slice(0, 10), '2026-11-22')
  assert.equal(parseDate('11/22/2026', { dayFirst: false }).slice(0, 10), '2026-11-22')
  assert.equal(parseDate('22 November 2026').slice(0, 10), '2026-11-22')
  assert.equal(parseDate('November 22, 2026').slice(0, 10), '2026-11-22')
  assert.equal(parseDate('22.11.2026').slice(0, 10), '2026-11-22')
  assert.equal(parseDate('Sun, 22 Nov 2026 10:00:00 GMT').slice(0, 10), '2026-11-22')
  assert.equal(parseDate('2026-11-22T10:00:00+01:00').slice(0, 10), '2026-11-22')
  assert.equal(parseDate('Published 3 décembre 2025').slice(0, 10), '2025-12-03')
  assert.equal(parseDate('not a date'), null)
})

test('feeds: RSS and Atom parse to the same shape, markup is stripped', () => {
  const rss = parseFeed('<rss><channel><item><title>A &amp; B</title><link>https://x.test/a</link><pubDate>Sun, 22 Nov 2026 10:00:00 GMT</pubDate><description>&lt;p&gt;Hello &lt;b&gt;there&lt;/b&gt;&lt;/p&gt;</description></item></channel></rss>')
  assert.equal(rss.length, 1)
  assert.equal(rss[0].title, 'A & B')
  assert.equal(toPlain(rss[0].summary), 'Hello there')
  const atom = parseFeed('<feed><entry><title type="html">T</title><link rel="alternate" href="https://x.test/b"/><updated>2026-11-22T00:00:00Z</updated><summary>S</summary></entry></feed>')
  assert.equal(atom[0].url, 'https://x.test/b')
  assert.equal(parseFeed('<rss><channel></channel></rss>').length, 0)
  assert.throws(() => parseFeed('<html><body>Blocked</body></html>'))
})
