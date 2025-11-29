require('./setup');
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const teamRoutes = require('../src/routes/teams');
const Team = require('../src/models/Team');
const Player = require('../src/models/Player');
const PointsRow = require('../src/models/PointsTable');
const Admin = require('../src/models/Admin');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/teams', teamRoutes);

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

describe('Teams API Endpoints', () => {
  let authToken;

  beforeAll(async () => {
    authToken = await getAuthToken();
  });

  describe('GET /api/teams (Public)', () => {
    it('should return only published teams', async () => {
      await Team.create([
        { name: 'Team A', department: 'CSE', isPublished: true },
        { name: 'Team B', department: 'IT', isPublished: false },
        { name: 'Team C', department: 'ECE', isPublished: true }
      ]);

      const response = await request(app).get('/api/teams');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body.every(t => t.isPublished === true)).toBe(true);
    });

    it('should return empty array when no published teams', async () => {
      await Team.create({ name: 'Team A', department: 'CSE', isPublished: false });

      const response = await request(app).get('/api/teams');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /api/teams/all (Admin)', () => {
    it('should return all teams for authenticated admin', async () => {
      await Team.create([
        { name: 'Team A', department: 'CSE', isPublished: true },
        { name: 'Team B', department: 'IT', isPublished: false }
      ]);

      const response = await authenticatedRequest(authToken)
        .get('/api/teams/all');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app).get('/api/teams/all');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/teams (Admin)', () => {
    it('should create a new team', async () => {
      const teamData = {
        name: 'New Team',
        department: 'CSE',
        logoUrl: 'https://example.com/logo.png',
        coachName: 'Coach Name',
        captainName: 'Captain Name'
      };

      const response = await authenticatedRequest(authToken)
        .post('/api/teams')
        .send(teamData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(teamData.name);
      expect(response.body.department).toBe(teamData.department);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/teams')
        .send({ name: 'Team', department: 'CSE' });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/teams/:id (Admin)', () => {
    it('should update a team successfully', async () => {
      const team = await Team.create({ name: 'Team A', department: 'CSE' });

      const response = await authenticatedRequest(authToken)
        .put(`/api/teams/${team._id}`)
        .send({ name: 'Updated Team', department: 'IT' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Team');
      expect(response.body.department).toBe('IT');
    });

    it('should return 401 without authentication', async () => {
      const team = await Team.create({ name: 'Team A', department: 'CSE' });

      const response = await request(app)
        .put(`/api/teams/${team._id}`)
        .send({ name: 'Updated Team' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/teams/:id (Admin)', () => {
    it('should delete team and associated data', async () => {
      const team = await Team.create({ name: 'Team A', department: 'CSE' });
      const teamId = team._id;

      await Player.create({ name: 'Player 1', team: teamId, jerseyNumber: 1, position: 'Forward', department: 'CSE' });
      await PointsRow.create({ team: teamId, played: 1, wins: 1, points: 3 });

      const response = await authenticatedRequest(authToken)
        .delete(`/api/teams/${teamId}`);

      expect(response.status).toBe(204);

      // Verify team is deleted
      const deletedTeam = await Team.findById(teamId);
      expect(deletedTeam).toBeNull();

      // Verify associated players are deleted
      const players = await Player.find({ team: teamId });
      expect(players).toHaveLength(0);

      // Verify associated points row is deleted
      const pointsRow = await PointsRow.findOne({ team: teamId });
      expect(pointsRow).toBeNull();
    });

    it('should return 401 without authentication', async () => {
      const team = await Team.create({ name: 'Team A', department: 'CSE' });

      const response = await request(app)
        .delete(`/api/teams/${team._id}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/teams/:id/publish (Admin)', () => {
    it('should update publish status', async () => {
      const team = await Team.create({ name: 'Team A', department: 'CSE', isPublished: false });

      const response = await authenticatedRequest(authToken)
        .post(`/api/teams/${team._id}/publish`)
        .send({ isPublished: true });

      expect(response.status).toBe(200);
      expect(response.body.isPublished).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const team = await Team.create({ name: 'Team A', department: 'CSE' });

      const response = await request(app)
        .post(`/api/teams/${team._id}/publish`)
        .send({ isPublished: true });

      expect(response.status).toBe(401);
    });
  });
});

