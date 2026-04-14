const db = require('../config/database');

exports.getStats = async (req, res, next) => {
  try {
    const [
      totalProjects,
      activeProjects,
      totalRevenue,
      pendingInvoices,
      equipmentUtilization,
      recentProjects,
      upcomingProjects,
      revenueByMonth,
    ] = await Promise.all([
      db.query('SELECT COUNT(*) FROM projects'),
      db.query("SELECT COUNT(*) FROM projects WHERE status IN ('confirmed', 'in_progress')"),
      db.query("SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE status = 'paid'"),
      db.query("SELECT COUNT(*), COALESCE(SUM(total), 0) as amount FROM invoices WHERE status IN ('sent', 'overdue')"),
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE available_quantity < quantity) as in_use,
          COUNT(*) as total,
          ROUND(AVG(CASE WHEN quantity > 0 THEN (quantity - available_quantity)::decimal / quantity * 100 ELSE 0 END), 1) as utilization_pct
        FROM equipment
      `),
      db.query(`
        SELECT p.id, p.name, p.status, p.start_date, p.end_date, c.name as client_name
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        ORDER BY p.updated_at DESC LIMIT 5
      `),
      db.query(`
        SELECT p.id, p.name, p.status, p.start_date, p.end_date, c.name as client_name
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.start_date > NOW()
        ORDER BY p.start_date ASC LIMIT 5
      `),
      db.query(`
        SELECT
          TO_CHAR(issue_date, 'YYYY-MM') as month,
          COALESCE(SUM(total), 0) as revenue,
          COUNT(*) as invoice_count
        FROM invoices
        WHERE issue_date > NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(issue_date, 'YYYY-MM')
        ORDER BY month ASC
      `),
    ]);

    res.json({
      totalProjects: parseInt(totalProjects.rows[0].count),
      activeProjects: parseInt(activeProjects.rows[0].count),
      totalRevenue: parseFloat(totalRevenue.rows[0].total),
      pendingInvoices: {
        count: parseInt(pendingInvoices.rows[0].count),
        amount: parseFloat(pendingInvoices.rows[0].amount),
      },
      equipmentUtilization: {
        inUse: parseInt(equipmentUtilization.rows[0].in_use),
        total: parseInt(equipmentUtilization.rows[0].total),
        pct: parseFloat(equipmentUtilization.rows[0].utilization_pct || 0),
      },
      recentProjects: recentProjects.rows,
      upcomingProjects: upcomingProjects.rows,
      revenueByMonth: revenueByMonth.rows,
    });
  } catch (err) {
    next(err);
  }
};
