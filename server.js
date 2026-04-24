const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');
const path       = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname), { index: 'apex-delivery.html' }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'apex-delivery.html'));
});

// ── CONFIG ───────────────────────────────────────────────
const SENDER_EMAIL    = 'jaynglissick@gmail.com';
const SENDER_PASSWORD = 'vqxgrjvumqiijptk';

const OWNER_EMAILS = [
  '519314@bsd48.org',
  '495547@bsd48.org',
];
// ─────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SENDER_EMAIL,
    pass: SENDER_PASSWORD,
  },
});

app.post('/send-order', async (req, res) => {
  const { order } = req.body;
  if (!order) return res.status(400).json({ success: false, error: 'No order data' });

  const itemRows = order.items.map(i => `
    <tr style="border-bottom:1px solid #222;">
      <td style="padding:8px 0;">${i.name}</td>
      <td style="color:#888;text-align:center;padding:8px 4px;">x ${i.qty}</td>
      <td style="text-align:right;color:#c9a84c;font-weight:bold;padding:8px 0;">$${(i.price * i.qty).toFixed(2)}</td>
    </tr>`).join('');

  const htmlBody = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f5f0e8;border-radius:10px;overflow:hidden;">
    <div style="background:#c9a84c;padding:20px 30px;">
      <h1 style="margin:0;font-size:26px;color:#111;letter-spacing:3px;">APEX DELIVERY</h1>
      <p style="margin:4px 0 0;color:#333;font-size:13px;letter-spacing:2px;text-transform:uppercase;">🔔 New Order Received</p>
    </div>
    <div style="padding:24px 30px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="color:#888;font-size:12px;padding:4px 0;">Order ID</td><td style="color:#c9a84c;font-size:18px;font-weight:bold;">${order.id}</td></tr>
        <tr><td style="color:#888;font-size:12px;padding:4px 0;">Time</td><td>${order.time}</td></tr>
      </table>
      <h3 style="color:#c9a84c;border-bottom:1px solid #333;padding-bottom:8px;margin-bottom:12px;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Customer</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="color:#888;font-size:12px;width:80px;padding:3px 0;">Name</td><td>${order.customer}</td></tr>
        <tr><td style="color:#888;font-size:12px;padding:3px 0;">Email</td><td>${order.email}</td></tr>
        <tr><td style="color:#888;font-size:12px;padding:3px 0;">Phone</td><td>${order.phone || 'Not provided'}</td></tr>
        <tr><td style="color:#888;font-size:12px;padding:3px 0;">Address</td><td style="font-weight:600;">${order.address}</td></tr>
        ${order.notes ? `<tr><td style="color:#888;font-size:12px;padding:3px 0;">Notes</td><td>${order.notes}</td></tr>` : ''}
      </table>
      <h3 style="color:#c9a84c;border-bottom:1px solid #333;padding-bottom:8px;margin-bottom:12px;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Items</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        ${itemRows}
        <tr>
          <td colspan="2" style="padding:12px 0;font-size:16px;font-weight:bold;">TOTAL</td>
          <td style="text-align:right;color:#c9a84c;font-size:22px;font-weight:bold;">$${order.total.toFixed(2)}</td>
        </tr>
      </table>
      <div style="background:#1a1a1a;border:1px solid #c9a84c;border-radius:6px;padding:12px;text-align:center;color:#c9a84c;font-weight:bold;">
        💵 PAYMENT: CASH ON DELIVERY
      </div>
    </div>
    <div style="background:#0a0a0a;padding:12px 30px;text-align:center;color:#444;font-size:11px;">
      Apex Delivery · Order Management System
    </div>
  </div>`;

  try {
    await transporter.sendMail({
      from: `"Apex Delivery" <${SENDER_EMAIL}>`,
      to:   OWNER_EMAILS.join(', '),
      subject: `🔔 New Order ${order.id} - $${order.total.toFixed(2)} - ${order.customer}`,
      html: htmlBody,
    });
    console.log(`✅ Email sent for order ${order.id}`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Email failed:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'running' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Apex Delivery server running on port ${PORT}`));
