const crypto = require('crypto');

function generateSignature(data) {
    const secret = process.env.HMAC_SECRET;
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifySignature(data, signature) {
    const expected = generateSignature(data);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

module.exports = { generateSignature, verifySignature };
