const db = require('../config/database');

exports.getAll = async (req, res, next) => {
  try {
    const { status, client_id, search } = req.query;
    let query = `
      SELECT p.*, c.name as client_name, c.company as client_company,
        u.name as created_by_name,
        COUNT(DISTINCT pe.id) as equipment_count,
        COUNT(DISTINCT pc.id) as crew_count,
        COUNT(DISTINCT t.id) as task_count
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN project_equipment pe ON p.id = pe.project_id
      LEFT JOIN project_crew pc ON p.id = pc.project_id
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE 1=1
    `;
    const params = [];
    let i = 1;
    if (status) { query += ` AND p.status = $${i++}`; params.push(status); }
    if (client_id) { query += ` AND p.client_id = $${i++}`; params.push(client_id); }
    if (search) { query += ` AND (p.name ILIKE $${i} OR p.description ILIKE $${i})`; params.push(`%${search}%`); i++; }

    query += ' GROUP BY p.id, c.name, c.company, u.name ORDER BY p.updated_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [project, equipment, crew, tasks] = await Promise.all([
      db.query(`
        SELECT p.*, c.name as client_name, c.company as client_company, c.email as client_email, u.name as created_by_name
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        LEFT JOIN users u ON p.created_by = u.id
        WHERE p.id = $1
      `, [id]),
      db.query(`
        SELECT pe.*, e.name as equipment_name, e.category, e.condition
        FROM project_equipment pe
        JOIN equipment e ON pe.equipment_id = e.id
        WHERE pe.project_id = $1
      `, [id]),
      db.query(`
        SELECT pc.*, cm.name as crew_name, cm.role as crew_role, cm.email as crew_email
        FROM project_crew pc
        JOIN crew_members cm ON pc.crew_id = cm.id
        WHERE pc.project_id = $1
      `, [id]),
      db.query(`
        SELECT t.*, u.name as assigned_to_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE t.project_id = $1
        ORDER BY t.due_date ASC
      `, [id]),
    ]);

    if (project.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

    res.json({ ...project.rows[0], equipment: equipment.rows, crew: crew.rows, tasks: tasks.rows });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, client_id, status, start_date, end_date, description, location, budget } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });

    const result = await db.query(
      `INSERT INTO projects (name, client_id, status, start_date, end_date, description, location, budget, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, client_id, status || 'draft', start_date, end_date, description, location, budget, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, client_id, status, start_date, end_date, description, location, budget } = req.body;

    const result = await db.query(
      `UPDATE projects SET
        name = COALESCE($1, name),
        client_id = COALESCE($2, client_id),
        status = COALESCE($3, status),
        start_date = COALESCE($4, start_date),
        end_date = COALESCE($5, end_date),
        description = COALESCE($6, description),
        location = COALESCE($7, location),
        budget = COALESCE($8, budget),
        updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [name, client_id, status, start_date, end_date, description, location, budget, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
};

// Tasks
exports.getTasks = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT t.*, u.name as assigned_to_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.project_id = $1
      ORDER BY t.due_date ASC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) { next(err); }
};

exports.createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, due_date, assigned_to } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const result = await db.query(
      `INSERT INTO tasks (project_id, title, description, status, priority, due_date, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, title, description, status || 'todo', priority || 'medium', due_date, assigned_to]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.updateTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { title, description, status, priority, due_date, assigned_to } = req.body;
    const result = await db.query(
      `UPDATE tasks SET
        title = COALESCE($1, title), description = COALESCE($2, description),
        status = COALESCE($3, status), priority = COALESCE($4, priority),
        due_date = COALESCE($5, due_date), assigned_to = COALESCE($6, assigned_to),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [title, description, status, priority, due_date, assigned_to, taskId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// Project equipment/crew management
exports.addEquipment = async (req, res, next) => {
  try {
    const { equipment_id, quantity, daily_rate } = req.body;
    const result = await db.query(
      'INSERT INTO project_equipment (project_id, equipment_id, quantity, daily_rate) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, equipment_id, quantity || 1, daily_rate || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

exports.addCrew = async (req, res, next) => {
  try {
    const { crew_id, role, hours, hourly_rate } = req.body;
    const result = await db.query(
      'INSERT INTO project_crew (project_id, crew_id, role, hours, hourly_rate) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.params.id, crew_id, role, hours || 0, hourly_rate || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};
