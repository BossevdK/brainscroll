// Fetches comparison data from Wikidata (CC0) and writes src/data/wd-*.json.
// Run: node scripts/fetch-wikidata.mjs
// Only well-known items are kept (many Wikipedia language links = famous).

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src', 'data');
const CACHE = join(ROOT, 'scripts', '.cache');
mkdirSync(CACHE, { recursive: true });

const UA = 'BrainscrollDataScript/0.1 (educational quiz app; build-time data script)';

async function sparql(name, query) {
  const cacheFile = join(CACHE, `wd-${name}.json`);
  if (existsSync(cacheFile)) return JSON.parse(readFileSync(cacheFile, 'utf8'));
  // QLever (University of Freiburg) mirrors Wikidata and answers these big scans in seconds,
  // where query.wikidata.org times out.
  const body = new URLSearchParams({ query: PREFIXES + query });
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://qlever.dev/api/wikidata', {
      method: 'POST',
      body,
      headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' },
    });
    if (res.ok) {
      const json = await res.json();
      const rows = json.results.bindings.map((b) =>
        Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])),
      );
      writeFileSync(cacheFile, JSON.stringify(rows));
      return rows;
    }
    console.warn(`  ${name}: HTTP ${res.status}, retrying…`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error(`query ${name} failed`);
}

const PREFIXES = `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX ps: <http://www.wikidata.org/prop/statement/>
PREFIX pq: <http://www.wikidata.org/prop/qualifier/>
PREFIX psn: <http://www.wikidata.org/prop/statement/value-normalized/>
`;
const label = (v) => `?${v} rdfs:label ?${v}Label . FILTER(LANG(?${v}Label) = "en")`;
const isQid = (s) => /^Q\d+$/.test(s);
const year = (iso) => {
  const m = /^(-?)(\d+)-/.exec(iso);
  return m ? (m[1] ? -1 : 1) * Number(m[2]) : NaN;
};

/** Group rows by item, keep one row per item using `pickBetter(a, b)`. */
function dedupe(rows, key, pickBetter) {
  const map = new Map();
  for (const r of rows) {
    const prev = map.get(r[key]);
    map.set(r[key], prev ? pickBetter(prev, r) : r);
  }
  return [...map.values()];
}

function write(file, data) {
  writeFileSync(join(OUT, file), JSON.stringify(data, null, 0) + '\n');
  console.log(`  -> ${file}: ${data.length} items`);
}

// ---------------------------------------------------------------- queries

async function countries() {
  const rows = await sparql(
    'countries',
    `SELECT ?c ?cLabel ?iso ?pop ?popDate ?area ?capLabel ?coord WHERE {
      ?c wdt:P31 wd:Q3624078; wdt:P297 ?iso.
      FILTER NOT EXISTS { ?c wdt:P576 [] }
      ?c p:P1082 ?ps. ?ps ps:P1082 ?pop. OPTIONAL { ?ps pq:P585 ?popDate }
      ?c p:P2046/psn:P2046/wikibase:quantityAmount ?area.
      OPTIONAL { ?c wdt:P36 ?cap . ${label('cap')} }
      OPTIONAL { ?c wdt:P625 ?coord }
      ${label('c')}
    }`,
  );
  const byC = new Map();
  for (const r of rows) {
    const e = byC.get(r.c) ?? { name: r.cLabel, iso2: r.iso, pops: [], areas: new Set(), caps: new Set(), coord: null };
    const m = /Point\(([-\d.]+) ([-\d.]+)\)/i.exec(r.coord ?? '');
    if (m && !e.coord) e.coord = [Number(m[2]), Number(m[1])]; // [lat, lon]
    e.pops.push({ v: Number(r.pop), d: r.popDate ?? '' });
    e.areas.add(Number(r.area) / 1e6);
    if (r.capLabel && !isQid(r.capLabel)) e.caps.add(r.capLabel);
    byC.set(r.c, e);
  }
  const out = [];
  for (const e of byC.values()) {
    if (isQid(e.name)) continue;
    e.pops.sort((a, b) => (a.d < b.d ? 1 : -1));
    const population = e.pops[0].v;
    const area = Math.max(...e.areas);
    if (!(population > 0 && area > 0)) continue;
    out.push({
      name: e.name,
      iso2: e.iso2,
      population,
      area: Math.round(area * 100) / 100,
      capital: e.caps.size === 1 ? [...e.caps][0] : null,
      lat: e.coord ? Math.round(e.coord[0] * 100) / 100 : null,
      lon: e.coord ? Math.round(e.coord[1] * 100) / 100 : null,
    });
  }
  // Wikidata population figures have mixed dates; use our checked 2024 figures
  // (UN estimates, rounded) for the countries we have them for.
  const curated = JSON.parse(readFileSync(join(ROOT, 'scripts', 'curated', 'countries-2024.json'), 'utf8'));
  const byIso = new Map(curated.map((c) => [c.iso2, c]));
  const NAME_FIX = { CN: 'China', NL: 'Netherlands' };
  const CAPITAL_FIX = { NO: 'Oslo' };
  for (const c of out) {
    const k = byIso.get(c.iso2);
    if (k) {
      c.population = k.population;
      c.area = k.area;
      c.name = k.name;
    }
    if (NAME_FIX[c.iso2]) c.name = NAME_FIX[c.iso2];
    if (CAPITAL_FIX[c.iso2]) c.capital = CAPITAL_FIX[c.iso2];
  }
  out.sort((a, b) => b.population - a.population);
  write('countries.json', out);
}

