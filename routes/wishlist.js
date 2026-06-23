const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/wishlist
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM wishlist ORDER BY added_at DESC').all();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// POST /api/wishlist  { gameID, title, thumb }
router.post('/', (req, res) => {
  const { gameID: rawGameID, title, thumb } = req.body;
  const gameID = rawGameID != null ? String(rawGameID) : null;

  if (!gameID || !title) {
    return res.status(400).json({ error: 'gameID and title are required' });
  }

  try {
    const existing = db.prepare('SELECT id FROM wishlist WHERE game_id = ?').get(gameID);
    if (existing) {
      return res.status(409).json({ error: 'Game already in wishlist' });
    }

    db.prepare('INSERT INTO wishlist (game_id, title, thumb) VALUES (?, ?, ?)').run(
      gameID,
      title,
      thumb || null
    );

    res.status(201).json({ gameID, title, thumb: thumb || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// DELETE /api/wishlist/:gameID
router.delete('/:gameID', (req, res) => {
  const gameID = String(req.params.gameID);

  try {
    const result = db.prepare('DELETE FROM wishlist WHERE game_id = ?').run(gameID);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Game not found in wishlist' });
    }
    res.json({ message: 'Removed from wishlist' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

module.exports = router;
