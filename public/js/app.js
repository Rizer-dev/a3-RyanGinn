// ---- Element references ----
const alertBox = document.getElementById('alert-box')
const welcomeText = document.getElementById('welcome-text')
const logoutBtn = document.getElementById('logout-btn')

const form = document.getElementById('transaction-form')
const formTitle = document.getElementById('form-title')
const transactionIdField = document.getElementById('transaction-id')
const submitBtn = document.getElementById('submit-btn')
const cancelEditBtn = document.getElementById('cancel-edit-btn')

const categorySelect = document.getElementById('category')
const recurringCheckbox = document.getElementById('recurring')
const recurrencePanel = document.getElementById('recurrence-panel')
const weeklyOptions = document.getElementById('weekly-options')
const monthlyOptions = document.getElementById('monthly-options')
const weekdayPicker = document.getElementById('weekday-picker')
const monthDayPicker = document.getElementById('month-day-picker')
const recurrenceSummaryEl = document.getElementById('recurrence-summary')

const tableBody = document.getElementById('transaction-table-body')
const emptyMessage = document.getElementById('empty-message')
const totalIncomeEl = document.getElementById('total-income')
const totalExpensesEl = document.getElementById('total-expenses')
const netBalanceEl = document.getElementById('net-balance')

// Income and expenses get their own category lists - swapped in whenever
// the Type toggle changes.
const CATEGORIES = {
  expense: ['Food', 'Transportation', 'Housing', 'Entertainment', 'Utilities', 'Other'],
  income: ['Salary', 'Freelance', 'Gift', 'Investment', 'Other']
}

