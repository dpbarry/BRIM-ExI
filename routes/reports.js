const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const PDFDocument = require('pdfkit');
const { parseReportFilters, generateReports } = require('../ai/reports');
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

function buildPdfBuffer({ pendingRows, completedRows, filters }) {
  return new Promise((resolve, reject) => {
    // ── Constants ───────────────────────────────────────────
    const MARGIN   = 46;
    const PAGE_W   = 612;
    const PAGE_H   = 792;
    const CONT_W   = PAGE_W - MARGIN * 2;   // 520
    const HDR_H    = 58;
    const FOOT_Y   = PAGE_H - 30;

    // Palette — navy/cyan used sparingly, rest is near-neutral
    const NAVY        = '#003d5c';
    const CYAN        = '#0891b2';
    const CYAN_LIGHT  = '#e8f6fb';
    const INK         = '#0f172a';
    const SLATE       = '#334155';
    const MUTED       = '#64748b';
    const DIVIDER     = '#e2e8f0';
    const ROW_ALT     = '#f8fafc';
    const WHITE       = '#ffffff';

    const now        = new Date();
    const reportDate = now.toISOString().slice(0, 10);
    const reportTime = now.toUTCString().slice(17, 22) + ' UTC';

    const doc = new PDFDocument({ size: 'LETTER', margin: MARGIN, bufferPages: true });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Header (drawn on every page) ───────────────────────
    function drawHeader() {
      doc.rect(0, 0, PAGE_W, HDR_H).fill(NAVY);
      // Brand
      doc.font('Helvetica-Bold').fontSize(13).fillColor(WHITE)
         .text('BRIM · ExI', MARGIN, 17, { lineBreak: false });
      // Subtitle
      doc.font('Helvetica').fontSize(10.5).fillColor('#7dd3fc')
         .text('Expense Request Report', MARGIN, 20,
               { width: CONT_W, align: 'right', lineBreak: false });
      // Date
      doc.font('Helvetica').fontSize(7.5).fillColor('#93c5fd')
         .text(`Generated ${reportDate}  ·  ${reportTime}`, MARGIN, 37,
               { width: CONT_W, align: 'right', lineBreak: false });
      doc.y = HDR_H + 16;
    }

    // ── Summary stats box (first page only) ────────────────
    function drawSummary() {
      const allRows = [...pendingRows, ...completedRows];
      const totalAmt   = allRows.reduce((s, r) => s + (Number(r.parsed_amount) || 0), 0);
      const pendingAmt = pendingRows.reduce((s, r) => s + (Number(r.parsed_amount) || 0), 0);
      const doneAmt    = completedRows.reduce((s, r) => s + (Number(r.parsed_amount) || 0), 0);

      const BOX_H = 66;
      const boxY  = doc.y;

      doc.rect(MARGIN, boxY, CONT_W, BOX_H).fill(CYAN_LIGHT);
      doc.rect(MARGIN, boxY, 3, BOX_H).fill(CYAN);

      const cols = [
        { label: 'Total Requests', count: allRows.length,       amt: totalAmt },
        { label: 'Pending',        count: pendingRows.length,   amt: pendingAmt },
        { label: 'Completed',      count: completedRows.length, amt: doneAmt },
      ];
      const colW = CONT_W / 3;
      cols.forEach((col, i) => {
        const x = MARGIN + i * colW + 18;
        doc.font('Helvetica').fontSize(7).fillColor(MUTED)
           .text(col.label.toUpperCase(), x, boxY + 11, { lineBreak: false });
        doc.font('Helvetica-Bold').fontSize(20).fillColor(INK)
           .text(String(col.count), x, boxY + 21, { lineBreak: false });
        doc.font('Helvetica').fontSize(8.5).fillColor(SLATE)
           .text(formatCurrency(col.amt), x, boxY + 44, { lineBreak: false });
      });

      doc.y = boxY + BOX_H + 14;

      // Filter strip
      const bits = [];
      if (filters.employee_label) bits.push(`Employee: ${filters.employee_label}`);
      if (filters.departments && filters.departments.length)
        bits.push(`Departments: ${filters.departments.join(', ')}`);
      if (filters.date_start) bits.push(`From: ${filters.date_start}`);
      if (filters.date_end)   bits.push(`To: ${filters.date_end}`);
      if (bits.length) {
        doc.font('Helvetica').fontSize(8).fillColor(MUTED)
           .text('Filters applied:  ' + bits.join('   ·   '), MARGIN, doc.y,
                 { width: CONT_W });
        doc.moveDown(0.7);
      }
    }

    // ── Section header ──────────────────────────────────────
    function drawSectionHeader(title, count) {
      if (doc.y > PAGE_H - 130) { doc.addPage(); }
      const y = doc.y + 6;
      // Left accent bar
      doc.rect(MARGIN, y, 3, 22).fill(CYAN);
      // Title
      doc.font('Helvetica-Bold').fontSize(11.5).fillColor(INK)
         .text(title, MARGIN + 10, y + 4, { lineBreak: false });
      // Badge
      const badgeTxt = String(count);
      const badgeW   = Math.max(24, badgeTxt.length * 7 + 10);
      const badgeX   = PAGE_W - MARGIN - badgeW;
      doc.rect(badgeX, y + 2, badgeW, 17).fill(count > 0 ? CYAN : '#94a3b8');
      doc.font('Helvetica-Bold').fontSize(8).fillColor(WHITE)
         .text(badgeTxt, badgeX, y + 6, { width: badgeW, align: 'center', lineBreak: false });
      doc.y = y + 28;
      doc.moveTo(MARGIN, doc.y).lineTo(PAGE_W - MARGIN, doc.y)
         .strokeColor(DIVIDER).lineWidth(0.5).stroke();
      doc.y += 8;
    }

    // ── Status badge colors ─────────────────────────────────
    function statusBg(s) {
      if (s === 'approved') return '#dcfce7';
      if (s === 'denied')   return '#fee2e2';
      return '#fef9c3';
    }
    function statusFg(s) {
      if (s === 'approved') return '#166534';
      if (s === 'denied')   return '#7f1d1d';
      return '#92400e';
    }

    // ── Single request row ──────────────────────────────────
    function drawRow(row, idx, isEven) {
      const ROW_H    = 54;
      const RIGHT_W  = 132;
      const LEFT_W   = CONT_W - 24 - RIGHT_W - 14; // ~350

      if (doc.y + ROW_H > PAGE_H - 40) { doc.addPage(); }

      const rowY   = doc.y;
      const nameX  = MARGIN + 24;
      const rightX = PAGE_W - MARGIN - RIGHT_W;

      // Alternating background
      if (isEven) {
        doc.rect(MARGIN, rowY - 1, CONT_W, ROW_H).fill(ROW_ALT);
      }

      // Index number
      doc.font('Helvetica').fontSize(8).fillColor(MUTED)
         .text(String(idx + 1).padStart(2, '0'), MARGIN + 4, rowY + 13, { lineBreak: false });

      // Employee name
      const employee = row.emp_name || row.parsed_name || 'Unknown';
      doc.font('Helvetica-Bold').fontSize(10).fillColor(INK)
         .text(employee, nameX, rowY + 5, { width: LEFT_W, lineBreak: false });

      // Dept · Date
      const dept = row.emp_dept || row.parsed_department || '—';
      const date = String(row.created_at || '').slice(0, 10);
      doc.font('Helvetica').fontSize(8).fillColor(MUTED)
         .text(`${dept}  ·  ${date}`, nameX, rowY + 19, { width: LEFT_W, lineBreak: false });

      // Purpose (truncated)
      const rawPurpose = row.parsed_purpose || '—';
      const purpose = rawPurpose.length > 88 ? rawPurpose.slice(0, 85) + '…' : rawPurpose;
      doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(SLATE)
         .text(purpose, nameX, rowY + 32, { width: LEFT_W, lineBreak: false });

      // Amount
      const amount = formatCurrency(row.parsed_amount);
      doc.font('Helvetica-Bold').fontSize(12).fillColor(INK)
         .text(amount, rightX, rowY + 5, { width: RIGHT_W, align: 'right', lineBreak: false });

      // Status badge
      const status    = String(row.status || 'pending').toLowerCase();
      const badgeText = status.toUpperCase();
      const badgeW    = 60;
      const badgeX    = PAGE_W - MARGIN - badgeW;
      const badgeY    = rowY + 22;
      doc.rect(badgeX, badgeY, badgeW, 13)
         .fill(statusBg(status));
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor(statusFg(status))
         .text(badgeText, badgeX, badgeY + 3, { width: badgeW, align: 'center', lineBreak: false });

      // Decided date (completed rows)
      if (row.decided_at) {
        const dDate = String(row.decided_at).slice(0, 10);
        doc.font('Helvetica').fontSize(6.5).fillColor(MUTED)
           .text(`Decided ${dDate}`, badgeX, badgeY + 18, { width: badgeW, align: 'center', lineBreak: false });
      }

      // Row divider
      doc.y = rowY + ROW_H;
      doc.moveTo(MARGIN, doc.y - 1).lineTo(PAGE_W - MARGIN, doc.y - 1)
         .strokeColor(DIVIDER).lineWidth(0.3).stroke();
    }

    // ── Full section ────────────────────────────────────────
    function drawSection(rows, title) {
      drawSectionHeader(title, rows.length);

      if (!rows.length) {
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(MUTED)
           .text('No requests in this section.', MARGIN + 8, doc.y + 4);
        doc.moveDown(1.4);
        return;
      }

      rows.forEach((row, idx) => drawRow(row, idx, idx % 2 === 0));

      // Section total line
      const total = rows.reduce((s, r) => s + (Number(r.parsed_amount) || 0), 0);
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(INK)
         .text(`Section total: ${formatCurrency(total)}`, MARGIN, doc.y,
               { width: CONT_W, align: 'right' });
      doc.moveDown(1.4);
    }

    // ── Footer (drawn retroactively on all buffered pages) ──
    function drawFooter(pageNum, totalPages) {
      doc.moveTo(MARGIN, FOOT_Y - 8).lineTo(PAGE_W - MARGIN, FOOT_Y - 8)
         .strokeColor(DIVIDER).lineWidth(0.4).stroke();
      doc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
         .text(
           `BRIM ExI  ·  Confidential  ·  Page ${pageNum} of ${totalPages}`,
           MARGIN, FOOT_Y,
           { width: CONT_W, align: 'center', lineBreak: false }
         );
    }

    // ── Render ──────────────────────────────────────────────
    doc.on('pageAdded', drawHeader);

    drawHeader();
    drawSummary();
    drawSection(pendingRows, 'Pending Requests');
    drawSection(completedRows, 'Completed Requests');

    // Add page numbers to all buffered pages
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      drawFooter(i + 1, range.count);
    }

    doc.flushPages();
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

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const status = req.query.status || 'all';
    const base = `SELECT r.*, e.name as emp_name, e.department as emp_dept,
      COUNT(ri.id) as item_count
      FROM expense_reports r
      JOIN employees e ON r.employee_id = e.id
      LEFT JOIN expense_report_items ri ON ri.report_id = r.id`;
    const query = status === 'all'
      ? `${base} GROUP BY r.id ORDER BY r.created_at DESC`
      : `${base} WHERE r.status = ? GROUP BY r.id ORDER BY r.created_at DESC`;
    const rows = status === 'all'
      ? db.prepare(query).all()
      : db.prepare(query).all(status);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate', async (req, res) => {
  const { employee_id, date_start, date_end } = req.body || {};
  if (!employee_id || !date_start || !date_end) {
    return res.status(400).json({ error: 'employee_id, date_start, date_end required' });
  }
  if (!isIsoDate(date_start) || !isIsoDate(date_end)) {
    return res.status(400).json({ error: 'date_start and date_end must be YYYY-MM-DD.' });
  }
  if (date_start > date_end) {
    return res.status(400).json({ error: 'date_start must be before or equal to date_end.' });
  }

  try {
    const db = getDb();
    const reportGroups = await generateReports(Number(employee_id), date_start, date_end);
    if (!Array.isArray(reportGroups) || reportGroups.length === 0) {
      return res.status(400).json({ error: 'No report groups generated for this range.' });
    }

    const insertReport = db.prepare(
      `INSERT INTO expense_reports (employee_id, title, date_range_start, date_range_end, total_amount, policy_summary)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const insertItem = db.prepare(
      'INSERT INTO expense_report_items (report_id, transaction_id) VALUES (?, ?)'
    );

    const tx = db.transaction((groups) => {
      const created = [];
      for (const group of groups) {
        const result = insertReport.run(
          Number(employee_id),
          group.title,
          group.date_range_start,
          group.date_range_end,
          group.total_amount,
          group.policy_summary
        );
        const reportId = result.lastInsertRowid;
        created.push(reportId);
        for (const txId of group.transaction_ids || []) {
          insertItem.run(reportId, txId);
        }
      }
      return created;
    });

    const ids = tx(reportGroups);
    res.json({ created: ids.length, ids });
  } catch (err) {
    console.error('Report generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/decide', (req, res) => {
  const action = String(req.body?.action || '');
  if (!['approved', 'denied'].includes(action)) {
    return res.status(400).json({ error: 'action must be approved or denied' });
  }
  try {
    const db = getDb();
    db.prepare('UPDATE expense_reports SET status = ? WHERE id = ?').run(action, req.params.id);
    res.json({ success: true, status: action });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
