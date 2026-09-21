const BASE = 'https://msstats.optimalwayconsulting.com/v1/fcbq';
const LEGACY_ENDPOINTS = { moves: 'getJsonWithMatchMoves', stats: 'getJsonWithMatchStats' };
const ALLOWED_HOSTS = new Set(['www.basquetcatala.cat', 'msstats.optimalwayconsulting.com']);

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    const query = event.queryStringParameters || {};
    let target;
    let suppliedToken = '';

    if (event.httpMethod === 'GET' && query.endpoint && query.id) {
      const id = query.id;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const isLegacy = /^[a-f0-9]{24}$/i.test(id);
      if (!isUuid && !isLegacy) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID FCBQ inválido' }) };
      if (!['moves', 'stats'].includes(query.endpoint)) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Endpoint FCBQ inválido' }) };
      if (isUuid) {
        target = new URL(`${BASE}/${query.endpoint === 'moves' ? 'matches/' + id + '/pbp' : 'matches/' + id + '/stats'}?currentSeason=true`);
        try {
          const jwt = await fetch('https://www.basquetcatala.cat/jwt.php');
          if (jwt.ok) suppliedToken = (await jwt.json()).token || '';
        } catch (e) {}
      } else {
        target = new URL(`${BASE}/${LEGACY_ENDPOINTS[query.endpoint]}/${id}?currentSeason=false`);
      }
    } else if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      target = new URL(body.url || '');
      suppliedToken = body.token || '';
    } else {
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    if (!['https:', 'http:'].includes(target.protocol) || !ALLOWED_HOSTS.has(target.hostname)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Target not allowed' }) };
    }

    const upstreamHeaders = { Accept: 'application/json' };
    if (suppliedToken) upstreamHeaders.Authorization = `Bearer ${suppliedToken}`;
    const response = await fetch(target, { headers: upstreamHeaders });
    const text = await response.text();

    return {
      statusCode: response.status,
      headers: { ...headers, 'Content-Type': response.headers.get('content-type') || 'application/json' },
      body: text
    };
  } catch (error) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: error.message || 'Invalid request' }) };
  }
};
