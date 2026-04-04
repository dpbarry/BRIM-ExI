const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const PDFDocument = require('pdfkit');
const { parseReportFilters } = require('../ai/reports');
const { sendExpenseReportPdfEmail } = require('../email');

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

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

function sanitizeEmail(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw;
}

function parseDepartments(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

function buildWhereClause(filters, employeeIds) {
  const where = [];
  const params = [];

  if (employeeIds.length > 0) {
    where.push(`s.employee_id IN (${employeeIds.map(() => '?').join(',')})`);
    params.push(...employeeIds);
  }

  if (filters.departments.length > 0) {
    where.push(`COALESCE(NULLIF(s.parsed_department, ''), e.department) IN (${filters.departments.map(() => '?').join(',')})`);
    params.push(...filters.departments);
  }

  if (isIsoDate(filters.date_start)) {
    where.push(`date(s.created_at) >= ?`);
    params.push(filters.date_start);
  }

  if (isIsoDate(filters.date_end)) {
    where.push(`date(s.created_at) <= ?`);
    params.push(filters.date_end);
  }

  return { whereClause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

function resolveEmployeeIds(db, explicitEmployeeId, parsedEmployeeNames) {
  const ids = new Set();
  const numeric = Number(explicitEmployeeId);
  if (Number.isInteger(numeric) && numeric > 0) ids.add(numeric);

  const names = Array.isArray(parsedEmployeeNames) ? parsedEmployeeNames : [];
  if (!names.length) return [...ids];

  const all = db.prepare(`SELECT id, name FROM employees`).all();
  for (const name of names) {
    const needle = String(name || '').trim().toLowerCase();
    if (!needle) continue;
    const match = all.find((e) => String(e.name || '').trim().toLowerCase() === needle)
      || all.find((e) => String(e.name || '').trim().toLowerCase().includes(needle));
    if (match?.id) ids.add(match.id);
  }
  return [...ids];
}

function buildRows(db, filters, employeeIds, statusMode) {
  const { whereClause, params } = buildWhereClause(filters, employeeIds);
  const statusClause = statusMode === 'pending'
    ? `s.status = 'pending'`
    : `s.status IN ('approved', 'denied')`;
  const combinedWhere = whereClause
    ? `${whereClause} AND ${statusClause}`
    : `WHERE ${statusClause}`;
  return db.prepare(`
    SELECT
      s.id,
      s.status,
      s.parsed_name,
      s.parsed_department,
      s.parsed_purpose,
      s.parsed_amount,
      s.created_at,
      s.decided_at,
      e.name AS emp_name,
      e.department AS emp_dept
    FROM submissions s
    LEFT JOIN employees e ON s.employee_id = e.id
    ${combinedWhere}
    ORDER BY datetime(s.created_at) DESC
  `).all(...params);
}

function normalizeFilters(payload, parsed = {}) {
  const parsedDepartments = Array.isArray(parsed.departments) ? parsed.departments : [];
  const explicitDepartments = parseDepartments(payload.departments);
  const departments = explicitDepartments.length ? explicitDepartments : parsedDepartments;

  const date_start = isIsoDate(payload.date_start) ? payload.date_start : (isIsoDate(parsed.date_start) ? parsed.date_start : '');
  const date_end = isIsoDate(payload.date_end) ? payload.date_end : (isIsoDate(parsed.date_end) ? parsed.date_end : '');

  return {
    prompt: String(payload.prompt || '').trim(),
    employee_id: Number(payload.employee_id) || null,
    employee_names: Array.isArray(parsed.employee_names) ? parsed.employee_names : [],
    departments,
    date_start,
    date_end,
    notes: String(parsed.notes || '').trim(),
  };
}

function drawRequestTable(doc, rows, title, includeStatus) {
  doc.fontSize(16).fillColor('#0f172a').text(title);
  doc.moveDown(0.35);

  if (!rows.length) {
    doc.fontSize(11).fillColor('#64748b').text('No requests in this section.');
    doc.moveDown(1.1);
    return;
  }

  rows.forEach((row, idx) => {
    if (doc.y > 710) doc.addPage();
    const employee = row.emp_name || row.parsed_name || 'Unknown';
    const department = row.emp_dept || row.parsed_department || 'Unknown';
    const status = String(row.status || '').trim() || 'pending';
    const date = String(row.created_at || '').slice(0, 10);
    const purpose = row.parsed_purpose || '—';
    const amount = formatCurrency(row.parsed_amount);
    const line1 = `${idx + 1}. ${employee} · ${department} · ${date}`;
    const line2 = includeStatus
      ? `${status.toUpperCase()} · ${amount}`
      : `PENDING · ${amount}`;

    doc.fontSize(11).fillColor('#111827').text(line1);
    doc.fontSize(10).fillColor('#334155').text(line2);
    doc.fontSize(10).fillColor('#475569').text(purpose, { width: 500 });
    doc.moveDown(0.8);
  });

  doc.moveDown(0.4);
}

function buildPdfBuffer({ pendingRows, completedRows, filters }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 46 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const now = new Date();
    const reportDate = now.toISOString().slice(0, 10);
    const filterBits = [];
    if (filters.employee_label) filterBits.push(`Employee: ${filters.employee_label}`);
    if (filters.departments.length) filterBits.push(`Departments: ${filters.departments.join(', ')}`);
    if (filters.date_start) filterBits.push(`From: ${filters.date_start}`);
    if (filters.date_end) filterBits.push(`To: ${filters.date_end}`);
    const filterText = filterBits.length ? filterBits.join(' | ') : 'No filters applied';

    doc.fontSize(24).fillColor('#0f172a').text('Expense Request Report');
    doc.moveDown(0.2);
    doc.fontSize(11).fillColor('#475569').text(`Generated: ${reportDate}`);
    doc.fontSize(10).fillColor('#64748b').text(filterText, { width: 510 });
    doc.moveDown(0.8);

    drawRequestTable(doc, pendingRows, `Pending Requests (${pendingRows.length})`, false);
    drawRequestTable(doc, completedRows, `Completed Requests (${completedRows.length})`, true);

    doc.end();
  });
}

function buildMeta(db) {
  const employees = db.prepare(`SELECT id, name, department FROM employees ORDER BY name ASC`).all();
  const deptRows = db.prepare(`SELECT DISTINCT department FROM employees WHERE department IS NOT NULL AND department != '' ORDER BY department ASC`).all();
  return {
    employees,
    departments: deptRows.map((d) => d.department),
  };
}

router.get('/filters/meta', (req, res) => {
  const db = getDb();
  res.json(buildMeta(db));
});

router.post('/filters/parse', async (req, res) => {
  try {
    const db = getDb();
    const meta = buildMeta(db);
    const parsed = await parseReportFilters(req.body?.prompt, {
      employeeNames: meta.employees.map((e) => e.name),
      departments: meta.departments,
      todayIso: new Date().toISOString().slice(0, 10),
    });
    res.json(parsed);
  } catch (err) {
    console.error('Report filter parse error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/pdf', async (req, res) => {
  try {
    const payload = req.body || {};
    const db = getDb();
    const meta = buildMeta(db);

    let parsed = {
      employee_names: [],
      departments: [],
      date_start: '',
      date_end: '',
      request_status: 'all',
      notes: '',
    };
    if (String(payload.prompt || '').trim()) {
      parsed = await parseReportFilters(payload.prompt, {
        employeeNames: meta.employees.map((e) => e.name),
        departments: meta.departments,
        todayIso: new Date().toISOString().slice(0, 10),
      });
    }

    const filters = normalizeFilters(payload, parsed);
    if (filters.date_start && filters.date_end && filters.date_start > filters.date_end) {
      return res.status(400).json({ error: 'date_start must be before or equal to date_end.' });
    }

    const employeeIds = resolveEmployeeIds(db, filters.employee_id, filters.employee_names);
    const selectedEmployee = meta.employees.find((e) => Number(e.id) === Number(filters.employee_id));
    const employeeLabel = selectedEmployee?.name || filters.employee_names[0] || '';
    const pendingRows = buildRows(db, filters, employeeIds, 'pending');
    const completedRows = buildRows(db, filters, employeeIds, 'completed');
    const pdfBuffer = await buildPdfBuffer({
      pendingRows,
      completedRows,
      filters: { ...filters, employee_label: employeeLabel },
    });

    const fileStamp = new Date().toISOString().slice(0, 10);
    const filename = `expense-request-report-${fileStamp}.pdf`;
    const emailTo = sanitizeEmail(payload.email_to || '');
    let emailed = false;

    if (emailTo) {
      await sendExpenseReportPdfEmail({
        to: emailTo,
        filename,
        pdfBuffer,
        counts: {
          pending: pendingRows.length,
          completed: completedRows.length,
        },
        filters: {
          employee: employeeLabel || '',
          departments: filters.departments,
          date_start: filters.date_start,
          date_end: filters.date_end,
        },
      });
      emailed = true;
    }

    res.json({
      filename,
      pdf_base64: pdfBuffer.toString('base64'),
      email_sent: emailed,
      counts: {
        pending: pendingRows.length,
        completed: completedRows.length,
        total: pendingRows.length + completedRows.length,
      },
      applied_filters: {
        employee_id: filters.employee_id,
        employee_label: employeeLabel || '',
        departments: filters.departments,
        date_start: filters.date_start,
        date_end: filters.date_end,
        prompt_notes: filters.notes,
      },
    });
  } catch (err) {
    console.error('Expense PDF generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate report PDF.' });
  }
});

module.exports = router;
