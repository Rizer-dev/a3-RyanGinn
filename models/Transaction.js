const mongoose = require('mongoose')

const transactionSchema = new mongoose.Schema({
  // Every transaction belongs to exactly one user (their ObjectId)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // 'expense' = money out, 'income' = money in
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense']
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  // Not a strict enum on purpose - income and expenses use different
  // category lists (see CATEGORIES in public/js/app.js). The client picks
  // the right list based on `type`; the server just checks it's non-empty.
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['Cash', 'Card', 'Other']
  },
  // For a recurring transaction, this is the date of the first occurrence.
  date: {
    type: Date,
    required: true
  },
  recurring: {
    type: Boolean,
    default: false
  },
  // Only present when recurring === true.
  recurrence: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    // Used only when frequency === 'weekly'. 0 = Sunday ... 6 = Saturday.
    daysOfWeek: {
      type: [Number],
      validate: {
        validator: (arr) => !arr || arr.every((d) => Number.isInteger(d) && d >= 0 && d <= 6),
        message: 'daysOfWeek must contain integers between 0 (Sun) and 6 (Sat).'
      }
    },
    // Used only when frequency === 'monthly'. Day-of-month, 1-31.
    daysOfMonth: {
      type: [Number],
      validate: {
        validator: (arr) => !arr || arr.every((d) => Number.isInteger(d) && d >= 1 && d <= 31),
        message: 'daysOfMonth must contain integers between 1 and 31.'
      }
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

// Cross-field validation that a plain schema `required` can't express:
// - recurring transactions must have a frequency
// - weekly ones must name at least one day of the week
// - monthly ones must name at least one day of the month
// NOTE: this runs on .save()/.create() (document validation), not on
// findOneAndUpdate - that's why routes/transactions.js loads the document
// and calls .save() for edits instead of using findOneAndUpdate.
transactionSchema.pre('validate', function (next) {
  if (this.recurring) {
    const freq = this.recurrence && this.recurrence.frequency
    if (!freq) {
      this.invalidate('recurrence.frequency', 'Choose how often this repeats (daily, weekly, or monthly).')
    } else if (freq === 'weekly' && (!this.recurrence.daysOfWeek || this.recurrence.daysOfWeek.length === 0)) {
      this.invalidate('recurrence.daysOfWeek', 'Select at least one day of the week.')
    } else if (freq === 'monthly' && (!this.recurrence.daysOfMonth || this.recurrence.daysOfMonth.length === 0)) {
      this.invalidate('recurrence.daysOfMonth', 'Select at least one day of the month.')
    }
  } else {
    // Not recurring - don't keep stale recurrence data around
    this.recurrence = undefined
  }
  next()
})

module.exports = mongoose.model('Transaction', transactionSchema)
