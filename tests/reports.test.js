const request = require('supertest');
const app = require('../src/index');

describe('Sales Report CSV Export & RBAC Tests', () => {
  let adminAToken;
  let agentAToken;
  let agentA2Token;
  let adminBToken;

  beforeAll(async () => {
    // Login as Tenant A Admin
    const resAdminA = await request(app)
      .post('/api/auth/login')
      .send({ email: 'adminA@example.com', password: 'secret123' });
    adminAToken = resAdminA.body.token;

    // Login as Tenant A Agent A
    const resAgentA = await request(app)
      .post('/api/auth/login')
      .send({ email: 'agentA@example.com', password: 'secret123' });
    agentAToken = resAgentA.body.token;

    // Login as Tenant A Agent A2
    const resAgentA2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'agentA2@example.com', password: 'secret123' });
    agentA2Token = resAgentA2.body.token;

    // Login as Tenant B Admin
    const resAdminB = await request(app)
      .post('/api/auth/login')
      .send({ email: 'adminB@example.com', password: 'secret123' });
    adminBToken = resAdminB.body.token;
  });

  describe('CSV Response Headers & Format', () => {
    it('should return 200, Content-Type text/csv, and Content-Disposition attachment with .csv extension', async () => {
      const res = await request(app)
        .get('/api/reports/sales')
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toBeDefined();
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toMatch(/filename=".*\.csv"/);

      const lines = res.text.trim().split(/\r?\n/);
      expect(lines[0]).toBe('id,amount,sale_date,client_name');
    });
  });

  describe('Admin RBAC: Tenant A Admin Export', () => {
    it('should return all sales records for Tenant A across all agents', async () => {
      const res = await request(app)
        .get('/api/reports/sales')
        .set('Authorization', `Bearer ${adminAToken}`);

      expect(res.status).toBe(200);
      const csv = res.text;

      // Verify records from Agent A in Tenant A
      expect(csv).toContain('Acme Corp');
      expect(csv).toContain('Globex A');
      expect(csv).toContain('Tenant A Customer');

      // Verify records from Agent A2 in Tenant A
      expect(csv).toContain('Initech A');
      expect(csv).toContain('Tenant A Special Deal');

      // Verify records from Tenant B are completely absent
      expect(csv).not.toContain('Tenant B Client');
      expect(csv).not.toContain('Wayne Enterprises B');
      expect(csv).not.toContain('Tenant B Customer');
      expect(csv).not.toContain('Umbrella Corp B');
    });
  });

  describe('Agent RBAC: Tenant A Agent Export', () => {
    it('should return only the authenticated agent own sales records and exclude peer agent records', async () => {
      const res = await request(app)
        .get('/api/reports/sales')
        .set('Authorization', `Bearer ${agentAToken}`);

      expect(res.status).toBe(200);
      const csv = res.text;

      // Agent A's own records MUST be present
      expect(csv).toContain('Acme Corp');
      expect(csv).toContain('Globex A');
      expect(csv).toContain('Tenant A Customer');

      // Agent A2's records in the same tenant MUST be absent for Agent A
      expect(csv).not.toContain('Initech A');
      expect(csv).not.toContain('Tenant A Special Deal');

      // Tenant B records MUST be absent
      expect(csv).not.toContain('Tenant B Client');
      expect(csv).not.toContain('Wayne Enterprises B');
    });

    it('should return only Agent A2 records when Agent A2 requests export', async () => {
      const res = await request(app)
        .get('/api/reports/sales')
        .set('Authorization', `Bearer ${agentA2Token}`);

      expect(res.status).toBe(200);
      const csv = res.text;

      // Agent A2's records MUST be present
      expect(csv).toContain('Initech A');
      expect(csv).toContain('Tenant A Special Deal');

      // Agent A's records MUST be absent
      expect(csv).not.toContain('Acme Corp');
      expect(csv).not.toContain('Globex A');
      expect(csv).not.toContain('Tenant A Customer');
    });
  });

  describe('Admin RBAC: Tenant B Admin Export', () => {
    it('should return all sales records for Tenant B and none for Tenant A', async () => {
      const res = await request(app)
        .get('/api/reports/sales')
        .set('Authorization', `Bearer ${adminBToken}`);

      expect(res.status).toBe(200);
      const csv = res.text;

      // Tenant B records MUST be present
      expect(csv).toContain('Tenant B Client');
      expect(csv).toContain('Wayne Enterprises B');
      expect(csv).toContain('Tenant B Customer');
      expect(csv).toContain('Umbrella Corp B');

      // Tenant A records MUST be absent
      expect(csv).not.toContain('Acme Corp');
      expect(csv).not.toContain('Globex A');
      expect(csv).not.toContain('Initech A');
    });
  });
});
