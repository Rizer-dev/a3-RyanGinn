require('dotenv').config()

const path = require('path')
const express = require('express')
const mongoose = require('mongoose')
const session = require('express-session')
const MongoStore = require('connect-mongo')

const authRoutes = require('./routes/auth')
const transactionRoutes = require('./routes/transactions')
const { requirePageAuth } = require('./middleware/auth')

const app = express()
const PORT = process.env.PORT || 3000
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expense-tracker'
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me'

// ---- Database ----
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err.message))

// ---- Core middleware ----
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGODB_URI }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      httpOnly: true,
      sameSite: 'lax'
    }
  })
)

// ---- API routes ----
app.use('/api', authRoutes)
app.use('/api/transactions', transactionRoutes)

// Root: send logged-in users to the app, everyone else to the login page.
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/app.html')
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'))
})

// Server-side guard as a backstop in case someone links directly to app.html
// (the page itself also checks /api/me on load and redirects if needed).
// IMPORTANT: this route is registered BEFORE express.static below, so it
// intercepts /app.html and enforces auth instead of the static file just
// being handed out to anyone who asks for it.
app.get('/app.html', requirePageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'))
})

// ---- Static files (Bootstrap-styled HTML/CSS/JS live in /public) ----
app.use(express.static(path.join(__dirname, 'public')))

// 404 fallback
app.use((req, res) => {
  res.status(404).send('Not found')
})

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
