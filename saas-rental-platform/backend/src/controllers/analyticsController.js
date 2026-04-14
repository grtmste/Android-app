const db = require('../config/database');

exports.getRevenue = async (req, res, next) => {
  try {
    const { period = '12' } = req.query;
    const months = parseInt(period);

    const [monthly, topClients, projectsByStatus, equipmentUtil, crewHours] = await Promise.all([
      db.query(`
        SELECT
          TO_CHAR(issue_date, 'YYYY-MM') as month,
          TO_CHAR(issue_date, 'Mon YY') as label,
          COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) as paid,
          COALESCE(SUM(total) FILTER (WHERE status = 'sent'), 0) as pending,
          COALESCE(SUM(total) FILTER (WHERE status = 'overdue'), 0) as overdue,
          COUNT(*) as invoice_count
        FROM invoices
        WHERE issue_date > NOW() - INTERVAL '${months} months'
        GROUP BY TO_CHAR(issue_date, 'YYYY-MM'), TO_CHAR(issue_date, 'Mon YY')
        ORDER BY month ASC
      `),
      db.query(`
        SELECT c.id, c.name, c.company,
          COALESCE(SUM(i.total) FILTER (WHERE i.status = 'paid'), 0) as revenue,
          COUNT(DISTINCT p.id) as project_count
        FROM clients c
        LEFT JOIN invoices i ON c.id = i.client_id
        LEFT JOIN projects p ON c.id = p.client_id
        GROUP BY c.id
        ORDER BY revenue DESC
        LIMIT 10
      `),
      db.query(`
        SELECT status, COUNT(*) as count
        FROM projects
        GROUP BY status
      `),
      db.query(`
        SELECT
          category,
          COUNT(*) as total_items,
          SUM(quantity) as total_quantity,
          SUM(quantity - available_quantity) as in_use_quantity,
          ROUND(AVG(CASE WHEN quantity > 0 THEN (quantity - available_quantity)::decimal / quantity * 100 ELSE 0 END), 1) as utilization_pct
        FROM equipment
        GROUP BY category
        ORDER BY utilization_pct DESC
      `),
      db.query(`
        SELECT cm.id, cm.name, cm.role,
          COALESCE(SUM(pc.hours), 0) as total_hours,
          COALESCE(SUM(pc.hours * pc.hourly_rate), 0) as total_earnings,
          COUNT(DISTINCT pc.project_id) as project_count
        FROM crew_members cm
        LEFT JOIN project_crew pc ON cm.id = pc.crew_id
        GROUP BY cm.id
        ORDER BY total_hours DESC
      `),
    ]);

    res.json({
      revenueByMonth: monthly.rows,
      topClients: topClients.rows,
      projectsByStatus: projectsByStatus.rows,
      equipmentUtilization: equipmentUtil.rows,
      crewHours: crewHours.rows,
    });
  } catch (err) {
    next(err);
  }
};
