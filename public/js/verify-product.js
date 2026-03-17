let qrScanner = null;

document.addEventListener('DOMContentLoaded', () => {
    renderPublicNav('verify');
    initQRScanner();

    document.getElementById('verifyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const productId = document.getElementById('productId').value.trim();
        const signature = document.getElementById('signature').value.trim();
        await verifyProduct(productId, signature);
    });
});

function switchTab(tab) {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(t => t.classList.remove('active'));

    if (tab === 'scan') {
        tabs[0].classList.add('active');
        document.getElementById('scanTab').classList.remove('hidden');
        document.getElementById('manualTab').classList.add('hidden');
        initQRScanner();
    } else {
        tabs[1].classList.add('active');
        document.getElementById('scanTab').classList.add('hidden');
        document.getElementById('manualTab').classList.remove('hidden');
        stopQRScanner();
    }
}

function initQRScanner() {
    if (qrScanner) return;

    try {
        qrScanner = new Html5Qrcode('qrReader');
        qrScanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            async (decodedText) => {
                try {
                    const data = JSON.parse(decodedText);
                    if (data.product_id && data.signature) {
                        stopQRScanner();
                        await verifyProduct(data.product_id, data.signature);
                    }
                } catch (e) {
                    // Not our QR format
                }
            },
            (errorMessage) => { /* ignore scan errors */ }
        ).catch(err => {
            document.getElementById('qrReader').innerHTML = `
                <div class="empty-state" style="padding:40px">
                    <div class="icon">📷</div>
                    <h3>Camera not available</h3>
                    <p>Use manual input tab to verify products</p>
                </div>
            `;
            qrScanner = null;
        });
    } catch (e) {
        qrScanner = null;
    }
}

function stopQRScanner() {
    if (qrScanner) {
        try {
            qrScanner.stop().then(() => { qrScanner = null; }).catch(() => { qrScanner = null; });
        } catch (e) {
            qrScanner = null;
        }
    }
}

async function verifyProduct(productId, signature) {
    const resultDiv = document.getElementById('verificationResult');
    resultDiv.innerHTML = '<div class="text-center" style="padding:40px"><span class="spinner"></span><p class="mt-2" style="color:var(--text-muted)">Verifying...</p></div>';

    const result = await apiRequest('/verify', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, signature }),
    });

    if (result && result.ok) {
        const data = result.data;
        const icons = { valid: '✅', invalid: '❌', suspicious: '⚠️' };
        const titles = { valid: 'Authentic Product', invalid: 'Verification Failed', suspicious: 'Suspicious Activity' };

        let detailsHtml = '';
        if (data.status === 'valid') {
            detailsHtml = `
                <div class="product-info mt-3" style="text-align:left">
                    <div class="info-item">
                        <div class="info-label">Product ID</div>
                        <div class="info-value">${data.product_id}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Product Name</div>
                        <div class="info-value">${data.product_name}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Batch Number</div>
                        <div class="info-value">${data.batch_number}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Current Status</div>
                        <div class="info-value">${getStatusBadge(data.current_status)}</div>
                    </div>
                </div>
            `;
        }

        resultDiv.innerHTML = `
            <div class="verification-result ${data.status}">
                <div class="verification-icon">${icons[data.status]}</div>
                <h2>${titles[data.status]}</h2>
                <p>${data.message}</p>
                ${detailsHtml}
                <button class="btn btn-secondary mt-3" onclick="resetVerification()">Verify Another</button>
            </div>
        `;
    } else {
        resultDiv.innerHTML = `
            <div class="verification-result invalid">
                <div class="verification-icon">❌</div>
                <h2>Error</h2>
                <p>${result?.data?.error || 'Could not verify product'}</p>
                <button class="btn btn-secondary mt-3" onclick="resetVerification()">Try Again</button>
            </div>
        `;
    }
}

function resetVerification() {
    document.getElementById('verificationResult').innerHTML = '';
    document.getElementById('productId').value = '';
    document.getElementById('signature').value = '';
}
