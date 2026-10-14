/**
 * KHOASMM.COM - Node.js Server & BaoStar API Gateway
 * Integrated Multi-User Authentication & Database System
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;
const DB_FILE = path.join(BASE_DIR, 'data_store.json');

// BAOSTAR PROVIDER CONFIGURATION
const BAOSTAR_CONFIG = {
  apiUrl: 'https://baostar.net/api/v2',
  apiKey: 'Mzk5NzVub3diZDg1MzBkODRlNzBjMjMyYTkzNmViMGZk',
  name: 'BaoStar API'
};

// =========================================================================
// SIMPLE JSON DATABASE (Users & Orders)
// =========================================================================
function loadDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialDb = {
        users: {
          "admin": {
            username: "admin",
            name: "Lương Đặng Khoa (Admin)",
            email: "khoaprono1@gmail.com",
            passwordHash: hashPassword("khoasmm123"),
            balance: 1000000,
            totalDeposit: 133059931,
            role: "Admin",
            createdAt: "2021-04-01 19:27:50"
          }
        },
        orders: [],
        sessions: {}
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf8');
      return initialDb;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error loading DB:', e);
    return { users: {}, orders: [], sessions: {} };
  }
}

function saveDb(db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving DB:', e);
  }
}

function hashPassword(pass) {
  return crypto.createHash('sha256').update(pass + 'khoasmm_salt_2026').digest('hex');
}

// Call BaoStar SMM API v2
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

    req.on('error', (err) => reject(err));
    req.on('timeout', () => { req.destroy(); reject(new Error('BaoStar API Timeout')); });
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Token');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  // Helper to read JSON body
  const readJsonBody = () => new Promise(resolve => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (e) { resolve({}); }
    });
  });

  // Helper to get authenticated user
  const getAuthUser = () => {
    const token = req.headers['x-user-token'] || req.headers['authorization'];
    if (!token) return null;
    const cleanToken = token.replace('Bearer ', '').trim();
    const db = loadDb();
    const username = db.sessions[cleanToken];
    if (username && db.users[username]) {
      return db.users[username];
    }
    return null;
  };

  // =========================================================================
  // AUTHENTICATION APIS (Register, Login, Me, Logout)
  // =========================================================================

  // 1. REGISTER: POST /api/auth/register
  if (url === '/api/auth/register' && req.method === 'POST') {
    const body = await readJsonBody();
    const { username, email, password, name } = body;

    if (!username || !password || username.length < 3) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Tên đăng nhập phải có ít nhất 3 ký tự!' }));
      return;
    }

    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    const db = loadDb();

    if (db.users[cleanUsername]) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Tên đăng nhập này đã có người sử dụng!' }));
      return;
    }

    const newUser = {
      username: cleanUsername,
      name: name || cleanUsername,
      email: email || `${cleanUsername}@gmail.com`,
      passwordHash: hashPassword(password),
      balance: 0, // NEW USERS START AT 0 VND!
      totalDeposit: 0,
      role: 'Thành viên',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    const token = 'token_' + crypto.randomBytes(16).toString('hex');
    db.users[cleanUsername] = newUser;
    db.sessions[token] = cleanUsername;
    saveDb(db);

    const safeUser = { ...newUser };
    delete safeUser.passwordHash;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', user: safeUser, token: token }));
    return;
  }

  // 2. LOGIN: POST /api/auth/login
  if (url === '/api/auth/login' && req.method === 'POST') {
    const body = await readJsonBody();
    const { username, password } = body;

    if (!username || !password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu!' }));
      return;
    }

    const cleanUsername = username.toLowerCase().trim();
    const db = loadDb();
    const user = db.users[cleanUsername];

    if (!user || user.passwordHash !== hashPassword(password)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Sai tên đăng nhập hoặc mật khẩu!' }));
      return;
    }

    const token = 'token_' + crypto.randomBytes(16).toString('hex');
    db.sessions[token] = cleanUsername;
    saveDb(db);

    const safeUser = { ...user };
    delete safeUser.passwordHash;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', user: safeUser, token: token }));
    return;
  }

  // 3. GET CURRENT USER PROFILE: GET /api/auth/me
  if (url === '/api/auth/me' && req.method === 'GET') {
    const user = getAuthUser();
    if (!user) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ authenticated: false, user: null }));
      return;
    }
    const safeUser = { ...user };
    delete safeUser.passwordHash;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ authenticated: true, user: safeUser }));
    return;
  }

  // 4. USER DEPOSIT (Simulator / Admin Add Money): POST /api/user/deposit
  if (url === '/api/user/deposit' && req.method === 'POST') {
    const user = getAuthUser();
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Vui lòng đăng nhập trước khi nạp tiền!' }));
      return;
    }

    const body = await readJsonBody();
    const amount = parseInt(body.amount) || 50000;

    const db = loadDb();
    db.users[user.username].balance += amount;
    db.users[user.username].totalDeposit += amount;
    saveDb(db);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      newBalance: db.users[user.username].balance,
      totalDeposit: db.users[user.username].totalDeposit
    }));
    return;
  }

  // =========================================================================
  // ORDERS API
  // =========================================================================

  // 5. USER ORDERS LIST: GET /api/orders/my-orders
  if (url === '/api/orders/my-orders' && req.method === 'GET') {
    const user = getAuthUser();
    if (!user) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ orders: [] }));
      return;
    }
    const db = loadDb();
    let userOrders = [];
    if (user.role === 'Admin') {
      userOrders = db.orders; // Admin sees all orders
    } else {
      userOrders = db.orders.filter(o => o.username === user.username);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ orders: userOrders }));
    return;
  }

  // 6. CREATE ORDER: POST /api/orders/create
  if (url === '/api/orders/create' && req.method === 'POST') {
    const user = getAuthUser();
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Vui lòng đăng nhập để tạo đơn hàng!' }));
      return;
    }

    const body = await readJsonBody();
    const { serviceId, baostarServiceId, serviceName, serverName, link, quantity, price, notes } = body;

    const qty = parseInt(quantity) || 0;
    const finalPrice = parseInt(price) || 0;

    const db = loadDb();
    const currentUser = db.users[user.username];

    // Check balance
    if (currentUser.balance < finalPrice) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Số dư không đủ! Bạn cần nạp thêm ${(finalPrice - currentUser.balance).toLocaleString('vi-VN')} đ.` }));
      return;
    }

    // Deduct user balance
    currentUser.balance -= finalPrice;

    // Create Order Record
    const orderId = `KHOA-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);

    const newOrder = {
      id: orderId,
      username: currentUser.username,
      serviceName: serviceName || 'Dịch vụ MXH',
      serverName: serverName || 'Máy chủ',
      target: link,
      quantity: qty,
      price: finalPrice,
      status: 'running',
      statusText: 'Đang chạy',
      createdAt: dateStr,
      notes: notes || '',
      baostarOrderId: null
    };

    // Forward to BaoStar if service ID is present
    if (baostarServiceId) {
      try {
        const baostarRes = await callBaoStar({
          action: 'add',
          service: baostarServiceId,
          link: link,
          quantity: qty
        });

        if (baostarRes.data && baostarRes.data.order) {
          newOrder.baostarOrderId = baostarRes.data.order;
          newOrder.notes += ` (BaoStar #${baostarRes.data.order})`;
          newOrder.statusText = 'Đang chạy (BaoStar)';
        } else if (baostarRes.data && baostarRes.data.error) {
          newOrder.status = 'processing';
          newOrder.statusText = 'Chờ xử lý';
          newOrder.notes += ` [BaoStar: ${baostarRes.data.error}]`;
        }
      } catch (err) {
        console.error('BaoStar Forward error:', err);
      }
    }

    db.orders.unshift(newOrder);
    saveDb(db);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      order: newOrder,
      newBalance: currentUser.balance
    }));
    return;
  }

  // 7. Check live balance from BaoStar
  if (url === '/api/baostar/balance' && req.method === 'GET') {
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
  loadDb(); // Ensure db is initialized
  console.log(`=======================================================`);
  console.log(`🚀 KHOASMM.COM Server with Multi-User Auth is running!`);
  console.log(`🌐 Local URL:        http://localhost:${PORT}`);
  console.log(`⚡ Connected API:    BaoStar.net (Live v2)`);
  console.log(`=======================================================`);
});
