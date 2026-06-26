/**
 * SPL · /data · v1.0
 * 21 competitions: FD free tier (12) + ESPN unofficial (9)
 * Saudi Pro League · Premier League · Champions League · AFCON · Copa América + more
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'public, max-age=60, stale-while-revalidate=120',
};

const FD_BASE   = 'https://api.football-data.org/v4';
const ESPN_APP  = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const ESPN_WEB  = 'https://site.web.api.espn.com/apis/site/v2/sports/soccer';

const FD_CODES = ['WC','CL','PL','PD','SA','BL1','FL1','EC','DED','PPL','ELC','BSA'];

const LEAGUES = [
  { code:'ALL',  name:'All Competitions',       source:'both' },
  // Featured
  { code:'SPL',  name:'Saudi Pro League',       source:'espn', slug:'sau.1',                     group:'Featured' },
  { code:'PL',   name:'Premier League',         source:'fd',                                      group:'Europe' },
  { code:'CL',   name:'Champions League',       source:'fd',                                      group:'Europe' },
  { code:'WC',   name:'FIFA World Cup',         source:'fd',                                      group:'World' },
  { code:'CWC',  name:'Club World Cup',         source:'espn', slug:'fifa.cwc',                   group:'World' },
  // Europe
  { code:'PD',   name:'La Liga',                source:'fd',                                      group:'Europe' },
  { code:'SA',   name:'Serie A',                source:'fd',                                      group:'Europe' },
  { code:'BL1',  name:'Bundesliga',             source:'fd',                                      group:'Europe' },
  { code:'FL1',  name:'Ligue 1',                source:'fd',                                      group:'Europe' },
  { code:'EC',   name:'Euro Championship',      source:'fd',                                      group:'Europe' },
  { code:'UEL',  name:'UEFA Europa League',     source:'espn', slug:'uefa.europa',               group:'Europe' },
  { code:'UCL',  name:'UEFA Conference League', source:'espn', slug:'uefa.europa.conference',   group:'Europe' },
  { code:'DED',  name:'Eredivisie',             source:'fd',                                      group:'Europe' },
  { code:'PPL',  name:'Primeira Liga',          source:'fd',                                      group:'Europe' },
  { code:'ELC',  name:'Championship',           source:'fd',                                      group:'Europe' },
  // Americas
  { code:'CA',   name:'Copa América',           source:'espn', slug:'conmebol.copa.america',     group:'Americas' },
  { code:'LIB',  name:'Copa Libertadores',      source:'espn', slug:'conmebol.libertadores',     group:'Americas' },
  { code:'SUD',  name:'Copa Sudamericana',      source:'espn', slug:'conmebol.sudamericana',     group:'Americas' },
  { code:'BSA',  name:'Brasileirao',            source:'fd',                                      group:'Americas' },
  // Africa / Asia
  { code:'AFCON',name:'AFCON',                  source:'espn', slug:'caf.africa_cup',            group:'Africa' },
  { code:'CAF',  name:'CAF Champions League',   source:'espn', slug:'caf.champions_league',     group:'Africa' },
];

const ESPN_SLUG_MAP = {
  'Saudi Pro League':       'sau.1',
  'Copa América':           'conmebol.copa.america',
  'Copa Libertadores':      'conmebol.libertadores',
  'Copa Sudamericana':      'conmebol.sudamericana',
  'Premier League':         'eng.1',
  'Champions League':       'uefa.champions',
  'UEFA Europa League':     'uefa.europa',
  'UEFA Conference League': 'uefa.europa.conference',
  'La Liga':                'esp.1',
  'Serie A':                'ita.1',
  'Bundesliga':             'ger.1',
  'Ligue 1':                'fra.1',
  'World Cup':              'fifa.world',
  'Club World Cup':         'fifa.cwc',
  'AFCON':                  'caf.africa_cup',
  'CAF Champions League':   'caf.champions_league',
  'default':                'soccer',
};

function shiftDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}

async function fdGet(path, key) {
  const r = await fetch(`${FD_BASE}/${path}`, {
    headers: { 'X-Auth-Token': key },
    signal:  AbortSignal.timeout(9000),
  });
  if (!r.ok) throw new Error(`FD ${r.status} /${path}`);
  return r.json();
}

async function espnGet(slug, ep, params='') {
  const r = await fetch(`${ESPN_APP}/${slug}/${ep}${params}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`ESPN ${r.status}`);
  return r.json();
}

async function espnSummary(slug, eventId) {
  const urls = [
    `${ESPN_WEB}/${slug}/summary?event=${eventId}`,
    `${ESPN_APP}/${slug}/summary?event=${eventId}`,
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const d = await r.json();
        if (d && (d.rosters || d.plays || d.header)) return d;
      }
    } catch(e) { continue; }
  }
  return null;
}

function normFD(m, compName) {
  const todayS = new Date().toISOString().slice(0,10);
  const dateS  = (m.utcDate||'').slice(0,10);
  const st     = m.status || '';
  const isLive = st==='IN_PLAY' || st==='PAUSED';
  const isDone = st==='FINISHED';
  const hs = m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? null;
  const as = m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? null;
  return {
    id:          String(m.id),
    homeTeam:    m.homeTeam?.name    || m.homeTeam?.shortName || 'TBA',
    awayTeam:    m.awayTeam?.name    || m.awayTeam?.shortName || 'TBA',
    homeAbbr:    m.homeTeam?.tla     || '',
    awayAbbr:    m.awayTeam?.tla     || '',
    homeLogo:    m.homeTeam?.crest   || '',
    awayLogo:    m.awayTeam?.crest   || '',
    homeScore:   hs, awayScore: as,
    status: st, isLive, isDone,
    utcDate:     m.utcDate || '',
    dateStr:     dateS,
    isToday:     dateS === new Date().toISOString().slice(0,10),
    venue:       m.venue  || '',
    round:       m.matchday ? `MD ${m.matchday}` : (m.stage||''),
    minute:      m.minute ? `${m.minute}'` : null,
    competition: compName || m.competition?.name || '',
    source: 'fd',
  };
}

function normESPN(e, compName) {
  const todayS = new Date().toISOString().slice(0,10);
  const comp   = e.competitions?.[0];
  const teams  = comp?.competitors || [];
  const home   = teams.find(t=>t.homeAway==='home') || teams[0] || {};
  const away   = teams.find(t=>t.homeAway==='away') || teams[1] || {};
  const st     = comp?.status?.type?.state || comp?.status?.type?.name || '';
  const isLive = ['in','halftime'].includes(st.toLowerCase());
  const isDone = ['post'].includes(st.toLowerCase());
  const dateS  = (e.date||'').slice(0,10);
  const slug   = ESPN_SLUG_MAP[compName] || 'soccer';
  return {
    id:          `espn_${slug}_${e.id}`,
    homeTeam:    home.team?.displayName || 'TBA',
    awayTeam:    away.team?.displayName || 'TBA',
    homeAbbr:    home.team?.abbreviation || '',
    awayAbbr:    away.team?.abbreviation || '',
    homeLogo:    home.team?.logo || '',
    awayLogo:    away.team?.logo || '',
    homeScore:   home.score !== undefined ? Number(home.score) : null,
    awayScore:   away.score !== undefined ? Number(away.score) : null,
    status: st, isLive, isDone,
    utcDate:     e.date || '',
    dateStr:     dateS,
    isToday:     dateS === todayS,
    venue:       comp?.venue?.fullName || '',
    round:       e.season?.displayName || '',
    minute:      comp?.status?.displayClock || null,
    competition: compName || '',
    source: 'espn',
  };
}

function groupMatches(matches) {
  const todayS = new Date().toISOString().slice(0,10);
  const live     = matches.filter(m => m.isLive);
  const today    = matches.filter(m => !m.isLive && m.isToday && !m.isDone);
  const upcoming = matches.filter(m => !m.isLive && !m.isDone && m.dateStr > todayS)
                          .sort((a,b)=>a.utcDate.localeCompare(b.utcDate)).slice(0,40);
  const results  = matches.filter(m => m.isDone)
                          .sort((a,b)=>b.utcDate.localeCompare(a.utcDate)).slice(0,100);
  return { live, today, upcoming, results };
}

/* ── FIXTURES ── */
async function getFixtures(league, key) {
  const from = shiftDate(-30);
  const to   = shiftDate(14);
  let matches = [];

  if (league === 'ALL') {
    const espnSlugs = LEAGUES.filter(l=>l.source==='espn' && l.code!=='ALL');
    const [fdRes, ...espnResults] = await Promise.allSettled([
      fdGet(`matches?dateFrom=${from}&dateTo=${to}`, key)
        .then(d => (d.matches||[]).map(m=>normFD(m,''))),
      ...espnSlugs.map(l =>
        espnGet(l.slug,'scoreboard')
          .then(d => (d.events||[]).map(e=>normESPN(e, l.name)))
      ),
    ]);
    if (fdRes.status==='fulfilled') matches.push(...fdRes.value);
    espnResults.forEach(r => { if(r.status==='fulfilled') matches.push(...r.value); });
  } else {
    const lg = LEAGUES.find(l=>l.code===league);
    if (!lg) return { total:0, matches:[], groups:groupMatches([]) };
    if (lg.source==='fd') {
      const d = await fdGet(`competitions/${league}/matches?dateFrom=${from}&dateTo=${to}`, key);
      matches = (d.matches||[]).map(m=>normFD(m, lg.name));
    } else {
      const d = await espnGet(lg.slug, 'scoreboard');
      matches = (d.events||[]).map(e=>normESPN(e, lg.name));
    }
  }

  const seen=new Set();
  matches = matches.filter(m=>{
    const k=`${m.homeTeam}_${m.awayTeam}_${m.dateStr}`;
    if(seen.has(k)) return false; seen.add(k); return true;
  });
  return { total:matches.length, matches, groups:groupMatches(matches) };
}

