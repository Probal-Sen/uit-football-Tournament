const express = require('express');
const Match = require('../models/Match');
const PointsRow = require('../models/PointsTable');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper: update points for two teams based on a completed match
async function updatePointsForMatch(match) {
  const { teamA, teamB, scoreA, scoreB } = match;

  // Skip if teams are not populated or are null
  if (!teamA || !teamB) {
    return;
  }

  // Extract team IDs - handle both populated objects and ObjectIds
  const teamAId = typeof teamA === 'object' && teamA._id ? teamA._id : teamA;
  const teamBId = typeof teamB === 'object' && teamB._id ? teamB._id : teamB;
  
  // Ensure we have valid IDs
  if (!teamAId || !teamBId) {
    return;
  }

  const rows = await PointsRow.find({ team: { $in: [teamAId, teamBId] } });
  const map = new Map(rows.map((r) => {
    const teamId = r.team ? (typeof r.team === 'object' ? r.team._id || r.team : r.team).toString() : null;
    return [teamId, r];
  }).filter(([key]) => key !== null));

  function getRow(teamId) {
    const key = teamId.toString();
    if (!map.has(key)) {
      const row = new PointsRow({ team: teamId });
      map.set(key, row);
      return row;
    }
    return map.get(key);
  }

  const rowA = getRow(teamAId);
  const rowB = getRow(teamBId);

  rowA.played += 1;
  rowB.played += 1;
  rowA.goalsFor += scoreA;
  rowA.goalsAgainst += scoreB;
  rowB.goalsFor += scoreB;
  rowB.goalsAgainst += scoreA;

  if (scoreA > scoreB) {
    rowA.wins += 1;
    rowB.losses += 1;
    rowA.points += 3;
  } else if (scoreB > scoreA) {
    rowB.wins += 1;
    rowA.losses += 1;
    rowB.points += 3;
  } else {
    rowA.draws += 1;
    rowB.draws += 1;
    rowA.points += 1;
    rowB.points += 1;
  }

  for (const row of map.values()) {
    row.goalDifference = row.goalsFor - row.goalsAgainst;
    // preserve isPublished; it is admin-controlled
    // row.isPublished remains as is
  }

  await Promise.all(Array.from(map.values()).map((r) => r.save()));
}

// Public: published fixtures
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { isPublished: true };
    if (status) filter.status = status;
    const matches = await Match.find(filter)
      .populate('teamA teamB')
      .sort({ date: 1 });
    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load matches' });
  }
});

// Public: live matches
router.get('/live', async (req, res) => {
  try {
    const liveMatches = await Match.find({ status: 'live', isPublished: true })
      .populate('teamA teamB goals.player goals.team')
      .sort({ date: 1 });
    res.json(liveMatches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load live matches' });
  }
});

// Admin: all matches
router.get('/all', auth, async (req, res) => {
  try {
    const matches = await Match.find()
      .populate('teamA teamB goals.player goals.team')
      .sort({ date: 1 });
    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load matches' });
  }
});

// Admin: create match
router.post('/', auth, async (req, res) => {
  try {
    const match = await Match.create(req.body);
    res.status(201).json(match);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to create match' });
  }
});

// Admin: update match
router.put('/:id', auth, async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    ).populate('teamA teamB goals.player goals.team teamALineup.goalkeeper teamALineup.players teamBLineup.goalkeeper teamBLineup.players');

    if (!match) return res.status(404).json({ message: 'Match not found' });

    const io = req.app.get('io');
    io.emit('matchUpdated', match);

    res.json(match);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to update match' });
  }
});

// Admin: publish/hide match
router.post('/:id/publish', auth, async (req, res) => {
  try {
    const { isPublished } = req.body;
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      { isPublished: !!isPublished },
      { new: true }
    );
    res.json(match);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to update publish status' });
  }
});

// Admin: set status (upcoming/live/completed)
router.post('/:id/status', auth, async (req, res) => {
  try {
    const { status, teamALineup, teamBLineup } = req.body;
    const update = { status };
    
    // If setting to live, include lineup data
    if (status === 'live') {
      if (teamALineup) {
        update.teamALineup = teamALineup;
      }
      if (teamBLineup) {
        update.teamBLineup = teamBLineup;
      }
    }
    
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).populate('teamA teamB goals.player goals.team teamALineup.goalkeeper teamALineup.players teamBLineup.goalkeeper teamBLineup.players');

    if (!match) return res.status(404).json({ message: 'Match not found' });

    const io = req.app.get('io');
    io.emit('matchUpdated', match);

    // If just completed, update points
    if (status === 'completed' && match.teamA && match.teamB) {
      await updatePointsForMatch(match);
    }

    res.json(match);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to update match status' });
  }
});

// Admin: update live score & goal scorers
router.post('/:id/score', auth, async (req, res) => {
  try {
    const { scoreA, scoreB, goals } = req.body;
    const update = {
      scoreA,
      scoreB,
    };
    if (goals) {
      // Ensure all goals have player information
      for (const goal of goals) {
        if (!goal.player) {
          return res.status(400).json({ message: 'All goals must include player information' });
        }
      }
      update.goals = goals;
    }

    const match = await Match.findByIdAndUpdate(req.params.id, update, {
      new: true,
    }).populate('teamA teamB goals.player goals.team');

    if (!match) return res.status(404).json({ message: 'Match not found' });

    const io = req.app.get('io');
    io.emit('matchUpdated', match);

    res.json(match);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to update score' });
  }
});

// Admin: delete match
router.delete('/:id', auth, async (req, res) => {
  try {
    await Match.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to delete match' });
  }
});

module.exports = router;


