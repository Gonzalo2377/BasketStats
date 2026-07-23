// netlify/functions/fcbq-proxy.js
//
// Proxy server-side para los endpoints públicos de la FCBQ. El navegador no
// puede llamar directamente a msstats.optimalwayconsulting.com desde un
// origen distinto (CORS), pero una Netlify Function corre en el servidor,
// no en el navegador, así que no tiene esa restricción.
//
// Uso desde el frontend:
//   /.netlify/functions/fcbq-proxy?endpoint=moves&id=68d825ab74669700015ddb2f
//   /.netlify/functions/fcbq-proxy?endpoint=stats&id=68d825ab74669700015ddb2f
 
const BASE = 'https://msstats.optimalwayconsulting.com/v1/fcbq';
 
const ENDPOINTS = {
  moves: 'getJsonWithMatchMoves',
  stats: 'getJsonWithMatchStats',
};
 
exports.handler = async (event) => {
  const { endpoint, id } = event.queryStringParameters || {};
 
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };
 
  if (!id || !/^[a-f0-9]{24}$/i.test(id)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta o es inválido el parámetro "id" (hex de 24 caracteres).' }) };
  }
  const path = ENDPOINTS[endpoint];
  if (!path) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Parámetro "endpoint" debe ser "moves" o "stats".' }) };
  }
 
  const url = `${BASE}/${path}/${id}?currentSeason=false`;
 
  try {
    const upstream = await fetch(url);
    const text = await upstream.text();
    return {
      statusCode: upstream.status,
      headers,
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: 'No se pudo contactar con la FCBQ', detail: String(err && err.message || err) }),
    };
  }
};
