const QRCode = require('qrcode');

async function generateQRCode(data) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    const dataUrl = await QRCode.toDataURL(payload, {
        width: 300,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
    });
    return dataUrl;
}

module.exports = { generateQRCode };
