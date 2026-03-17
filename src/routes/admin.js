const express = require('express');
const { dbRun, dbGet, dbAll } = require('../database');
const { authenticateToken, authorize, logAction } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/users — List all users
router.get('/users', authenticateToken, authorize('admin'), (req, res) => {
    try {
        const users = dbAll('SELECT user_id, username, role, status, created_at FROM users ORDER BY created_at DESC');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/pending-users — List pending users
router.get('/pending-users', authenticateToken, authorize('admin'), (req, res) => {
    try {
        const users = dbAll("SELECT user_id, username, role, created_at FROM users WHERE status = 'pending' ORDER BY created_at ASC");
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/admin/users/:id/approve — Approve a pending user
router.put('/users/:id/approve', authenticateToken, authorize('admin'), (req, res) => {
    const userId = parseInt(req.params.id);

    try {
        const user = dbGet('SELECT username, role, status FROM users WHERE user_id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.status === 'approved') {
            return res.status(400).json({ error: 'User is already approved' });
        }

        dbRun("UPDATE users SET status = 'approved' WHERE user_id = ?", [userId]);
        logAction(req.user.userId, 'USER_APPROVED', `Approved user: ${user.username} (${user.role})`, req.ip);

        res.json({ message: `User "${user.username}" berhasil di-approve` });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/admin/users/:id/reject — Reject a pending user
router.put('/users/:id/reject', authenticateToken, authorize('admin'), (req, res) => {
    const userId = parseInt(req.params.id);

    try {
        const user = dbGet('SELECT username, role, status FROM users WHERE user_id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.status === 'rejected') {
            return res.status(400).json({ error: 'User is already rejected' });
        }

        dbRun("UPDATE users SET status = 'rejected' WHERE user_id = ?", [userId]);
        logAction(req.user.userId, 'USER_REJECTED', `Rejected user: ${user.username} (${user.role})`, req.ip);

        res.json({ message: `User "${user.username}" telah ditolak` });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/admin/users/:id — Delete user
router.delete('/users/:id', authenticateToken, authorize('admin'), (req, res) => {
    const userId = parseInt(req.params.id);

    if (userId === req.user.userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    try {
        const user = dbGet('SELECT username FROM users WHERE user_id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        dbRun('DELETE FROM users WHERE user_id = ?', [userId]);
        logAction(req.user.userId, 'USER_DELETED', `Deleted user: ${user.username}`, req.ip);

        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/logs — View audit logs
router.get('/logs', authenticateToken, authorize('admin'), (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    try {
        const logs = dbAll(
            'SELECT l.*, u.username FROM audit_log l LEFT JOIN users u ON l.user_id = u.user_id ORDER BY l.timestamp DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );

        const total = dbGet('SELECT COUNT(*) as count FROM audit_log');

        res.json({
            logs,
            pagination: {
                page,
                limit,
                total: total.count,
                pages: Math.ceil(total.count / limit),
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/suspicious — List suspicious products
router.get('/suspicious', authenticateToken, authorize('admin'), (req, res) => {
    try {
        const products = dbAll(
            'SELECT product_id, product_name, batch_number, status, created_at FROM products WHERE is_suspicious = 1 ORDER BY created_at DESC'
        );
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/admin/stats — Dashboard statistics
router.get('/stats', authenticateToken, (req, res) => {
    try {
        const totalProducts = dbGet('SELECT COUNT(*) as count FROM products');
        const verifiedCount = dbGet('SELECT COUNT(DISTINCT product_id) as count FROM verification_attempts');
        const suspiciousCount = dbGet('SELECT COUNT(*) as count FROM products WHERE is_suspicious = 1');
        const pendingUsers = dbGet("SELECT COUNT(*) as count FROM users WHERE status = 'pending'");
        const recentLogs = dbAll(
            'SELECT l.*, u.username FROM audit_log l LEFT JOIN users u ON l.user_id = u.user_id ORDER BY l.timestamp DESC LIMIT 10'
        );

        res.json({
            totalProducts: totalProducts ? totalProducts.count : 0,
            verifiedCount: verifiedCount ? verifiedCount.count : 0,
            suspiciousCount: suspiciousCount ? suspiciousCount.count : 0,
            pendingUsers: pendingUsers ? pendingUsers.count : 0,
            recentLogs,
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
