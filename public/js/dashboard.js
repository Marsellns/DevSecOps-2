document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    renderSidebar('dashboard');

    const result = await apiRequest('/admin/stats');
    if (result && result.ok) {
        const { totalProducts, verifiedCount, suspiciousCount, recentLogs } = result.data;

        document.getElementById('totalProducts').textContent = totalProducts;
        document.getElementById('verifiedProducts').textContent = verifiedCount;
        document.getElementById('suspiciousProducts').textContent = suspiciousCount;

        const tbody = document.getElementById('activityTable');
        if (recentLogs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding:40px;color:var(--text-muted)">No activity yet</td></tr>';
        } else {
            tbody.innerHTML = recentLogs.map(log => `
                <tr>
                    <td><span class="badge ${getActionBadge(log.action)}">${log.action}</span></td>
                    <td>${log.username || '—'}</td>
                    <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${log.details || ''}">${log.details || '—'}</td>
                    <td>${formatDate(log.timestamp)}</td>
                </tr>
            `).join('');
        }
    }
});

function getActionBadge(action) {
    if (action.includes('SUCCESS') || action.includes('REGISTERED')) return 'badge-success';
    if (action.includes('FAILED') || action.includes('ERROR')) return 'badge-danger';
    if (action.includes('SUSPICIOUS')) return 'badge-warning';
    return 'badge-info';
}
