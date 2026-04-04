// email.js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

async function sendApprovalEmail(submission, recommendation, token) {
  const approveUrl = `${BASE_URL}/api/approvals/decide?token=${token}&action=approve`;
  const denyUrl    = `${BASE_URL}/api/approvals/decide?token=${token}&action=deny`;

  const btnStyle = `display:inline-block;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;text-decoration:none;`;

  await resend.emails.send({
    from: 'ExI <onboarding@resend.dev>',
    to: process.env.FINANCE_EMAIL,
    subject: `[Action Required] ExI — Expense Request from ${submission.parsed_name} — $${submission.parsed_amount}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:2rem">
        <h2 style="color:#0f172a">Expense Pre-Approval Request</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem">
          <tr><td style="padding:6px 0;color:#64748b;width:140px">Employee</td><td><strong>${submission.parsed_name}</strong> (${submission.parsed_department})</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Purpose</td><td>${submission.parsed_purpose}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Amount</td><td><strong>$${submission.parsed_amount}</strong></td></tr>
        </table>
        <div style="background:#f8fafc;border-radius:8px;padding:1.25rem;margin-bottom:1.5rem">
          <h3 style="margin:0 0 0.75rem;color:#0f172a">AI Recommendation</h3>
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

async function sendViolationNoticeEmail(violation, employeeEmail) {
  const sevMap = { high: 'High Priority', med: 'Medium Priority', low: 'Low Priority' };
  const sevLabel = sevMap[violation.severity] || violation.severity;
  const reasoningText = violation.note || violation.ai_reasoning || '';

  await resend.emails.send({
    from: 'ExI Compliance <onboarding@resend.dev>',
    to: employeeEmail,
    subject: `Expense Review Request — ${violation.merchant || 'Transaction'} on ${violation.date || 'recent date'}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:2rem">
        <h2 style="color:#0f172a;margin-bottom:0.25rem">Expense Policy Review</h2>
        <p style="color:#64748b;margin-top:0;font-size:0.875rem">ExI Compliance · ${new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <p style="color:#334155">Hi ${violation.employee_name},</p>
        <p style="color:#334155;line-height:1.6">
          We're following up on a transaction that was flagged during our recent expense review.
          We'd appreciate a brief explanation — or if it's easier, we can set up a quick call to sort it out together.
        </p>

        <table style="width:100%;border-collapse:collapse;margin:1.5rem 0;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
          <tr style="background:#f8fafc">
            <td style="padding:10px 14px;color:#64748b;font-size:0.875rem;width:130px;border-bottom:1px solid #e2e8f0">Merchant</td>
            <td style="padding:10px 14px;font-weight:600;border-bottom:1px solid #e2e8f0">${violation.merchant || '—'}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;color:#64748b;font-size:0.875rem;border-bottom:1px solid #e2e8f0">Amount</td>
            <td style="padding:10px 14px;font-weight:600;border-bottom:1px solid #e2e8f0">$${Number(violation.amount || 0).toFixed(2)}</td>
          </tr>
          <tr style="background:#f8fafc">
            <td style="padding:10px 14px;color:#64748b;font-size:0.875rem;border-bottom:1px solid #e2e8f0">Date</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0">${violation.date || '—'}</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;color:#64748b;font-size:0.875rem;border-bottom:1px solid #e2e8f0">Priority</td>
            <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0">${sevLabel}</td>
          </tr>
          ${violation.rule_text ? `
          <tr style="background:#f8fafc">
            <td style="padding:10px 14px;color:#64748b;font-size:0.875rem;vertical-align:top">Policy</td>
            <td style="padding:10px 14px;font-size:0.875rem;color:#475569;line-height:1.5">${violation.rule_text}</td>
          </tr>` : ''}
        </table>

        ${reasoningText ? `
        <div style="background:#fff7ed;border-left:3px solid #f97316;padding:0.85rem 1rem;margin-bottom:1.5rem;border-radius:0 6px 6px 0">
          <p style="margin:0 0 0.25rem;font-size:0.75rem;font-weight:600;color:#9a3412;text-transform:uppercase;letter-spacing:0.04em">Note from review</p>
          <p style="margin:0;font-size:0.875rem;color:#7c2d12;line-height:1.5">${reasoningText}</p>
        </div>` : ''}

        <p style="color:#334155;line-height:1.6">
          Please reply to this email with any context that would help us resolve this quickly.
          We're happy to accommodate a brief meeting if that works better.
          Thanks for your understanding — we appreciate your cooperation.
        </p>

        <p style="color:#94a3b8;font-size:0.75rem;margin-top:2rem;border-top:1px solid #e2e8f0;padding-top:1rem">
          ExI · Brim Financial Expense Intelligence
        </p>
      </div>
    `,
  });
}

module.exports = { sendApprovalEmail, sendViolationNoticeEmail };
