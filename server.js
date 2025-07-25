const express = require("express")
const fs = require("fs").promises
const path = require("path")
const multer = require("multer")
const app = express()
const PORT = process.env.PORT || 7860

// Admin token
const ADMIN_TOKEN = "CBLTOKEN@235#_&@"

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/")
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed!"), false)
    }
  },
})

// Middleware
app.use(express.json())
app.use(express.static(path.join(__dirname)))
app.use("/uploads", express.static("uploads"))

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  try {
    await fs.mkdir("uploads", { recursive: true })
  } catch (error) {
    console.log("Uploads directory already exists")
  }
}

// Utility functions
const readUsers = async () => {
  try {
    const data = await fs.readFile(path.join(__dirname, "data", "users.json"), "utf8")
    return JSON.parse(data)
  } catch (error) {
    return { users: [] }
  }
}

const writeUsers = async (data) => {
  try {
    await fs.mkdir(path.join(__dirname, "data"), { recursive: true })
    await fs.writeFile(path.join(__dirname, "data", "users.json"), JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error("Error writing users:", error)
    return false
  }
}

const generateId = () => {
  return "user_" + Math.random().toString(36).substr(2, 9)
}

const calculateDaysLeft = (premiumExpiry) => {
  if (!premiumExpiry) return 0
  const now = new Date()
  const expiry = new Date(premiumExpiry)
  const diffTime = expiry - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

// Initialize
ensureUploadsDir()

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"))
})

app.get("/auth", (req, res) => {
  res.sendFile(path.join(__dirname, "auth.html"))
})

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard.html"))
})

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"))
})

app.get("/create-receipt", (req, res) => {
  res.sendFile(path.join(__dirname, "create-receipt.html"))
})

// API Routes
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" })
    }

    const data = await readUsers()

    // Check if user already exists
    const existingUser = data.users.find((u) => u.email === email || u.username === username)
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" })
    }

    // Create new user
    const newUser = {
      id: generateId(),
      username,
      email,
      password, // In production, hash this password
      isPremium: false,
      premiumExpiry: null,
      createdAt: new Date().toISOString(),
      receiptsGenerated: 0,
      profilePhoto: null,
      subscriptionDaysLeft: 0,
      isActive: true,
    }

    data.users.push(newUser)
    await writeUsers(data)

    // Return user without password
    const { password: _, ...userResponse } = newUser
    res.json({ user: userResponse })
  } catch (error) {
    console.error("Signup error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" })
    }

    const data = await readUsers()
    const user = data.users.find((u) => u.email === email && u.password === password)

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: "This account has been banned. Please contact support." })
    }

    // Check if premium has expired
    if (user.isPremium && user.premiumExpiry && new Date(user.premiumExpiry) < new Date()) {
      user.isPremium = false
      user.premiumExpiry = null
      user.subscriptionDaysLeft = 0
      await writeUsers(data)
    } else if (user.isPremium && user.premiumExpiry) {
      user.subscriptionDaysLeft = calculateDaysLeft(user.premiumExpiry)
    }

    // Return user without password
    const { password: _, ...userResponse } = user
    res.json({ user: userResponse })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Admin token verification
