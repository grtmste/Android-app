const db = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const { status, client_id } = req.query;
    let query = `
      SELECT i.*, c.name as client_name, c.company as client_company, p.name as project_name
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN projects p ON i.project_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (status) { query += ` AND i.status = $${idx++}`; params.push(status); }
    if (client_id) { query += ` AND i.client_id = $${idx++}`; params.push(client_id); }
    query += ' ORDER BY i.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [invoice, items] = await Promise.all([
      db.query(`
        SELECT i.*, c.name as client_name, c.company as client_company,
          c.email as client_email, c.address as client_address, c.phone as client_phone,
          p.name as project_name
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.id
        LEFT JOIN projects p ON i.project_id = p.id
        WHERE i.id = $1
      `, [id]),
      db.query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at ASC', [id]),
    ]);
    if (invoice.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ ...invoice.rows[0], items: items.rows });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { project_id, client_id, quote_id, due_date, tax_rate = 0, notes, terms, items = [] } = req.body;

    const countResult = await db.query('SELECT COUNT(*) FROM invoices');
    const invoiceNum = `INV-${new Date().getFullYear()}-${String(parseInt(countResult.rows[0].count) + 1).padStart(3, '0')}`;

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const tax_amount = subtotal * (tax_rate / 100);
    const total = subtotal + tax_amount;

    const result = await db.query(
      `INSERT INTO invoices (project_id, client_id, quote_id, invoice_number, status, due_date, subtotal, tax_rate, tax_amount, total, notes, terms, created_by)
       VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [project_id, client_id, quote_id, invoiceNum, due_date, subtotal, tax_rate, tax_amount, total, notes, terms, req.user.id]
    );

    const invoice = result.rows[0];
    for (const item of items) {
      await db.query(
        'INSERT INTO invoice_items (invoice_id, description, type, quantity, unit_price, total) VALUES ($1, $2, $3, $4, $5, $6)',
        [invoice.id, item.description, item.type || 'other', item.quantity, item.unit_price, item.quantity * item.unit_price]
      );
    }

    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, due_date, tax_rate, notes, terms, amount_paid, items } = req.body;

    let subtotal, tax_amount, total;
    if (items) {
      subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      tax_amount = subtotal * ((tax_rate || 0) / 100);
      total = subtotal + tax_amount;
      await db.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
      for (const item of items) {
        await db.query(
          'INSERT INTO invoice_items (invoice_id, description, type, quantity, unit_price, total) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, item.description, item.type || 'other', item.quantity, item.unit_price, item.quantity * item.unit_price]
        );
      }
    }

    const result = await db.query(
      `UPDATE invoices SET
        status = COALESCE($1, status), due_date = COALESCE($2, due_date),
        tax_rate = COALESCE($3, tax_rate), notes = COALESCE($4, notes), terms = COALESCE($5, terms),
        amount_paid = COALESCE($6, amount_paid),
        subtotal = COALESCE($7, subtotal), tax_amount = COALESCE($8, tax_amount), total = COALESCE($9, total),
        updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [status, due_date, tax_rate, notes, terms, amount_paid, subtotal, tax_amount, total, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM invoices WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    next(err);
  }
};
