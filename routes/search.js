const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const CHEAPSHARK_BASE = 'https://www.cheapshark.com/api/1.0';

// GET /api/search?title=witcher
router.get('/', async (req, res) => {
  const { title } = req.query;

  if (!title) {
    return res.status(400).json({ error: 'Query param "title" is required' });
  }

  try {
    const response = await fetch(
      `${CHEAPSHARK_BASE}/games?title=${encodeURIComponent(title)}&limit=20`
    );

    if (!response.ok) {
      throw new Error(`CheapShark API responded with ${response.status}`);
    }

    const data = await response.json();

    // Normalize the response shape for the frontend
    const games = data.map((g) => ({
      id: g.gameID,
      title: g.external,
      thumb: g.thumb,
      cheapestPrice: g.cheapest,
      cheapestDealID: g.cheapestDealID,
    }));

    res.json({ count: games.length, results: games });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(502).json({ error: 'Failed to fetch search results', details: err.message });
  }
});

module.exports = router;
