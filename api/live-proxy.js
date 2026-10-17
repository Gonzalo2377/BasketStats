// api/live-proxy.js — Vercel Function
//
// Marcador en directo de los partidos de la quiniela, a partir del marcador público de calendaris.cat.
// Uso: /api/live-proxy?ids=1658,1661   (ids de partido de calendaris.cat; máximo 8 por petición)
// La respuesta queda en caché 15 s en Vercel: aunque haya muchos mirando la quiniela, calendaris.cat
// recibe como mucho una petición por partido cada 15 s.

const SEASON = '2026-27';

function slim(id, j) {
  const s = j && j.score;
  if (!s) return { id, state: (j && j.state) || 'waiting' };
  const per = +s.period || 0, reg = +s.regulation_periods || 4;
  return {
    id, state: s.state || j.state || 'live',
    h: +s.home_score || 0, a: +s.away_score || 0,
    period: per, reg, ot: per > reg, clock: s.clock || '',
    parts: Array.isArray(s.partials) ? s.partials.map(p => [+p.home || 0, +p.away || 0]) : [],
    upd: (j.meta && j.meta.source_updated_at) || null,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const ids = String((req.query && req.query.ids) || '').split(',').map(x => x.trim()).filter(x => /^\d{1,6}$/.test(x)).slice(0, 8);
  if (!ids.length) return res.status(400).json({ error: 'Faltan ids' });
  try {
    const out = await Promise.all(ids.map(id => fetch(`https://calendaris.cat/marcador/calendari/${SEASON}/${id}?ajax=1`, {
      headers: { Accept: 'application/json', 'User-Agent': 'BasketApp (basketapp.es) · marcador de la quiniela' },
    }).then(r => (r.ok ? r.json() : null)).then(j => slim(id, j)).catch(() => ({ id, state: 'error' }))));
    res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=15');
    return res.status(200).json({ at: Date.now(), matches: out });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