/* ── STANDINGS ── */
async function getStandings(league, key) {
  const lg = LEAGUES.find(l=>l.code===league) || LEAGUES.find(l=>l.code==='PL');
  if (lg.source==='fd') {
    const d = await fdGet(`competitions/${lg.code}/standings`, key);
    return {
      source:'fd', competition:d.competition?.name||lg.name,
      season: d.season?.currentMatchday ? `Matchday ${d.season.currentMatchday}` : '',
      groups:(d.standings||[]).map(s=>({
        name: s.group||s.stage||'Table',
        rows:(s.table||[]).map(r=>({
          position:r.position, team:r.team?.name||'', abbr:r.team?.tla||'',
          logo:r.team?.crest||'', played:r.playedGames||0,
          won:r.won||0, drawn:r.draw||0, lost:r.lost||0,
          gf:r.goalsFor||0, ga:r.goalsAgainst||0,
          gd:r.goalDifference||0, points:r.points||0, form:r.form||'',
        })),
      })),
    };
  }
  const d = await espnGet(lg.slug,'standings');
  return {
    source:'espn', competition:lg.name,
    groups:(d.standings||[]).map(g=>({
      name:g.name||'Table',
      rows:(g.entries||[]).map((e,i)=>{
        const s=n=>e.stats?.find(x=>x.name===n)?.value||0;
        return { position:i+1, team:e.team?.displayName||'', abbr:e.team?.abbreviation||'',
          logo:e.team?.logos?.[0]?.href||'', played:s('gamesPlayed'), won:s('wins'),
          drawn:s('ties'), lost:s('losses'), gf:s('pointsFor'), ga:s('pointsAgainst'),
          gd:s('pointDifferential'), points:s('points'), form:'' };
      }),
    })),
  };
}

