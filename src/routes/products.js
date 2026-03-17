const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { dbRun, dbGet, dbAll } = require('../database');
const { authenticateToken, authorize, logAction } = require('../middleware/auth');
const { generateSignature } = require('../utils/hmac');
const { generateQRCode } = require('../utils/qrcode');

const router = express.Router();

// Default product images (used when no image uploaded)
const DEFAULT_IMAGES = [
    '/images/default-product.png',
    '/images/product-watch.png',
    '/images/product-sneaker.png',
];

// GET /api/products/catalog — Public product catalog (no auth required)
router.get('/catalog', (req, res) => {
    try {
        const products = dbAll(
            `SELECT p.product_id, p.product_name, p.batch_number, p.production_date, 
                    p.status, p.image_url, p.is_suspicious, p.created_at,
                    u.username as manufacturer_name
             FROM products p 
             LEFT JOIN users u ON p.manufacturer_id = u.user_id 
             ORDER BY p.created_at DESC`
        );
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/products — Register a new product (manufacturer only)
router.post('/', authenticateToken, authorize('admin'), [
    body('product_name').trim().notEmpty().withMessage('Product name required'),
    body('batch_number').trim().notEmpty().withMessage('Batch number required'),
    body('production_date').trim().notEmpty().withMessage('Production date required'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { product_name, batch_number, production_date, image_url } = req.body;

    try {
        const productId = 'PRD-' + uuidv4().substring(0, 8).toUpperCase();

        // Generate HMAC-SHA256 signature
        const signatureData = { productId, product_name, batch_number, production_date };
        const signature = generateSignature(signatureData);

        // Generate QR code
        const qrData = JSON.stringify({ product_id: productId, signature });
        const qrCode = await generateQRCode(qrData);

        // Use uploaded image or pick a random default
        const finalImage = image_url || DEFAULT_IMAGES[Math.floor(Math.random() * DEFAULT_IMAGES.length)];

        // Save to database
        dbRun(
            `INSERT INTO products (product_id, product_name, batch_number, production_date, signature, qr_code, image_url, manufacturer_id, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manufactured')`,
            [productId, product_name, batch_number, production_date, signature, qrCode, finalImage, req.user.userId]
        );

        // Add supply chain record
        dbRun(
            `INSERT INTO supply_chain (product_id, actor, actor_id, status) VALUES (?, ?, ?, 'manufactured')`,
            [productId, req.user.username, req.user.userId]
        );

        logAction(req.user.userId, 'PRODUCT_REGISTERED', `Product ${productId} registered`, req.ip);

        res.status(201).json({
            message: 'Product registered successfully',
            product: {
                product_id: productId,
                product_name,
                batch_number,
                production_date,
                signature,
                qr_code: qrCode,
                image_url: finalImage,
            },
        });
    } catch (err) {
        logAction(req.user.userId, 'SYSTEM_ERROR', err.message, req.ip);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/products — List products
router.get('/', authenticateToken, (req, res) => {
    try {
        const products = dbAll('SELECT product_id, product_name, batch_number, production_date, status, image_url, is_suspicious, created_at FROM products ORDER BY created_at DESC');
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/products/:id — Single product detail (public)
router.get('/:id', (req, res) => {
    try {
        const product = dbGet('SELECT * FROM products WHERE product_id = ?', [req.params.id]);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
