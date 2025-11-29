# MongoDB Setup Guide

## Quick Fix for Connection Error

If you see this error:
```
MongoDB connection error MongooseServerSelectionError: connect ECONNREFUSED
```

It means MongoDB is not running or not accessible. Follow the steps below.

---

## Option 1: MongoDB Atlas (Cloud - Easiest)

**Best for:** Quick setup, no local installation needed

1. **Sign up** at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) (free tier available)

2. **Create a cluster:**
   - Click "Build a Database"
   - Choose "FREE" (M0) tier
   - Select a cloud provider and region
   - Click "Create"

3. **Create database user:**
   - Go to "Database Access" → "Add New Database User"
   - Choose "Password" authentication
   - Username: `admin` (or your choice)
   - Password: Create a strong password (save it!)
   - Click "Add User"

4. **Whitelist IP:**
   - Go to "Network Access" → "Add IP Address"
   - For development: Click "Allow Access from Anywhere" (`0.0.0.0/0`)
   - Click "Confirm"

5. **Get connection string:**
   - Go to "Database" → Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)

6. **Update your `.env` file:**
   ```bash
   MONGO_URI=mongodb+srv://admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/uit-football?retryWrites=true&w=majority
   ```
   - Replace `YOUR_PASSWORD` with your actual password
   - Replace `cluster0.xxxxx.mongodb.net` with your actual cluster URL
   - Make sure `/uit-football` is in the path (database name)

7. **Restart your backend server**

---

## Option 2: Local MongoDB Installation

**Best for:** Offline development, full control

### Windows

1. **Download:**
   - Go to [MongoDB Community Server Download](https://www.mongodb.com/try/download/community)
   - Select Windows, MSI package
   - Download and run installer

2. **Install:**
   - Choose "Complete" installation
   - Check "Install MongoDB as a Service" (default)
   - Check "Install MongoDB Compass" (optional GUI tool)
   - Click "Install"

3. **Verify it's running:**
   ```powershell
   # Check if MongoDB service is running
   Get-Service MongoDB
   ```
   If it shows "Running", you're good!

4. **If service is not running:**
   ```powershell
   # Start MongoDB service
   Start-Service MongoDB
   ```

5. **Update your `.env` file:**
   ```bash
   MONGO_URI=mongodb://localhost:27017/uit-football
   ```

### macOS

```bash
# Install using Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify it's running
brew services list
```

### Linux (Ubuntu/Debian)

```bash
# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb

# Start MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Check status
sudo systemctl status mongodb
```

---

## Verify MongoDB Connection

### Test Local MongoDB (Windows PowerShell)

```powershell
# Try connecting with MongoDB shell (if installed)
mongosh
# Or older version:
mongo
```

If it connects, you'll see a MongoDB prompt. Type `exit` to leave.

### Test Connection from Node.js

Create a test file `test-mongo.js`:

```javascript
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
```

Run it:
```bash
node test-mongo.js
```

---

## Common Issues

### Issue: "ECONNREFUSED" on localhost

**Solution:**
- Make sure MongoDB service is running
- Check if port 27017 is blocked by firewall
- Try restarting MongoDB service

### Issue: "Authentication failed" on Atlas

**Solution:**
- Double-check username and password in connection string
- Make sure you replaced `<password>` with actual password
- Verify database user exists in Atlas dashboard

### Issue: "IP not whitelisted" on Atlas

**Solution:**
- Go to Atlas → Network Access
- Add your current IP address
- Or temporarily allow `0.0.0.0/0` for development (not recommended for production)

### Issue: Connection string format error

**Solution:**
- Make sure connection string is in quotes in `.env` file
- Check for special characters in password (may need URL encoding)
- Verify database name is included: `/uit-football`

---

## Need Help?

- MongoDB Atlas Docs: https://docs.atlas.mongodb.com/
- Local MongoDB Docs: https://docs.mongodb.com/manual/installation/
- MongoDB Community Forum: https://developer.mongodb.com/community/forums/

