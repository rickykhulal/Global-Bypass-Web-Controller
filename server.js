const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'status_data.json');
const ADMIN_KEY = process.env.ADMIN_KEY || 'rixxy123'; // Change this or set ADMIN_KEY env variable

// Default status state
let statusState = {
    status: 'online',
    is_online: true,
    version: '2.1',
    message: 'Global Bypass V2.1 Server Active',
    developer: 'rixxy.so',
    last_updated: new Date().toISOString()
};

// Load persisted state if exists
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

    // --- Public API Endpoints ---
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

    // --- Admin Toggle API ---
    if (pathname === '/api/toggle' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
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
                    statusState.is_online = (statusState.status === 'online');
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

    // --- Serve Admin Dashboard UI ---
    if (pathname === '/' || pathname === '/index.html') {
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        if (fs.existsSync(htmlPath)) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fs.readFileSync(htmlPath, 'utf-8'));
            return;
        }
    }

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