const CATEGORY_ICONS = {
  Food: '🍔',
  Transportation: '🚗',
  Housing: '🏠',
  Entertainment: '🎬',
  Utilities: '💡',
  Salary: '💼',
  Freelance: '🧑‍💻',
  Gift: '🎁',
  Investment: '📈',
  Other: '📦'
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function showAlert(message, type = 'danger') {
  alertBox.textContent = message
  alertBox.className = `alert alert-${type}`
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(dateString) {
  const d = new Date(dateString)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

// Basic HTML-escaping so a description like "<script>" can't break the table
function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

// ---- Category dropdown (depends on selected Type) ----
function populateCategoryOptions(type, selectedValue) {
  categorySelect.innerHTML = ''
  CATEGORIES[type].forEach((cat) => {
    const opt = document.createElement('option')
    opt.value = cat
    opt.textContent = cat
    categorySelect.appendChild(opt)
  })
  if (selectedValue && CATEGORIES[type].includes(selectedValue)) {
    categorySelect.value = selectedValue
  }
}

document.querySelectorAll('input[name="type"]').forEach((radio) => {
  radio.addEventListener('change', () => populateCategoryOptions(radio.value))
})

// ---- Recurrence: weekday picker (weekly) + calendar day-of-month picker (monthly) ----
function buildDayButton(label, dayValue) {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.textContent = label
  btn.dataset.day = dayValue
  btn.setAttribute('aria-pressed', 'false')
  btn.addEventListener('click', () => {
    const isSelected = btn.classList.toggle('selected')
    btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false')
    updateRecurrenceSummary()
  })
  return btn
}

WEEKDAY_LABELS.forEach((label, idx) => {
  const btn = buildDayButton(label, idx)
  btn.className = 'weekday-btn'
  weekdayPicker.appendChild(btn)
})

for (let day = 1; day <= 31; day++) {
  monthDayPicker.appendChild(buildDayButton(day, day))
}

function getSelectedDays(container) {
  return Array.from(container.querySelectorAll('button.selected')).map((btn) => Number(btn.dataset.day))
}

function setSelectedDays(container, days = []) {
  container.querySelectorAll('button').forEach((btn) => {
    const isSelected = days.includes(Number(btn.dataset.day))
    btn.classList.toggle('selected', isSelected)
    btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false')
  })
}

function updateFrequencyPanels() {
  const frequency = document.querySelector('input[name="frequency"]:checked')?.value
  weeklyOptions.classList.toggle('d-none', frequency !== 'weekly')
  monthlyOptions.classList.toggle('d-none', frequency !== 'monthly')
  updateRecurrenceSummary()
}

document.querySelectorAll('input[name="frequency"]').forEach((radio) => {
  radio.addEventListener('change', updateFrequencyPanels)
})

recurringCheckbox.addEventListener('change', () => {
  recurrencePanel.classList.toggle('d-none', !recurringCheckbox.checked)
  updateRecurrenceSummary()
})

// Builds { frequency, daysOfWeek? , daysOfMonth? } straight from the form's
// current state - used both for the live on-screen summary and on submit.
function readRecurrenceFromForm() {
  const frequency = document.querySelector('input[name="frequency"]:checked')?.value
  if (!frequency) return null

  const recurrence = { frequency }
  if (frequency === 'weekly') {
    recurrence.daysOfWeek = getSelectedDays(weekdayPicker)
  } else if (frequency === 'monthly') {
    recurrence.daysOfMonth = getSelectedDays(monthDayPicker)
  }
  return recurrence
}

// Turns a recurrence object into a readable sentence, e.g.
// "Repeats weekly on Mon, Wed" - shared by the live form summary and the
// results table.
function describeRecurrence(recurrence) {
  if (!recurrence || !recurrence.frequency) return ''

  if (recurrence.frequency === 'daily') return 'Repeats daily'

  if (recurrence.frequency === 'weekly') {
    const days = (recurrence.daysOfWeek || []).slice().sort((a, b) => a - b).map((d) => WEEKDAY_LABELS[d])
    return days.length ? `Repeats weekly on ${days.join(', ')}` : 'Repeats weekly'
  }

  if (recurrence.frequency === 'monthly') {
    const days = (recurrence.daysOfMonth || []).slice().sort((a, b) => a - b).map(ordinal)
    return days.length ? `Repeats monthly on the ${days.join(', ')}` : 'Repeats monthly'
  }

  return ''
}

function updateRecurrenceSummary() {
  if (!recurringCheckbox.checked) {
    recurrenceSummaryEl.textContent = ''
    return
  }
  const recurrence = readRecurrenceFromForm()
  recurrenceSummaryEl.textContent = describeRecurrence(recurrence) || 'Pick at least one day above.'
}

// ---- Auth check on page load ----
async function checkAuth() {
  try {
    const res = await fetch('/api/me')
    if (!res.ok) {
      window.location.href = '/login.html'
      return
    }
    const data = await res.json()
    welcomeText.textContent = `Logged in as ${data.username}`

    if (sessionStorage.getItem('justCreatedAccount')) {
      showAlert("Welcome! Since that username didn't exist yet, we created a new account for you.", 'success')
      sessionStorage.removeItem('justCreatedAccount')
    }
  } catch (err) {
    console.error(err)
    window.location.href = '/login.html'
  }
}

// ---- Load + render transactions ----
async function loadTransactions() {
  try {
    const res = await fetch('/api/transactions')
    if (res.status === 401) {
      window.location.href = '/login.html'
      return
    }
    const transactions = await res.json()
    renderTransactions(transactions)
  } catch (err) {
    console.error(err)
    showAlert('Could not load your transactions. Please refresh the page.')
  }
}

function renderTransactions(transactions) {
  tableBody.innerHTML = ''

  emptyMessage.classList.toggle('d-none', transactions.length !== 0)

  let totalIncome = 0
  let totalExpenses = 0

  for (const t of transactions) {
    if (t.type === 'income') {
      totalIncome += t.amount
    } else {
      totalExpenses += t.amount
    }

    const isIncome = t.type === 'income'
    const amountClass = isIncome ? 'text-success' : 'text-danger'
    const amountPrefix = isIncome ? '+' : '-'
    const typeBadgeClass = isIncome ? 'text-bg-success' : 'text-bg-danger'
    const recurrenceText = t.recurring ? describeRecurrence(t.recurrence) : '—'

    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${formatDate(t.date)}</td>
      <td>${escapeHtml(t.description)}</td>
      <td><span class="badge ${typeBadgeClass}">${isIncome ? 'Income' : 'Expense'}</span></td>
      <td>${CATEGORY_ICONS[t.category] || ''} ${escapeHtml(t.category)}</td>
      <td class="${amountClass} fw-semibold">${amountPrefix}${formatCurrency(t.amount)}</td>
      <td>${escapeHtml(t.paymentMethod)}</td>
      <td class="small">${escapeHtml(recurrenceText)}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1 edit-btn" data-id="${t._id}">Edit</button>
        <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${t._id}">Delete</button>
      </td>
    `
    tableBody.appendChild(tr)

    tr.querySelector('.edit-btn').addEventListener('click', () => startEdit(t))
    tr.querySelector('.delete-btn').addEventListener('click', () => deleteTransaction(t._id))
  }

  totalIncomeEl.textContent = formatCurrency(totalIncome)
  totalExpensesEl.textContent = formatCurrency(totalExpenses)

  const net = totalIncome - totalExpenses
  netBalanceEl.textContent = (net < 0 ? '-' : '') + formatCurrency(Math.abs(net))
  netBalanceEl.className = `h4 mb-0 ${net < 0 ? 'text-danger' : 'text-success'}`
}

// ---- Add / Edit form handling ----
function startEdit(transaction) {
  formTitle.textContent = 'Edit Transaction'
  submitBtn.textContent = 'Save Changes'
  cancelEditBtn.classList.remove('d-none')

  transactionIdField.value = transaction._id

  document.getElementById(`type-${transaction.type}`).checked = true
  populateCategoryOptions(transaction.type, transaction.category)

  document.getElementById('description').value = transaction.description
  document.getElementById('amount').value = transaction.amount
  document.getElementById('date').value = new Date(transaction.date).toISOString().slice(0, 10)
  document.getElementById('notes').value = transaction.notes || ''

  const pmRadio = document.querySelector(`input[name="paymentMethod"][value="${transaction.paymentMethod}"]`)
  if (pmRadio) pmRadio.checked = true

  recurringCheckbox.checked = !!transaction.recurring
  recurrencePanel.classList.toggle('d-none', !transaction.recurring)

  setSelectedDays(weekdayPicker, [])
  setSelectedDays(monthDayPicker, [])

  if (transaction.recurring && transaction.recurrence) {
    const freqRadio = document.querySelector(`input[name="frequency"][value="${transaction.recurrence.frequency}"]`)
    if (freqRadio) freqRadio.checked = true
    updateFrequencyPanels()

    if (transaction.recurrence.frequency === 'weekly') {
      setSelectedDays(weekdayPicker, transaction.recurrence.daysOfWeek || [])
    } else if (transaction.recurrence.frequency === 'monthly') {
      setSelectedDays(monthDayPicker, transaction.recurrence.daysOfMonth || [])
    }
  } else {
    document.getElementById('freq-daily').checked = true
    updateFrequencyPanels()
  }

  updateRecurrenceSummary()
  form.scrollIntoView({ behavior: 'smooth' })
}

function resetForm() {
  form.reset()
  transactionIdField.value = ''
  formTitle.textContent = 'Add a Transaction'
  submitBtn.textContent = 'Add Transaction'
  cancelEditBtn.classList.add('d-none')

  document.getElementById('type-expense').checked = true
  populateCategoryOptions('expense')

  recurringCheckbox.checked = false
  recurrencePanel.classList.add('d-none')
  document.getElementById('freq-daily').checked = true
  updateFrequencyPanels()
  setSelectedDays(weekdayPicker, [])
  setSelectedDays(monthDayPicker, [])

  document.getElementById('date').valueAsDate = new Date()
}

cancelEditBtn.addEventListener('click', resetForm)

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  alertBox.className = 'alert d-none'

  const id = transactionIdField.value
  const recurring = recurringCheckbox.checked
  const recurrence = recurring ? readRecurrenceFromForm() : null

  if (recurring) {
    if (!recurrence || !recurrence.frequency) {
      showAlert('Please choose how often this repeats.')
      return
    }
    if (recurrence.frequency === 'weekly' && recurrence.daysOfWeek.length === 0) {
      showAlert('Please select at least one day of the week.')
      return
    }
    if (recurrence.frequency === 'monthly' && recurrence.daysOfMonth.length === 0) {
      showAlert('Please select at least one day of the month.')
      return
    }
  }

  const payload = {
    type: document.querySelector('input[name="type"]:checked')?.value,
    description: document.getElementById('description').value.trim(),
    amount: document.getElementById('amount').value,
    date: document.getElementById('date').value,
    category: categorySelect.value,
    paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value,
    recurring,
    recurrence,
    notes: document.getElementById('notes').value.trim()
  }

  try {
    const res = await fetch(id ? `/api/transactions/${id}` : '/api/transactions', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (res.status === 401) {
      window.location.href = '/login.html'
      return
    }

    const data = await res.json()
    if (!res.ok) {
      showAlert(data.error || 'Could not save transaction.')
      return
    }

    resetForm()
    loadTransactions()
  } catch (err) {
    console.error(err)
    showAlert('Something went wrong saving your transaction.')
  }
})

async function deleteTransaction(id) {
  if (!confirm('Delete this transaction? This cannot be undone.')) return

  try {
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    if (res.status === 401) {
      window.location.href = '/login.html'
      return
    }
    if (!res.ok) {
      const data = await res.json()
      showAlert(data.error || 'Could not delete transaction.')
      return
    }
    loadTransactions()
  } catch (err) {
    console.error(err)
    showAlert('Something went wrong deleting your transaction.')
  }
}

// ---- Logout ----
logoutBtn.addEventListener('click', async () => {
  try {
    await fetch('/api/logout', { method: 'POST' })
  } catch (err) {
    console.error(err)
  } finally {
    window.location.href = '/login.html'
  }
})

// ---- Init ----
populateCategoryOptions('expense')
document.getElementById('date').valueAsDate = new Date()
checkAuth()
loadTransactions()
