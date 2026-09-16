const loginForm = document.getElementById('login-form')
const alertBox = document.getElementById('alert-box')
const loginBtn = document.getElementById('login-btn')

function showAlert(message, type) {
  alertBox.textContent = message
  alertBox.className = `alert alert-${type}`
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  alertBox.className = 'alert d-none'

  const username = document.getElementById('username').value.trim()
  const password = document.getElementById('password').value

  loginBtn.disabled = true
  loginBtn.textContent = 'Logging in...'

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })

    const data = await response.json()

    if (!response.ok) {
      showAlert(data.error || 'Login failed.', 'danger')
      return
    }

    // If the server just created this account, let the app page know so it
    // can greet the user, then head to the main app.
    if (data.isNewAccount) {
      sessionStorage.setItem('justCreatedAccount', '1')
    }
    window.location.href = '/app.html'
  } catch (err) {
    console.error(err)
    showAlert('Something went wrong reaching the server. Please try again.', 'danger')
  } finally {
    loginBtn.disabled = false
    loginBtn.textContent = 'Log In / Sign Up'
  }
})
