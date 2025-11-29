## UIT Burdwan University Inter-Department Football Tournament Web App

Full-stack web application for managing and displaying the UIT Burdwan University inter-department football tournament.

- **Frontend**: Next.js (TypeScript, App Router) in `frontend`
- **Backend**: Node.js + Express + MongoDB + Socket.io in `backend`
- **Auth**: JWT (admin only, no public registration)
- **Realtime**: Socket.io for live scores

---

### 1. System Architecture

- **Admin-only backend**
  - JWT auth with HTTP-only cookies
  - Only admins can manage teams, players, fixtures, live scores, points table & publish/hide data.
- **Public frontend**
  - Read-only UI that consumes only published data from the backend.
  - Views: Home, Fixtures & Results, Live Match Center, Points Table.
- **Realtime**
  - Admin updates a match score/status via backend APIs.
  - Backend broadcasts `matchUpdated` events via Socket.io.
  - Public live page listens and updates live without refresh.

---

### 2. Database Schema (MongoDB via Mongoose)

- **Admin**
  - `email: string (unique)`
  - `passwordHash: string`
  - `name?: string`

- **Team**
  - `name: string`
  - `department: "CSE" | "IT" | "ECE" | "EE" | "CE" | "AEIE"`
  - `logoUrl?: string`
  - `coachName?: string`
  - `captainName?: string`
  - `isPublished: boolean`

- **Player**
  - `name: string`
  - `jerseyNumber: number`
  - `position: string`
  - `department: "CSE" | "IT" | "ECE" | "EE" | "CE" | "AEIE"`
  - `team: ObjectId<Team>`
  - `isPublished: boolean`

- **Match**
  - `teamA: ObjectId<Team>`
  - `teamB: ObjectId<Team>`
  - `date: Date`
  - `venue: string`
  - `status: "upcoming" | "live" | "completed"`
  - `scoreA: number`
  - `scoreB: number`
  - `goals: { player?: ObjectId<Player>; team?: ObjectId<Team>; minute?: number }[]`
  - `isPublished: boolean`

- **PointsRow**
  - `team: ObjectId<Team> (unique)`
  - `played, wins, draws, losses: number`
  - `goalsFor, goalsAgainst, goalDifference, points: number`
  - `isPublished: boolean`

---

### 3. Backend API (Express)

**Base URL**: `/api`

- **Auth** (`/api/auth`)
  - `POST /login` – admin login, sets JWT cookie.
  - `POST /logout` – clear JWT cookie.
  - `POST /seed-initial-admin` – one-time endpoint to create the first admin.

- **Teams** (`/api/teams`)
  - `GET /` – public, returns only `isPublished: true` teams.
  - `GET /all` – admin, all teams.
  - `POST /` – admin, create team.
  - `PUT /:id` – admin, update team.
  - `DELETE /:id` – admin, delete team.
  - `POST /:id/publish` – admin, toggle `isPublished`.

- **Players** (`/api/players`)
  - `GET /` – public, published players (optional `?teamId=`).
  - `GET /all` – admin, all players.
  - `POST /` – admin, create player.
  - `PUT /:id` – admin, update player.
  - `DELETE /:id` – admin, delete player.
  - `POST /:id/publish` – admin, toggle `isPublished`.

- **Matches / Fixtures** (`/api/matches`)
  - `GET /` – public, published fixtures (optional `?status=upcoming|live|completed`).
  - `GET /live` – public, currently live and published matches.
  - `GET /all` – admin, all matches.
  - `POST /` – admin, create match fixture.
  - `PUT /:id` – admin, update match metadata.
  - `POST /:id/publish` – admin, toggle `isPublished`.
  - `POST /:id/status` – admin, set `status` (upcoming/live/completed), emits Socket.io event; when `completed`, points are updated.
  - `POST /:id/score` – admin, update `scoreA`, `scoreB` and `goals[]`; emits Socket.io event.

- **Points Table** (`/api/points`)
  - `GET /` – public, published standings.
  - `GET /all` – admin, all rows.
  - `POST /recalculate` – admin, recompute table from all `completed` matches.
  - `POST /publish` – admin, set `isPublished` on all rows.

JWT auth is enforced via `src/middleware/auth.js` for all admin routes.

---

### 4. Frontend UI (Next.js App Router)

**Key pages**

- `/` – hero landing page summarizing the tournament, quick links.
- `/fixtures` – list of published fixtures & results from `/api/matches`.
- `/live` – Live Match Center:
  - Loads current live matches from `/api/matches/live`.
  - Subscribes to `matchUpdated` events via Socket.io.
