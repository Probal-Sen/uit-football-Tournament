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
    console.log('Creating player with data:', req.body);
    
    // Validate required fields
    if (!req.body.name || !req.body.position || !req.body.department || !req.body.team) {
      return res.status(400).json({ 
        message: 'Missing required fields. Name, position, department, and team are required.' 
      });
    }

    const player = await Player.create(req.body).then(p => Player.populate(p, 'team'));
    const io = req.app.get('io');
    io.emit('playerUpdated', { action: 'created', player });
    res.status(201).json(player);
  } catch (err) {
    console.error('Error creating player:', err);
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ message: `Validation error: ${errors}` });
    }
    // Handle duplicate key errors
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Player with this information already exists' });
    }
    const errorMessage = err.message || 'Failed to create player';
    res.status(400).json({ message: errorMessage });
  }
});

// Admin: update player
router.put('/:id', auth, async (req, res) => {
  try {
    const player = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .then(p => Player.populate(p, 'team'));
    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }
    const io = req.app.get('io');
    io.emit('playerUpdated', { action: 'updated', player });
    res.json(player);
  } catch (err) {
    console.error('Error updating player:', err);
    const errorMessage = err.message || 'Failed to update player';
    res.status(400).json({ message: errorMessage });
  }
});

// Admin: delete player
router.delete('/:id', auth, async (req, res) => {
  try {
    await Player.findByIdAndDelete(req.params.id);
    const io = req.app.get('io');
    io.emit('playerUpdated', { action: 'deleted', playerId: req.params.id });
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
    ).then(p => Player.populate(p, 'team'));
    const io = req.app.get('io');
    io.emit('playerUpdated', { action: 'published', player });
    res.json(player);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to update publish status' });
  }
});

module.exports = router;


