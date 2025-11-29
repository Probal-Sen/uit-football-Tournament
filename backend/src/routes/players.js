const express = require('express');
const Player = require('../models/Player');
const auth = require('../middleware/auth');

const router = express.Router();

// Public: published players
router.get('/', async (req, res) => {
  try {
    const { teamId } = req.query;
    const filter = { isPublished: true };
    if (teamId) filter.team = teamId;
    const players = await Player.find(filter).populate('team').sort({ name: 1 });
    res.json(players);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load players' });
  }
});

// Admin: all players
router.get('/all', auth, async (req, res) => {
  try {
    const players = await Player.find().populate('team').sort({ createdAt: -1 });
    res.json(players);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load players' });
  }
});

// Admin: create player
router.post('/', auth, async (req, res) => {
  try {
    const player = await Player.create(req.body);
    res.status(201).json(player);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to create player' });
  }
});

// Admin: update player
router.put('/:id', auth, async (req, res) => {
  try {
    const player = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(player);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to update player' });
  }
});

// Admin: delete player
router.delete('/:id', auth, async (req, res) => {
  try {
    await Player.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to delete player' });
  }
});

// Admin: publish/hide player
router.post('/:id/publish', auth, async (req, res) => {
  try {
    const { isPublished } = req.body;
    const player = await Player.findByIdAndUpdate(
      req.params.id,
      { isPublished: !!isPublished },
      { new: true }
    );
    res.json(player);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to update publish status' });
  }
});

module.exports = router;


