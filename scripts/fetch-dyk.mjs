// Builds src/data/dyk.json from Wikipedia's "Did you know…" archive (CC BY-SA 4.0).
// These hooks are short, surprising facts picked by Wikipedia editors for being interesting.
// Run: node scripts/fetch-dyk.mjs   (raw pages are cached in scripts/.cache)

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'scripts', '.cache', 'dyk');
mkdirSync(CACHE, { recursive: true });
const UA = 'BrainscrollDataScript/0.1 (educational quiz app; build-time data script)';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const FIRST_YEAR = 2015;
const LAST_YEAR = 2025;
const MAX_PER_CATEGORY = 450;

async function fetchMonth(year, month) {
  const file = join(CACHE, `${year}-${month}.txt`);
  if (existsSync(file)) return readFileSync(file, 'utf8');
  const page = `Wikipedia:Did_you_know_archive/${year}/${month}`;
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2`;
  let wait = 2000;
  for (let attempt = 0; attempt < 5; attempt++) {
    await new Promise((r) => setTimeout(r, wait)); // be polite
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
    const body = await res.text();
    let json;
    try {
      json = JSON.parse(body);
    } catch {
      // Rate limited: wait as long as Wikipedia asks (Retry-After), else double the wait.
      const retryAfter = Number(res.headers.get('retry-after'));
      wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 + 1000 : wait * 2;
      console.warn(`\n  ${year}/${month}: HTTP ${res.status}, waiting ${Math.round(wait / 1000)}s…`);
      continue;
    }
    const text = json?.parse?.wikitext ?? '';
    writeFileSync(file, text);
    return text;
  }
  console.warn(`\n  skipping ${year}/${month}`);
  return '';
}

// ------------------------------------------------------------ cleaning

function clean(raw) {
  let s = raw.replace(/^\*\s*\.\.\.\s*/, '');
  s = s.replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/g, '');
  s = s.replace(/\{\{`s\}\}/g, "'s").replace(/\{\{-\?\}\}/g, '?').replace(/\{\{\s*nbsp\s*\}\}/gi, ' ');
  s = s.replace(/\{\{\s*(?:nowrap|lang\|[a-z-]+|transl\|[a-z-]+|ill)\|([^{}|]+)(?:\|[^{}]*)?\}\}/gi, '$1');
  s = s.replace(/\{\{\s*(?:convert|cvt)\|([\d.,]+)\|([^|{}]+)(?:\|[^{}]*)?\}\}/gi, '$1 $2');
  s = s.replace(/\{\{\s*(?:frac)\|(\d+)\|(\d+)\}\}/gi, '$1/$2');
  if (/\{\{|\}\}/.test(s)) return null; // unknown template left: skip this hook
  s = s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1');
  s = s.replace(/'{2,}/g, '');
  s = s.replace(/\s*\((?:pictured|depicted|illustrated|shown|example pictured|right|left|top|bottom)[^)]*\)/gi, '');
  s = s.replace(/<[^>]+>/g, '');
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  s = s.replace(/\s+/g, ' ').replace(/\s+([?,.;:])/g, '$1').trim();
  if (!s.startsWith('that ') || !s.endsWith('?')) return null;
  if (/\[|\]|\||=|http/.test(s)) return null;
  return '…' + s;
}

