let allProducts = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    renderPublicNav('catalog');
    await loadCatalog();

    // Search handler
    document.getElementById('searchInput').addEventListener('input', (e) => {
        renderProducts(filterAndSearch(allProducts));
    });
});

async function loadCatalog() {
    const result = await apiRequest('/products/catalog');
    const grid = document.getElementById('catalogGrid');

    if (result && result.ok) {
        allProducts = result.data;
        renderStats(allProducts);
        renderProducts(allProducts);
    } else {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <div class="icon">📦</div>
                <h3>Could not load products</h3>
                <p>Please try again later</p>
            </div>
        `;
    }
}

function renderStats(products) {
    const stats = document.getElementById('catalogStats');
    const total = products.length;
    const manufactured = products.filter(p => p.status === 'manufactured').length;
    const distributed = products.filter(p => p.status === 'distributed').length;
    const retail = products.filter(p => p.status === 'retail').length;
    const sold = products.filter(p => p.status === 'sold').length;

    stats.innerHTML = `
        <div class="catalog-stat"><span class="num">${total}</span> Total Products</div>
        <div class="catalog-stat"><span class="num">${manufactured}</span> Manufactured</div>
        <div class="catalog-stat"><span class="num">${distributed}</span> Distributed</div>
        <div class="catalog-stat"><span class="num">${retail}</span> In Retail</div>
        <div class="catalog-stat"><span class="num">${sold}</span> Sold</div>
    `;
}

function filterProducts(status) {
    currentFilter = status;

    // Update chip active state
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');

    renderProducts(filterAndSearch(allProducts));
}

function filterAndSearch(products) {
    let filtered = products;

    // Apply status filter
    if (currentFilter !== 'all') {
        filtered = filtered.filter(p => p.status === currentFilter);
    }

    // Apply search
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    if (query) {
        filtered = filtered.filter(p =>
            p.product_name.toLowerCase().includes(query) ||
            p.product_id.toLowerCase().includes(query) ||
            p.batch_number.toLowerCase().includes(query) ||
            (p.manufacturer_name && p.manufacturer_name.toLowerCase().includes(query))
        );
    }

    return filtered;
}

function renderProducts(products) {
    const grid = document.getElementById('catalogGrid');

    if (products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <div class="icon">📦</div>
                <h3>No products found</h3>
                <p>Try adjusting your search or filter criteria</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = products.map(p => {
        const imgSrc = p.image_url || '/images/default-product.png';
        return `
            <div class="product-card" onclick="showDetail('${p.product_id}')">
                <div class="product-card-img">
                    <img src="${imgSrc}" alt="${p.product_name}" onerror="this.src='/images/default-product.png'">
                    <div class="status-overlay">${getStatusBadge(p.status)}</div>
                    ${p.is_suspicious ? '<div class="suspicious-flag"><span class="badge badge-danger">⚠ Suspicious</span></div>' : ''}
                </div>
                <div class="product-card-body">
                    <h3>${p.product_name}</h3>
                    <div class="product-card-meta">
                        <span><em>ID:</em> ${p.product_id}</span>
                        <span><em>Batch:</em> ${p.batch_number}</span>
                        <span><em>Date:</em> ${p.production_date}</span>
                    </div>
                </div>
                <div class="product-card-footer">
                    <span class="manufacturer">by <strong>${p.manufacturer_name || 'Unknown'}</strong></span>
                    <span style="font-size:0.7rem;color:var(--text-muted)">${formatDate(p.created_at)}</span>
                </div>
            </div>
        `;
    }).join('');
}

async function showDetail(productId) {
    const product = allProducts.find(p => p.product_id === productId);
    if (!product) return;

    const modal = document.getElementById('productModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    title.textContent = product.product_name;

    const imgSrc = product.image_url || '/images/default-product.png';

    body.innerHTML = `
        <div class="detail-grid">
            <div class="detail-img">
                <img src="${imgSrc}" alt="${product.product_name}" onerror="this.src='/images/default-product.png'">
            </div>
            <div class="detail-info">
                <div class="info-item">
                    <div class="info-label">Product ID</div>
                    <div class="info-value">${product.product_id}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Batch Number</div>
                    <div class="info-value">${product.batch_number}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Production Date</div>
                    <div class="info-value">${product.production_date}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Status</div>
                    <div class="info-value">${getStatusBadge(product.status)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Manufacturer</div>
                    <div class="info-value">${product.manufacturer_name || 'Unknown'}</div>
                </div>
                ${product.is_suspicious ? '<div class="alert alert-warning">⚠ This product has been flagged as suspicious</div>' : ''}
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('productModal').classList.add('hidden');
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        closeModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});