- `/points` – public points table from `/api/points`.
- `/admin/login` – admin login form posting to `/api/auth/login`.
- `/admin` – minimal admin dashboard:
  - Shows fixtures list with status + publish controls.
  - Buttons to change match status (upcoming/live/completed).
  - Buttons to recalculate / publish points table.
  - Read-only team overview.

Frontend uses a small helper in `src/lib/api.ts` to call the backend with
`credentials: "include"` so JWT cookies are sent automatically.

---

### 5. Running the Project Locally

#### 5.1 Prerequisites

- Node.js 18+
- MongoDB instance (local or cloud)

#### 5.2 MongoDB Setup

**⚠️ Important:** If you see `MongoDB connection error`, MongoDB is not running. See [MONGODB_SETUP.md](./MONGODB_SETUP.md) for detailed instructions.

You have two options for MongoDB:

**Option A: MongoDB Atlas (Cloud - Recommended for beginners)**

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account
2. Create a new cluster (free tier is fine)
3. Create a database user (username/password)
4. Whitelist your IP address (or use `0.0.0.0/0` for all IPs - only for development!)
5. Click "Connect" → "Connect your application"
6. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/...`)
7. Replace `<password>` with your actual password
8. Add database name: `uit-football` (or append `?retryWrites=true&w=majority` if not present)

**Option B: Local MongoDB Installation**

**Windows:**
1. Download MongoDB Community Server from [mongodb.com/download](https://www.mongodb.com/try/download/community)
2. Run the installer (choose "Complete" installation)
3. Install MongoDB as a Windows Service (default option)
4. MongoDB will start automatically on `localhost:27017`

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

#### 5.3 Backend setup

```bash
cd backend
npm install            # already done once by scaffolding
npm run dev            # starts server with nodemon on port 4000
```

Create `backend/.env` file with:

**For Local MongoDB:**
```bash
PORT=4000
MONGO_URI=mongodb://localhost:27017/uit-football
JWT_SECRET=choose-a-strong-secret
CLIENT_ORIGIN=http://localhost:3000
NODE_ENV=development
```

**For MongoDB Atlas:**
```bash
PORT=4000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/uit-football?retryWrites=true&w=majority
JWT_SECRET=choose-a-strong-secret
CLIENT_ORIGIN=http://localhost:3000
NODE_ENV=development
```

**Note:** Replace `username` and `password` in the MONGO_URI with your actual MongoDB Atlas credentials.

If you see `MongoDB connection error`, make sure:
- MongoDB is running (if using local) or your Atlas cluster is active
- The connection string in `.env` is correct
- Your IP is whitelisted (for Atlas)
- No firewall is blocking port 27017 (for local)

#### 5.4 Seed Initial Admin

After the backend server starts successfully, create your first admin account using one of these methods:

**PowerShell (Windows):**
```powershell
Invoke-RestMethod -Uri http://localhost:4000/api/auth/seed-initial-admin `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@example.com","password":"StrongPass123","name":"Tournament Admin"}'
```

**Bash/Unix (Linux/Mac/Git Bash):**
```bash
curl -X POST http://localhost:4000/api/auth/seed-initial-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"StrongPass123","name":"Tournament Admin"}'
```

Then log in on the frontend with that email/password.

**Or use the PowerShell script:**
```powershell
cd backend
.\seed-admin.ps1
```

#### 5.5 Frontend setup

```bash
cd frontend
npm install        # already done by create-next-app
npm run dev        # starts Next.js on http://localhost:3000
```

Create `frontend/.env.local` if needed:

```bash
NEXT_PUBLIC_API_BASE=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_BASE=http://localhost:4000
```

Open `http://localhost:3000` in the browser.

---

### 6. Deployment Notes

- **Backend**
  - Host on Render/Railway/Heroku/AWS.
  - Set env vars: `PORT`, `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` (your frontend URL).
  - Make sure WebSocket/SSE is enabled for Socket.io.

- **Frontend**
  - Deploy `frontend` to Vercel/Netlify.
  - Set env vars:
    - `NEXT_PUBLIC_API_BASE=https://your-backend-host/api`
    - `NEXT_PUBLIC_SOCKET_BASE=https://your-backend-host`

---

### 7. How to Use (Admin Flow)

1. Seed first admin using `/api/auth/seed-initial-admin`.
2. Log in at `/admin/login`.
3. Use the dashboard at `/admin` and/or backend APIs to:
   - Create teams & set `isPublished`.
   - Add players linked to teams and publish them.
   - Create fixtures (`/api/matches`).
   - When a match starts, set status to `live` and update scores with `/api/matches/:id/score`.
   - When a match ends, set status to `completed` (points update automatically).
   - Recalculate and publish the points table from the dashboard.

No mock data is shipped; all content is created by admins after login.


