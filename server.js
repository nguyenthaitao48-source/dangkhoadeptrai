/**
 * KHOASMM.COM - Node.js Server & BaoStar API Gateway
 * Integrated with BaoStar API (https://baostar.net/api/v2)
 * API Key: Mzk5NzVub3diZDg1MzBkODRlNzBjMjMyYTkzNmViMGZk
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;

// BAOSTAR PROVIDER CONFIGURATION
const BAOSTAR_CONFIG = {
  apiUrl: 'https://baostar.net/api/v2',
  apiKey: 'Mzk5NzVub3diZDg1MzBkODRlNzBjMjMyYTkzNmViMGZk',
  name: 'BaoStar API'
};

// Helper function to call BaoStar SMM API v2
function callBaoStar(payload) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      key: BAOSTAR_CONFIG.apiKey,
      ...payload
    }).toString();

    const req = https.request(BAOSTAR_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'KhoaSMM-Client/1.0'
      },
      timeout: 10000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ statusCode: res.statusCode, data: parsed, raw: body });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: null, raw: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('BaoStar API Timeout'));
    });

    req.write(postData);
    req.end();
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // =========================================================================
  // BAOSTAR PROXY API ENDPOINTS FOR KHOASMM
  // =========================================================================

  // 1. Check live balance from BaoStar
  if (req.url === '/api/baostar/balance' && req.method === 'GET') {
    try {
      const result = await callBaoStar({ action: 'balance' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 2. Fetch live services from BaoStar
  if (req.url === '/api/baostar/services' && req.method === 'GET') {
    try {
      const result = await callBaoStar({ action: 'services' });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.data));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 3. Place order directly to BaoStar
  if (req.url === '/api/baostar/order' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { service, link, quantity, comments } = payload;

        if (!service || !link || !quantity) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing service, link or quantity' }));
          return;
        }

        const baostarParams = {
          action: 'add',
          service: service,
          link: link,
          quantity: quantity
        };

        if (comments) baostarParams.comments = comments;

        console.log(`[BaoStar Order] Sending to BaoStar: service=${service}, qty=${quantity}, link=${link}`);
        const result = await callBaoStar(baostarParams);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          provider: 'BaoStar',
          response: result.data,
          raw: result.raw
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 4. Check order status on BaoStar
  if (req.url === '/api/baostar/status' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { order } = payload;
        const result = await callBaoStar({ action: 'status', order: order });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.data));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 5. Standard SMM v2 endpoint for KhoaSMM external clients
  if (req.url.startsWith('/api/v2') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const action = payload.action;

        if (action === 'balance') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ balance: "1310", currency: "VND" }));
          return;
        }

        if (action === 'services') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify([
            { service: 16379, name: "Tiktok FollowTây", type: "Default", category: "TikTok", rate: "138.33", min: 100, max: 50000 },
            { service: 16369, name: "S4 Follow TikTok Việt", type: "Default", category: "TikTok", rate: "30.00", min: 100, max: 30000 },
            { service: 16344, name: "Tiktok Follow Tây | KHÔNG BẢO HÀNH", type: "Default", category: "TikTok", rate: "29.73", min: 100, max: 200000 }
          ]));
          return;
        }

        const fakeOrderId = Math.floor(100000 + Math.random() * 900000);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ order: fakeOrderId }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Invalid JSON format" }));
      }
    });
    return;
  }

  // =========================================================================
  // STATIC FILE SERVING
  // =========================================================================
  let safePath = path.normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(BASE_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const indexPath = path.join(BASE_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('File Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
          res.end(content);
        }
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 KHOASMM.COM Server is running!`);
  console.log(`🌐 Local URL:        http://localhost:${PORT}`);
  console.log(`⚡ Connected API:    BaoStar.net (Live v2)`);
  console.log(`🔑 Key:              ${BAOSTAR_CONFIG.apiKey.slice(0, 8)}...${BAOSTAR_CONFIG.apiKey.slice(-4)}`);
  console.log(`=======================================================`);
});
