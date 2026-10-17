// api/cal-proxy.js — Vercel Function
//
// Horarios actualizados de la Copa Catalunya (grupo del Claret) desde los calendarios públicos de
// calendaris.cat (los .ics que da para suscribirse a cada equipo). Devuelve un JSON con cada partido:
// local, visitante, fecha y hora (hora de Catalunya) y el link de su marcador en directo.
// Solo lee estos 14 calendarios y la respuesta queda en caché 1 h: calendaris.cat recibe como mucho
// 14 peticiones por hora, entre ellos todos los que abran la quiniela.

const FEEDS = [
  '4GF4ujJF', '7PzzLyp5', 'xQ9wLUur', 'AqMfsvkU', 'maQ6GXQk', 'wGtM5G2C', '8ufbtjn9',
  'miGh43rm', 'b9ViE8ZM', 'pXN8ASh9', '33B36SFM', 'gxyELfaH', 's6PQWKto', 'dqayNR3t',
].map(id => `https://calendaris.cat/s/${id}.ics`);

function parse(ics) {
  const txt = ics.replace(/\r?\n[ \t]/g, '');   // líneas partidas del formato iCalendar
  return txt.split('BEGIN:VEVENT').slice(1).map(b => {
    const get = k => { const m = b.match(new RegExp('\\n' + k + '[^:\\n]*:(.*)')); return m ? m[1].trim() : ''; };
    const uid = get('UID'), start = get('DTSTART'), sum = get('SUMMARY').replace(/^[^A-Za-z0-9]*/u, '');
    const desc = get('DESCRIPTION').replace(/\\n/g, '\n').replace(/\\,/g, ',');
    const vs = sum.split(' vs ');
    const mk = (desc.match(/Marcador:\s*(https:\/\/calendaris\.cat\/marcador\/\S+)/) || [])[1] || '';
    const id = (uid.match(/match(\d+)/) || [])[1] || '';
    if (vs.length !== 2 || !/^\d{8}T\d{4}/.test(start)) return null;
    const CH = /\s*\(canvi[^)]*\)\s*$/i;   // calendaris.cat marca así los partidos con cambio de día u hora
    const h = vs[0].trim(), a = vs[1].trim();
    return { id, h: h.replace(CH, ''), a: a.replace(CH, ''), d: start.slice(0, 13), mk, canvi: CH.test(h) || CH.test(a) };
  }).filter(Boolean);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const all = await Promise.all(FEEDS.map(u => fetch(u, { headers: { Accept: 'text/calendar', 'User-Agent': 'BasketApp (basketapp.es) · horarios de la quiniela' } })
      .then(r => (r.ok ? r.text() : '')).catch(() => '')));
    const byId = new Map();
    all.forEach(t => parse(t).forEach(m => { if (!byId.has(m.id)) byId.set(m.id, m); }));
    const matches = [...byId.values()];
    if (!matches.length) return res.status(502).json({ error: 'calendaris.cat no ha respondido' });
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=21600');
    return res.status(200).json({ at: Date.now(), source: 'calendaris.cat', matches });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
