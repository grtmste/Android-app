const db = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const { category, condition, search } = req.query;
    let query = `
      SELECT e.*,
        ROUND((e.quantity - e.available_quantity)::decimal / NULLIF(e.quantity, 0) * 100, 1) as utilization_pct
      FROM equipment e
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (category) { query += ` AND e.category = $${paramIndex++}`; params.push(category); }
    if (condition) { query += ` AND e.condition = $${paramIndex++}`; params.push(condition); }
    if (search) { query += ` AND (e.name ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex})`; params.push(`%${search}%`); paramIndex++; }

    query += ' ORDER BY e.name ASC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const equipment = await db.query('SELECT * FROM equipment WHERE id = $1', [id]);
    if (equipment.rows.length === 0) return res.status(404).json({ error: 'Equipment not found' });

    const logs = await db.query(`
      SELECT el.*, u.name as checked_by_name, p.name as project_name
      FROM equipment_logs el
      LEFT JOIN users u ON el.checked_by = u.id
      LEFT JOIN projects p ON el.project_id = p.id
      WHERE el.equipment_id = $1
      ORDER BY el.created_at DESC LIMIT 20
    `, [id]);

    res.json({ ...equipment.rows[0], logs: logs.rows });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, category, quantity, condition, location, description, daily_rate, serial_number } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'Name and category are required' });

    const result = await db.query(
      `INSERT INTO equipment (name, category, quantity, available_quantity, condition, location, description, daily_rate, serial_number)
       VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, category, quantity || 1, condition || 'good', location, description, daily_rate || 0, serial_number]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category, quantity, available_quantity, condition, location, description, daily_rate, serial_number } = req.body;

    const result = await db.query(
      `UPDATE equipment SET
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        quantity = COALESCE($3, quantity),
        available_quantity = COALESCE($4, available_quantity),
        condition = COALESCE($5, condition),
        location = COALESCE($6, location),
        description = COALESCE($7, description),
        daily_rate = COALESCE($8, daily_rate),
        serial_number = COALESCE($9, serial_number),
        updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [name, category, quantity, available_quantity, condition, location, description, daily_rate, serial_number, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Equipment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM equipment WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Equipment not found' });
    res.json({ message: 'Equipment deleted' });
  } catch (err) {
    next(err);
  }
};

exports.checkout = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { project_id, quantity = 1, notes } = req.body;

    const equip = await db.query('SELECT * FROM equipment WHERE id = $1', [id]);
    if (equip.rows.length === 0) return res.status(404).json({ error: 'Equipment not found' });
    if (equip.rows[0].available_quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient available quantity' });
    }

    await db.query('UPDATE equipment SET available_quantity = available_quantity - $1, updated_at = NOW() WHERE id = $2', [quantity, id]);
    await db.query(
      'INSERT INTO equipment_logs (equipment_id, project_id, action, quantity, notes, checked_by) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, project_id, 'checkout', quantity, notes, req.user.id]
    );

    res.json({ message: 'Equipment checked out successfully' });
  } catch (err) {
    next(err);
  }
};

exports.checkin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity = 1, notes, condition } = req.body;

    const equip = await db.query('SELECT * FROM equipment WHERE id = $1', [id]);
    if (equip.rows.length === 0) return res.status(404).json({ error: 'Equipment not found' });

    const newAvailable = Math.min(equip.rows[0].quantity, equip.rows[0].available_quantity + quantity);
    await db.query(
      'UPDATE equipment SET available_quantity = $1, condition = COALESCE($2, condition), updated_at = NOW() WHERE id = $3',
      [newAvailable, condition, id]
    );
    await db.query(
      'INSERT INTO equipment_logs (equipment_id, action, quantity, notes, checked_by) VALUES ($1, $2, $3, $4, $5)',
      [id, 'checkin', quantity, notes, req.user.id]
    );

    res.json({ message: 'Equipment checked in successfully' });
  } catch (err) {
    next(err);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const result = await db.query('SELECT DISTINCT category FROM equipment ORDER BY category');
    res.json(result.rows.map(r => r.category));
  } catch (err) {
    next(err);
  }
};
