// functions/api/fcbq-proxy.js  —  Cloudflare Pages Function
//
// Equivalente a la función de Netlify, para alojar la app en Cloudflare Pages.
// Cloudflare enruta este archivo automáticamente a  /api/fcbq-proxy
// (la app ya lo intenta en su cadena de respaldo).
//
// Uso:  /api/fcbq-proxy?endpoint=moves&id=68d825ab74669700015ddb2f

const BASE = 'https://msstats.optimalwayconsulting.com/v1/fcbq';
const ENDPOINTS = {
  moves: 'getJsonWithMatchMoves',
  stats: 'getJsonWithMatchStats',
};

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const endpoint = url.searchParams.get('endpoint');
  const id = url.searchParams.get('id');

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (!id || !/^[a-f0-9]{24}$/i.test(id)) {
    return new Response(JSON.stringify({ error: 'Falta o es inválido el parámetro "id".' }), { status: 400, headers });
  }
  const path = ENDPOINTS[endpoint];
  if (!path) {
    return new Response(JSON.stringify({ error: 'El parámetro "endpoint" debe ser "moves" o "stats".' }), { status: 400, headers });
  }

  try {
    const upstream = await fetch(`${BASE}/${path}/${id}?currentSeason=false`);
    const text = await upstream.text();
    return new Response(text, { status: upstream.status, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'No se pudo contactar con la FCBQ', detail: String(err) }), { status: 502, headers });
  }
}
