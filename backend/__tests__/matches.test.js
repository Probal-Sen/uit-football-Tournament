require('./setup');
const request = require('supertest');
const express = require('express');
const http = require('http');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const matchRoutes = require('../src/routes/matches');
const Match = require('../src/models/Match');
const Team = require('../src/models/Team');
const Player = require('../src/models/Player');
const PointsRow = require('../src/models/PointsTable');
const Admin = require('../src/models/Admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', credentials: true } });
app.set('io', io);

app.use(express.json());
app.use(cookieParser());
app.use('/api/matches', matchRoutes);

// Helper to get auth token
async function getAuthToken() {
  const passwordHash = await Admin.hashPassword('Test123!');
  const admin = await Admin.create({
    email: 'admin@test.com',
    passwordHash,
    name: 'Test Admin'
  });
  return jwt.sign(
    { sub: admin._id.toString(), email: admin.email },
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '8h' }
  );
}

// Helper to create authenticated request
function authenticatedRequest(token) {
  const agent = request.agent(app);
  agent.set('Cookie', `token=${token}`);
  return agent;
}

describe('Matches API Endpoints', () => {
  let authToken;
  let teamA, teamB;
  let playerA, playerB;

  beforeAll(async () => {
    authToken = await getAuthToken();
    teamA = await Team.create({ name: 'Team A', department: 'CSE' });
    teamB = await Team.create({ name: 'Team B', department: 'IT' });
    playerA = await Player.create({ name: 'Player A', team: teamA._id, jerseyNumber: 1, position: 'Forward', department: 'CSE' });
    playerB = await Player.create({ name: 'Player B', team: teamB._id, jerseyNumber: 2, position: 'Forward', department: 'IT' });
  });

  describe('GET /api/matches (Public)', () => {
    it('should return only published matches', async () => {
      await Match.create([
        { teamA: teamA._id, teamB: teamB._id, date: new Date(), venue: 'Stadium 1', status: 'upcoming', isPublished: true },
        { teamA: teamA._id, teamB: teamB._id, date: new Date(), venue: 'Stadium 2', status: 'upcoming', isPublished: false }
      ]);

      const response = await request(app).get('/api/matches');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].isPublished).toBe(true);
    });

    it('should filter by status when provided', async () => {
      await Match.create([
        { teamA: teamA._id, teamB: teamB._id, date: new Date(), venue: 'Stadium 1', status: 'upcoming', isPublished: true },
        { teamA: teamA._id, teamB: teamB._id, date: new Date(), venue: 'Stadium 2', status: 'live', isPublished: true }
      ]);

      const response = await request(app).get('/api/matches?status=live');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('live');
    });
  });

  describe('GET /api/matches/live (Public)', () => {
    it('should return only live published matches', async () => {
      await Match.create([
        { teamA: teamA._id, teamB: teamB._id, date: new Date(), venue: 'Stadium 1', status: 'live', isPublished: true, scoreA: 1, scoreB: 0 },
        { teamA: teamA._id, teamB: teamB._id, date: new Date(), venue: 'Stadium 2', status: 'upcoming', isPublished: true },
        { teamA: teamA._id, teamB: teamB._id, date: new Date(), venue: 'Stadium 3', status: 'live', isPublished: false }
      ]);

      const response = await request(app).get('/api/matches/live');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('live');
      expect(response.body[0].isPublished).toBe(true);
    });
  });

  describe('GET /api/matches/all (Admin)', () => {
    it('should return all matches for authenticated admin', async () => {
      await Match.create([
        { teamA: teamA._id, teamB: teamB._id, date: new Date(), venue: 'Stadium 1', status: 'upcoming', isPublished: true },
        { teamA: teamA._id, teamB: teamB._id, date: new Date(), venue: 'Stadium 2', status: 'upcoming', isPublished: false }
      ]);

      const response = await authenticatedRequest(authToken)
        .get('/api/matches/all');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/matches/all');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/matches (Admin)', () => {
    it('should create a new match', async () => {
      const matchData = {
        teamA: teamA._id,
        teamB: teamB._id,
        date: new Date().toISOString(),
        venue: 'Test Stadium',
        status: 'upcoming'
      };

      const response = await authenticatedRequest(authToken)
        .post('/api/matches')
        .send(matchData);

      expect(response.status).toBe(201);
      expect(response.body.venue).toBe(matchData.venue);
      expect(response.body.status).toBe('upcoming');
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/matches')
        .send({ teamA: teamA._id, teamB: teamB._id, date: new Date(), venue: 'Stadium', status: 'upcoming' });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/matches/:id (Admin)', () => {
    it('should update a match successfully', async () => {
      const match = await Match.create({
        teamA: teamA._id,
        teamB: teamB._id,
        date: new Date(),
        venue: 'Old Stadium',
        status: 'upcoming'
      });

      const response = await authenticatedRequest(authToken)
        .put(`/api/matches/${match._id}`)
        .send({ venue: 'New Stadium' });

      expect(response.status).toBe(200);
      expect(response.body.venue).toBe('New Stadium');
    });

    it('should return 401 without authentication', async () => {
      const match = await Match.create({
        teamA: teamA._id,
        teamB: teamB._id,
        date: new Date(),
        venue: 'Stadium',
        status: 'upcoming'
      });

      const response = await request(app)
        .put(`/api/matches/${match._id}`)
        .send({ venue: 'New Stadium' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/matches/:id/status (Admin)', () => {
    it('should update match status and emit socket event', async () => {
      const match = await Match.create({
        teamA: teamA._id,
        teamB: teamB._id,
        date: new Date(),
        venue: 'Stadium',
        status: 'upcoming',
        scoreA: 0,
        scoreB: 0
      });

      const response = await authenticatedRequest(authToken)
        .post(`/api/matches/${match._id}/status`)
        .send({ status: 'live' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('live');
    });

    it('should update points when status is completed', async () => {
      // Ensure teams exist - recreate if they were deleted
      let testTeamA = await Team.findById(teamA._id);
      let testTeamB = await Team.findById(teamB._id);
      
      if (!testTeamA) {
        testTeamA = await Team.create({ _id: teamA._id, name: 'Team A', department: 'CSE' });
      }
      if (!testTeamB) {
        testTeamB = await Team.create({ _id: teamB._id, name: 'Team B', department: 'IT' });
      }

      const match = await Match.create({
        teamA: testTeamA._id,
        teamB: testTeamB._id,
        date: new Date(),
        venue: 'Stadium',
        status: 'live',
        scoreA: 2,
        scoreB: 1
      });

      const response = await authenticatedRequest(authToken)
        .post(`/api/matches/${match._id}/status`)
        .send({ status: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('completed');

      // Wait a bit for async points update to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get the match again to verify teams and check points
      const updatedMatch = await Match.findById(match._id).populate('teamA teamB');
      expect(updatedMatch).toBeTruthy();
      expect(updatedMatch.status).toBe('completed');
      
      // Extract team IDs - use the IDs we created the match with
      const teamAId = testTeamA._id;
      const teamBId = testTeamB._id;
      
      // Check points were updated
      const pointsA = await PointsRow.findOne({ team: teamAId });
      const pointsB = await PointsRow.findOne({ team: teamBId });

      expect(pointsA).toBeTruthy();
      expect(pointsA.wins).toBe(1);
      expect(pointsA.points).toBe(3);
      expect(pointsB).toBeTruthy();
      expect(pointsB.losses).toBe(1);
    });

    it('should return 401 without authentication', async () => {
      const match = await Match.create({
        teamA: teamA._id,
        teamB: teamB._id,
        date: new Date(),
        venue: 'Stadium',
        status: 'upcoming'
      });

      const response = await request(app)
        .post(`/api/matches/${match._id}/status`)
        .send({ status: 'live' });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/matches/:id/score (Admin)', () => {
    it('should update match score and goals', async () => {
      const match = await Match.create({
        teamA: teamA._id,
        teamB: teamB._id,
        date: new Date(),
        venue: 'Stadium',
        status: 'live',
        scoreA: 0,
        scoreB: 0
      });

      const response = await authenticatedRequest(authToken)
        .post(`/api/matches/${match._id}/score`)
        .send({
          scoreA: 2,
          scoreB: 1,
          goals: [
            { player: playerA._id, team: teamA._id, minute: 10 },
            { player: playerA._id, team: teamA._id, minute: 25 },
            { player: playerB._id, team: teamB._id, minute: 60 }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.scoreA).toBe(2);
      expect(response.body.scoreB).toBe(1);
      expect(response.body.goals).toHaveLength(3);
    });

    it('should return 400 if goals missing player info', async () => {
      const match = await Match.create({
        teamA: teamA._id,
        teamB: teamB._id,
        date: new Date(),
        venue: 'Stadium',
        status: 'live'
      });

      const response = await authenticatedRequest(authToken)
        .post(`/api/matches/${match._id}/score`)
        .send({
          scoreA: 1,
          scoreB: 0,
          goals: [{ team: teamA._id, minute: 10 }] // Missing player
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('player information');
    });

    it('should return 401 without authentication', async () => {
      const match = await Match.create({
        teamA: teamA._id,
        teamB: teamB._id,
        date: new Date(),
        venue: 'Stadium',
        status: 'live'
      });

      const response = await request(app)
        .post(`/api/matches/${match._id}/score`)
        .send({ scoreA: 1, scoreB: 0 });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/matches/:id/publish (Admin)', () => {
    it('should update publish status', async () => {
      const match = await Match.create({
        teamA: teamA._id,
        teamB: teamB._id,
        date: new Date(),
        venue: 'Stadium',
        status: 'upcoming',
        isPublished: false
      });

      const response = await authenticatedRequest(authToken)
        .post(`/api/matches/${match._id}/publish`)
        .send({ isPublished: true });

      expect(response.status).toBe(200);
      expect(response.body.isPublished).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const match = await Match.create({
        teamA: teamA._id,
        teamB: teamB._id,
        date: new Date(),
        venue: 'Stadium',
        status: 'upcoming'
      });

      const response = await request(app)
        .post(`/api/matches/${match._id}/publish`)
        .send({ isPublished: true });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/matches/:id (Admin)', () => {
    it('should delete a match successfully', async () => {
      const match = await Match.create({
        teamA: teamA._id,
        teamB: teamB._id,
        date: new Date(),
        venue: 'Stadium',
        status: 'upcoming'
      });

      const response = await authenticatedRequest(authToken)
        .delete(`/api/matches/${match._id}`);

      expect(response.status).toBe(204);

      const deletedMatch = await Match.findById(match._id);
      expect(deletedMatch).toBeNull();
    });

    it('should return 401 without authentication', async () => {
      const match = await Match.create({
        teamA: teamA._id,
        teamB: teamB._id,
        date: new Date(),
        venue: 'Stadium',
        status: 'upcoming'
      });

      const response = await request(app)
        .delete(`/api/matches/${match._id}`);

      expect(response.status).toBe(401);
    });
  });
});

