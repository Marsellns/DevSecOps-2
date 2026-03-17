let currentLogPage = 1;

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    renderSidebar('admin');
    loadPendingUsers();
    loadUsers();
    loadLogs(1);
    loadSuspicious();
});

function switchAdminTab(tab) {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(t => t.classList.remove('active'));

    document.getElementById('pendingTab').classList.add('hidden');
    document.getElementById('usersTab').classList.add('hidden');
    document.getElementById('logsTab').classList.add('hidden');
    document.getElementById('suspiciousTab').classList.add('hidden');

    if (tab === 'pending') {
        tabs[0].classList.add('active');
        document.getElementById('pendingTab').classList.remove('hidden');
    } else if (tab === 'users') {
        tabs[1].classList.add('active');
        document.getElementById('usersTab').classList.remove('hidden');
    } else if (tab === 'logs') {
        tabs[2].classList.add('active');
        document.getElementById('logsTab').classList.remove('hidden');
    } else {
        tabs[3].classList.add('active');
        document.getElementById('suspiciousTab').classList.remove('hidden');
    }
}

// ===== Pending Users =====
async function loadPendingUsers() {
    const result = await apiRequest('/admin/pending-users');
    const tbody = document.getElementById('pendingTable');
    const badge = document.getElementById('pendingBadge');

    if (result && result.ok) {
        // Update badge count
        if (result.data.length > 0) {
            badge.textContent = result.data.length;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }

        if (result.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:40px;color:var(--text-muted)">Tidak ada user yang menunggu approval 🎉</td></tr>';
        } else {
            tbody.innerHTML = result.data.map(u => `
                <tr>
                    <td>${u.user_id}</td>
                    <td><strong>${u.username}</strong></td>
                    <td><span class="badge badge-${getRoleBadge(u.role)}">${u.role}</span></td>
                    <td>${formatDate(u.created_at)}</td>
                    <td>
                        <div class="flex-gap">
                            <button class="btn btn-success btn-sm" onclick="approveUser(${u.user_id}, '${u.username}')">✓ Approve</button>
                            <button class="btn btn-danger btn-sm" onclick="rejectUser(${u.user_id}, '${u.username}')">✕ Reject</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    }
}

async function approveUser(id, username) {
    if (!confirm(`Approve user "${username}"?`)) return;

    const result = await apiRequest(`/admin/users/${id}/approve`, { method: 'PUT' });
    const alertContainer = document.getElementById('alertContainer');

    if (result && result.ok) {
        showAlert(alertContainer, 'success', `User "${username}" berhasil di-approve`);
        loadPendingUsers();
        loadUsers();
    } else {
        showAlert(alertContainer, 'danger', result?.data?.error || 'Approve failed');
    }
}

async function rejectUser(id, username) {
    if (!confirm(`Reject user "${username}"? Mereka tidak akan bisa login.`)) return;

    const result = await apiRequest(`/admin/users/${id}/reject`, { method: 'PUT' });
    const alertContainer = document.getElementById('alertContainer');

    if (result && result.ok) {
        showAlert(alertContainer, 'success', `User "${username}" telah ditolak`);
        loadPendingUsers();
        loadUsers();
    } else {
        showAlert(alertContainer, 'danger', result?.data?.error || 'Reject failed');
    }
}

// ===== Users =====
async function loadUsers() {
    const result = await apiRequest('/admin/users');
    const tbody = document.getElementById('usersTable');
    const currentUser = getUser();

    if (result && result.ok) {
        if (result.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:40px;color:var(--text-muted)">No users found</td></tr>';
        } else {
            tbody.innerHTML = result.data.map(u => `
                <tr>
                    <td>${u.user_id}</td>
                    <td><strong>${u.username}</strong></td>
                    <td><span class="badge badge-${getRoleBadge(u.role)}">${u.role}</span></td>
                    <td>${getStatusBadgeUser(u.status)}</td>
                    <td>${formatDate(u.created_at)}</td>
                    <td>
                        ${u.user_id !== currentUser.userId ? `<button class="btn btn-danger btn-sm" onclick="deleteUser(${u.user_id}, '${u.username}')">Delete</button>` : '<span class="badge badge-neutral">Current</span>'}
                    </td>
                </tr>
            `).join('');
        }
    }
}

function getStatusBadgeUser(status) {
    const map = {
        'approved': { class: 'badge-success', label: 'Approved' },
        'pending':  { class: 'badge-warning', label: 'Pending' },
        'rejected': { class: 'badge-danger',  label: 'Rejected' },
    };
    const s = map[status] || { class: 'badge-neutral', label: status || 'Unknown' };
    return `<span class="badge ${s.class}">${s.label}</span>`;
}

function getRoleBadge(role) {
    const map = { admin: 'danger', distributor: 'warning', customer: 'neutral' };
    return map[role] || 'neutral';
}

async function deleteUser(id, username) {
    if (!confirm(`Delete user "${username}"?`)) return;

    const result = await apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
    const alertContainer = document.getElementById('alertContainer');

    if (result && result.ok) {
        showAlert(alertContainer, 'success', `User "${username}" deleted`);
        loadUsers();
        loadPendingUsers();
    } else {
        showAlert(alertContainer, 'danger', result?.data?.error || 'Delete failed');
    }
}

function showAddUserModal() {
    document.getElementById('addUserModal').classList.remove('hidden');
}

function hideAddUserModal() {
    document.getElementById('addUserModal').classList.add('hidden');
    document.getElementById('addUserForm').reset();
}

async function createUser() {
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value;
    const alertContainer = document.getElementById('alertContainer');

    if (!username || !password || !role) {
        showAlert(alertContainer, 'warning', 'Please fill all fields');
        return;
    }

    const btn = document.getElementById('createUserBtn');
    btn.disabled = true;

    const result = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, role }),
    });

    if (result && result.ok) {
        showAlert(alertContainer, 'success', `User "${username}" created as ${role}`);
        hideAddUserModal();
        loadUsers();
    } else {
        showAlert(alertContainer, 'danger', result?.data?.error || result?.data?.errors?.[0]?.msg || 'Creation failed');
    }

    btn.disabled = false;
}

// ===== Logs =====
async function loadLogs(page) {
    currentLogPage = page;
    const result = await apiRequest(`/admin/logs?page=${page}&limit=20`);
    const tbody = document.getElementById('logsTable');
    const pagination = document.getElementById('logsPagination');

    if (result && result.ok) {
        const { logs, pagination: pag } = result.data;

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:40px;color:var(--text-muted)">No logs found</td></tr>';
            pagination.innerHTML = '';
        } else {
            tbody.innerHTML = logs.map(log => `
                <tr>
                    <td>${log.log_id}</td>
                    <td><span class="badge ${getActionBadge(log.action)}">${log.action}</span></td>
                    <td>${log.username || '—'}</td>
                    <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${log.details || ''}">${log.details || '—'}</td>
                    <td>${log.ip_address || '—'}</td>
                    <td>${formatDate(log.timestamp)}</td>
                </tr>
            `).join('');

            pagination.innerHTML = `
                <span style="font-size:0.8rem;color:var(--text-muted)">Page ${pag.page} of ${pag.pages} (${pag.total} total)</span>
                <div class="flex-gap">
                    <button class="btn btn-secondary btn-sm" ${pag.page <= 1 ? 'disabled' : ''} onclick="loadLogs(${pag.page - 1})">← Prev</button>
                    <button class="btn btn-secondary btn-sm" ${pag.page >= pag.pages ? 'disabled' : ''} onclick="loadLogs(${pag.page + 1})">Next →</button>
                </div>
            `;
        }
    }
}

function getActionBadge(action) {
    if (action.includes('SUCCESS') || action.includes('CREATED') || action.includes('REGISTERED') || action.includes('APPROVED')) return 'badge-success';
    if (action.includes('FAILED') || action.includes('ERROR') || action.includes('DELETED') || action.includes('REJECTED')) return 'badge-danger';
    if (action.includes('SUSPICIOUS') || action.includes('BLOCKED')) return 'badge-warning';
    return 'badge-info';
}

// ===== Suspicious =====
async function loadSuspicious() {
    const result = await apiRequest('/admin/suspicious');
    const tbody = document.getElementById('suspiciousTable');

    if (result && result.ok) {
        if (result.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:40px;color:var(--text-muted)">No suspicious products detected 🎉</td></tr>';
        } else {
            tbody.innerHTML = result.data.map(p => `
                <tr>
                    <td><strong>${p.product_id}</strong></td>
                    <td>${p.product_name}</td>
                    <td>${p.batch_number}</td>
                    <td>${getStatusBadge(p.status)}</td>
                    <td>${formatDate(p.created_at)}</td>
                </tr>
            `).join('');
        }
    }
}