/** Generic "famous items with one quantity" query. */
async function quantity({ name, types, prop, minLinks, scale = 1, round = 0, extra = '', unitless = false }) {
  const rows = await sparql(
    name,
    `SELECT ?x ?xLabel ?v ?links WHERE {
      VALUES ?type { ${types.map((t) => 'wd:' + t).join(' ')} }
      ?x wdt:P31 ?type; wikibase:sitelinks ?links.
      FILTER(?links >= ${minLinks})
      ${unitless ? `?x wdt:${prop} ?v.` : `?x p:${prop}/psn:${prop}/wikibase:quantityAmount ?v.`}
      ${extra}
      ${label('x')}
    }`,
  );
  const items = dedupe(rows, 'x', (a, b) => (Number(b.v) > Number(a.v) ? b : a))
    .filter((r) => !isQid(r.xLabel) && Number(r.v) > 0)
    .map((r) => ({
      name: r.xLabel,
      value: Math.round(Number(r.v) * scale * 10 ** round) / 10 ** round,
      links: Number(r.links),
    }))
    .sort((a, b) => b.links - a.links);
  return items;
}

async function dated({ name, types, prop, minLinks }) {
  const rows = await sparql(
    name,
    `SELECT ?x ?xLabel ?d ?links WHERE {
      VALUES ?type { ${types.map((t) => 'wd:' + t).join(' ')} }
      ?x wdt:P31 ?type; wikibase:sitelinks ?links; wdt:${prop} ?d.
      FILTER(?links >= ${minLinks})
      ${label('x')}
    }`,
  );
  // earliest date per item
  return dedupe(rows, 'x', (a, b) => (year(b.d) < year(a.d) ? b : a))
    .filter((r) => !isQid(r.xLabel) && Number.isFinite(year(r.d)))
    .map((r) => ({ name: r.xLabel, value: year(r.d), links: Number(r.links) }))
    .sort((a, b) => b.links - a.links);
}

const strip = (items, max) => items.slice(0, max).map(({ links, ...rest }) => rest);

async function main() {
  console.log('countries');
  await countries();

  console.log('mountains');
  write(
    'wd-mountains.json',
    strip(await quantity({ name: 'mountains', types: ['Q8502', 'Q8072', 'Q169358', 'Q207326'], prop: 'P2044', minLinks: 30 }), 160),
  );

  console.log('structures');
  write(
    'wd-structures.json',
    strip(
      await quantity({
        name: 'structures',
        types: ['Q11303', 'Q12518', 'Q11166728', 'Q1440300', 'Q179700', 'Q12516', 'Q2977', 'Q4989906', 'Q12570', 'Q570116'],
        prop: 'P2048',
        minLinks: 35,
        round: 0,
      }),
      160,
    ),
  );

  console.log('cities');
  write(
    'wd-cities.json',
    strip(await quantity({ name: 'cities', types: ['Q1637706', 'Q515', 'Q5119'], prop: 'P1082', minLinks: 90, unitless: true }), 200),
  );

  console.log('rivers');
  write(
    'wd-rivers.json',
    strip(await quantity({ name: 'rivers', types: ['Q4022'], prop: 'P2043', minLinks: 45, scale: 1 / 1000 }), 120),
  );

  console.log('companies');
  write(
    'wd-companies.json',
    strip(await dated({ name: 'companies', types: ['Q4830453', 'Q891723', 'Q6881511'], prop: 'P571', minLinks: 70 }), 150),
  );

  console.log('films');
  write('wd-films.json', strip(await dated({ name: 'films', types: ['Q11424'], prop: 'P577', minLinks: 55 }), 200));

  console.log('video games');
  write('wd-games.json', strip(await dated({ name: 'games', types: ['Q7889'], prop: 'P577', minLinks: 40 }), 150));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
