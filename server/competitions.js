// SPL competition catalogue. Each entry maps to an ID per data provider.
// fd = football-data.org v4 competition id, af = API-Football (api-sports) league id.
// null means that provider does not offer the competition; the app shows it as
// "not in the current data plan" instead of pretending to cover it.
// API-Football IDs: confirm against GET /leagues?id=<id> after you get a key —
// the competition page always shows the provider's own name for the ID.

export const GROUPS = ['Top leagues', 'Europe', 'Africa', 'Middle East & Asia', 'International', 'Women', 'Americas'];

export const CATALOGUE = [
  // Top leagues
  { key: 'epl', name: 'Premier League', country: 'England', group: 'Top leagues', fd: 2021, af: 39 },
  { key: 'ucl', name: 'UEFA Champions League', country: 'Europe', group: 'Top leagues', fd: 2001, af: 2 },
  { key: 'laliga', name: 'La Liga', country: 'Spain', group: 'Top leagues', fd: 2014, af: 140 },
  { key: 'seriea', name: 'Serie A', country: 'Italy', group: 'Top leagues', fd: 2019, af: 135 },
  { key: 'bundesliga', name: 'Bundesliga', country: 'Germany', group: 'Top leagues', fd: 2002, af: 78 },
  { key: 'ligue1', name: 'Ligue 1', country: 'France', group: 'Top leagues', fd: 2015, af: 61 },
  { key: 'spl', name: 'Saudi Pro League', country: 'Saudi Arabia', group: 'Middle East & Asia', fd: null, af: 307 },
  { key: 'npfl', name: 'Nigeria Premier Football League', country: 'Nigeria', group: 'Africa', fd: null, af: 399 },
  // Europe
  { key: 'uel', name: 'UEFA Europa League', country: 'Europe', group: 'Europe', fd: null, af: 3 },
  { key: 'uecl', name: 'UEFA Conference League', country: 'Europe', group: 'Europe', fd: null, af: 848 },
  { key: 'championship', name: 'Championship', country: 'England', group: 'Europe', fd: 2016, af: 40 },
  { key: 'eredivisie', name: 'Eredivisie', country: 'Netherlands', group: 'Europe', fd: 2003, af: 88 },
  { key: 'primeira', name: 'Primeira Liga', country: 'Portugal', group: 'Europe', fd: 2017, af: 94 },
  // Africa
  { key: 'cafcl', name: 'CAF Champions League', country: 'Africa', group: 'Africa', fd: null, af: 12 },
  { key: 'cafcc', name: 'CAF Confederation Cup', country: 'Africa', group: 'Africa', fd: null, af: 20 },
  { key: 'afcon', name: 'Africa Cup of Nations', country: 'Africa', group: 'Africa', fd: null, af: 6 },
  { key: 'egypt', name: 'Egyptian Premier League', country: 'Egypt', group: 'Africa', fd: null, af: 233 },
  { key: 'psl', name: 'South African Premiership', country: 'South Africa', group: 'Africa', fd: null, af: 288 },
  { key: 'botola', name: 'Botola Pro', country: 'Morocco', group: 'Africa', fd: null, af: 200 },
  { key: 'ghana', name: 'Ghana Premier League', country: 'Ghana', group: 'Africa', fd: null, af: 570 },
  // Middle East & Asia
  { key: 'aclE', name: 'AFC Champions League Elite', country: 'Asia', group: 'Middle East & Asia', fd: null, af: 17 },
  // International
  { key: 'wc', name: 'FIFA World Cup', country: 'World', group: 'International', fd: 2000, af: 1 },
  { key: 'wcqcaf', name: 'World Cup Qualifiers — Africa', country: 'World', group: 'International', fd: null, af: 29 },
  { key: 'euro', name: 'European Championship', country: 'Europe', group: 'International', fd: 2018, af: 4 },
  { key: 'copa', name: 'Copa América', country: 'South America', group: 'International', fd: null, af: 9 },
  // Women
  { key: 'wwc', name: "FIFA Women's World Cup", country: 'World', group: 'Women', fd: null, af: 8 },
  { key: 'uwcl', name: "UEFA Women's Champions League", country: 'Europe', group: 'Women', fd: null, af: 525 },
  { key: 'wsl', name: "Women's Super League", country: 'England', group: 'Women', fd: null, af: 44 },
  // Americas
  { key: 'brasileirao', name: 'Brasileirão Série A', country: 'Brazil', group: 'Americas', fd: 2013, af: 71 },
  { key: 'mls', name: 'Major League Soccer', country: 'USA', group: 'Americas', fd: null, af: 253 },
];

const FD_CODES = {2021:"PL", 2001:"CL", 2014:"PD", 2019:"SA", 2002:"BL1", 2015:"FL1", 2016:"ELC", 2003:"DED", 2017:"PPL", 2000:"WC", 2018:"EC", 2013:"BSA"};

export function catalogueFor(provider) {
  const field = provider === 'api-football' ? 'af' : 'fd';
  return CATALOGUE.map((c, i) => ({
    id: c[field] ?? null,
    key: c.key,
    name: c.name,
    country: c.country,
    group: c.group,
    priority: i,
    covered: c[field] != null,
    logo: c[field] == null ? null : field === 'af'
      ? `https://media.api-sports.io/football/leagues/${c.af}.png`
      : FD_CODES[c.fd] ? `https://crests.football-data.org/${FD_CODES[c.fd]}.png` : null,
  }));
}

export function priorityOf(provider, compId) {
  let field = provider === 'api-football' ? 'af' : 'fd';
  let id = compId;
  if (provider === 'hybrid' && /^a\d+$/.test(String(compId))) { field = 'af'; id = String(compId).slice(1); }
  const i = CATALOGUE.findIndex((c) => c[field] === Number(id));
  return i === -1 ? 999 : i;
}
