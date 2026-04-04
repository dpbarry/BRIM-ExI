// email.js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

async function sendApprovalEmail(submission, recommendation, token) {
  const approveUrl = `${BASE_URL}/api/approvals/decide?token=${token}&action=approve`;
  const denyUrl    = `${BASE_URL}/api/approvals/decide?token=${token}&action=deny`;

  const btnStyle = `display:inline-block;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none;`;

  await resend.emails.send({
    from: 'ExI Approvals <approvals@resend.dev>',
    to: process.env.FINANCE_EMAIL,
    subject: `[Action Required] Expense Request — ${submission.parsed_name} — $${submission.parsed_amount}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:2rem">
        <h2 style="color:#0f172a">Expense Pre-Approval Request</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem">
          <tr><td style="padding:6px 0;color:#64748b;width:140px">Employee</td><td><strong>${submission.parsed_name}</strong> (${submission.parsed_department})</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Purpose</td><td>${submission.parsed_purpose}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Amount</td><td><strong>$${submission.parsed_amount}</strong></td></tr>
        </table>
        <div style="background:#f8fafc;border-radius:8px;padding:1.25rem;margin-bottom:1.5rem">
          <h3 style="margin:0 0 0.75rem;color:#0f172a">AI Analysis</h3>
          <p style="margin:0;white-space:pre-wrap;color:#334155">${recommendation}</p>
        </div>
        <div style="display:flex;gap:12px">
          <a href="${approveUrl}" style="${btnStyle}background:#16a34a;color:#fff">&#10003; Approve</a>
          <a href="${denyUrl}"    style="${btnStyle}background:#dc2626;color:#fff">&#10007; Deny</a>
        </div>
        <p style="margin-top:1.5rem;font-size:0.75rem;color:#94a3b8">
          Or open the <a href="${BASE_URL}">ExI web app</a> to review with fresh context.
        </p>
      </div>
    `,
  });
}

module.exports = { sendApprovalEmail };
