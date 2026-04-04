// email.js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '$0';
  const hasCents = Math.abs(amount % 1) > 0.000001;
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

async function sendApprovalEmail(submission, recommendation, token) {
  const approveUrl = `${BASE_URL}/api/approvals/decide?token=${token}&action=approve`;
  const denyUrl    = `${BASE_URL}/api/approvals/decide?token=${token}&action=deny`;
  const formattedAmount = formatCurrency(submission.parsed_amount);

  const btnStyle = `display:inline-block;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none;`;

  await resend.emails.send({
    from: 'ExI Approvals <approvals@resend.dev>',
    to: process.env.FINANCE_EMAIL,
    subject: `[Action Required] Expense Request — ${submission.parsed_name} — ${formattedAmount}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:2rem">
        <h2 style="color:#0f172a">Expense Pre-Approval Request</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem">
          <tr><td style="padding:6px 0;color:#64748b;width:140px">Employee</td><td><strong>${submission.parsed_name}</strong> (${submission.parsed_department})</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Purpose</td><td>${submission.parsed_purpose}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Amount</td><td><strong>${formattedAmount}</strong></td></tr>
        </table>
        <div style="background:#f8fafc;border-radius:8px;padding:1.25rem;margin-bottom:1.5rem">
          <h3 style="margin:0 0 0.75rem;color:#0f172a">Recommendation</h3>
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

async function sendExpenseReportPdfEmail({ to, filename, pdfBuffer, counts, filters }) {
  const filterBits = [];
  if (filters?.employee) filterBits.push(`Employee: ${filters.employee}`);
  if (Array.isArray(filters?.departments) && filters.departments.length) {
    filterBits.push(`Departments: ${filters.departments.join(', ')}`);
  }
  if (filters?.date_start) filterBits.push(`From: ${filters.date_start}`);
  if (filters?.date_end) filterBits.push(`To: ${filters.date_end}`);
  const filterText = filterBits.length ? filterBits.join(' | ') : 'No filters applied';

  await resend.emails.send({
    from: 'ExI Reports <approvals@resend.dev>',
    to,
    subject: `Expense request PDF (${counts?.pending || 0} pending, ${counts?.completed || 0} completed)`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:2rem">
        <h2 style="color:#0f172a;margin:0 0 0.5rem">Expense Request Report</h2>
        <p style="color:#334155;margin:0 0 0.9rem">Attached is your generated PDF report.</p>
        <ul style="margin:0;padding-left:1.2rem;color:#334155">
          <li><strong>Pending requests:</strong> ${Number(counts?.pending) || 0}</li>
          <li><strong>Completed requests:</strong> ${Number(counts?.completed) || 0}</li>
        </ul>
        <p style="margin-top:1rem;font-size:0.85rem;color:#64748b">${filterText}</p>
      </div>
    `,
    attachments: [
      {
        filename: filename || 'expense-request-report.pdf',
        content: Buffer.from(pdfBuffer).toString('base64'),
      },
    ],
  });
}

module.exports = { sendApprovalEmail, sendExpenseReportPdfEmail };
