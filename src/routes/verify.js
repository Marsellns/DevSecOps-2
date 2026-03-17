const express = require('express');
const { body, validationResult } = require('express-validator');
const { dbRun, dbGet } = require('../database');
const { generateSignature } = require('../utils/hmac');
const { logAction } = require('../middleware/auth');

const router = express.Router();

// POST /api/verify — Verify a product
router.post('/', [
    body('product_id').trim().notEmpty().withMessage('Product ID required'),
    body('signature').trim().notEmpty().withMessage('Signature required'),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { product_id, signature } = req.body;
    const ip = req.ip;

    try {
        const product = dbGet('SELECT * FROM products WHERE product_id = ?', [product_id]);

        if (!product) {
            logAction(null, 'VERIFICATION_FAILED', `Product not found: ${product_id}`, ip);
            return res.json({
                status: 'invalid',
                message: 'Product not found in database',
                product_id,
            });
        }

        // Check for suspicious activity (>3 scans in 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const recentScans = dbGet(
            'SELECT COUNT(*) as count FROM verification_attempts WHERE product_id = ? AND timestamp > ?',
            [product_id, fiveMinutesAgo]
        );

        // Record this attempt
        dbRun('INSERT INTO verification_attempts (product_id, ip_address) VALUES (?, ?)', [product_id, ip]);

        if (recentScans && recentScans.count >= 3) {
            // Mark as suspicious
            dbRun('UPDATE products SET is_suspicious = 1 WHERE product_id = ?', [product_id]);
            logAction(null, 'SUSPICIOUS_ACTIVITY', `Product ${product_id} scanned ${recentScans.count + 1} times in 5 min`, ip);

            return res.json({
                status: 'suspicious',
                message: 'This product has been scanned multiple times in a short period. It has been flagged for review.',
                product_id,
                product_name: product.product_name,
            });
        }

        // Recalculate HMAC signature
        const signatureData = {
            productId: product.product_id,
            product_name: product.product_name,
            batch_number: product.batch_number,
            production_date: product.production_date,
        };
        const expectedSignature = generateSignature(signatureData);

        if (signature === expectedSignature) {
            logAction(null, 'VERIFICATION_SUCCESS', `Product ${product_id} verified as authentic`, ip);
            return res.json({
                status: 'valid',
                message: 'Product is authentic',
                product_id,
                product_name: product.product_name,
                batch_number: product.batch_number,
                production_date: product.production_date,
                current_status: product.status,
            });
        } else {
            logAction(null, 'VERIFICATION_FAILED', `Product ${product_id} signature mismatch`, ip);
            return res.json({
                status: 'invalid',
                message: 'Product signature does not match. This may be a counterfeit product.',
                product_id,
            });
        }
    } catch (err) {
        logAction(null, 'SYSTEM_ERROR', err.message, ip);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
