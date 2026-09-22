const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/index');

describe('Authentication API & Middleware Tests', () => {

  describe('POST /api/auth/login', () => {
    it('should return 200 and a valid JWT on valid login for Tenant A Admin', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'adminA@example.com',
          password: 'secret123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');

      // Decode and verify JWT payload
      const decoded = jwt.decode(response.body.token);
      expect(decoded).toBeDefined();
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('tenantId', 1);
      expect(decoded).toHaveProperty('role', 'admin');
    });

    it('should return 200 and a valid JWT on valid login for Tenant A Agent', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'agentA@example.com',
          password: 'secret123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');

      const decoded = jwt.decode(response.body.token);
      expect(decoded).toBeDefined();
      expect(decoded).toHaveProperty('userId', 2);
      expect(decoded).toHaveProperty('tenantId', 1);
      expect(decoded).toHaveProperty('role', 'agent');
    });

    it('should return 200 and a valid JWT on valid login for Tenant B Admin', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'adminB@example.com',
          password: 'secret123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');

      const decoded = jwt.decode(response.body.token);
      expect(decoded).toBeDefined();
      expect(decoded).toHaveProperty('tenantId', 2);
      expect(decoded).toHaveProperty('role', 'admin');
    });

    it('should return 401 on invalid password for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'adminA@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid credentials' });
    });

    it('should return 401 on nonexistent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'secret123',
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid credentials' });
    });

    it('should return 401 when email or password is missing', async () => {
      const responseNoPassword = await request(app)
        .post('/api/auth/login')
        .send({ email: 'adminA@example.com' });
      expect(responseNoPassword.status).toBe(401);

      const responseNoEmail = await request(app)
        .post('/api/auth/login')
        .send({ password: 'secret123' });
      expect(responseNoEmail.status).toBe(401);
    });
  });

  describe('Authentication Middleware on Protected Routes', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const response = await request(app).get('/api/reports/sales');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 when Authorization header is malformed (no Bearer prefix)', async () => {
      const response = await request(app)
        .get('/api/reports/sales')
        .set('Authorization', 'InvalidToken123');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 when JWT token is invalid or signed with wrong secret', async () => {
      const fakeToken = jwt.sign(
        { userId: 1, tenantId: 1, role: 'admin' },
        'wrong-secret-key'
      );

      const response = await request(app)
        .get('/api/reports/sales')
        .set('Authorization', `Bearer ${fakeToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 when JWT token is garbage string', async () => {
      const response = await request(app)
        .get('/api/reports/sales')
        .set('Authorization', 'Bearer not-a-valid-jwt-token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