/* ── SCORERS ── */
async function getScorers(league, key) {
  const lg = LEAGUES.find(l=>l.code===league) || LEAGUES.find(l=>l.code==='PL');
  if (lg.source==='fd') {
    const d = await fdGet(`competitions/${lg.code}/scorers?limit=20`, key);
    return { source:'fd', competition:d.competition?.name||lg.name,
      scorers:(d.scorers||[]).map(s=>({
        name:s.player?.name||'', team:s.team?.name||'', logo:s.team?.crest||'',
        nationality:s.player?.nationality||'',
        goals:s.goals||0, assists:s.assists||0, penalties:s.penalties||0,
      })),
    };
  }
  const d = await espnGet(lg.slug,'leaders');
  const cat = (d.categories||[]).find(c=>c.name==='goals'||c.abbreviation==='G');
  return { source:'espn', competition:lg.name,
    scorers:(cat?.leaders||[]).slice(0,20).map(l=>({
      name:l.athlete?.displayName||'', team:l.team?.displayName||'',
      logo:l.team?.logos?.[0]?.href||'', goals:l.value||0, assists:0, penalties:0,
    })),
  };
}

/* ── MATCH DETAIL ── */
async function getMatchDetail(matchId, key) {
  if (matchId.startsWith('espn_')) {
    const parts   = matchId.split('_');
    const eventId = parts[parts.length-1];
    const slug    = parts.slice(1,-1).join('_') || 'soccer';
    const data    = await espnSummary(slug, eventId);
    if (!data) throw new Error('ESPN summary unavailable');

    const comps  = data.header?.competitions?.[0];
    const teams  = comps?.competitors || [];
    const home   = teams.find(t=>t.homeAway==='home') || teams[0] || {};
    const away   = teams.find(t=>t.homeAway==='away') || teams[1] || {};

    /* Lineups */
    const lineups = (data.rosters||[]).map(r=>({
      team:      { name:r.team?.displayName||r.team?.name||'' },
      formation: r.formation||'',
      coach:     { name:r.coach?.[0]?.athlete?.displayName||r.coach?.[0]?.displayName||'' },
      startXI:   (r.roster||[]).filter(p=>p.starter!==false&&p.position).map(p=>({
        player:     { name:p.athlete?.displayName||p.displayName||'' },
        position:   p.position?.displayName||p.position?.abbreviation||'',
        shirtNumber:p.jersey||'',
      })),
      bench:(r.roster||[]).filter(p=>p.starter===false).map(p=>({
        player:     { name:p.athlete?.displayName||p.displayName||'' },
        position:   p.position?.displayName||p.position?.abbreviation||'',
        shirtNumber:p.jersey||'',
      })),
    }));

    /* Stats */
    const stats=[];
    const ts = data.boxscore?.teams||[];
    if (ts.length>=2) {
      const hs=ts[0]?.statistics||[], as=ts[1]?.statistics||[];
      [['possessionPct','Possession %'],['totalShots','Shots'],
       ['shotsOnTarget','On Target'],['saves','Saves'],
       ['fouls','Fouls'],['yellowCards','Yellow Cards'],
       ['redCards','Red Cards'],['corners','Corners'],
       ['offsides','Offsides']].forEach(([n,lbl])=>{
        const hv=hs.find(s=>s.name===n||s.abbreviation===n);
        const av=as.find(s=>s.name===n||s.abbreviation===n);
        if(hv||av) stats.push({name:lbl,home:parseFloat(hv?.displayValue||hv?.value)||0,away:parseFloat(av?.displayValue||av?.value)||0});
      });
    }

    /* Goals / cards / subs */
    const goals=[],bookings=[],subs=[];
    (data.plays||[]).forEach(p=>{
      const type=p.type?.text?.toLowerCase()||'';
      const min=p.clock?.value?Math.floor(p.clock.value/60):0;
      const team=p.team?.displayName||'';
      const a1=p.participants?.[0]?.athlete?.displayName||p.athletesInvolved?.[0]?.displayName||'';
      const a2=p.participants?.[1]?.athlete?.displayName||p.athletesInvolved?.[1]?.displayName||'';
      if(type.includes('goal')||type.includes('penalty score')) goals.push({minute:min,team,scorer:a1,assist:a2,type:'GOAL'});
      else if(type.includes('yellow card')) bookings.push({minute:min,team,player:a1,card:'YELLOW_CARD'});
      else if(type.includes('red card')||type.includes('two yellow')) bookings.push({minute:min,team,player:a1,card:'RED_CARD'});
      else if(type.includes('substitution')||type.includes('sub ')) subs.push({minute:min,team,playerIn:a1,playerOut:a2});
    });
    (data.scoringPlays||[]).forEach(p=>{
      const a=p.athletesInvolved?.[0]?.displayName||'';
      const min=p.clock?.value?Math.floor(p.clock.value/60):0;
      if(a&&!goals.find(g=>g.scorer===a&&g.minute===min))
        goals.push({minute:min,team:p.team?.displayName||'',scorer:a,assist:'',type:'GOAL'});
    });

    return {
      source:'espn',
      match:{
        id:matchId, homeTeam:home.team?.displayName||'', awayTeam:away.team?.displayName||'',
        homeLogo:home.team?.logo||home.team?.logos?.[0]?.href||'',
        awayLogo:away.team?.logo||away.team?.logos?.[0]?.href||'',
        homeScore:home.score!==undefined?Number(home.score):null,
        awayScore:away.score!==undefined?Number(away.score):null,
        status:comps?.status?.type?.description||'',
        minute:comps?.status?.displayClock||'',
        venue:comps?.venue?.fullName||'',
        competition:data.header?.season?.displayName||'',
        utcDate:comps?.date||'',
      },
      lineups, stats, goals, bookings, subs,
    };
  }

  /* FD match */
  const [mr, hr] = await Promise.allSettled([
    fdGet(`matches/${matchId}`, key),
    fdGet(`matches/${matchId}/head2head?limit=5`, key),
  ]);
  const m = mr.status==='fulfilled' ? mr.value : {};
  const h = hr.status==='fulfilled' ? hr.value : {};

  const goals=(m.goals||[]).map(g=>({minute:g.minute,team:g.team?.name||'',scorer:g.scorer?.name||'',assist:g.assist?.name||'',type:'GOAL'}));
  const bookings=(m.bookings||[]).map(b=>({minute:b.minute,team:b.team?.name||'',player:b.player?.name||'',card:b.card||'YELLOW_CARD'}));
  const subs=(m.substitutions||[]).map(s=>({minute:s.minute,team:s.team?.name||'',playerIn:s.playerIn?.name||'',playerOut:s.playerOut?.name||''}));
  const lineups=(m.lineups||[]).map(l=>({
    team:{name:l.team?.name||''}, formation:l.formation||'', coach:{name:l.coach?.name||''},
    startXI:(l.startXI||[]).map(p=>({player:{name:p.player?.name||''},position:p.position||'',shirtNumber:p.shirtNumber||''})),
    bench:(l.substitutes||[]).map(p=>({player:{name:p.player?.name||''},position:p.position||'',shirtNumber:p.shirtNumber||''})),
  }));
  const h2h=(h.matches||[]).map(hm=>({
    date:(hm.utcDate||'').slice(0,10), homeTeam:hm.homeTeam?.name||'', awayTeam:hm.awayTeam?.name||'',
    homeScore:hm.score?.fullTime?.home, awayScore:hm.score?.fullTime?.away, competition:hm.competition?.name||'',
  }));

  return {
    source:'fd', match:normFD(m, m.competition?.name||''),
    goals, bookings, subs, lineups, h2h, stats:[],
    fdFreeNote: lineups.length===0 ? 'Lineups require FD paid tier' : '',
  };
}

