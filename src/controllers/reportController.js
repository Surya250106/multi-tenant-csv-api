const { stringify } = require('csv-stringify/sync');
const db = require('../db/database');

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    // Format YYYY-MM-DD using ISO date string or UTC parts
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === 'string') {
    return val.slice(0, 10);
  }
  return String(val);
}

function formatAmount(val) {
  if (val === null || val === undefined) return '';
  const num = Number(val);
  return isNaN(num) ? String(val) : num.toFixed(2);
}

async function exportSalesReport(req, res, next) {
  try {
    // CRITICAL SECURITY ENFORCEMENT:
    // Tenant context and user context MUST come ONLY from the cryptographically verified JWT (req.user).
    // Any query parameters (e.g., req.query.tenant_id), body properties, or custom headers are strictly ignored.
    const { tenantId, userId, role } = req.user;

    let queryText = '';
    let queryParams = [];

    if (role === 'admin') {
      // Admin RBAC: Access ALL sales records belonging to their tenant
      queryText = `
        SELECT id, amount, sale_date, client_name
        FROM sales_records
        WHERE tenant_id = $1
        ORDER BY id;
      `;
      queryParams = [tenantId];
    } else if (role === 'agent') {
      // Agent RBAC: Access ONLY sales records belonging to their tenant AND their own user ID
      queryText = `
        SELECT id, amount, sale_date, client_name
        FROM sales_records
        WHERE tenant_id = $1
          AND agent_id = $2
        ORDER BY id;
      `;
      queryParams = [tenantId, userId];
    } else {
      return res.status(403).json({ error: 'Forbidden: Unknown role' });
    }

    const result = await db.query(queryText, queryParams);

    const formattedRows = result.rows.map((row) => ({
      id: row.id,
      amount: formatAmount(row.amount),
      sale_date: formatDate(row.sale_date),
      client_name: row.client_name,
    }));

    // Generate RFC 4180 compliant CSV
    const csvOutput = stringify(formattedRows, {
      header: true,
      columns: ['id', 'amount', 'sale_date', 'client_name'],
      quoted_string: false,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sales_report.csv"');

    return res.status(200).send(csvOutput);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  exportSalesReport,
};
