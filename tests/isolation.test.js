const request = require('supertest');
const app = require('../src/index');

describe('Tenant Isolation & Security Tests', () => {
  let adminAToken;
  let agentAToken;
  let adminBToken;

  beforeAll(async () => {
    // Login as Tenant A Admin
    const resAdminA = await request(app)
      .post('/api/auth/login')
      .send({ email: 'adminA@example.com', password: 'secret123' });
    adminAToken = resAdminA.body.token;

    // Login as Tenant A Agent
    const resAgentA = await request(app)
      .post('/api/auth/login')
      .send({ email: 'agentA@example.com', password: 'secret123' });
    agentAToken = resAgentA.body.token;

    // Login as Tenant B Admin
    const resAdminB = await request(app)
      .post('/api/auth/login')
      .send({ email: 'adminB@example.com', password: 'secret123' });
    adminBToken = resAdminB.body.token;
  });

  // MANDATORY SPECIFICATION TEST
  it('Tenant Isolation: Tenant A cannot access Tenant B records', async () => {
    // 1. Call GET /api/reports/sales using Tenant A admin credentials
    const response = await request(app)
      .get('/api/reports/sales')
      .set('Authorization', `Bearer ${adminAToken}`);

    // 2. Verify status and CSV format
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/csv/);

    const csvContent = response.text;
    const lines = csvContent.trim().split(/\r?\n/);

    // 3. Verify exact CSV header
    expect(lines[0]).toBe('id,amount,sale_date,client_name');

    // 4. Assert that known Tenant A data is present
    expect(csvContent).toContain('Acme Corp');
    expect(csvContent).toContain('Globex A');
    expect(csvContent).toContain('Tenant A Customer');
    expect(csvContent).toContain('Initech A');
    expect(csvContent).toContain('Tenant A Special Deal');

    // 5. Assert that known Tenant B data is strictly ABSENT
    expect(csvContent).not.toContain('Tenant B Client');
    expect(csvContent).not.toContain('Wayne Enterprises B');
    expect(csvContent).not.toContain('Tenant B Customer');
    expect(csvContent).not.toContain('Umbrella Corp B');
  });

  it('Tenant Isolation: Tenant A cannot access Tenant B records even with malicious tenant_id query parameter', async () => {
    // Malicious attempt: Tenant A Admin specifies tenant_id=2 (Tenant B's ID) in query param
    const response = await request(app)
      .get('/api/reports/sales?tenant_id=2')
      .set('Authorization', `Bearer ${adminAToken}`);

    expect(response.status).toBe(200);
    const csvContent = response.text;

    // Response MUST still contain ONLY Tenant A records
    expect(csvContent).toContain('Acme Corp');
    expect(csvContent).toContain('Globex A');

    // Response MUST NOT leak any Tenant B records
    expect(csvContent).not.toContain('Tenant B Client');
    expect(csvContent).not.toContain('Wayne Enterprises B');
    expect(csvContent).not.toContain('Tenant B Customer');
    expect(csvContent).not.toContain('Umbrella Corp B');
  });

  it('Tenant Isolation: Tenant B cannot access Tenant A records even with malicious tenant_id query parameter', async () => {
    // Malicious attempt: Tenant B Admin specifies tenant_id=1 (Tenant A's ID) in query param
    const response = await request(app)
      .get('/api/reports/sales?tenant_id=1')
      .set('Authorization', `Bearer ${adminBToken}`);

    expect(response.status).toBe(200);
    const csvContent = response.text;

    // Response MUST contain Tenant B records
    expect(csvContent).toContain('Tenant B Client');
    expect(csvContent).toContain('Wayne Enterprises B');

    // Response MUST NOT leak any Tenant A records
    expect(csvContent).not.toContain('Acme Corp');
    expect(csvContent).not.toContain('Globex A');
  });

  it('Role & Tenant Isolation: Agent cannot access other agents or tenants via query parameter tampering', async () => {
    // Malicious attempt: Agent A requests with query params attempting to elevate access or cross tenants/agents
    const response = await request(app)
      .get('/api/reports/sales?tenant_id=2&agent_id=3&role=admin')
      .set('Authorization', `Bearer ${agentAToken}`);

    expect(response.status).toBe(200);
    const csvContent = response.text;

    // Must contain Agent A records
    expect(csvContent).toContain('Acme Corp');
    expect(csvContent).toContain('Globex A');

    // Must NOT contain Agent A2 records or Tenant B records
    expect(csvContent).not.toContain('Initech A');
    expect(csvContent).not.toContain('Tenant A Special Deal');
    expect(csvContent).not.toContain('Tenant B Client');
    expect(csvContent).not.toContain('Wayne Enterprises B');
  });
});
