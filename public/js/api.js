// ===== API Helper & Shared Utilities =====

const API_BASE = '/api';

function getToken() {
    return localStorage.getItem('spv_token');
}

function getUser() {
    const user = localStorage.getItem('spv_user');
    return user ? JSON.parse(user) : null;
}

function setAuth(token, user) {
    localStorage.setItem('spv_token', token);
    localStorage.setItem('spv_user', JSON.stringify(user));
}

function clearAuth() {
    localStorage.removeItem('spv_token');
    localStorage.removeItem('spv_user');
}

function logout() {
    clearAuth();
    window.location.href = '/';
}

async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers,
        },
        ...options,
    };

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await res.json();

        if (res.status === 401 || res.status === 403) {
            // Only redirect to login for protected pages, not public pages
            const publicPages = ['/', '/index.html', '/verify-product.html', '/products.html', '/login.html'];
            const currentPath = window.location.pathname;
            if (!publicPages.includes(currentPath) && endpoint !== '/auth/login') {
                clearAuth();
                window.location.href = '/login.html';
                return null;
            }
        }

        return { ok: res.ok, status: res.status, data };
    } catch (err) {
        console.error('API Error:', err);
        return { ok: false, status: 0, data: { error: 'Network error' } };
    }
}

function requireAuth() {
    if (!getToken()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// ===== Navigation Rendering =====

const NAV_ITEMS = {
    admin: [
        { href: '/dashboard.html', icon: '📊', label: 'Dashboard', id: 'dashboard' },
        { href: '/products.html', icon: '🛍️', label: 'Product Catalog', id: 'catalog' },
        { href: '/register-product.html', icon: '📦', label: 'Register Product', id: 'register' },
        { href: '/verify-product.html', icon: '✅', label: 'Verify Product', id: 'verify' },
        { href: '/supply-chain.html', icon: '🔗', label: 'Supply Chain', id: 'supply' },
        { href: '/admin.html', icon: '⚙️', label: 'Admin Panel', id: 'admin' },
    ],
    distributor: [
        { href: '/dashboard.html', icon: '📊', label: 'Dashboard', id: 'dashboard' },
        { href: '/products.html', icon: '🛍️', label: 'Product Catalog', id: 'catalog' },
        { href: '/verify-product.html', icon: '✅', label: 'Verify Product', id: 'verify' },
        { href: '/supply-chain.html', icon: '🔗', label: 'Supply Chain', id: 'supply' },
    ],
};

function renderSidebar(activeId) {
    const user = getUser();
    if (!user) return;

    const items = NAV_ITEMS[user.role] || NAV_ITEMS.distributor;

    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    sidebar.innerHTML = `
        <div class="sidebar-header">
            <div class="brand">
                <div class="brand-icon">🔐</div>
                <div class="brand-text">
                    <h2>SPV System</h2>
                    <span>Product Verification</span>
                </div>
            </div>
        </div>
        <nav class="sidebar-nav">
            <div class="nav-label">Navigation</div>
            ${items.map(item => `
                <a href="${item.href}" class="nav-item ${item.id === activeId ? 'active' : ''}">
                    <span class="nav-icon">${item.icon}</span>
                    <span>${item.label}</span>
                </a>
            `).join('')}
        </nav>
        <div class="sidebar-footer">
            <div class="user-info">
                <div class="user-avatar">${user.username[0].toUpperCase()}</div>
                <div class="user-details">
                    <div class="name">${user.username}</div>
                    <div class="role">${user.role}</div>
                </div>
                <button class="btn-logout" onclick="logout()" title="Logout">⏻</button>
            </div>
        </div>
    `;
}

// ===== Public Navigation for non-logged-in pages =====

function renderPublicNav(activePage) {
    const nav = document.getElementById('publicNav');
    if (!nav) return;

    const links = [
        { href: '/', icon: '🏠', label: 'Home', id: 'home' },
        { href: '/verify-product.html', icon: '✅', label: 'Verify Product', id: 'verify' },
        { href: '/products.html', icon: '🛍️', label: 'Product Catalog', id: 'catalog' },
        { href: '/login.html', icon: '🔑', label: 'Login', id: 'login' },
    ];

    nav.innerHTML = `
        <div class="public-nav-inner">
            <a href="/" class="public-brand">
                <span class="brand-icon">🔐</span>
                <span class="brand-name">SPV System</span>
            </a>
            <button class="public-menu-toggle" onclick="togglePublicNav()" aria-label="Toggle menu">☰</button>
            <div class="public-nav-links" id="publicNavLinks">
                ${links.map(l => `
                    <a href="${l.href}" class="nav-link ${l.id === activePage ? 'active' : ''} ${l.id === 'login' ? 'nav-login' : ''}">${l.icon} ${l.label}</a>
                `).join('')}
            </div>
        </div>
    `;
}

function showAlert(container, type, message) {
    const icons = { success: '✓', danger: '✕', warning: '⚠', info: 'ℹ' };
    const el = document.createElement('div');
    el.className = `alert alert-${type}`;
    el.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
    container.prepend(el);
    setTimeout(() => el.remove(), 5000);
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getStatusBadge(status) {
    const map = {
        'manufactured': 'info',
        'distributed': 'warning',
        'sold': 'neutral',
    };
    return `<span class="badge badge-${map[status] || 'neutral'}">${status}</span>`;
}

// ===== Mobile Nav Toggles =====
window.togglePublicNav = function() {
    const navLinks = document.querySelector('.public-nav-links');
    if (navLinks) {
        navLinks.classList.toggle('active');
    }
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
};
