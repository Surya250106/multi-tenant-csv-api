-- Seed data for Multi-Tenant CSV Export API

-- 1. Insert Tenants
INSERT INTO tenants (id, name) VALUES
(1, 'Tenant A'),
(2, 'Tenant B')
ON CONFLICT (id) DO NOTHING;

-- Reset serial sequence for tenants
SELECT setval(pg_get_serial_sequence('tenants', 'id'), COALESCE(max(id), 1)) FROM tenants;

-- 2. Insert Users (Password is 'secret123' hashed with bcrypt)
-- Hash: $2a$10$l2FKm0/52vwGKMfU9dUpKu3Qjmvxe/1NtZ7NTqEWFFw5weEk0WI3y -> 'secret123'
INSERT INTO users (id, tenant_id, email, password_hash, role) VALUES
(1, 1, 'adminA@example.com', '$2a$10$l2FKm0/52vwGKMfU9dUpKu3Qjmvxe/1NtZ7NTqEWFFw5weEk0WI3y', 'admin'),
(2, 1, 'agentA@example.com', '$2a$10$l2FKm0/52vwGKMfU9dUpKu3Qjmvxe/1NtZ7NTqEWFFw5weEk0WI3y', 'agent'),
(3, 1, 'agentA2@example.com', '$2a$10$l2FKm0/52vwGKMfU9dUpKu3Qjmvxe/1NtZ7NTqEWFFw5weEk0WI3y', 'agent'),
(4, 2, 'adminB@example.com', '$2a$10$l2FKm0/52vwGKMfU9dUpKu3Qjmvxe/1NtZ7NTqEWFFw5weEk0WI3y', 'admin'),
(5, 2, 'agentB@example.com', '$2a$10$l2FKm0/52vwGKMfU9dUpKu3Qjmvxe/1NtZ7NTqEWFFw5weEk0WI3y', 'agent')
ON CONFLICT (email) DO NOTHING;

-- Reset serial sequence for users
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(max(id), 1)) FROM users;

-- 3. Insert Sales Records
INSERT INTO sales_records (id, tenant_id, agent_id, amount, sale_date, client_name) VALUES
-- Tenant A Sales (Agent A - User 2)
(1, 1, 2, 12500.50, '2026-01-15', 'Acme Corp'),
(2, 1, 2, 8300.00, '2026-02-10', 'Globex A'),
(3, 1, 2, 450.75, '2026-03-01', 'Tenant A Customer'),
-- Tenant A Sales (Agent A2 - User 3)
(4, 1, 3, 9900.00, '2026-03-05', 'Initech A'),
(5, 1, 3, 15000.00, '2026-03-12', 'Tenant A Special Deal'),
-- Tenant B Sales (Agent B - User 5)
(6, 2, 5, 22000.00, '2026-01-20', 'Tenant B Client'),
(7, 2, 5, 45000.00, '2026-02-18', 'Wayne Enterprises B'),
(8, 2, 5, 3100.25, '2026-03-10', 'Tenant B Customer'),
(9, 2, 5, 17500.00, '2026-03-15', 'Umbrella Corp B')
ON CONFLICT (id) DO NOTHING;

-- Reset serial sequence for sales_records
SELECT setval(pg_get_serial_sequence('sales_records', 'id'), COALESCE(max(id), 1)) FROM sales_records;
