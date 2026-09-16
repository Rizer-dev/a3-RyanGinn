## Expense Tracker

A link to your project running on Render:

A two-tier web application for tracking personal expenses. Users log in (or are
automatically signed up on first login) and can add, edit, and delete expense or income records, each with a description, amount, category, payment method, date, a recurring flag, and optional notes. All data is scoped per-account and persists across server restarts in MongoDB.

- **Goal**: Give users a simple, private place to log day-to-day spending and
  see a running total, without needing a spreadsheet.
- **Challenges**: The trickiest part was making sure every expense route was
  scoped to `req.session.userId` on the *server* (not just hidden in the UI),
  so one user can never read, edit, or delete another user's data even by
  guessing an id. Getting session persistence working correctly with
  `connect-mongo` (so logins survive a server restart, not just in-memory)
  took some care too.
- **Authentication strategy**: Username/password with sessions
  (`express-session` + `connect-mongo` for the session store, `bcryptjs` for
  password hashing). Per the assignment spec, logging in with a username that
  doesn't exist yet automatically creates an account, and the UI shows a
  banner telling the user that happened. I chose this over OAuth because it
  requires no third-party app registration and is easy for graders to test
  with a throwaway account.
- **CSS framework**: [Bootstrap 5](https://getbootstrap.com/) (via CDN), for
  its form controls, cards, tables, and responsive grid. The framework does
  essentially all of the visual design.

### How the pieces fit together
- `server.js` — Express app setup, session/DB config, static file serving.
- `models/User.js`, `models/Expense.js` — Mongoose schemas.
- `routes/auth.js` — `/api/login`, `/api/logout`, `/api/me`.
- `routes/expenses.js` — `/api/expenses` CRUD, all routes protected by
  `middleware/auth.js`.
- `public/login.html` + `public/js/login.js` — login/sign-up page.
- `public/app.html` + `public/js/app.js` — main app: add/edit/delete form,
  results table, running total.

## Technical Achievements
- 100% Lighthouse
