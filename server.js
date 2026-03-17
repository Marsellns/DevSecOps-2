require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { initDatabase } = require('./src/database');
const { generalLimiter } = require('./src/middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '10mb' }));
app.use(generalLimiter);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/verify', require('./src/routes/verify'));
app.use('/api/supply-chain', require('./src/routes/supplyChain'));
app.use('/api/admin', require('./src/routes/admin'));

// SPA fallback — serve index.html for non-API routes
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Initialize database, then start server
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🔐 Secure Product Verification System`);
        console.log(`   Server running at http://localhost:${PORT}`);
        console.log(`   Default admin: admin / admin123\n`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
