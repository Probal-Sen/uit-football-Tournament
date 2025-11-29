require('./setup');
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const playerRoutes = require('../src/routes/players');
const Player = require('../src/models/Player');
const Team = require('../src/models/Team');
const Admin = require('../src/models/Admin');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/players', playerRoutes);

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

describe('Players API Endpoints', () => {
  let authToken;
  let testTeam;

  beforeAll(async () => {
    authToken = await getAuthToken();
    testTeam = await Team.create({ name: 'Test Team', department: 'CSE' });
  });

  describe('GET /api/players (Public)', () => {
    it('should return only published players', async () => {
      await Player.create([
        { name: 'Player A', team: testTeam._id, jerseyNumber: 1, position: 'Forward', department: 'CSE', isPublished: true },
        { name: 'Player B', team: testTeam._id, jerseyNumber: 2, position: 'Midfielder', department: 'CSE', isPublished: false },
        { name: 'Player C', team: testTeam._id, jerseyNumber: 3, position: 'Defender', department: 'CSE', isPublished: true }
      ]);

      const response = await request(app).get('/api/players');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body.every(p => p.isPublished === true)).toBe(true);
    });

    it('should filter by teamId when provided', async () => {
      const team2 = await Team.create({ name: 'Team 2', department: 'IT' });
      await Player.create([
        { name: 'Player A', team: testTeam._id, jerseyNumber: 1, position: 'Forward', department: 'CSE', isPublished: true },
        { name: 'Player B', team: team2._id, jerseyNumber: 2, position: 'Midfielder', department: 'IT', isPublished: true }
      ]);

      const response = await request(app)
        .get(`/api/players?teamId=${testTeam._id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toBe('Player A');
    });
  });

  describe('GET /api/players/all (Admin)', () => {
    it('should return all players for authenticated admin', async () => {
      await Player.create([
        { name: 'Player A', team: testTeam._id, jerseyNumber: 1, position: 'Forward', department: 'CSE', isPublished: true },
        { name: 'Player B', team: testTeam._id, jerseyNumber: 2, position: 'Midfielder', department: 'CSE', isPublished: false }
      ]);

      const response = await authenticatedRequest(authToken)
        .get('/api/players/all');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/players/all');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/players (Admin)', () => {
    it('should create a new player', async () => {
      const playerData = {
        name: 'New Player',
        team: testTeam._id,
        jerseyNumber: 10,
        position: 'Forward',
        department: 'CSE',
        photoUrl: 'https://example.com/photo.jpg'
      };

      const response = await authenticatedRequest(authToken)
        .post('/api/players')
        .send(playerData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(playerData.name);
      expect(response.body.jerseyNumber).toBe(playerData.jerseyNumber);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/players')
        .send({ name: 'Player', team: testTeam._id, jerseyNumber: 1, position: 'Forward', department: 'CSE' });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/players/:id (Admin)', () => {
    it('should update a player successfully', async () => {
      const player = await Player.create({
        name: 'Player A',
        team: testTeam._id,
        jerseyNumber: 1,
        position: 'Forward',
        department: 'CSE'
      });

      const response = await authenticatedRequest(authToken)
        .put(`/api/players/${player._id}`)
        .send({ name: 'Updated Player', jerseyNumber: 99 });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Player');
      expect(response.body.jerseyNumber).toBe(99);
    });

    it('should return 401 without authentication', async () => {
      const player = await Player.create({
        name: 'Player A',
        team: testTeam._id,
        jerseyNumber: 1,
        position: 'Forward',
        department: 'CSE'
      });

      const response = await request(app)
        .put(`/api/players/${player._id}`)
        .send({ name: 'Updated Player' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/players/:id (Admin)', () => {
    it('should delete a player successfully', async () => {
      const player = await Player.create({
        name: 'Player A',
        team: testTeam._id,
        jerseyNumber: 1,
        position: 'Forward',
        department: 'CSE'
      });

      const response = await authenticatedRequest(authToken)
        .delete(`/api/players/${player._id}`);

      expect(response.status).toBe(204);

      const deletedPlayer = await Player.findById(player._id);
      expect(deletedPlayer).toBeNull();
    });

    it('should return 401 without authentication', async () => {
      const player = await Player.create({
        name: 'Player A',
        team: testTeam._id,
        jerseyNumber: 1,
        position: 'Forward',
        department: 'CSE'
      });

      const response = await request(app)
        .delete(`/api/players/${player._id}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/players/:id/publish (Admin)', () => {
    it('should update publish status', async () => {
      const player = await Player.create({
        name: 'Player A',
        team: testTeam._id,
        jerseyNumber: 1,
        position: 'Forward',
        department: 'CSE',
        isPublished: false
      });

      const response = await authenticatedRequest(authToken)
        .post(`/api/players/${player._id}/publish`)
        .send({ isPublished: true });

      expect(response.status).toBe(200);
      expect(response.body.isPublished).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const player = await Player.create({
        name: 'Player A',
        team: testTeam._id,
        jerseyNumber: 1,
        position: 'Forward',
        department: 'CSE'
      });

      const response = await request(app)
        .post(`/api/players/${player._id}/publish`)
        .send({ isPublished: true });

      expect(response.status).toBe(401);
    });
  });
});

