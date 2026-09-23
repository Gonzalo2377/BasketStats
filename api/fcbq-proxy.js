export default async function handler(req, res) {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }

  const { endpoint, id } = req.query;

  if (!endpoint || !id) {
    return res.status(400).json({ error: 'Faltan endpoint o id' });
  }

  // Convierte 'moves' a 'pbp' para la API
  const fcbqEndpoint = endpoint === 'moves' ? 'pbp' : 'stats';
  const url =
    `https://msstats.optimalwayconsulting.com/v1/fcbq/matches/` +
    `${encodeURIComponent(id)}/${fcbqEndpoint}?currentSeason=true`;

  try {
    const response = await fetch(url);
    const body = await response.text();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    return res.status(response.status).send(body);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
