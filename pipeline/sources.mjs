// The source registry. Every endpoint here was checked by hand before being added.
//
// filter:  'all'                keep everything (the feed is already about medication safety)
//          'medication'         keep items about medicines OR digital systems (for broad feeds)
//          'medication-digital' keep items about medicines AND digital systems (for device or health IT feeds)
//          'digital'            keep items about digital systems
// hints:   { kind, minSeverity, maxSeverity } applied to every item from the source or feed.
// Adapters are in adapters.mjs; the default is 'rss' (RSS or Atom).

import { NORTH_AMERICA } from './sources/north-america.mjs'
import { UK_IRELAND } from './sources/uk-ireland.mjs'
import { EUROPE } from './sources/europe.mjs'
import { ASIA_PACIFIC } from './sources/asia-pacific.mjs'
import { GLOBAL } from './sources/global.mjs'

export const SOURCES = [...GLOBAL, ...UK_IRELAND, ...EUROPE, ...NORTH_AMERICA, ...ASIA_PACIFIC]

const ids = new Set()
for (const s of SOURCES) {
  if (ids.has(s.id)) throw new Error(`Duplicate source id: ${s.id}`)
  ids.add(s.id)
}
