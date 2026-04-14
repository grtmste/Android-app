const db = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const { status, client_id } = req.query;
    let query = `
      SELECT q.*, c.name as client_name, c.company as client_company, p.name as project_name
      FROM quotes q
      LEFT JOIN clients c ON q.client_id = c.id
      LEFT JOIN projects p ON q.project_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let i = 1;
    if (status) { query += ` AND q.status = $${i++}`; params.push(status); }
    if (client_id) { query += ` AND q.client_id = $${i++}`; params.push(client_id); }
    query += ' ORDER BY q.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [quote, items] = await Promise.all([
      db.query(`
        SELECT q.*, c.name as client_name, c.company as client_company, c.email as client_email,
          c.address as client_address, p.name as project_name
        FROM quotes q
        LEFT JOIN clients c ON q.client_id = c.id
        LEFT JOIN projects p ON q.project_id = p.id
        WHERE q.id = $1
      `, [id]),
      db.query('SELECT * FROM quote_items WHERE quote_id = $1 ORDER BY created_at ASC', [id]),
    ]);
    if (quote.rows.length === 0) return res.status(404).json({ error: 'Quote not found' });
    res.json({ ...quote.rows[0], items: items.rows });
  } catch (err) {
    next(err);
  }
};

const calcTotals = (items, taxRate) => {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const tax_amount = subtotal * (taxRate / 100);
  return { subtotal, tax_amount, total: subtotal + tax_amount };
};

exports.create = async (req, res, next) => {
  try {
    const { project_id, client_id, valid_until, tax_rate = 0, notes, terms, items = [] } = req.body;

    // Generate quote number
    const countResult = await db.query('SELECT COUNT(*) FROM quotes');
    const quoteNum = `QT-${new Date().getFullYear()}-${String(parseInt(countResult.rows[0].count) + 1).padStart(3, '0')}`;

    const { subtotal, tax_amount, total } = calcTotals(items, tax_rate);

    const quoteResult = await db.query(
      `INSERT INTO quotes (project_id, client_id, quote_number, status, valid_until, subtotal, tax_rate, tax_amount, total, notes, terms, created_by)
       VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [project_id, client_id, quoteNum, valid_until, subtotal, tax_rate, tax_amount, total, notes, terms, req.user.id]
    );

    const quote = quoteResult.rows[0];
    if (items.length > 0) {
      for (const item of items) {
        await db.query(
          'INSERT INTO quote_items (quote_id, description, type, quantity, unit_price, total) VALUES ($1, $2, $3, $4, $5, $6)',
          [quote.id, item.description, item.type || 'other', item.quantity, item.unit_price, item.quantity * item.unit_price]
        );
      }
    }

    res.status(201).json(quote);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, valid_until, tax_rate, notes, terms, items } = req.body;

    let subtotal, tax_amount, total;
    if (items) {
      ({ subtotal, tax_amount, total } = calcTotals(items, tax_rate || 0));
      await db.query('DELETE FROM quote_items WHERE quote_id = $1', [id]);
      for (const item of items) {
        await db.query(
          'INSERT INTO quote_items (quote_id, description, type, quantity, unit_price, total) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, item.description, item.type || 'other', item.quantity, item.unit_price, item.quantity * item.unit_price]
        );
      }
    }

    const result = await db.query(
      `UPDATE quotes SET
        status = COALESCE($1, status), valid_until = COALESCE($2, valid_until),
        tax_rate = COALESCE($3, tax_rate), notes = COALESCE($4, notes), terms = COALESCE($5, terms),
        subtotal = COALESCE($6, subtotal), tax_amount = COALESCE($7, tax_amount), total = COALESCE($8, total),
        updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [status, valid_until, tax_rate, notes, terms, subtotal, tax_amount, total, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quote not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM quotes WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Quote not found' });
    res.json({ message: 'Quote deleted' });
  } catch (err) {
    next(err);
  }
};
