const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const { Server } = require("socket.io");

dotenv.config();

// ROUTES
const authRoutes = require("./src/routes/auth");
const teamRoutes = require("./src/routes/teams");
const playerRoutes = require("./src/routes/players");
const matchRoutes = require("./src/routes/matches");
const pointsRoutes = require("./src/routes/points");

// MODELS
const User = require("./src/models/User");
const Admin = require("./src/models/Admin");

const app = express();
const server = http.createServer(app);

// ALLOWED ORIGINS FOR CORS & SOCKET.IO
const allowedOrigins = [
  process.env.CLIENT_ORIGIN,
  "http://localhost:3000",
  "http://localhost:3001",
  "https://uit-football-tournament.vercel.app",
  "https://uit-football-tournament.vercel.app/",
]
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, "")); // Remove trailing slashes

// SOCKET.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.set("io", io);

// SOCKET CONNECTION
io.on("connection", (socket) => {
  console.log("Client connected");
  socket.on("disconnect", () => console.log("Client disconnected"));
});

// MIDDLEWARE
app.use(
  cors({
    origin: function (origin, callback) {
      if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/points", pointsRoutes);

// HOME ROUTE
app.get("/", (req, res) => {
  res.send("Backend running successfully.");
});

// AUTO ADMIN CREATOR
async function createAdmin() {
  try {
    const exists = await Admin.findOne({ email: "9probalsen@gmail.com" });
    if (exists) {
      console.log("Admin already exists");
      return;
    }

    const passwordHash = await Admin.hashPassword("Probal2004");
    await Admin.create({
      email: "9probalsen@gmail.com",
      passwordHash: passwordHash,
      name: "Tournament Admin",
    });
    console.log("Admin created successfully");
  } catch (err) {
    console.error("Error creating admin:", err);
  }
}

// DATABASE + START SERVER
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    // Run admin creation when server boots
    await createAdmin();

    server.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error", err);
    process.exit(1);
  });
