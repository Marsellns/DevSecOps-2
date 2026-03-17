const express = require('express');
const { dbRun, dbGet, dbAll } = require('../database');
const { authenticateToken, authorize, logAction } = require('../middleware/auth');

const router = express.Router();

const VALID_TRANSITIONS = {
    'manufactured': { next: 'distributed', roles: ['distributor', 'admin'] },
    'distributed': { next: 'sold', roles: ['distributor', 'admin'] },
};

// POST /api/supply-chain/:productId — Update product status
router.post('/:productId', authenticateToken, authorize('distributor', 'admin'), (req, res) => {
    const { productId } = req.params;

    try {
        const product = dbGet('SELECT * FROM products WHERE product_id = ?', [productId]);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const transition = VALID_TRANSITIONS[product.status];
        if (!transition) {
            return res.status(400).json({ error: `Product cannot transition from status: ${product.status}` });
        }

        if (!transition.roles.includes(req.user.role)) {
            return res.status(403).json({ error: `Role '${req.user.role}' cannot perform this transition` });
        }

        // Update product status
        dbRun('UPDATE products SET status = ? WHERE product_id = ?', [transition.next, productId]);

        // Add supply chain record
        dbRun(
            'INSERT INTO supply_chain (product_id, actor, actor_id, status) VALUES (?, ?, ?, ?)',
            [productId, req.user.username, req.user.userId, transition.next]
        );

        logAction(req.user.userId, 'SUPPLY_CHAIN_UPDATE', `Product ${productId}: ${product.status} → ${transition.next}`, req.ip);

        res.json({
            message: 'Product status updated',
            product_id: productId,
            previous_status: product.status,
            new_status: transition.next,
        });
    } catch (err) {
        logAction(req.user.userId, 'SYSTEM_ERROR', err.message, req.ip);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/supply-chain/:productId — Get product supply chain history
router.get('/:productId', authenticateToken, (req, res) => {
    try {
        const history = dbAll(
            'SELECT * FROM supply_chain WHERE product_id = ? ORDER BY timestamp ASC',
            [req.params.productId]
        );

        if (history.length === 0) {
            return res.status(404).json({ error: 'No supply chain records found' });
        }

        res.json(history);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/supply-chain — List all products with status for supply chain view
router.get('/', authenticateToken, authorize('distributor', 'admin'), (req, res) => {
    try {
        const products = dbAll(
            'SELECT product_id, product_name, batch_number, status, created_at FROM products ORDER BY created_at DESC'
        );
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
