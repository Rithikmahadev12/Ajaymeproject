// ═══════════════════════════════════════════════════════════
//  APEX DELIVERY — Node.js Backend
//  Sends order confirmation emails to both owners via Resend
// ═══════════════════════════════════════════════════════════
//
//  SETUP INSTRUCTIONS:
//  1. Make sure Node.js is installed (https://nodejs.org)
//  2. In this folder, run:
//       npm install
//  3. Sign up FREE at https://resend.com (no credit card needed)
//  4. Go to API Keys → Create Key → copy it
//  5. Paste it below where it says YOUR_RESEND_API_KEY
//  6. Start the server:
//       npm start
//  7. Open http://localhost:3000 in your browser
//
// ═══════════════════════════════════════════════════════════

const express = require('express');
const { Resend } = require('resend');
const cors    = require('cors');
const path    = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// ── Serve the HTML file at the root URL ──────────────────
app.use(express.static(path.join(__dirname), { index: 'apex-delivery.html' }));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'apex-delivery.html'));
});

// ── CONFIG — only thing you need to change ───────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY || 'YOUR_RESEND_API_KEY'; // ← set this in Render environment variables

const OWNER_EMAILS = [
  '519314@bsd48.org',
  '495547@bsd48.org',
];
// ─────────────────────────────────────────────────────────

const resend = new Resend(RESEND_API_KEY);

// ── POST /send-order ─────────────────────────────────────
app.post('/send-order', async (req, res) => {
  const { order } = req.body;

  if (!order) {
    return res.status(400).json({ success: false, error: 'No order data provided' });
  }

  const itemLines = order.items
    .map(i => `<tr style="border-bottom:1px solid #222;">
      <td style="padding:8px 0;">${i.name}</td>
      <td style="color:#888;text-align:center;padding:8px 4px;">x ${i.qty}</td>
      <td style="text-align:right;color:#c9a84c;font-weight:bold;padding:8px 0;">$${(i.price * i.qty).toFixed(2)}</td>
    </tr>`).join('');

  const htmlBody = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#f5f0e8;border-radius:10px;overflow:hidden;">
    <div style="background:#c9a84c;padding:20px 30px;">
      <h1 style="margin:0;font-size:26px;color:#111;letter-spacing:3px;">APEX DELIVERY</h1>
      <p style="margin:4px 0 0;color:#333;font-size:13px;letter-spacing:2px;text-transform:uppercase;">New Order Received</p>
    </div>
    <div style="padding:24px 30px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding:4px 0;">Order ID</td>
          <td style="font-weight:bold;color:#c9a84c;font-size:18px;padding:4px 0;">${order.id}</td>
        </tr>
        <tr>
          <td style="color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding:4px 0;">Time</td>
          <td style="padding:4px 0;">${order.time}</td>
        </tr>
      </table>

      <h3 style="color:#c9a84c;border-bottom:1px solid #333;padding-bottom:8px;margin-bottom:12px;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Customer</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="color:#888;font-size:12px;width:80px;padding:3px 0;">Name</td><td style="padding:3px 0;">${order.customer}</td></tr>
        <tr><td style="color:#888;font-size:12px;padding:3px 0;">Email</td><td style="padding:3px 0;">${order.email}</td></tr>
        <tr><td style="color:#888;font-size:12px;padding:3px 0;">Phone</td><td style="padding:3px 0;">${order.phone || 'Not provided'}</td></tr>
        <tr><td style="color:#888;font-size:12px;padding:3px 0;">Address</td><td style="padding:3px 0;font-weight:600;">${order.address}</td></tr>
        ${order.notes ? `<tr><td style="color:#888;font-size:12px;padding:3px 0;">Notes</td><td style="padding:3px 0;color:#ccc;">${order.notes}</td></tr>` : ''}
      </table>

      <h3 style="color:#c9a84c;border-bottom:1px solid #333;padding-bottom:8px;margin-bottom:12px;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Items Ordered</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        ${itemLines}
        <tr>
          <td colspan="2" style="padding:12px 0;font-size:16px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Total</td>
          <td style="text-align:right;color:#c9a84c;font-size:22px;font-weight:bold;padding:12px 0;">$${order.total.toFixed(2)}</td>
        </tr>
      </table>

      <div style="background:#1a1a1a;border:1px solid #c9a84c;border-radius:6px;padding:12px 16px;text-align:center;color:#c9a84c;font-weight:bold;letter-spacing:1px;">
        PAYMENT: CASH ON DELIVERY
      </div>
    </div>
    <div style="background:#0a0a0a;padding:12px 30px;text-align:center;color:#444;font-size:11px;">
      Apex Delivery · Order Management System
    </div>
  </div>`;

  try {
    console.log('Attempting to send email to:', OWNER_EMAILS);
    console.log('Using API key starting with:', RESEND_API_KEY.substring(0, 8));

    const response = await resend.emails.send({
      from:    'onboarding@resend.dev',
      to:      OWNER_EMAILS,
      subject: `New Order ${order.id} - $${order.total.toFixed(2)} - ${order.customer}`,
      html:    htmlBody,
    });

    console.log('Resend full response:', JSON.stringify(response));

    if (response.error) {
      console.error('Resend returned error:', JSON.stringify(response.error));
      return res.status(500).json({ success: false, error: response.error });
    }

    console.log('Email sent successfully! ID:', response.data?.id);
    res.json({ success: true, id: response.data?.id });
  } catch (err) {
    console.error('Email send EXCEPTION:', err.message);
    console.error('Full error:', JSON.stringify(err));
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Health check ─────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'Apex Delivery server running' }));

// ── Start ─────────────────────────────────────────────────
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   APEX DELIVERY SERVER RUNNING      ║
  ║   http://localhost:${PORT}              ║
  ╚══════════════════════════════════════╝
  `);
});
