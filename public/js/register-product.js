let selectedImageDataUrl = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;
    renderSidebar('register');
    loadProducts();

    // Image preview handler
    document.getElementById('productImage').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                selectedImageDataUrl = ev.target.result;
                document.getElementById('previewImg').src = selectedImageDataUrl;
                document.getElementById('imagePreview').style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            selectedImageDataUrl = null;
            document.getElementById('imagePreview').style.display = 'none';
        }
    });

    const form = document.getElementById('productForm');
    const btn = document.getElementById('registerBtn');
    const alertContainer = document.getElementById('alertContainer');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Registering...';

        const payload = {
            product_name: document.getElementById('productName').value.trim(),
            batch_number: document.getElementById('batchNumber').value.trim(),
            production_date: document.getElementById('productionDate').value,
        };

        // Include image if uploaded
        if (selectedImageDataUrl) {
            payload.image_url = selectedImageDataUrl;
        }

        const result = await apiRequest('/products', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        if (result && result.ok) {
            const product = result.data.product;

            // Show result card
            document.getElementById('resultCard').style.display = '';
            document.getElementById('qrDisplay').innerHTML = `<img src="${product.qr_code}" alt="QR Code for ${product.product_id}">`;
            document.getElementById('signatureDisplay').textContent = product.signature;
            document.getElementById('productInfo').innerHTML = `
                <div class="info-item">
                    <div class="info-label">Product ID</div>
                    <div class="info-value">${product.product_id}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Product Name</div>
                    <div class="info-value">${product.product_name}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Batch Number</div>
                    <div class="info-value">${product.batch_number}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Production Date</div>
                    <div class="info-value">${product.production_date}</div>
                </div>
            `;

            showAlert(alertContainer, 'success', `Product ${product.product_id} registered successfully!`);
            form.reset();
            selectedImageDataUrl = null;
            document.getElementById('imagePreview').style.display = 'none';
            loadProducts();
        } else {
            const msg = result?.data?.error || result?.data?.errors?.[0]?.msg || 'Registration failed';
            showAlert(alertContainer, 'danger', msg);
        }

        btn.disabled = false;
        btn.innerHTML = '🔒 Register & Generate QR Code';
    });
});

async function loadProducts() {
    const result = await apiRequest('/products');
    const tbody = document.getElementById('productsTable');

    if (result && result.ok) {
        if (result.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:40px;color:var(--text-muted)">No products registered yet</td></tr>';
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
