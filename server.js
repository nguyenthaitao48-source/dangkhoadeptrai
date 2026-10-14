/**
 * KHOASMM.COM - Node.js Server & BaoStar API Gateway
 * Multi-User System + Full Admin Control Panel + 20% Profit Margin System
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
// SIMPLE JSON DATABASE (Users, Orders, System Settings)
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
        sessions: {},
        settings: {
          profitMargin: 20, // 20% PROFIT MARGIN OVER BAOSTAR BASE PRICE
          bankName: "MBBank (Quân Đội)",
          bankCode: "MB",
          accountNumber: "0987654321",
          accountName: "LUONG DANG KHOA",
          zalo: "0987654321",
          telegram: "khoasmm",
          announcement: "Chào mừng quý khách đến với KHOASMM.COM - Hệ thống tăng tương tác MXH uy tín tự động 24/7.",
          customPrices: {} // serverId -> customPrice (vnd)
        }
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf8');
      return initialDb;
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(data);
    if (!parsed.settings) {
      parsed.settings = {
        profitMargin: 20,
        bankName: "MBBank (Quân Đội)",
        bankCode: "MB",
        accountNumber: "0987654321",
        accountName: "LUONG DANG KHOA",
        zalo: "0987654321",
        telegram: "khoasmm",
        announcement: "Chào mừng quý khách đến với KHOASMM.COM",
        customPrices: {}
      };
      saveDb(parsed);
    }
    if (!parsed.depositRequests) {
      parsed.depositRequests = [];
      saveDb(parsed);
    }
    return parsed;
  } catch (e) {
    console.error('Error loading DB:', e);
    return { users: {}, orders: [], sessions: {}, settings: { profitMargin: 20, customPrices: {} } };
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

  const readJsonBody = () => new Promise(resolve => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (e) { resolve({}); }
    });
  });

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
  // PUBLIC & SETTINGS APIS
  // =========================================================================

  // Public Settings & Margin Info
  if (url === '/api/public/settings' && req.method === 'GET') {
    const db = loadDb();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      profitMargin: db.settings.profitMargin || 20,
      bankName: db.settings.bankName,
      bankCode: db.settings.bankCode,
      accountNumber: db.settings.accountNumber,
      accountName: db.settings.accountName,
      zalo: db.settings.zalo,
      telegram: db.settings.telegram,
      announcement: db.settings.announcement,
      customPrices: db.settings.customPrices || {}
    }));
    return;
  }

  // =========================================================================
  // AUTHENTICATION APIS (Register, Login, Me, Logout)
  // =========================================================================

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
      balance: 0,
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

  // CUSTOMER SUBMIT DEPOSIT NOTIFICATION: POST /api/user/deposit-notify
  if (url === '/api/user/deposit-notify' && req.method === 'POST') {
    const user = getAuthUser();
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Vui lòng đăng nhập trước khi gửi thông báo nạp tiền!' }));
      return;
    }

    const body = await readJsonBody();
    const amount = parseInt(body.amount) || 0;
    if (amount <= 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Số tiền nạp phải lớn hơn 0 đ!' }));
      return;
    }

    const db = loadDb();
    if (!db.depositRequests) db.depositRequests = [];

    const reqId = 'DEP-' + Math.floor(100000 + Math.random() * 900000);
    const newReq = {
      id: reqId,
      username: user.username,
      name: user.name || user.username,
      amount: amount,
      bank: body.bank || db.settings.bankName || 'MBBank',
      txCode: body.txCode || '',
      note: body.note || '',
      status: 'pending',
      statusText: 'Chờ duyệt',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    db.depositRequests.unshift(newReq);
    saveDb(db);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      message: `Đã gửi thông báo nạp ${amount.toLocaleString('vi-VN')} đ! Admin sẽ kiểm tra và cộng tiền trong 1-3 phút.`,
      request: newReq
    }));
    return;
  }

  // =========================================================================
  // ADMIN CONTROL PANEL APIS (Protected: Admin Only)
  // =========================================================================

  // 1. ADMIN STATS & OVERVIEW: GET /api/admin/overview
  if (url === '/api/admin/overview' && req.method === 'GET') {
    const user = getAuthUser();
    if (!user || user.role !== 'Admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Quyền truy cập bị từ chối! Chỉ dành cho Admin.' }));
      return;
    }

    const db = loadDb();
    const usersList = Object.values(db.users).map(u => {
      const safe = { ...u };
      delete safe.passwordHash;
      return safe;
    });

    let totalRevenue = 0;
    db.orders.forEach(o => { totalRevenue += (o.price || 0); });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      totalUsers: usersList.length,
      totalOrders: db.orders.length,
      totalRevenue: totalRevenue,
      settings: db.settings,
      users: usersList,
      orders: db.orders.slice(0, 50),
      depositRequests: db.depositRequests || []
    }));
    return;
  }

  // 2. ADMIN ADJUST USER BALANCE: POST /api/admin/user/balance
  if (url === '/api/admin/user/balance' && req.method === 'POST') {
    const user = getAuthUser();
    if (!user || user.role !== 'Admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Chỉ Admin mới có quyền thực hiện!' }));
      return;
    }

    const body = await readJsonBody();
    const { targetUsername, action, amount } = body;
    const numAmount = parseInt(amount) || 0;

    const db = loadDb();
    if (!db.users[targetUsername]) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Không tìm thấy người dùng này!' }));
      return;
    }

    if (action === 'add') {
      db.users[targetUsername].balance += numAmount;
      db.users[targetUsername].totalDeposit += numAmount;
    } else if (action === 'deduct') {
      db.users[targetUsername].balance = Math.max(0, db.users[targetUsername].balance - numAmount);
    }

    saveDb(db);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      message: `Đã ${action === 'add' ? 'cộng' : 'trừ'} ${numAmount.toLocaleString('vi-VN')} đ cho ${targetUsername}!`,
      newBalance: db.users[targetUsername].balance
    }));
    return;
  }

  // 3. ADMIN UPDATE SETTINGS & PROFIT MARGIN: POST /api/admin/settings
  if (url === '/api/admin/settings' && req.method === 'POST') {
    const user = getAuthUser();
    if (!user || user.role !== 'Admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Chỉ Admin mới có quyền sửa cài đặt!' }));
      return;
    }

    const body = await readJsonBody();
    const db = loadDb();

    if (body.profitMargin !== undefined) {
      db.settings.profitMargin = parseFloat(body.profitMargin) || 20;
    }
    if (body.bankName) db.settings.bankName = body.bankName;
    if (body.accountNumber) db.settings.accountNumber = body.accountNumber;
    if (body.accountName) db.settings.accountName = body.accountName;
    if (body.zalo) db.settings.zalo = body.zalo;
    if (body.telegram) db.settings.telegram = body.telegram;
    if (body.announcement) db.settings.announcement = body.announcement;

    if (body.customPrices) {
      db.settings.customPrices = { ...db.settings.customPrices, ...body.customPrices };
    }

    saveDb(db);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      message: 'Cập nhật thiết lập & giá chênh lệch thành công!',
      settings: db.settings
    }));
    return;
  }

  // 4. ADMIN UPDATE USER ROLE: POST /api/admin/user/role
  if (url === '/api/admin/user/role' && req.method === 'POST') {
    const user = getAuthUser();
    if (!user || user.role !== 'Admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Chỉ Admin mới có quyền thực hiện!' }));
      return;
    }

    const body = await readJsonBody();
    const { targetUsername, role } = body;
    const db = loadDb();

    if (!db.users[targetUsername]) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Không tìm thấy người dùng này!' }));
      return;
    }

    db.users[targetUsername].role = role || 'Thành viên';
    saveDb(db);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      message: `Đã cập nhật cấp bậc của ${targetUsername} thành ${role}!`,
      newRole: role
    }));
    return;
  }

  // 5. ADMIN UPDATE ORDER STATUS & REFUND: POST /api/admin/order/status
  if (url === '/api/admin/order/status' && req.method === 'POST') {
    const user = getAuthUser();
    if (!user || user.role !== 'Admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Chỉ Admin mới có quyền thực hiện!' }));
      return;
    }

    const body = await readJsonBody();
    const { orderId, newStatus, newStatusText, refund } = body;
    const db = loadDb();

    const order = db.orders.find(o => o.id === orderId);
    if (!order) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Không tìm thấy đơn hàng này!' }));
      return;
    }

    order.status = newStatus || order.status;
    order.statusText = newStatusText || (newStatus === 'completed' ? 'Đã hoàn thành' : (newStatus === 'cancelled' ? 'Đã huỷ & Hoàn tiền' : 'Đang chạy'));

    let refundMsg = '';
    if (refund && order.price > 0 && db.users[order.username]) {
      db.users[order.username].balance += order.price;
      refundMsg = ` & Đã hoàn trả lại ${order.price.toLocaleString('vi-VN')} đ cho ${order.username}`;
    }

    saveDb(db);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      message: `Đơn hàng ${orderId} chuyển sang "${order.statusText}"${refundMsg}!`,
      order
    }));
    return;
  }

  // 6. ADMIN APPROVE OR REJECT DEPOSIT: POST /api/admin/deposit/action
  if (url === '/api/admin/deposit/action' && req.method === 'POST') {
    const user = getAuthUser();
    if (!user || user.role !== 'Admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Chỉ Admin mới có quyền thực hiện!' }));
      return;
    }

    const body = await readJsonBody();
    const { reqId, action } = body;
    const db = loadDb();
    if (!db.depositRequests) db.depositRequests = [];

    const reqItem = db.depositRequests.find(d => d.id === reqId);
    if (!reqItem) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Không tìm thấy yêu cầu nạp tiền này!' }));
      return;
    }

    if (action === 'approve') {
      if (reqItem.status === 'approved') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Yêu cầu này đã được duyệt trước đó rồi!' }));
        return;
      }

      reqItem.status = 'approved';
      reqItem.statusText = 'Đã cộng tiền';

      if (db.users[reqItem.username]) {
        db.users[reqItem.username].balance += reqItem.amount;
        db.users[reqItem.username].totalDeposit += reqItem.amount;
      }

      saveDb(db);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'success',
        message: `Đã duyệt nạp và cộng +${reqItem.amount.toLocaleString('vi-VN')} đ cho ${reqItem.username}!`,
        newBalance: db.users[reqItem.username] ? db.users[reqItem.username].balance : 0
      }));
      return;
    } else if (action === 'reject') {
      reqItem.status = 'rejected';
      reqItem.statusText = 'Đã từ chối';
      saveDb(db);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'success',
        message: `Đã từ chối yêu cầu nạp tiền ${reqId}!`
      }));
      return;
    }
  }

  // =========================================================================
  // ORDERS API
  // =========================================================================

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
      userOrders = db.orders;
    } else {
      userOrders = db.orders.filter(o => o.username === user.username);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ orders: userOrders }));
    return;
  }

  if (url === '/api/orders/create' && req.method === 'POST') {
    const user = getAuthUser();
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Vui lòng đăng nhập để tạo đơn hàng!' }));
      return;
    }

    const body = await readJsonBody();
    const { baostarServiceId, serviceName, serverName, link, quantity, price, notes } = body;

    const qty = parseInt(quantity) || 0;
    const finalPrice = parseInt(price) || 0;

    const db = loadDb();
    const currentUser = db.users[user.username];

    if (currentUser.balance < finalPrice) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Số dư không đủ! Bạn cần nạp thêm ${(finalPrice - currentUser.balance).toLocaleString('vi-VN')} đ.` }));
      return;
    }

    currentUser.balance -= finalPrice;

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
  loadDb();
  console.log(`=======================================================`);
  console.log(`🚀 KHOASMM.COM Server with Admin Control Panel is running!`);
  console.log(`🌐 Local URL:        http://localhost:${PORT}`);
  console.log(`⚡ Connected API:    BaoStar.net (Live v2)`);
  console.log(`💰 Profit Margin:    20% Markup Active`);
  console.log(`👑 Admin Account:    Username: admin | Pass: khoasmm123`);
  console.log(`=======================================================`);
});
