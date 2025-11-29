const express = require('express');
const Team = require('../models/Team');
const Player = require('../models/Player');
const PointsRow = require('../models/PointsTable');
const auth = require('../middleware/auth');

const router = express.Router();

// Public: published teams
router.get('/', async (req, res) => {
  try {
    const teams = await Team.find({ isPublished: true }).sort({ department: 1, name: 1 });
    res.json(teams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load teams' });
  }
});

// Admin: all teams
router.get('/all', auth, async (req, res) => {
  try {
    const teams = await Team.find().sort({ createdAt: -1 });
    res.json(teams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load teams' });
  }
});

// Admin: create team
router.post('/', auth, async (req, res) => {
  try {
    const team = await Team.create(req.body);
    res.status(201).json(team);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to create team' });
  }
});

// Admin: update team
router.put('/:id', auth, async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(team);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to update team' });
  }
});

// Admin: delete team
router.delete('/:id', auth, async (req, res) => {
  try {
    const teamId = req.params.id;
    
    // Delete associated players
    await Player.deleteMany({ team: teamId });
    
    // Delete associated points table entry
    await PointsRow.deleteMany({ team: teamId });
    
    // Delete the team itself
    await Team.findByIdAndDelete(teamId);
    
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to delete team' });
  }
});

// Admin: publish/hide team
router.post('/:id/publish', auth, async (req, res) => {
  try {
    const { isPublished } = req.body;
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { isPublished: !!isPublished },
      { new: true }
    );
    res.json(team);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to update publish status' });
  }
});

module.exports = router;


