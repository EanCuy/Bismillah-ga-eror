const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/reviews/:gameID -> all reviews for a game
router.get('/:gameID', (req, res) => {
  const gameID = String(req.params.gameID);

  try {
    const rows = db
      .prepare('SELECT * FROM reviews WHERE game_id = ? ORDER BY created_at DESC')
      .all(gameID);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// POST /api/reviews  { gameID, title, username, rating, comment }
router.post('/', (req, res) => {
  const { gameID: rawGameID, title, username, rating, comment } = req.body;
  const gameID = rawGameID != null ? String(rawGameID) : null;

  if (!gameID || !username || !rating) {
    return res.status(400).json({ error: 'gameID, username, and rating are required' });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be between 1 and 5' });
  }

  try {
    const result = db
      .prepare(
        'INSERT INTO reviews (game_id, title, username, rating, comment) VALUES (?, ?, ?, ?, ?)'
      )
      .run(gameID, title || '', username, rating, comment || '');

    res.status(201).json({
      id: result.lastInsertRowid,
      gameID,
      title: title || '',
      username,
      rating,
      comment: comment || '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

// DELETE /api/reviews/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  try {
    const result = db.prepare('DELETE FROM reviews WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

module.exports = router;
