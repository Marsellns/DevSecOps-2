const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'db', 'data.sqlite');
const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'schema.sql');

let db = null;
let dbReady = null;

function initDatabase() {
    if (dbReady) return dbReady;

    dbReady = initSqlJs().then(SQL => {
        try {
            if (fs.existsSync(DB_PATH)) {
                const buffer = fs.readFileSync(DB_PATH);
                db = new SQL.Database(buffer);
            } else {
                db = new SQL.Database();
            }
        } catch (e) {
            db = new SQL.Database();
        }

        // Run schema
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
        db.run(schema);

        // Migration: add status column if missing (backward compatible)
        try {
            db.run("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected'))");
        } catch (e) {
            // Column already exists, ignore
        }
        // Always ensure existing seed users are set to approved
        try {
            db.run("UPDATE users SET status = 'approved' WHERE status IS NULL OR (status = 'pending' AND username IN ('admin', 'manufacturer', 'distributor', 'retailer', 'customer'))");
        } catch (e) {
            // ignore
        }

        // Seed default users for all roles
        const defaultUsers = [
            { username: 'admin',        password: 'admin123',    role: 'admin' },
            { username: 'manufacturer', password: 'mfr123456',   role: 'manufacturer' },
            { username: 'distributor',  password: 'dist123456',  role: 'distributor' },
            { username: 'retailer',     password: 'ret123456',   role: 'retailer' },
            { username: 'customer',     password: 'cust123456',  role: 'customer' },
        ];

        for (const u of defaultUsers) {
            const existing = db.exec(`SELECT user_id FROM users WHERE username = '${u.username}'`);
            if (existing.length === 0 || existing[0].values.length === 0) {
                const hash = bcrypt.hashSync(u.password, 10);
                db.run("INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, 'approved')", [u.username, hash, u.role]);
                console.log(`✓ Default user created: ${u.username} / ${u.password} (${u.role})`);
            }
        }

        saveDb();
        return db;
    });

    return dbReady;
}

function getDb() {
    if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
    return db;
}

function saveDb() {
    if (!db) return;
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
}

// Helper: run a query that modifies data (INSERT/UPDATE/DELETE)
function dbRun(sql, params = []) {
    db.run(sql, params);
    saveDb();
    return { lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0].values[0][0] };
}

// Helper: get a single row
function dbGet(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    let result = null;
    if (stmt.step()) {
        const cols = stmt.getColumnNames();
        const vals = stmt.get();
        result = {};
        cols.forEach((col, i) => { result[col] = vals[i]; });
    }
    stmt.free();
    return result;
}

// Helper: get all rows
function dbAll(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    const cols = stmt.getColumnNames();
    while (stmt.step()) {
        const vals = stmt.get();
        const row = {};
        cols.forEach((col, i) => { row[col] = vals[i]; });
        results.push(row);
    }
    stmt.free();
    return results;
}

module.exports = { initDatabase, getDb, dbRun, dbGet, dbAll, saveDb };
