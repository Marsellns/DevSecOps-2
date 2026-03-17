const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { dbRun, dbGet } = require('../database');
const { authenticateToken, authorize, logAction } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// POST /api/auth/login
router.post('/login', authLimiter, [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    const ip = req.ip;

    try {
        const user = dbGet('SELECT * FROM users WHERE username = ?', [username]);

        if (!user || !bcrypt.compareSync(password, user.password_hash)) {
            logAction(null, 'LOGIN_FAILED', `Failed login attempt for: ${username}`, ip);
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Check account status
        if (user.status === 'pending') {
            logAction(user.user_id, 'LOGIN_BLOCKED', `Pending account login attempt: ${username}`, ip);
            return res.status(403).json({ error: 'Akun Anda masih menunggu persetujuan admin. Silakan tunggu.' });
        }
        if (user.status === 'rejected') {
            logAction(user.user_id, 'LOGIN_BLOCKED', `Rejected account login attempt: ${username}`, ip);
            return res.status(403).json({ error: 'Akun Anda telah ditolak oleh admin.' });
        }

        const token = jwt.sign(
            { userId: user.user_id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        logAction(user.user_id, 'LOGIN_SUCCESS', `User ${username} logged in`, ip);

        res.json({
            token,
            user: {
                userId: user.user_id,
                username: user.username,
                role: user.role,
            },
        });
    } catch (err) {
        logAction(null, 'SYSTEM_ERROR', err.message, ip);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/register-public — Public registration (no auth required)
router.post('/register-public', authLimiter, [
    body('username').trim().isLength({ min: 3 }).withMessage('Username minimal 3 karakter'),
    body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
    body('role').isIn(['distributor', 'customer']).withMessage('Role tidak valid'),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, role } = req.body;
    const ip = req.ip;

    try {
        const existing = dbGet('SELECT user_id FROM users WHERE username = ?', [username]);
        if (existing) {
            return res.status(409).json({ error: 'Username sudah digunakan' });
        }

        // Customer gets instant approval, others need admin approval
        const status = role === 'customer' ? 'approved' : 'pending';
        const hash = bcrypt.hashSync(password, 10);

        dbRun('INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)', [username, hash, role, status]);

        logAction(null, 'USER_REGISTERED', `New registration: ${username} (${role}) — status: ${status}`, ip);

        if (status === 'approved') {
            res.status(201).json({ message: 'Registrasi berhasil! Silakan login.' });
        } else {
            res.status(201).json({ message: 'Registrasi berhasil! Akun Anda perlu diverifikasi oleh admin sebelum bisa login.' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/register (admin only)
router.post('/register', authenticateToken, authorize('admin'), [
    body('username').trim().isLength({ min: 3 }).withMessage('Username min 3 chars'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('role').isIn(['admin', 'distributor', 'customer']).withMessage('Invalid role'),
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, role } = req.body;

    try {
        const existing = dbGet('SELECT user_id FROM users WHERE username = ?', [username]);
        if (existing) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const hash = bcrypt.hashSync(password, 10);
        const result = dbRun('INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)', [username, hash, role, 'approved']);

        logAction(req.user.userId, 'USER_CREATED', `Created user: ${username} (${role})`, req.ip);

        res.status(201).json({
            message: 'User created successfully',
            userId: result.lastInsertRowid,
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
    const user = dbGet('SELECT user_id, username, role, created_at FROM users WHERE user_id = ?', [req.user.userId]);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
});

module.exports = router;
