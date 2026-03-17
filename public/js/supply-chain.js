document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    renderSidebar('supply');
    loadProducts();
});

async function loadProducts() {
    const result = await apiRequest('/supply-chain');
    const tbody = document.getElementById('productsTable');

    if (result && result.ok) {
        if (result.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding:40px;color:var(--text-muted)">No products found</td></tr>';
        } else {
            const user = getUser();
            tbody.innerHTML = result.data.map(p => {
                const canUpdate = canTransition(p.status, user.role);
                return `
                    <tr>
                        <td><strong>${p.product_id}</strong></td>
                        <td>${p.product_name}</td>
                        <td>${getStatusBadge(p.status)}</td>
                        <td>
                            <div class="flex-gap">
                                ${canUpdate ? `<button class="btn btn-primary btn-sm" onclick="updateStatus('${p.product_id}')">Update Status</button>` : ''}
                                <button class="btn btn-secondary btn-sm" onclick="viewHistory('${p.product_id}')">History</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }
}

function canTransition(status, role) {
    const transitions = {
        'manufactured': ['distributor', 'admin'],
        'distributed': ['retailer', 'admin'],
        'retail': ['retailer', 'admin'],
    };
    return transitions[status] && transitions[status].includes(role);
}

async function updateStatus(productId) {
    const alertContainer = document.getElementById('alertContainer');
    const result = await apiRequest(`/supply-chain/${productId}`, { method: 'POST' });

    if (result && result.ok) {
        showAlert(alertContainer, 'success', `${productId}: ${result.data.previous_status} → ${result.data.new_status}`);
        loadProducts();
        viewHistory(productId);
    } else {
        showAlert(alertContainer, 'danger', result?.data?.error || 'Update failed');
    }
}

async function viewHistory(productId) {
    const historyCard = document.getElementById('historyCard');
    const timeline = document.getElementById('timeline');
    const badge = document.getElementById('historyProductId');

    historyCard.style.display = '';
    badge.textContent = productId;
    timeline.innerHTML = '<div class="text-center" style="padding:20px"><span class="spinner"></span></div>';

    const result = await apiRequest(`/supply-chain/${productId}`);

    if (result && result.ok) {
        const statusLabels = {
            'manufactured': '🏭 Manufactured',
            'distributed': '🚚 Distributed',
            'retail': '🏪 In Retail',
            'sold': '✅ Sold to Customer',
        };

        timeline.innerHTML = result.data.map(record => `
            <div class="timeline-item">
                <div class="time">${formatDate(record.timestamp)}</div>
                <div class="event">${statusLabels[record.status] || record.status}</div>
                <div class="actor">by ${record.actor}</div>
            </div>
        `).join('');
    } else {
        timeline.innerHTML = '<div class="empty-state"><p>No history found</p></div>';
    }
}
