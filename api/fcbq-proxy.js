export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }

  const { endpoint, id } = req.query;

  if (!endpoint || !id) {
    return res.status(400).json({ error: 'Faltan endpoint o id' });
  }

  const fcbqEndpoint = endpoint === 'moves' ? 'pbp' : 'stats';
  const url = `https://msstats.optimalwayconsulting.com/v1/fcbq/matches/${encodeURIComponent(id)}/${fcbqEndpoint}?currentSeason=true`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.basquetcatala.cat/',
        'Origin': 'https://www.basquetcatala.cat',
        'Accept': 'application/json',
      }
    });

    const body = await response.text();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    return res.status(response.status).send(body);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