function sourceOf(raw) {
  const m = /'''+\s*\[\[([^\]|#]+)/.exec(raw);
  return m ? m[1].trim().replace(/ /g, '_') : null;
}

// ------------------------------------------------------------ filtering

const EXCLUDE = new RegExp(
  '\\b(' +
    [
      'politic\\w*', 'election\\w*', 'elected', 'parliament\\w*', 'MP', 'MLA', 'senator', 'minister', 'mayor', 'governor', 'congress\\w*', 'party',
      'footballer', 'cricketer', 'rugby', 'NFL', 'NBA', 'MLB', 'NHL', 'coach\\w*', 'quarterback', 'wrestl\\w*', 'boxer', 'tennis', 'golf\\w*',
      'athlete\\w*', 'olympi\\w*', 'medal\\w*', 'league', 'club', 'cup', 'champion\\w*', 'tournament', 'scored', 'goals?', 'match', 'team',
      'album', 'single', 'charts?', 'charted', 'Billboard', 'songs?', 'band', 'singer', 'rapper', 'episode', 'season', 'sitcom', 'series',
      'killed', 'kill\\w*', 'murder\\w*', 'died', 'death\\w*', 'dead', 'dying', 'suicide', 'rape\\w*', 'abuse\\w*', 'shot', 'shooting',
      'massacre\\w*', 'genocide', 'Holocaust', 'Nazis?', 'terror\\w*', 'Hamas', 'Israel\\w*', 'Gaza', 'Palestin\\w*', 'Ukrain\\w*', 'invasion',
      'bomb\\w*', 'execut\\w*', 'assassinat\\w*', 'sexual\\w*', 'porn\\w*', 'drugs?', 'cocaine', 'heroin', 'racis\\w*', 'slave\\w*', 'lynch\\w*',
      'Trump', 'Biden', 'Putin', 'Hitler', 'Stalin', 'bishop', 'archbishop', 'priest', 'diocese', 'prison\\w*', 'arrest\\w*', 'convicted',
      'sentenced', 'cancer', 'COVID', 'pandemic', 'hospitali[sz]ed', 'refugee\\w*', 'protest\\w*', 'regiment', 'soldier\\w*',
    ].join('|') +
    ')\\b',
  'i',
);

// Case-SENSITIVE on purpose: lowercase words only match real nouns, so names like
// "James Cook", "Sailor Moon" or "Mr Baker" don't end up in the wrong category.
// (?<![-\w]) also stops "co-stars" from matching "stars".
const w = (words) => new RegExp(`(?<![-\\w])(${words})(?![-\\w])`);
const CATEGORIES = [
  ['space', w('planets?|galax\\w+|asteroids?|comets?|NASA|astronauts?|cosmonauts?|orbit\\w*|telescopes?|satellites?|meteor\\w*|spacecraft|lunar|Mars|Jupiter|Saturn|Venus|Pluto|black hole')],
  ['nature', w('species|birds?|fish(es)?|insects?|beetles?|spiders?|moths?|butterfl\\w+|snakes?|frogs?|lizards?|mammals?|whales?|sharks?|bats?|ants|bees|wasps?|fung\\w+|mushrooms?|plants?|trees|flowers?|orchids?|moss|lichens?|snails?|crabs?|shrimps?|worms?|corals?|dinosaurs?|fossils?|animals?|dogs?|cats?|horses?|cows?|pigs?|sheep|goats?|rats?|mice|owls?|parrots?|penguins?|octop\\w+|squids?|jellyfish|turtles?|tortoises?|crocodiles?|monkeys?|apes?|bears?|wolf|wolves|foxes|deer|elephants?|lions?|tigers?|seeds?|pollinat\\w+|predators?|prey|eggs?|nests?|venom\\w*')],
  ['food', w('food|dish(es)?|recipes?|cheese|bread|cakes?|soups?|sauces?|beer|wine|whisk(e)?y|cocktails?|chocolate|coffee|tea|restaurants?|cooked|cooking|chefs?|fruits?|vegetables?|cand(y|ies)|sandwich(es)?|pizza|ate|eaten|eating|meals?|sausages?|noodles?|biscuits?|cookies?|pies?|sugar|honey|ice cream|flavou?rs?|baked|baking|bakery|dessert|snacks?')],
  ['tech', w('computers?|software|video games?|robots?|internet|websites?|engines?|machines?|invent(ed|or|ion)s?|patent(ed|s)?|cars?|automobiles?|locomotives?|aircraft|airplanes?|aeroplanes?|submarines?|telephones?|radio|cameras?|electric\\w*|bicycles?|clocks?|calculators?|typewriters?|programming|batteries|battery')],
  ['body', w('brains?|blood|skin|tooth|teeth|bones?|hearts?|eyes|hair|sleep\\w*|surgery|surgeons?|human body|muscles?|beards?|hiccups?|tattoo\\w*|sneez\\w+|yawn\\w*')],
  ['science', w('scien\\w+|chemist\\w*|physics|mathemat\\w+|equations?|molecules?|atoms?|chemical elements?|experiments?|laborator\\w+|viruses|virus|bacteri\\w+|genes?|genetic\\w*|DNA|medicines?|diseases?|minerals?|crystals?|magnet\\w*|weather|earthquakes?|volcan\\w+|lightning|radioactive')],
  ['language', w('words?|languages?|dictionar\\w+|alphabet|spell\\w*|pronounc\\w+|slang|translat\\w+|nicknamed|named after|means')],
  ['culture', w('paint(ing|ings|er|ers|ed)|artists?|sculpt\\w+|museums?|novels?|poems?|books?|films?|movies?|opera|ballet|theat(re|er)|music|musical|statues?|comics?|cartoons?|fashion|dress(es)?|festival|toys?|board games?|puzzles?|magic(ian)?|circus|architect\\w*')],
  ['history', w('centur(y|ies)|ancient|medieval|Roman|Romans|Greek|Egypt\\w*|kings?|queens?|emperors?|empires?|castles?|pharaohs?|Vikings?|knights?|pirates?|treasure|archaeolog\\w+|BC|BCE|tombs?|dynast(y|ies)|princes?|princess(es)?|monarchs?|Tudor|Victorian|mummy|mummies|shipwrecks?')],
  ['geography', w('islands?|rivers?|mountains?|lakes?|villages?|deserts?|caves?|glaciers?|oceans?|waterfalls?|forests?|volcano(es)?')],
];

// "Fun" signals: surprise, records, oddities. Used to rank hooks, best first.
const FUN = /\b(only|first|world's|largest|smallest|oldest|youngest|longest|tallest|shortest|never|accidentally|accidental|banned|named after|legend|legendary|secret|record|mistaken(ly)?|despite|instead|nicknamed|ghosts?|haunted|curse[ds]?|bizarre|unusual|strange|weird|giant|tiny|stolen|escaped|fake|hoax|prank|invented|million|billion|edible|poisonous|glow(s|ed)?|upside[- ]down|backwards|accident|mistake|surprising(ly)?|nobody|no one|thousands?|hundreds of|smell(s|ed)?|tastes?|eaten|survived|lost|hidden|cat|cats|dog|dogs|bananas?|cheese|chocolate|robot|toilet|dinosaur|treasure)\b/gi;
// Biography / institution signals: usually dull for a general audience.
const DULL = /\b(actor|actress|voice actor|professor|journalist|editor|businessman|businesswoman|entrepreneur|activist|chief|lawyer|judge|diplomat|ambassador|executive|CEO|writer|author|novelist|historian|physicist|economist|academic|scholar|composer|director|producer|presenter|broadcaster|union|company|brand|station|newspaper|magazine|awards?|nominated|prize|school|university|college|airport|road|highway|church|temple|mosque|cathedral|award-winning|career|degree|graduated|founded|founder|organi[sz]ation|committee|council|association|society|publisher|published|journal|report)\b/gi;

function funScore(t) {
  let s = (t.match(FUN)?.length ?? 0) * 2 - (t.match(DULL)?.length ?? 0) * 2;
  // "…that the / a …" is usually about a thing; "…that Firstname Lastname" about a person.
  if (/^…that (the|a|an|some|in|when|after|during|many|most|there) /.test(t)) s += 1;
  if (/^…that [A-Z][a-z]+ [A-Z][a-z]+/.test(t)) s -= 2;
  if (t.length > 160) s -= 1;
  return s;
}

const USE_IT = {
  space: ['When someone is stargazing', 'For the next clear night sky', 'When someone says "it\'s not rocket science"'],
  nature: ['On your next walk in the park', 'At the zoo or aquarium', 'When a nature documentary is on'],
  food: ['At dinner, between courses', 'While waiting for your food', 'When someone asks what\'s for dinner'],
  tech: ['When your phone is acting up', 'For the tech nerd in your life', 'When someone complains about their laptop'],
  body: ['At the doctor\'s waiting room', 'When someone yawns', 'At the gym'],
  science: ['When someone says science is boring', 'In the middle of a pub quiz', 'For your nerdiest friend'],
  language: ['When someone uses a fancy word', 'During a game of Scrabble', 'When a word sounds weird'],
  culture: ['In a museum or gallery', 'During movie night', 'When someone says art is boring'],
  history: ['When someone says "back in the day"', 'For the history buff in your life', 'During a castle or museum visit'],
  geography: ['On a long road trip', 'When planning your next holiday', 'When someone looks at a map'],
};

function categorize(text) {
  for (const [cat, re] of CATEGORIES) if (re.test(text)) return cat;
  return null;
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

async function main() {
  const byCategory = new Map();
  const seenSources = new Set();
  let total = 0;
  for (let y = LAST_YEAR; y >= FIRST_YEAR; y--) {
    for (const m of MONTHS) {
      const text = await fetchMonth(y, m);
      const lines = text.split('\n').filter((l) => /^\*\s*\.\.\.\s*that\b/.test(l));
      for (const raw of lines) {
        total++;
        const source = sourceOf(raw);
        if (!source || seenSources.has(source)) continue;
        const t = clean(raw);
        if (!t || t.length < 50 || t.length > 190) continue;
        if (EXCLUDE.test(t)) continue;
        const category = categorize(t);
        if (!category) continue;
        const score = funScore(t);
        if (score < 1) continue;
        seenSources.add(source);
        const h = hash(source);
        const list = byCategory.get(category) ?? [];
        list.push({
          id: 'dyk' + h.toString(36),
          category,
          text: t,
          useIt: USE_IT[category][h % USE_IT[category].length],
          source,
          score,
        });
        byCategory.set(category, list);
      }
    }
    process.stdout.write(`${y} `);
  }
  // Keep the most fun hooks per category.
  for (const [c, list] of byCategory) {
    list.sort((a, b) => b.score - a.score);
    byCategory.set(c, list.slice(0, MAX_PER_CATEGORY).map(({ score, ...f }) => f));
  }
  const all = [...byCategory.values()].flat();
  console.log(`\nhooks read: ${total}, kept: ${all.length}`);
  for (const [c, l] of byCategory) console.log(`  ${c}: ${l.length}`);
  writeFileSync(join(ROOT, 'src', 'data', 'dyk.json'), JSON.stringify(all) + '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
