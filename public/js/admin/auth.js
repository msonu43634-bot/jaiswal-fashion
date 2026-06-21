// ==================== AUTH ====================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  const loginBtn = document.getElementById('loginBtn');
  
  const originalText = loginBtn.innerHTML;
  loginBtn.innerHTML = '⏳ Sending OTP...';
  loginBtn.disabled = true;

  try {
    const res = await fetch(`${API}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    
    loginBtn.innerHTML = originalText;
    loginBtn.disabled = false;

    if (res.ok && data.success && data.otpRequired) {
      document.getElementById('loginForm').style.display = 'none';
      document.getElementById('otpForm').style.display = 'block';
      document.getElementById('loginError').style.display = 'none';
    } else if (res.ok && data.success) {
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('adminLayout').style.display = 'flex';
      document.getElementById('adminName').textContent = data.admin.name;
      loadPage('dashboard');
    } else {
      document.getElementById('loginError').style.display = 'block';
      document.getElementById('loginError').textContent = data.error || 'Login failed';
      if (data.emailFailed) {
        alert(data.error || 'The email address you entered is invalid. Please check your email address and try again.');
      }
    }
  } catch (err) {
    loginBtn.innerHTML = originalText;
    loginBtn.disabled = false;
    document.getElementById('loginError').style.display = 'block';
    document.getElementById('loginError').textContent = 'Server not reachable';
  }
});

document.getElementById('otpForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const otp = document.getElementById('loginOtp').value;

  try {
    const res = await fetch(`${API}/admin/verify-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, otp })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('adminLayout').style.display = 'flex';
      document.getElementById('adminName').textContent = data.admin.name;
      loadCsrfToken(); // Load CSRF token for state-changing requests
      loadPage('dashboard');
      
      // Reset form
      document.getElementById('loginForm').reset();
      document.getElementById('otpForm').reset();
      document.getElementById('loginForm').style.display = 'block';
      document.getElementById('otpForm').style.display = 'none';
    } else {
      document.getElementById('loginError').style.display = 'block';
      document.getElementById('loginError').textContent = data.error || 'Invalid OTP';
    }
  } catch (err) {
    document.getElementById('loginError').style.display = 'block';
    document.getElementById('loginError').textContent = 'Server not reachable';
  }
});

// Check session
async function checkSession() {
  try {
    const res = await fetch(`${API}/admin/me`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      document.getElementById('loginPage').style.display = 'none';
      document.getElementById('adminLayout').style.display = 'flex';
      document.getElementById('adminName').textContent = data.admin.name;
      await loadCsrfToken();
      loadPage('dashboard');
    }
  } catch {}
}
checkSession();

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch(`${API}/admin/logout`, { method: 'POST', credentials: 'include' });
  location.reload();
});
