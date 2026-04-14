const db = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const { role, available, skill, search } = req.query;
    let query = `
      SELECT cm.*,
        COUNT(DISTINCT pc.project_id) as total_projects,
        COALESCE(SUM(pc.hours), 0) as total_hours
      FROM crew_members cm
      LEFT JOIN project_crew pc ON cm.id = pc.crew_id
      WHERE 1=1
    `;
    const params = [];
    let i = 1;
    if (role) { query += ` AND cm.role = $${i++}`; params.push(role); }
    if (available !== undefined) { query += ` AND cm.is_available = $${i++}`; params.push(available === 'true'); }
    if (skill) { query += ` AND $${i++} = ANY(cm.skills)`; params.push(skill); }
    if (search) { query += ` AND (cm.name ILIKE $${i} OR cm.role ILIKE $${i})`; params.push(`%${search}%`); i++; }

    query += ' GROUP BY cm.id ORDER BY cm.name ASC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [crew, projects, availability] = await Promise.all([
      db.query('SELECT * FROM crew_members WHERE id = $1', [id]),
      db.query(`
        SELECT p.id, p.name, p.status, p.start_date, p.end_date, pc.role, pc.hours, pc.hourly_rate
        FROM project_crew pc
        JOIN projects p ON pc.project_id = p.id
        WHERE pc.crew_id = $1
        ORDER BY p.start_date DESC
      `, [id]),
      db.query('SELECT * FROM crew_availability WHERE crew_id = $1 ORDER BY start_date DESC', [id]),
    ]);

    if (crew.rows.length === 0) return res.status(404).json({ error: 'Crew member not found' });
    res.json({ ...crew.rows[0], projects: projects.rows, availability: availability.rows });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, email, phone, role, skills, hourly_rate, notes } = req.body;
    if (!name || !role) return res.status(400).json({ error: 'Name and role are required' });

    const result = await db.query(
      `INSERT INTO crew_members (name, email, phone, role, skills, hourly_rate, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, email, phone, role, skills || [], hourly_rate || 0, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, skills, hourly_rate, is_available, notes } = req.body;

    const result = await db.query(
      `UPDATE crew_members SET
        name = COALESCE($1, name), email = COALESCE($2, email),
        phone = COALESCE($3, phone), role = COALESCE($4, role),
        skills = COALESCE($5, skills), hourly_rate = COALESCE($6, hourly_rate),
        is_available = COALESCE($7, is_available), notes = COALESCE($8, notes),
        updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [name, email, phone, role, skills, hourly_rate, is_available, notes, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Crew member not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM crew_members WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Crew member not found' });
    res.json({ message: 'Crew member deleted' });
  } catch (err) {
    next(err);
  }
};

exports.getSchedule = async (req, res, next) => {
  try {
    const { start, end } = req.query;
    const result = await db.query(`
      SELECT cm.id, cm.name, cm.role, cm.is_available,
        json_agg(json_build_object(
          'project_id', p.id,
          'project_name', p.name,
          'role', pc.role,
          'start_date', p.start_date,
          'end_date', p.end_date,
          'hours', pc.hours
        )) FILTER (WHERE p.id IS NOT NULL) as assignments
      FROM crew_members cm
      LEFT JOIN project_crew pc ON cm.id = pc.crew_id
      LEFT JOIN projects p ON pc.project_id = p.id
        AND ($1::timestamp IS NULL OR p.start_date <= $2::timestamp)
        AND ($2::timestamp IS NULL OR p.end_date >= $1::timestamp)
      GROUP BY cm.id
      ORDER BY cm.name
    `, [start || null, end || null]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.addAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, is_available, reason } = req.body;
    const result = await db.query(
      'INSERT INTO crew_availability (crew_id, start_date, end_date, is_available, reason) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, start_date, end_date, is_available !== false, reason]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};
