let isLoginMode = true;

document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect to dashboard
    if (getToken()) {
        window.location.href = '/dashboard.html';
        return;
    }

    // Login form handler
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span class="spinner"></span> Signing in...';

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const alertContainer = document.getElementById('alertContainer');

        const result = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });

        if (result && result.ok) {
            setAuth(result.data.token, result.data.user);
            window.location.href = '/dashboard.html';
        } else {
            const msg = result?.data?.error || 'Login failed';
            showAlert(alertContainer, 'danger', msg);
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In';
        }
    });

    // Register form handler
    const registerForm = document.getElementById('registerForm');
    const registerBtn = document.getElementById('registerBtn');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const alertContainer = document.getElementById('alertContainer');

        const username = document.getElementById('regUsername').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;
        const role = document.getElementById('regRole').value;

        if (password !== confirmPassword) {
            showAlert(alertContainer, 'danger', 'Password tidak cocok!');
            return;
        }

        if (!role) {
            showAlert(alertContainer, 'danger', 'Pilih role terlebih dahulu');
            return;
        }

        registerBtn.disabled = true;
        registerBtn.innerHTML = '<span class="spinner"></span> Creating account...';

        const result = await apiRequest('/auth/register-public', {
            method: 'POST',
            body: JSON.stringify({ username, password, role }),
        });

        if (result && result.ok) {
            showAlert(alertContainer, 'success', result.data.message);
            registerForm.reset();
            // Switch back to login after successful registration
            setTimeout(() => {
                toggleAuthForm();
            }, 2000);
        } else {
            const msg = result?.data?.error || result?.data?.errors?.[0]?.msg || 'Registrasi gagal';
            showAlert(alertContainer, 'danger', msg);
        }

        registerBtn.disabled = false;
        registerBtn.textContent = 'Create Account';
    });

    // Role notice toggle
    const regRole = document.getElementById('regRole');
    regRole.addEventListener('change', () => {
        const notice = document.getElementById('roleNotice');
        if (regRole.value && regRole.value !== 'customer') {
            notice.classList.remove('hidden');
        } else {
            notice.classList.add('hidden');
        }
    });
});

function toggleAuthForm(e) {
    if (e) e.preventDefault();
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const toggleText = document.getElementById('toggleText');
    const alertContainer = document.getElementById('alertContainer');
    alertContainer.innerHTML = '';

    isLoginMode = !isLoginMode;

    if (isLoginMode) {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        toggleText.innerHTML = 'Belum punya akun? <a href="#" onclick="toggleAuthForm(event)">Buat Akun</a>';
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        toggleText.innerHTML = 'Sudah punya akun? <a href="#" onclick="toggleAuthForm(event)">Sign In</a>';
    }
}
