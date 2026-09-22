# Multi-Tenant CSV Export API with Functional Isolation Tests

A robust, production-style, multi-tenant sales reporting REST API built with Node.js, Express.js, PostgreSQL, and JWT-based Role-Based Access Control (RBAC).

---

## 1. Project Overview

This API allows multi-tenant organizations to export sales reporting data securely in RFC 4180-compliant CSV format. It strictly enforces tenant isolation and role-based permissions at the database query layer.

---

## 2. Architecture

```text
Client Request
  ↓
[POST /api/auth/login] ──> Verifies bcrypt password in PostgreSQL ──> Issues signed JWT
  ↓
[GET /api/reports/sales] (with Authorization: Bearer <JWT>)
  ↓
[Auth Middleware] ──> Verifies JWT with JWT_SECRET ──> Sets req.user = { userId, tenantId, role }
  ↓
[Report Controller] ──> Enforces RBAC & constructs parameterized SQL query
  ↓
[PostgreSQL Database] ──> Returns isolated tenant dataset
  ↓
[CSV Formatter] ──> Generates RFC 4180 CSV with headers
  ↓
Client Response: Content-Type: text/csv, Content-Disposition: attachment; filename="sales_report.csv"
```

---

## 3. Multi-Tenancy Model

This service employs a **Shared Database, Shared Schema** multi-tenancy architecture:
- Every tenant-owned table (`users`, `sales_records`) contains a mandatory `tenant_id` foreign key referencing the `tenants` table.
- Composite and foreign-key indexes (`idx_sales_records_tenant_id`, `idx_sales_records_tenant_agent`) ensure high query performance and data segregation.
- PostgreSQL constraints enforce referential integrity with cascading deletions on tenant teardown.

---

## 4. Role-Based Access Control (RBAC)

The API defines two distinct user roles:

| Role | Permissions | SQL Query Constraint |
| :--- | :--- | :--- |
| **`admin`** | Can view **all** sales records belonging to their tenant across all agents. | `WHERE tenant_id = $1` |
| **`agent`** | Can view **only their own** sales records within their tenant. | `WHERE tenant_id = $1 AND agent_id = $2` |

---

## 5. Security & Tenant Isolation

1. **Zero-Trust Client Multi-Tenancy**:
   - `tenant_id` is **NEVER** accepted from query parameters (`?tenant_id=...`), request bodies, or unverified custom headers.
   - Any query parameters attempting to switch tenants or agents are strictly ignored.
   - The verified JWT payload (`req.user.tenantId`, `req.user.userId`, `req.user.role`) is the single source of truth for authorization and query scoping.
2. **SQL Injection Prevention**:
   - All queries use parameterized statements (`$1`, `$2`). No string concatenation or template literals are used in SQL.
3. **Password Security**:
   - Plaintext passwords are never stored or logged. Passwords are salted and hashed using `bcrypt` (cost factor 10).
4. **Sanitized Error Handling**:
   - Database errors and internal exceptions are caught by centralized middleware. Stack traces and PostgreSQL internals are never exposed to clients; generic 500 (`{"error": "Internal server error"}`) responses are returned.

---

## 6. Seeded Test Accounts

The database is pre-seeded with the following credentials (all passwords are `secret123`):

| Tenant | Email | Role | Accessible Sales Records |
| :--- | :--- | :--- | :--- |
| **Tenant A** (ID: 1) | `adminA@example.com` | `admin` | All Tenant A records (Agent A & Agent A2) |
| **Tenant A** (ID: 1) | `agentA@example.com` | `agent` | Only Agent A's records |
| **Tenant A** (ID: 1) | `agentA2@example.com` | `agent` | Only Agent A2's records |
| **Tenant B** (ID: 2) | `adminB@example.com` | `admin` | All Tenant B records |
| **Tenant B** (ID: 2) | `agentB@example.com` | `agent` | Only Agent B's records |

---

## 7. API Endpoints

### Health Checks (Public)
- `GET /` & `GET /health`
  - Response (`200 OK`):
    ```json
    { "status": "ok" }
    ```

### Authentication
- `POST /api/auth/login`
  - Request:
    ```json
    {
      "email": "adminA@example.com",
      "password": "secret123"
    }
    ```
  - Response (`200 OK`):
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
    }
    ```
  - Error Response (`401 Unauthorized`):
    ```json
    {
      "error": "Invalid credentials"
    }
    ```

### Reports
- `GET /api/reports/sales`
  - Headers: `Authorization: Bearer <JWT>`
  - Response (`200 OK`):
    - `Content-Type: text/csv`
    - `Content-Disposition: attachment; filename="sales_report.csv"`
  - Body (RFC 4180 CSV):
    ```csv
    id,amount,sale_date,client_name
    1,12500.50,2026-01-15,Acme Corp
    2,8300.00,2026-02-10,Globex A
    ```

---

## 8. Setup & Running with Docker

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for running tests locally outside containers)

### 1. Copy Environment Configuration
```bash
cp .env.example .env
```

### 2. Build and Start Services
```bash
docker compose up --build -d
```

### 3. Check Container Health
```bash
docker compose ps
```
Both `multitenant-db` and `multitenant-api` will report `healthy`.

### 4. Stop Services
```bash
docker compose down
```
To also reset the database volume:
```bash
docker compose down -v
```

---

## 9. Running Tests

### Run Full Test Suite via Shell Script
```bash
./run-tests.sh
```

### Run Tests via NPM
```bash
npm test
```