app.post("/api/auth/admin-token", async (req, res) => {
  try {
    const { token } = req.body

    if (token === ADMIN_TOKEN) {
      res.json({ success: true, message: "Admin access granted" })
    } else {
      res.status(401).json({ error: "Invalid admin token" })
    }
  } catch (error) {
    console.error("Admin token verification error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Legacy admin login (keeping for backward compatibility)
app.post("/api/auth/admin", async (req, res) => {
  try {
    const { email, password } = req.body

    if (email === "cblpro@gmail.com" && password === "cblpro@#$&") {
      res.json({ success: true, isAdmin: true })
    } else {
      res.status(401).json({ error: "Invalid admin credentials" })
    }
  } catch (error) {
    console.error("Admin login error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Profile photo upload
app.post("/api/user/:userId/profile-photo", upload.single("profilePhoto"), async (req, res) => {
  try {
    const { userId } = req.params

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" })
    }

    const data = await readUsers()
    const user = data.users.find((u) => u.id === userId)

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Delete old profile photo if exists
    if (user.profilePhoto) {
      try {
        await fs.unlink(user.profilePhoto)
      } catch (error) {
        console.log("Old profile photo not found or already deleted")
      }
    }

    // Update user with new profile photo path
    user.profilePhoto = req.file.path

    await writeUsers(data)

    const { password: _, ...userResponse } = user
    res.json({ user: userResponse, photoUrl: `/${req.file.path}` })
  } catch (error) {
    console.error("Profile photo upload error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Delete profile photo
app.delete("/api/user/:userId/profile-photo", async (req, res) => {
  try {
    const { userId } = req.params

    const data = await readUsers()
    const user = data.users.find((u) => u.id === userId)

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Delete profile photo file if exists
    if (user.profilePhoto) {
      try {
        await fs.unlink(user.profilePhoto)
      } catch (error) {
        console.log("Profile photo file not found")
      }
    }

    // Remove profile photo from user
    user.profilePhoto = null

    await writeUsers(data)

    const { password: _, ...userResponse } = user
    res.json({ user: userResponse })
  } catch (error) {
    console.error("Delete profile photo error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/admin/users", async (req, res) => {
  try {
    const data = await readUsers()

    // Update expired premium users
    let updated = false
    data.users.forEach((user) => {
      if (user.isPremium && user.premiumExpiry && new Date(user.premiumExpiry) < new Date()) {
        user.isPremium = false
        user.premiumExpiry = null
        user.subscriptionDaysLeft = 0
        updated = true
      } else if (user.isPremium && user.premiumExpiry) {
        user.subscriptionDaysLeft = calculateDaysLeft(user.premiumExpiry)
      }
    })

    if (updated) {
      await writeUsers(data)
    }

    // Return users without passwords
    const users = data.users.map(({ password, ...user }) => user)
    res.json({ users })
  } catch (error) {
    console.error("Get users error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/admin/users/:userId/premium", async (req, res) => {
  try {
    const { userId } = req.params
    const { duration, customDate } = req.body

    const data = await readUsers()
    const user = data.users.find((u) => u.id === userId)

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    let expiryDate
    if (duration === "custom" && customDate) {
      expiryDate = new Date(customDate)
    } else {
      expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + Number.parseInt(duration))
    }

    user.isPremium = true
    user.premiumExpiry = expiryDate.toISOString()
    user.subscriptionDaysLeft = calculateDaysLeft(user.premiumExpiry)

    await writeUsers(data)

    const { password: _, ...userResponse } = user
    res.json({ user: userResponse })
  } catch (error) {
    console.error("Set premium error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.delete("/api/admin/users/:userId/premium", async (req, res) => {
  try {
    const { userId } = req.params

    const data = await readUsers()
    const user = data.users.find((u) => u.id === userId)

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    user.isPremium = false
    user.premiumExpiry = null
    user.subscriptionDaysLeft = 0

    await writeUsers(data)

    const { password: _, ...userResponse } = user
    res.json({ user: userResponse })
  } catch (error) {
    console.error("Remove premium error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.delete("/api/admin/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params

    const data = await readUsers()
    const userIndex = data.users.findIndex((u) => u.id === userId)

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" })
    }

    // Delete user's profile photo if exists
    const user = data.users[userIndex]
    if (user.profilePhoto) {
      try {
        await fs.unlink(user.profilePhoto)
      } catch (error) {
        console.log("Profile photo file not found")
      }
    }

    data.users.splice(userIndex, 1)
    await writeUsers(data)

    res.json({ success: true })
  } catch (error) {
    console.error("Delete user error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Ban/Unban user
app.post("/api/admin/users/:userId/ban", async (req, res) => {
  try {
    const { userId } = req.params
    const { action } = req.body

    const data = await readUsers()
    const user = data.users.find((u) => u.id === userId)

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    if (user.isAdmin) {
      return res.status(403).json({ error: "Cannot ban admin users" })
    }

    user.isActive = action === "unban"

    await writeUsers(data)

    const { password: _, ...userResponse } = user
    res.json({ user: userResponse })
  } catch (error) {
    console.error("Ban user error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.post("/api/receipts/generate", async (req, res) => {
  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" })
    }

    const data = await readUsers()
    const user = data.users.find((u) => u.id === userId)

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Check if user is premium or if premium has expired
    if (user.isPremium && user.premiumExpiry && new Date(user.premiumExpiry) < new Date()) {
      user.isPremium = false
      user.premiumExpiry = null
      user.subscriptionDaysLeft = 0
    }

    if (!user.isPremium) {
      return res.status(403).json({ error: "Premium subscription required to generate receipts" })
    }

    // Increment receipt count
    user.receiptsGenerated = (user.receiptsGenerated || 0) + 1
    await writeUsers(data)

    res.json({ success: true, receiptsGenerated: user.receiptsGenerated })
  } catch (error) {
    console.error("Generate receipt error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.get("/api/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params

    const data = await readUsers()
    const user = data.users.find((u) => u.id === userId)

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Check if premium has expired
    if (user.isPremium && user.premiumExpiry && new Date(user.premiumExpiry) < new Date()) {
      user.isPremium = false
      user.premiumExpiry = null
      user.subscriptionDaysLeft = 0
      await writeUsers(data)
    } else if (user.isPremium && user.premiumExpiry) {
      user.subscriptionDaysLeft = calculateDaysLeft(user.premiumExpiry)
    }

    const { password: _, ...userResponse } = user
    res.json({ user: userResponse })
  } catch (error) {
    console.error("Get user error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ReceiptCraft Pro server running on port ${PORT}`)
  console.log(`📱 Open http://localhost:${PORT} in your browser`)
  console.log(`🔐 Admin token: ${ADMIN_TOKEN}`)
  console.log(`👑 Legacy admin: email: "cblpro@gmail.com", password: "cblpro@#$&"`)
})
