// Builds public/data/cities.json from GeoNames dumps (CC BY 4.0, https://www.geonames.org).
// Usage: node scripts/build-cities.mjs <dir with cities1000.txt, cities15000.txt, admin1CodesASCII.txt>
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) throw new Error('usage: node scripts/build-cities.mjs <geonames dir>');

const TELUGU = /[ఀ-౿]/;
const rows = (file) => readFileSync(join(dir, file), 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t'));
const admin1 = new Map(rows('admin1CodesASCII.txt').map((r) => [r[0], r[1]]));

// Who is included (population thresholds keep the file small but cover AP/TS towns and the diaspora).
const AP_TS = new Set(['02', '40']);
const DIASPORA = { US: 50_000, GB: 100_000, CA: 100_000, AU: 100_000, NZ: 100_000, SG: 0, AE: 50_000, SA: 300_000, QA: 50_000,
  KW: 50_000, OM: 50_000, BH: 50_000, MY: 300_000, DE: 300_000, IE: 100_000, NL: 300_000, ZA: 500_000, MU: 50_000, JP: 1_000_000 };

// Telugu names written by the designer in design/handoff take precedence over GeoNames alternates.
const TE_OVERRIDES = { '1269843': 'హైదరాబాద్', '1253184': 'విజయవాడ' };

const keep = new Map();
const add = (r) => {
  const [id, name, ascii, alt, lat, lon, fclass, , cc, , a1, , , , pop, , , tz] = r;
  if (fclass !== 'P' || !tz) return;
  const te = TE_OVERRIDES[id] ?? (alt ?? '').split(',').find((n) => TELUGU.test(n)) ?? '';
  keep.set(id, { id, en: name, ascii: ascii !== name ? ascii : '', te, lat: +(+lat).toFixed(4), lon: +(+lon).toFixed(4), tz, admin: admin1.get(`${cc}.${a1}`) ?? '', cc, pop: +pop });
};
for (const r of rows('cities1000.txt')) if (r[8] === 'IN' && AP_TS.has(r[10])) add(r);
for (const r of rows('cities15000.txt')) {
  const cc = r[8], pop = +r[14];
  if (cc === 'IN' && pop >= 100_000) add(r);
  else if (cc in DIASPORA && pop >= DIASPORA[cc]) add(r);
}

const list = [...keep.values()].sort((a, b) => b.pop - a.pop);
const tzs = [...new Set(list.map((c) => c.tz))].sort();
const out = {
  source: 'GeoNames (https://www.geonames.org), cities1000 / cities15000 / admin1CodesASCII dumps, licensed CC BY 4.0. Built by scripts/build-cities.mjs.',
  version: new Date().toISOString().slice(0, 10),
  notes: 'All AP/TS places with population ≥ 1000; other Indian cities ≥ 100k; larger cities in diaspora countries. te = a Telugu-script alternate name from GeoNames, when one exists; Hyderabad and Vijayawada use the spelling from design/handoff. Rows are sorted by population (largest first). tz is an index into "tz".',
  fields: ['id', 'en', 'ascii', 'te', 'lat', 'lon', 'tz', 'admin', 'cc'],
  tz: tzs,
  rows: list.map((c) => [c.id, c.en, c.ascii, c.te, c.lat, c.lon, tzs.indexOf(c.tz), c.admin, c.cc]),
};
writeFileSync('public/data/cities.json', JSON.stringify(out));
const by = (k) => Object.entries(list.reduce((m, c) => ((m[c[k]] = (m[c[k]] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log(`${list.length} places, ${list.filter((c) => c.te).length} with Telugu names, ${tzs.length} zones`, by('cc'));
