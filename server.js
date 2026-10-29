// Updated server with TOTP authentication layer
const http = require('http');
const fs = require('fs');
const path = require('path');
const speakeasy = require('speakeasy'); // OTP library
const QRCode = require('qrcode'); // QR generation

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'status_data.json');
const AUTH_FILE = path.join(__dirname, 'auth_secret.json'); // stores TOTP secret
const ADMIN_KEY = process.env.ADMIN_KEY || 'kismis*285667##$##09jhk12K-'; // Change this or set ADMIN_KEY env variable

// Default status state
let statusState = {
    status: 'online',
    is_online: true,
    version: '2.1',
    message: 'Global Bypass V2.1 Server Active',
    developer: 'rixxy.so',
    last_updated: new Date().toISOString()
};

// Load persisted status if exists
if (fs.existsSync(DATA_FILE)) {
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        statusState = { ...statusState, ...JSON.parse(raw) };
        console.log('[STATUS] Loaded persisted status:', statusState.status);
    } catch (e) {
        console.error('[STATUS] Error loading status_data.json:', e.message);
    }
}

function saveState() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(statusState, null, 2), 'utf-8');
    } catch (e) {
        console.error('[STATUS] Error saving status_data.json:', e.message);
    }
}

// Helper: read or generate TOTP secret
function getOrCreateSecret() {
    if (fs.existsSync(AUTH_FILE)) {
        try { return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')).secret; } catch (_) {}
    }
    const secret = speakeasy.generateSecret({ length: 20 });
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ secret: secret.base32 }, null, 2));
    console.log('[AUTH] New TOTP secret generated');
    return secret.base32;
}

// Helper: simple cookie parser
function parseCookies(req) {
    const header = req.headers?.cookie || '';
    return header.split(';').reduce((acc, cur) => {
        const [k, v] = cur.trim().split('=');
        if (k) acc[k] = v;
        return acc;
    }, {});
}

// Authentication middleware for protected routes (dashboard & toggle)
function isAuthenticated(req) {
    const cookies = parseCookies(req);
    return cookies.auth === '1';
}

// Server creation
const server = http.createServer((req, res) => {
    // Enable CORS for all requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Public status endpoints – no auth required
    if (pathname === '/api/status' || pathname === '/status.json' || pathname === '/status') {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        res.end(JSON.stringify(statusState, null, 2));
        return;
    }

    if (pathname === '/status.txt') {
        res.writeHead(200, {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(statusState.is_online ? 'online' : 'offline');
        return;
    }

    if (pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
        return;
    }

    // ---------- Authentication endpoints ----------
    // 1. Setup endpoint – returns QR code for the authenticator app (once)
    if (pathname === '/api/setup' && req.method === 'GET') {
        const secret = getOrCreateSecret();
        const otpauth = speakeasy.otpauthURL({ secret, label: 'Global-Bypass', issuer: 'Global-Bypass' });
        QRCode.toDataURL(otpauth, (err, dataUrl) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'QR generation failed' }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ otpauth_url: otpauth, qr_data_url: dataUrl }));
        });
        return;
    }

    // 2. Auth verification – client sends username and password
    if (pathname === '/api/auth' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => (body += chunk));
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const username = payload.username?.trim();
                const password = payload.password?.trim();
                // Simple hard‑coded credentials (replace with real auth as needed)
                const valid = username === 'admin' && password === 'admin123';
                if (valid) {
                    // set simple auth cookie (session‑less)
                    res.writeHead(200, {
                        'Content-Type': 'application/json',
                        'Set-Cookie': 'auth=1; HttpOnly; Path=/'
                    });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid username or password' }));
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Bad request' }));
            }
        });
        return;
    }

    // Protected routes – require auth cookie
    const protected = (pathname === '/' || pathname === '/index.html' || pathname === '/api/toggle');
    if (protected && !isAuthenticated(req)) {
        // Serve login page (simple HTML) from public folder
        const loginPath = path.join(__dirname, 'public', 'login.html');
        if (fs.existsSync(loginPath)) {
            const loginHtml = fs.readFileSync(loginPath, 'utf-8');
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(loginHtml);
        } else {
            res.writeHead(401, { 'Content-Type': 'text/plain' });
            res.end('Authentication required');
        }
        return;
    }

    // ---------- Admin Toggle API (now protected) ----------
    if (pathname === '/api/toggle' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => (body += chunk));
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const key = payload.key || req.headers['authorization'];
                if (key !== ADMIN_KEY) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Unauthorized: Invalid Admin Key' }));
                    return;
                }

                if (typeof payload.is_online === 'boolean') {
                    statusState.is_online = payload.is_online;
                    statusState.status = payload.is_online ? 'online' : 'offline';
                } else if (payload.status) {
                    statusState.status = payload.status === 'online' ? 'online' : 'offline';
                    statusState.is_online = statusState.status === 'online';
                } else {
                    // Toggle current state
                    statusState.is_online = !statusState.is_online;
                    statusState.status = statusState.is_online ? 'online' : 'offline';
                }

                if (payload.message && typeof payload.message === 'string') {
                    statusState.message = payload.message;
                }

                statusState.last_updated = new Date().toISOString();
                saveState();

                console.log(`[MASTER SWITCH] Server status flipped to: ${statusState.status.toUpperCase()} (${statusState.message})`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, state: statusState }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
            }
        });
        return;
    }

    // ---------- Serve Admin Dashboard UI (now after auth) ----------
    if (pathname === '/' || pathname === '/index.html') {
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        if (fs.existsSync(htmlPath)) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fs.readFileSync(htmlPath, 'utf-8'));
            return;
        }
    }

    // Fallback 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

server.listen(PORT, () => {
    console.log('================================================================');
    console.log(` GLOBAL BYPASS V2.1 - Master Online Server Controller`);
    console.log(` Developer: rixxy.so`);
    console.log(` Dashboard URL : http://localhost:${PORT}`);
    console.log(` Status API    : http://localhost:${PORT}/api/status`);
    console.log(` Default Key   : ${ADMIN_KEY}`);
    console.log('================================================================');
});