/* ── MAIN ── */
export async function onRequestGet(context) {
  const url     = new URL(context.request.url);
  const type    = url.searchParams.get('type')    || 'health';
  const league  = (url.searchParams.get('league') || 'ALL').toUpperCase();
  const matchId = url.searchParams.get('match')   || '';
  const key     = context.env?.FD_API_KEY || 'ff8b4eed3f2b426aab199e77061149b4';

  console.log(`[SPL/data] type=${type} league=${league}`);

  try {
    let data;
    switch(type) {
      case 'fixtures':  data = await getFixtures(league, key);      break;
      case 'standings': data = await getStandings(league, key);     break;
      case 'scorers':   data = await getScorers(league, key);       break;
      case 'match':     data = await getMatchDetail(matchId, key);  break;
      case 'leagues':   data = { leagues: LEAGUES };                break;
      default: data = { status:'ok', app:'SPL', version:'1.0', now:new Date().toISOString(), key_set:!!context.env?.FD_API_KEY };
    }
    return new Response(JSON.stringify({ success:true, type, league, ...data }), {
      headers: { ...CORS, 'Content-Type':'application/json' },
    });
  } catch(err) {
    console.error('[SPL/data] Error:', err.message);
    return new Response(JSON.stringify({ success:false, type, error:err.message }), {
      status:200, headers: { ...CORS, 'Content-Type':'application/json' },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
