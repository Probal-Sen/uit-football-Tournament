require('./setup');
const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('../src/routes/auth');
const Admin = require('../src/models/Admin');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

describe('Auth API Endpoints', () => {
  describe('POST /api/auth/seed-initial-admin', () => {
    it('should create a new admin successfully', async () => {
      const response = await request(app)
        .post('/api/auth/seed-initial-admin')
        .send({
          email: 'admin@test.com',
          password: 'Test123!',
          name: 'Test Admin'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', 'admin@test.com');
    });

    it('should return 400 if admin already exists', async () => {
      await Admin.create({
        email: 'existing@test.com',
        passwordHash: 'hash',
        name: 'Existing Admin'
      });

      const response = await request(app)
        .post('/api/auth/seed-initial-admin')
        .send({
          email: 'existing@test.com',
          password: 'Test123!',
          name: 'Test Admin'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Admin already exists');
    });

    it('should return 500 on invalid data', async () => {
      const response = await request(app)
        .post('/api/auth/seed-initial-admin')
        .send({});

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const passwordHash = await Admin.hashPassword('Test123!');
      await Admin.create({
        email: 'login@test.com',
        passwordHash,
        name: 'Login Test Admin'
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'Test123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged in');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@test.com',
          password: 'Test123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out');
    });
  });
});

