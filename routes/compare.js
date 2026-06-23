const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

const CHEAPSHARK_BASE = 'https://www.cheapshark.com/api/1.0';

// In-memory cache of storeID -> store name, refreshed once an hour.
let storeMap = {};
let storeMapFetchedAt = 0;
const STORE_MAP_TTL = 60 * 60 * 1000; // 1 hour

async function getStoreMap() {
  const now = Date.now();
  if (now - storeMapFetchedAt < STORE_MAP_TTL && Object.keys(storeMap).length > 0) {
    return storeMap;
  }

  const response = await fetch(`${CHEAPSHARK_BASE}/stores`);
  if (!response.ok) throw new Error(`CheapShark /stores responded with ${response.status}`);

  const stores = await response.json();
  const map = {};
  stores.forEach((s) => {
    map[s.storeID] = s.storeName;
  });

  storeMap = map;
  storeMapFetchedAt = now;
  return storeMap;
}

// GET /api/compare/:gameID  -> price across stores for one game (CheapShark data)
router.get('/:gameID', async (req, res) => {
  const { gameID } = req.params;

  try {
    const [storeNames, gameResponse] = await Promise.all([
      getStoreMap(),
      fetch(`${CHEAPSHARK_BASE}/games?id=${gameID}`),
    ]);

    if (!gameResponse.ok) throw new Error(`CheapShark API responded with ${gameResponse.status}`);

    const data = await gameResponse.json();

    const deals = (data.deals || []).map((d) => ({
      store: storeNames[d.storeID] || `Store #${d.storeID}`,
      storeID: d.storeID,
      price: d.price,
      retailPrice: d.retailPrice,
      savings: Number(d.savings).toFixed(0) + '%',
      dealID: d.dealID,
    }));

    res.json({
      info: data.info,
      deals,
      note:
        'Epic Games Store and Xbox Store do not expose public price-comparison APIs. ' +
        'These are shown only if CheapShark has indexed a matching deal; otherwise add manual entries.',
    });
  } catch (err) {
    console.error('Compare error:', err.message);
    res.status(502).json({ error: 'Failed to fetch price comparison', details: err.message });
  }
});

module.exports = router;
