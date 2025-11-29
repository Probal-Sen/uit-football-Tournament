const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

// Load .env
dotenv.config();

// Import routes
const authRoutes = require('./src/routes/auth');
const teamRoutes = require('./src/routes/teams');
const playerRoutes = require('./src/routes/players');
const matchRoutes = require('./src/routes/matches');
const pointsRoutes = require('./src/routes/points');

// Import User Model (required for admin creation)
const User = require('./src/models/User');

const app = express();
const server = http.createServer(app);

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('Client connected to Socket.io');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/points', pointsRoutes);

// Test Home Page
app.get("/", (req, res) => {
  res.send("Backend running successfully.");
});

// =======================
//  CREATE ADMIN FUNCTION
// =======================
async function createAdmin() {
  try {
    const exists = await User.findOne({ email: "9probalsen@gmail.com" });
    if (exists) {
      console.log("Admin already exists");
      return;
    }

    const admin = new User({
      username: "admin",
      email: "9probalsen@gmail.com",
      password: "Probal2004",  // Will be hashed automatically
      isAdmin: true
    });

    await admin.save();
    console.log("Admin created successfully");
  } catch (err) {
    console.error("Error creating admin:", err);
  }
}

// =======================
//  DATABASE + SERVER START
// =======================
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    // Create admin account once
    await createAdmin();

    server.listen(PORT, () => {
      console.log(`Backend server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error", err);
    process.exit(1);
  });
