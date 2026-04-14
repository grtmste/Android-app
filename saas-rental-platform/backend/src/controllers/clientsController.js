const db = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT c.*,
        COUNT(DISTINCT p.id) as total_projects,
        COALESCE(SUM(i.total) FILTER (WHERE i.status = 'paid'), 0) as total_revenue
      FROM clients c
      LEFT JOIN projects p ON c.id = p.client_id
      LEFT JOIN invoices i ON c.id = i.client_id
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      query += ` AND (c.name ILIKE $1 OR c.company ILIKE $1 OR c.email ILIKE $1)`;
      params.push(`%${search}%`);
    }
    query += ' GROUP BY c.id ORDER BY c.name ASC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [client, projects, invoices, logs] = await Promise.all([
      db.query('SELECT * FROM clients WHERE id = $1', [id]),
      db.query(`SELECT p.*, COUNT(pe.id) as equipment_count FROM projects p LEFT JOIN project_equipment pe ON p.id = pe.project_id WHERE p.client_id = $1 GROUP BY p.id ORDER BY p.start_date DESC`, [id]),
      db.query('SELECT * FROM invoices WHERE client_id = $1 ORDER BY created_at DESC', [id]),
      db.query(`
        SELECT cl.*, u.name as created_by_name
        FROM communication_logs cl
        LEFT JOIN users u ON cl.created_by = u.id
        WHERE cl.client_id = $1
        ORDER BY cl.created_at DESC
      `, [id]),
    ]);
    if (client.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json({ ...client.rows[0], projects: projects.rows, invoices: invoices.rows, logs: logs.rows });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, company, email, phone, address, city, country, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = await db.query(
      `INSERT INTO clients (name, company, email, phone, address, city, country, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, company, email, phone, address, city, country || 'US', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, company, email, phone, address, city, country, notes } = req.body;
    const result = await db.query(
      `UPDATE clients SET
        name = COALESCE($1, name), company = COALESCE($2, company),
        email = COALESCE($3, email), phone = COALESCE($4, phone),
        address = COALESCE($5, address), city = COALESCE($6, city),
        country = COALESCE($7, country), notes = COALESCE($8, notes),
        updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [name, company, email, phone, address, city, country, notes, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM clients WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    res.json({ message: 'Client deleted' });
  } catch (err) {
    next(err);
  }
};

exports.addLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, subject, content } = req.body;
    const result = await db.query(
      'INSERT INTO communication_logs (client_id, type, subject, content, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, type || 'note', subject, content, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};
