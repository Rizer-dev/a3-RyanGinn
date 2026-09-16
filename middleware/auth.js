// Protects API routes - only lets the request through if a session exists.
// Every expense route uses this, which is what guarantees a user can only
// ever see/edit/delete their OWN data (we always scope queries to
// req.session.userId, never to an id supplied by the client).
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next()
  }
  return res.status(401).json({ error: 'Not logged in.' })
}

// Same check, but for full-page (non-API) requests: redirect to the login
// page instead of returning JSON, since a browser navigating to /app.html
// directly needs a page to land on, not a 401 blob.
function requirePageAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next()
  }
  return res.redirect('/login.html')
}

module.exports = { requireAuth, requirePageAuth }
