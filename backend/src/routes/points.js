const express = require('express');
const PointsRow = require('../models/PointsTable');
const Match = require('../models/Match');
const Team = require('../models/Team');
const auth = require('../middleware/auth');

const router = express.Router();

// Public: published points table
router.get('/', async (req, res) => {
  try {
    const rows = await PointsRow.find({ isPublished: true })
      .populate('team')
      .sort({ points: -1, goalDifference: -1, goalsFor: -1 });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load points table' });
  }
});

// Public: top goal scorers
router.get('/top-scorers', async (req, res) => {
  try {
    const Match = require('../models/Match');
    const matches = await Match.find({ isPublished: true, status: { $in: ['live', 'completed'] } })
      .populate('goals.player goals.team')
      .select('goals status');

    const scorerMap = new Map();

    matches.forEach(match => {
      if (match.goals && Array.isArray(match.goals)) {
        match.goals.forEach(goal => {
          if (goal.player) {
            const playerId = typeof goal.player === 'object' ? goal.player._id.toString() : goal.player.toString();
            const playerName = typeof goal.player === 'object' ? (goal.player.name || 'Unknown') : 'Unknown';
            let teamName = 'Unknown';
            if (goal.team) {
              if (typeof goal.team === 'object') {
                teamName = goal.team.name || 'Unknown';
              }
            }

            if (scorerMap.has(playerId)) {
              const existing = scorerMap.get(playerId);
              existing.goals += 1;
            } else {
              scorerMap.set(playerId, {
                playerId,
                playerName,
                teamName,
                goals: 1,
              });
            }
          }
        });
      }
    });

    const topScorers = Array.from(scorerMap.values())
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 10); // Top 10

    res.json(topScorers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load top scorers' });
  }
});

// Admin: full table
router.get('/all', auth, async (req, res) => {
  try {
    const rows = await PointsRow.find()
      .populate('team')
      .sort({ points: -1, goalDifference: -1, goalsFor: -1 });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load points table' });
  }
});

// Admin: recalculate table from all completed matches
router.post('/recalculate', auth, async (req, res) => {
  try {
    const matches = await Match.find({ status: 'completed' });
    // Reset table
    await PointsRow.deleteMany({});

    const map = new Map();

    function getRow(teamId) {
      const key = teamId.toString();
      if (!map.has(key)) {
        map.set(
          key,
          new PointsRow({
            team: teamId,
          })
        );
      }
      return map.get(key);
    }

    for (const m of matches) {
      const rowA = getRow(m.teamA);
      const rowB = getRow(m.teamB);

      rowA.played += 1;
      rowB.played += 1;
      rowA.goalsFor += m.scoreA;
      rowA.goalsAgainst += m.scoreB;
      rowB.goalsFor += m.scoreB;
      rowB.goalsAgainst += m.scoreA;

      if (m.scoreA > m.scoreB) {
        rowA.wins += 1;
        rowB.losses += 1;
        rowA.points += 3;
      } else if (m.scoreB > m.scoreA) {
        rowB.wins += 1;
        rowA.losses += 1;
        rowB.points += 3;
      } else {
        rowA.draws += 1;
        rowB.draws += 1;
        rowA.points += 1;
        rowB.points += 1;
      }
    }

    for (const row of map.values()) {
      row.goalDifference = row.goalsFor - row.goalsAgainst;
    }

    await PointsRow.insertMany(Array.from(map.values()));

    const rows = await PointsRow.find()
      .populate('team')
      .sort({ points: -1, goalDifference: -1, goalsFor: -1 });
    
    const io = req.app.get('io');
    io.emit('pointsTableUpdated', rows);
    
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to recalculate points table' });
  }
});

// Admin: publish/hide entire table (all rows)
router.post('/publish', auth, async (req, res) => {
  try {
    const { isPublished } = req.body;
    await PointsRow.updateMany({}, { isPublished: !!isPublished });
    const rows = await PointsRow.find()
      .populate('team')
      .sort({ points: -1, goalDifference: -1, goalsFor: -1 });
    const io = req.app.get('io');
    io.emit('pointsTableUpdated', rows);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update publish status' });
  }
});

// Admin: cleanup orphaned entries (teams that no longer exist)
router.post('/cleanup', auth, async (req, res) => {
  try {
    // Get all teams that exist
    const existingTeams = await Team.find({}, '_id');
    const existingTeamIds = new Set(existingTeams.map(t => t._id.toString()));
    
    // Get all points rows
    const allRows = await PointsRow.find({}, 'team');
    
    // Find rows with teams that don't exist
    const orphanedRows = allRows.filter(row => {
      const teamId = row.team ? row.team.toString() : null;
      return !teamId || !existingTeamIds.has(teamId);
    });
    
    // Delete orphaned rows
    const orphanedIds = orphanedRows.map(row => row._id);
    const result = await PointsRow.deleteMany({ _id: { $in: orphanedIds } });
    
    // Return updated table
    const rows = await PointsRow.find()
      .populate('team')
      .sort({ points: -1, goalDifference: -1, goalsFor: -1 });
    
    res.json({
      message: `Cleaned up ${result.deletedCount} orphaned entries`,
      deletedCount: result.deletedCount,
      rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to cleanup orphaned entries' });
  }
});

module.exports = router;


