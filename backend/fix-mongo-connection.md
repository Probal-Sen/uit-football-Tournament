# Fix MongoDB Atlas Authentication Error

## Error: `bad auth : authentication failed`

This means your MongoDB Atlas username or password is incorrect in the connection string.

---

## Step-by-Step Fix

### 1. Get Your Correct Credentials from MongoDB Atlas

1. Go to [MongoDB Atlas Dashboard](https://cloud.mongodb.com/)
2. Click **"Database Access"** in the left sidebar
3. Find your database user (or create a new one if needed)
4. **Note down:**
   - Username (e.g., `admin`, `myuser`)
   - Password (the one you set when creating the user)

### 2. Get Your Cluster Connection String

1. Go to **"Database"** in the left sidebar
2. Click **"Connect"** on your cluster
3. Choose **"Connect your application"**
4. Copy the connection string (it looks like):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 3. Fix Your `.env` File

**Important:** Replace `<password>` with your actual password. If your password has special characters, you may need to URL-encode them.

**Special Characters that Need Encoding:**
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `=` → `%3D`
- `?` → `%3F`
- `/` → `%2F`
- `:` → `%3A`
- ` ` (space) → `%20`

**Example:**

If your password is `MyP@ss#123`, it should be `MyP%40ss%23123` in the connection string.

**Correct Format:**
```bash
MONGO_URI=mongodb+srv://admin:MyP%40ss%23123@cluster0.xxxxx.mongodb.net/uit-football?retryWrites=true&w=majority
```

**Key Points:**
- Replace `<username>` with your actual username
- Replace `<password>` with your actual password (URL-encoded if needed)
- Make sure `/uit-football` is added before the `?` (this is your database name)
- Keep `?retryWrites=true&w=majority` at the end

### 4. Test the Connection

Run the test script:
```powershell
cd backend
node test-mongo.js
```

If it shows "✅ MongoDB connected successfully!", you're good!

---

## Quick Fix Checklist

- [ ] Verified username in Atlas "Database Access" matches connection string
- [ ] Verified password is correct (try resetting it in Atlas if unsure)
- [ ] URL-encoded any special characters in password
- [ ] Added `/uit-football` database name in the connection string
- [ ] Connection string is in quotes in `.env` file
- [ ] No extra spaces or line breaks in the connection string
- [ ] IP address is whitelisted in "Network Access"

---

## Still Not Working?

### Option 1: Reset Database User Password

1. Go to Atlas → "Database Access"
2. Click the three dots (⋯) next to your user
3. Click "Edit" → "Edit Password"
4. Set a new password (use only letters and numbers to avoid encoding issues)
5. Update your `.env` file with the new password

### Option 2: Create a New Database User

1. Go to Atlas → "Database Access" → "Add New Database User"
2. Username: `tournament-admin` (or your choice)
3. Password: Create a simple password (letters + numbers only, e.g., `Tournament2024`)
4. Database User Privileges: "Read and write to any database"
5. Click "Add User"
6. Use this new user's credentials in your connection string

### Option 3: Use Local MongoDB Instead

If Atlas is too complicated, switch to local MongoDB:

1. Install MongoDB locally (see MONGODB_SETUP.md)
2. Update `.env`:
   ```bash
   MONGO_URI=mongodb://localhost:27017/uit-football
   ```

---

## Example Connection Strings

**Simple password (no special chars):**
```bash
MONGO_URI=mongodb+srv://admin:MyPassword123@cluster0.abc123.mongodb.net/uit-football?retryWrites=true&w=majority
```

**Password with special characters (URL-encoded):**
```bash
# Password: P@ss#123
MONGO_URI=mongodb+srv://admin:P%40ss%23123@cluster0.abc123.mongodb.net/uit-football?retryWrites=true&w=majority
```

**With different username:**
```bash
MONGO_URI=mongodb+srv://tournament-admin:SecurePass456@cluster0.abc123.mongodb.net/uit-football?retryWrites=true&w=majority
```

