const express = require('express')
const bcrypt = require('bcryptjs')
const User = require('../models/User')

const router = express.Router()

// POST /api/login
// Per the assignment spec: if the username doesn't exist yet, we create a
// brand new account for it (and tell the client that happened so it can
// show a "we made you an account!" message). If the username DOES exist,
// we verify the password against the stored hash like a normal login.
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' })
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' })
    }

    const normalizedUsername = username.trim().toLowerCase()
    let user = await User.findOne({ username: normalizedUsername })
    let isNewAccount = false

    if (!user) {
      // No account with this username - create one automatically.
      const passwordHash = await bcrypt.hash(password, 10)
      user = await User.create({ username: normalizedUsername, passwordHash })
      isNewAccount = true
    } else {
      const passwordMatches = await bcrypt.compare(password, user.passwordHash)
      if (!passwordMatches) {
        return res.status(401).json({ error: 'Incorrect password.' })
      }
    }

    // Regenerate the session to prevent session fixation, then log the user in.
    req.session.regenerate((err) => {
      if (err) {
        console.error(err)
        return res.status(500).json({ error: 'Could not start a session.' })
      }
      req.session.userId = user._id.toString()
      req.session.username = user.username
      res.json({ username: user.username, isNewAccount })
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error while logging in.' })
  }
})

// POST /api/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err)
      return res.status(500).json({ error: 'Could not log out.' })
    }
    res.clearCookie('connect.sid')
    res.json({ success: true })
  })
})

// GET /api/me - lets the front end check "am I logged in?" on page load
router.get('/me', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({ username: req.session.username })
  }
  return res.status(401).json({ error: 'Not logged in.' })
})

module.exports = router
