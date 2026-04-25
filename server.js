const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// ─── FILE PATHS ───────────────────────────────────────────
const PRICES_FILE = path.join(__dirname, 'prices.json');
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// ─── EMAIL CONFIG ─────────────────────────────────────────
const SENDER_EMAIL    = 'jaynglissick@gmail.com';
const SENDER_PASSWORD = 'vqxgrjvumqiijptk';
const OWNER_EMAILS    = ['519314@bsd48.org', '495547@bsd48.org'];

// ─── DEFAULT PRICES ───────────────────────────────────────
const DEFAULT_PRICES = {
  tb1: 2.49, tb2: 2.49, tb3: 2.99, tb4: 3.49, tb5: 2.99,
  tb6: 2.29, tb7: 5.49, tb8: 5.99, tb9: 4.49,
  tb10: 4.49, tb11: 5.99, tb12: 4.99, tb13: 5.79,
  tb14: 5.99, tb15: 2.99, tb16: 2.99, tb17: 5.49,
  tb18: 2.99, tb19: 2.49, tb20: 1.99,
  tb21: 1.99, tb22: 6.99
};

// ─── HELPERS ──────────────────────────────────────────────
function readJSON(file, fallback) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {}
  return fallback;
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ─── NODEMAILER ───────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: SENDER_EMAIL, pass: SENDER_PASSWORD },
});

// ══════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// GET prices — returns { tb1: 2.49, tb2: 2.49, ... }
app.get('/api/prices', (req, res) => {
  const prices = readJSON(PRICES_FILE, DEFAULT_PRICES);
  res.json(prices);
});

// POST prices — update one or many prices { tb1: 3.99, ... }
app.post('/api/prices', (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ success: false, error: 'Invalid data' });
  }
  const current = readJSON(PRICES_FILE, DEFAULT_PRICES);
  for (const [id, price] of Object.entries(incoming)) {
    const parsed = parseFloat(price);
    if (!isNaN(parsed) && parsed >= 0) current[id] = parsed;
  }
  writeJSON(PRICES_FILE, current);
  console.log('✅ Prices updated:', Object.keys(incoming).join(', '));
  res.json({ success: true, prices: current });
});

// GET orders
app.get('/api/orders', (req, res) => {
  const orders = readJSON(ORDERS_FILE, []);
  res.json(orders);
});

// POST new order
app.post('/api/orders', async (req, res) => {
  const { order } = req.body;
  if (!order) return res.status(400).json({ success: false, error: 'No order data' });

  const orders = readJSON(ORDERS_FILE, []);
  order.status = 'new';
  order.time   = order.time || new Date().toLocaleString();
  orders.unshift(order);
  writeJSON(ORDERS_FILE, orders);
  console.log(`📦 New order: ${order.id} — $${order.total}`);

  // Send email
  const itemRows = order.items.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;">${i.name}</td>
      <td style="padding:10px 4px;border-bottom:1px solid #1a1a1a;text-align:center;color:#666;">×${i.qty}</td>
      <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;text-align:right;color:#d4a843;font-weight:bold;">$${(i.price*i.qty).toFixed(2)}</td>
    </tr>`).join('');

  const html = `
  <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:580px;margin:0 auto;background:#0a0a0a;color:#f0ebe2;border-radius:12px;overflow:hidden;border:1px solid #222;">
    <div style="background:#d4a843;padding:28px 32px;">
      <div style="font-size:11px;letter-spacing:4px;font-weight:700;color:#000;margin-bottom:6px;text-transform:uppercase;">Apex Delivery</div>
      <div style="font-size:26px;font-weight:900;color:#000;letter-spacing:1px;">New Order 🔔</div>
    </div>
    <div style="padding:28px 32px;">
      <table style="width:100%;margin-bottom:24px;border-collapse:collapse;">
        <tr><td style="color:#555;font-size:11px;letter-spacing:2px;text-transform:uppercase;padding-bottom:4px;">Order ID</td><td style="color:#d4a843;font-size:20px;font-weight:900;letter-spacing:2px;">${order.id}</td></tr>
        <tr><td style="color:#555;font-size:11px;letter-spacing:2px;text-transform:uppercase;padding-top:8px;">Time</td><td style="color:#aaa;font-size:13px;">${order.time}</td></tr>
      </table>
      <div style="background:#111;border-radius:8px;padding:20px;margin-bottom:20px;">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#555;margin-bottom:14px;">Customer</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#555;font-size:12px;padding:4px 0;width:80px;">Name</td><td style="font-size:14px;font-weight:600;">${order.customer}</td></tr>
          <tr><td style="color:#555;font-size:12px;padding:4px 0;">Email</td><td style="font-size:14px;">${order.email}</td></tr>
          <tr><td style="color:#555;font-size:12px;padding:4px 0;">Phone</td><td style="font-size:14px;">${order.phone}</td></tr>
          <tr><td style="color:#555;font-size:12px;padding:4px 0;">Address</td><td style="font-size:14px;font-weight:700;color:#f0ebe2;">${order.address}</td></tr>
          ${order.notes ? `<tr><td style="color:#555;font-size:12px;padding:4px 0;">Notes</td><td style="font-size:14px;color:#aaa;font-style:italic;">${order.notes}</td></tr>` : ''}
        </table>
      </div>
      <div style="background:#111;border-radius:8px;padding:20px;margin-bottom:20px;">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#555;margin-bottom:14px;">Items</div>
        <table style="width:100%;border-collapse:collapse;">${itemRows}
          <tr>
            <td colspan="2" style="padding:14px 0 0;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Total</td>
            <td style="padding:14px 0 0;text-align:right;font-size:28px;font-weight:900;color:#d4a843;">$${order.total.toFixed(2)}</td>
          </tr>
        </table>
      </div>
      <div style="background:#d4a843;border-radius:8px;padding:14px 20px;text-align:center;color:#000;font-weight:800;font-size:14px;letter-spacing:2px;text-transform:uppercase;">
        💵 Payment: Cash on Delivery
      </div>
    </div>
    <div style="background:#050505;padding:14px 32px;text-align:center;color:#333;font-size:11px;letter-spacing:2px;">
      APEX DELIVERY · ORDER MANAGEMENT
    </div>
  </div>`;

  try {
    await transporter.sendMail({
      from:    `"Apex Delivery" <${SENDER_EMAIL}>`,
      to:      OWNER_EMAILS.join(', '),
      subject: `🔔 New Order ${order.id} — $${order.total.toFixed(2)} — ${order.customer}`,
      html,
    });
    console.log(`✅ Email sent for ${order.id}`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Email failed:', err.message);
    res.json({ success: true, emailError: err.message }); // still confirm order
  }
});

// PATCH order status
app.patch('/api/orders/:id', (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;
  const orders     = readJSON(ORDERS_FILE, []);
  const idx        = orders.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Order not found' });
  orders[idx].status = status;
  writeJSON(ORDERS_FILE, orders);
  console.log(`📋 Order ${id} → ${status}`);
  res.json({ success: true, order: orders[idx] });
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'running', ts: Date.now() }));

// ══════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Apex Delivery server → http://localhost:${PORT}`);
  console.log(`   Prices file: ${PRICES_FILE}`);
  console.log(`   Orders file: ${ORDERS_FILE}`);
});
