/**
 * SPL · /news · v1.0
 * Unlimited infinite scroll — ESPN (10 slugs) + Guardian + FD results
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'public, max-age=30, stale-while-revalidate=60',
};

const ESPN = [
  { slug:'sau.1',                   name:'Saudi Pro League' },
  { slug:'eng.1',                   name:'Premier League' },
  { slug:'uefa.champions',          name:'Champions League' },
  { slug:'esp.1',                   name:'La Liga' },
  { slug:'ger.1',                   name:'Bundesliga' },
  { slug:'ita.1',                   name:'Serie A' },
  { slug:'conmebol.copa.america',   name:'Copa América' },
  { slug:'caf.africa_cup',          name:'AFCON' },
  { slug:'fifa.cwc',                name:'Club World Cup' },
  { slug:'soccer',                  name:'ESPN FC' },
];

const GUARDIAN_Q = [
  'saudi pro league football', 'premier league football', 'champions league football',
  'transfer news football', 'world cup 2026', 'african football AFCON',
  'la liga bundesliga', 'football results today', 'football injury news', 'club world cup',
];

async function srcESPN(page) {
  const c = ESPN[(page-1)%ESPN.length];
  try {
    const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${c.slug}/news?limit=50`,
      { signal:AbortSignal.timeout(4000) });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.articles||[]).slice(0,20).map((a,i)=>({
      id:`e_${c.slug}_${page}_${i}`, title:a.headline||a.title||'',
      summary:(a.description||a.summary||'').slice(0,240), image:a.images?.[0]?.url||null,
      source:c.name, url:a.links?.web?.href||'', date:a.published||new Date().toISOString(),
    })).filter(a=>a.title);
  } catch(e){ return []; }
}

async function srcESPN2(page) {
  const c = ESPN[page%ESPN.length];
  try {
    const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${c.slug}/news?limit=50`,
      { signal:AbortSignal.timeout(4000) });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.articles||[]).slice(10,25).map((a,i)=>({
      id:`e2_${c.slug}_${page}_${i}`, title:a.headline||'',
      summary:(a.description||'').slice(0,240), image:a.images?.[0]?.url||null,
      source:c.name, url:a.links?.web?.href||'', date:a.published||new Date().toISOString(),
    })).filter(a=>a.title);
  } catch(e){ return []; }
}

async function srcGuardian(page, key) {
  const q = GUARDIAN_Q[(page-1)%GUARDIAN_Q.length];
  try {
    const r = await fetch(
      `https://content.guardianapis.com/search?q=${encodeURIComponent(q)}&section=football`+
      `&show-fields=thumbnail,trailText&page-size=20&order-by=newest&api-key=${key||'test'}`,
      { signal:AbortSignal.timeout(5000) });
    if (!r.ok) return [];
    const d = await r.json();
    return (d.response?.results||[]).map((a,i)=>({
      id:`g_${page}_${i}`, title:a.webTitle||'',
      summary:(a.fields?.trailText||'').replace(/<[^>]+>/g,'').slice(0,240),
      image:a.fields?.thumbnail||null, source:'The Guardian',
      url:a.webUrl||'', date:a.webPublicationDate||new Date().toISOString(),
    })).filter(a=>a.title);
  } catch(e){ return []; }
}

async function srcFDResults(key) {
  if (!key) return [];
  try {
    const now=new Date(), from=new Date(now); from.setDate(from.getDate()-4);
    const fmt=d=>d.toISOString().slice(0,10);
    const r=await fetch(`https://api.football-data.org/v4/matches?dateFrom=${fmt(from)}&dateTo=${fmt(now)}&status=FINISHED`,
      { headers:{'X-Auth-Token':key}, signal:AbortSignal.timeout(5000) });
    if (!r.ok) return [];
    const d=await r.json();
    return (d.matches||[]).slice(0,25).map(m=>({
      id:`fd_${m.id}`, title:`${m.homeTeam?.name} ${m.score?.fullTime?.home}-${m.score?.fullTime?.away} ${m.awayTeam?.name}`,
      summary:`${m.competition?.name} · Full time. ${(m.utcDate||'').slice(0,10)}.`,
      image:null, source:m.competition?.name||'football-data.org',
      url:'', date:m.utcDate||new Date().toISOString(),
    }));
  } catch(e){ return []; }
}

const FILTERS = {
  'spl':         ['saudi','spl','saudi pro','al hilal','al nassr'],
  'champions':   ['champions league','ucl','european'],
  'results':     ['result','score','win','beat','defeat','draw','goal','–','-','ft'],
  'transfers':   ['transfer','sign','deal','fee','join','move','loan'],
  'injuries':    ['injur','return','fitness','sidelined','ruled out'],
  'afcon':       ['afcon','africa','african'],
};

export async function onRequestGet(context) {
  const url    = new URL(context.request.url);
  const page   = Math.max(1, parseInt(url.searchParams.get('page')||'1',10));
  const filter = url.searchParams.get('filter')||'all';
  const key    = context.env?.FD_API_KEY||'ff8b4eed3f2b426aab199e77061149b4';
  const gKey   = context.env?.GUARDIAN_KEY||'test';

  const [e1,e2,guardian,fdRes] = await Promise.all([
    srcESPN(page), srcESPN2(page), srcGuardian(page,gKey), srcFDResults(key),
  ]);

  let articles=[...e1,...e2,...guardian,...fdRes];
  const seen=new Set();
  articles=articles.filter(a=>{
    if(!a.title) return false;
    const k=a.title.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,40);
    if(seen.has(k)) return false; seen.add(k); return true;
  });
  articles.sort((a,b)=>new Date(b.date)-new Date(a.date));

  if(filter!=='all'){
    const words=FILTERS[filter]||[];
    if(words.length) articles=articles.filter(a=>{
      const t=(a.title+' '+(a.summary||'')).toLowerCase();
      return words.some(w=>t.includes(w));
    });
  }

  if(!articles.length) articles=[
    {id:'f1',title:'Saudi Pro League — Live Scores & Results',summary:'Follow every Saudi Pro League match with live scores and standings.',image:null,source:'SPL',url:'',date:new Date().toISOString()},
    {id:'f2',title:'Champions League — Europe\'s Elite Club Football',summary:'Live scores, results and standings from the UEFA Champions League.',image:null,source:'SPL',url:'',date:new Date().toISOString()},
    {id:'f3',title:'AFCON — African Football',summary:'Latest results, standings and news from the Africa Cup of Nations.',image:null,source:'SPL',url:'',date:new Date().toISOString()},
  ];

  const perPage=12, start=(page-1)*perPage;
  let paged=articles.slice(start,start+perPage);
  if(!paged.length) paged=articles.slice(0,perPage);

  return new Response(JSON.stringify({
    success:true, page, total:articles.length, hasMore:page<50,
    sources:[...new Set(articles.map(a=>a.source))], articles:paged,
  }),{ headers:{...CORS,'Content-Type':'application/json'} });
}

export async function onRequestOptions() {
  return new Response(null,{headers:CORS});
}
