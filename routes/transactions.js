const express = require('express')
const mongoose = require('mongoose')
const Transaction = require('../models/Transaction')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// All routes below require a logged-in session
router.use(requireAuth)

// Pulls a clean { frequency, daysOfWeek? , daysOfMonth? } object out of
// whatever the client sent, or undefined if this isn't a recurring
// transaction. Keeping this in one place means POST and PUT stay in sync.
function sanitizeRecurrence(recurring, recurrence) {
  if (!recurring || !recurrence || !recurrence.frequency) return undefined

  const clean = { frequency: recurrence.frequency }

  if (recurrence.frequency === 'weekly') {
    clean.daysOfWeek = Array.isArray(recurrence.daysOfWeek) ? recurrence.daysOfWeek.map(Number) : []
  } else if (recurrence.frequency === 'monthly') {
    clean.daysOfMonth = Array.isArray(recurrence.daysOfMonth) ? recurrence.daysOfMonth.map(Number) : []
  }
  // 'daily' needs no extra detail - it just repeats every day.

  return clean
}

// Mongoose ValidationErrors (including our custom pre('validate') checks)
// get turned into a single friendly message instead of a raw error dump.
function sendValidationError(res, err) {
  const firstError = Object.values(err.errors)[0]
  return res.status(400).json({ error: firstError ? firstError.message : 'Invalid transaction data.' })
}

// GET /api/transactions - all transactions belonging to the logged-in user
router.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.session.userId }).sort({ date: -1 })
    res.json(transactions)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not fetch transactions.' })
  }
})

// POST /api/transactions - create a new income or expense entry
router.post('/', async (req, res) => {
  try {
    const { type, description, amount, category, paymentMethod, date, recurring, recurrence, notes } = req.body

    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Type must be "income" or "expense".' })
    }
    if (!description || !amount || !category || !paymentMethod || !date) {
      return res.status(400).json({ error: 'Missing required fields.' })
    }
    if (isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' })
    }

    const transaction = await Transaction.create({
      userId: req.session.userId,
      type,
      description,
      amount: Number(amount),
      category,
      paymentMethod,
      date: new Date(date),
      recurring: !!recurring,
      recurrence: sanitizeRecurrence(recurring, recurrence),
      notes: notes || ''
    })

    res.status(201).json(transaction)
  } catch (err) {
    if (err.name === 'ValidationError') return sendValidationError(res, err)
    console.error(err)
    res.status(500).json({ error: 'Could not create transaction.' })
  }
})

// PUT /api/transactions/:id - update a transaction (only if it belongs to this user)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid transaction id.' })
    }

    const { type, description, amount, category, paymentMethod, date, recurring, recurrence, notes } = req.body

    // Load + mutate + save (rather than findOneAndUpdate) so our custom
    // pre('validate') recurrence checks actually run - Mongoose document
    // middleware doesn't fire on findOneAndUpdate.
    // Scoping the filter to userId as well as _id means a user can never
    // edit another user's transaction, even if they guess a valid id.
    const transaction = await Transaction.findOne({ _id: id, userId: req.session.userId })
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found.' })
    }

    transaction.type = type
    transaction.description = description
    transaction.amount = Number(amount)
    transaction.category = category
    transaction.paymentMethod = paymentMethod
    transaction.date = new Date(date)
    transaction.recurring = !!recurring
    transaction.recurrence = sanitizeRecurrence(recurring, recurrence)
    transaction.notes = notes || ''

    await transaction.save()
    res.json(transaction)
  } catch (err) {
    if (err.name === 'ValidationError') return sendValidationError(res, err)
    console.error(err)
    res.status(500).json({ error: 'Could not update transaction.' })
  }
})

// DELETE /api/transactions/:id - delete a transaction (only if it belongs to this user)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid transaction id.' })
    }

    const transaction = await Transaction.findOneAndDelete({ _id: id, userId: req.session.userId })
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found.' })
    }
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Could not delete transaction.' })
  }
})

module.exports = router
