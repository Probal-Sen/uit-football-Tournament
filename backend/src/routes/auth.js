const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const router = express.Router();

// Seed a default admin if none exists (for first-time setup)
router.post('/seed-initial-admin', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Admin already exists' });
    }
    const passwordHash = await Admin.hashPassword(password);
    const admin = await Admin.create({ email, passwordHash, name });
    res.status(201).json({ id: admin._id, email: admin.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to seed admin' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const valid = await admin.validatePassword(password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const payload = { sub: admin._id.toString(), email: admin.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'change_this_secret', {
      expiresIn: '8h',
    });

    console.log('Login successful, setting cookie with sameSite: none, secure: true, origin:', req.headers.origin);
    res
      .cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
      })
      .json({ message: 'Logged in' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  res
    .clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    })
    .json({ message: 'Logged out' });
});

module.exports = router;


