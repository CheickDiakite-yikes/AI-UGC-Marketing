# Predi AI Database Management API

## Overview

The Database Management API provides full control over your PostgreSQL database through REST endpoints. This API is designed for AI coding agents, automation tools, and external integrations to manage database schema and data.

## Authentication

All API endpoints require authentication via API key.

### Header Format
```
x-api-key: YOUR_API_KEY
```

Or using Bearer token format:
```
Authorization: Bearer YOUR_API_KEY
```

### Getting Your API Key

The API key is stored in the `DB_API_KEY` environment variable. You can find it in the Replit Secrets panel.

### Authentication Errors

| Status Code | Error Message | Solution |
|-------------|---------------|----------|
| 401 | Unauthorized | Provide valid API key in `x-api-key` header |
| 503 | DB_API_KEY not configured | Set the `DB_API_KEY` environment variable |

---

## Base URL

```
https://YOUR-REPLIT-URL/api/db
```

Replace `YOUR-REPLIT-URL` with your Replit app's URL.

---

## Endpoints Reference

### 1. List Available Endpoints

Get a list of all available API endpoints.

```http
GET /api/db
```

**Response:**
```json
{
  "endpoints": {
    "GET /api/db?action=tables": "List all tables",
    "GET /api/db?action=schema&table=tablename": "Get table schema",
    "POST /api/db/query": "Execute SELECT query",
    "POST /api/db/execute": "Execute INSERT/UPDATE/DELETE",
    "POST /api/db/table": "Create a new table",
    "DELETE /api/db/table?name=tablename": "Drop a table",
    "GET /api/db/rows?table=tablename": "Get all rows from table",
    "POST /api/db/rows": "Insert row into table",
    "PUT /api/db/rows": "Update row in table",
    "DELETE /api/db/rows?table=tablename&id=rowid": "Delete row from table"
  }
}
```

---

### 2. List All Tables

Get a list of all tables in the database.

```http
GET /api/db?action=tables
```

**Response:**
```json
{
  "tables": ["users", "boards", "assets", "generated_items", "messages", "brand_identities", "avatar_identities"]
}
```

---

### 3. Get Table Schema

Get the column definitions for a specific table.

```http
GET /api/db?action=schema&table=users
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| table | string | Yes | Name of the table |

**Response:**
```json
{
  "schema": [
    {
      "column_name": "id",
      "data_type": "uuid",
      "is_nullable": "NO",
      "column_default": "gen_random_uuid()"
    },
    {
      "column_name": "email",
      "data_type": "text",
      "is_nullable": "YES",
      "column_default": null
    }
  ]
}
```

---

### 4. Execute SELECT Query

Run a SELECT query and get results.

```http
POST /api/db/query
Content-Type: application/json
```

**Request Body:**
```json
{
  "query": "SELECT * FROM users WHERE email = $1",
  "params": ["user@example.com"]
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| query | string | Yes | SQL SELECT query (only SELECT allowed) |
| params | array | No | Parameterized query values (for $1, $2, etc.) |

**Response:**
```json
{
  "rows": [
    {
      "id": "abc-123",
      "email": "user@example.com",
      "name": "John Doe"
    }
  ],
  "rowCount": 1,
  "fields": ["id", "email", "name"]
}
```

**Error (non-SELECT query):**
```json
{
  "error": "Only SELECT queries allowed. Use /api/db/execute for mutations."
}
```

---

### 5. Execute Mutation Query

Run INSERT, UPDATE, DELETE, or DDL statements.

```http
POST /api/db/execute
Content-Type: application/json
```

**Request Body:**
```json
{
  "query": "UPDATE users SET name = $1 WHERE id = $2",
  "params": ["Jane Doe", "abc-123"]
}
```

**Response:**
```json
{
  "success": true,
  "rowCount": 1,
  "rows": []
}
```

---

### 6. Create Table

Create a new database table.

```http
POST /api/db/table
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "products",
  "columns": [
    {
      "name": "id",
      "type": "uuid",
      "primary": true,
      "default": "gen_random_uuid()"
    },
    {
      "name": "name",
      "type": "text",
      "nullable": false
    },
    {
      "name": "price",
      "type": "integer"
    },
    {
      "name": "sku",
      "type": "text",
      "unique": true
    },
    {
      "name": "created_at",
      "type": "timestamp",
      "default": "now()"
    }
  ]
}
```

**Column Options:**
| Option | Type | Description |
|--------|------|-------------|
| name | string | Column name (required) |
| type | string | PostgreSQL data type (required) |
| primary | boolean | Mark as primary key |
| nullable | boolean | Allow NULL values (default: true) |
| unique | boolean | Enforce unique constraint |
| default | string | Default value expression |

**Common PostgreSQL Types:**
- `uuid` - Universally unique identifier
- `text` - Variable-length string
- `integer` / `bigint` - Whole numbers
- `boolean` - True/false
- `timestamp` - Date and time
- `jsonb` - JSON data
- `numeric(p,s)` - Decimal numbers

**Response:**
```json
{
  "success": true,
  "message": "Table \"products\" created",
  "query": "CREATE TABLE IF NOT EXISTS \"products\" (\"id\" uuid PRIMARY KEY DEFAULT gen_random_uuid(), ...)"
}
```

---

### 7. Drop Table

Delete a table and all its data.

```http
DELETE /api/db/table?name=products
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | Yes | Table name to drop |

**Response:**
```json
{
  "success": true,
  "message": "Table \"products\" dropped"
}
```

**Warning:** This action is irreversible and removes all data in the table.

---

### 8. Get All Rows

Retrieve rows from a table with pagination.

```http
GET /api/db/rows?table=users&limit=10&offset=0
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| table | string | - | Table name (required) |
| limit | integer | 100 | Max rows to return |
| offset | integer | 0 | Skip this many rows |
| orderBy | string | created_at | Column to sort by |
| order | string | DESC | Sort direction (ASC/DESC) |

**Response:**
```json
{
  "rows": [
    {
      "id": "abc-123",
      "email": "user@example.com",
      "name": "John Doe",
      "created_at": "2026-01-13T00:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

---

### 9. Insert Row

Add a new row to a table.

```http
POST /api/db/rows
Content-Type: application/json
```

**Request Body:**
```json
{
  "table": "users",
  "data": {
    "email": "newuser@example.com",
    "name": "New User"
  }
}
```

**Response:**
```json
{
  "success": true,
  "row": {
    "id": "def-456",
    "email": "newuser@example.com",
    "name": "New User",
    "created_at": "2026-01-13T00:00:00.000Z"
  }
}
```

---

### 10. Update Row

Modify an existing row.

```http
PUT /api/db/rows
Content-Type: application/json
```

**Request Body:**
```json
{
  "table": "users",
  "id": "abc-123",
  "idColumn": "id",
  "data": {
    "name": "Updated Name"
  }
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| table | string | Yes | Table name |
| id | string | Yes | Row identifier value |
| idColumn | string | No | ID column name (default: "id") |
| data | object | Yes | Fields to update |

**Response:**
```json
{
  "success": true,
  "row": {
    "id": "abc-123",
    "email": "user@example.com",
    "name": "Updated Name",
    "created_at": "2026-01-13T00:00:00.000Z"
  }
}
```

---

### 11. Delete Row

Remove a row from a table.

```http
DELETE /api/db/rows?table=users&id=abc-123
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| table | string | Yes | Table name |
| id | string | Yes | Row identifier value |
| idColumn | string | No | ID column name (default: "id") |

**Response:**
```json
{
  "success": true,
  "deleted": {
    "id": "abc-123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

## Usage Examples

### cURL Examples

**List tables:**
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://YOUR-URL/api/db?action=tables"
```

**Create a table:**
```bash
curl -X POST \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"products","columns":[{"name":"id","type":"uuid","primary":true,"default":"gen_random_uuid()"},{"name":"name","type":"text"}]}' \
  "https://YOUR-URL/api/db/table"
```

**Insert a row:**
```bash
curl -X POST \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"table":"users","data":{"email":"test@example.com","name":"Test"}}' \
  "https://YOUR-URL/api/db/rows"
```

### JavaScript/TypeScript Examples

```typescript
const API_KEY = process.env.DB_API_KEY;
const BASE_URL = 'https://your-app.replit.app/api/db';

const headers = {
  'x-api-key': API_KEY,
  'Content-Type': 'application/json'
};

// List all tables
const tables = await fetch(`${BASE_URL}?action=tables`, { headers })
  .then(r => r.json());

// Insert a new user
const newUser = await fetch(`${BASE_URL}/rows`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    table: 'users',
    data: { email: 'user@example.com', name: 'John' }
  })
}).then(r => r.json());

// Run a custom query
const results = await fetch(`${BASE_URL}/query`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    query: 'SELECT * FROM users WHERE created_at > $1',
    params: ['2026-01-01']
  })
}).then(r => r.json());
```

### Python Examples

```python
import requests

API_KEY = "YOUR_API_KEY"
BASE_URL = "https://your-app.replit.app/api/db"

headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

# List all tables
response = requests.get(f"{BASE_URL}?action=tables", headers=headers)
tables = response.json()

# Insert a row
response = requests.post(
    f"{BASE_URL}/rows",
    headers=headers,
    json={
        "table": "users",
        "data": {"email": "user@example.com", "name": "John"}
    }
)
new_user = response.json()

# Execute a query
response = requests.post(
    f"{BASE_URL}/query",
    headers=headers,
    json={
        "query": "SELECT COUNT(*) FROM users",
        "params": []
    }
)
result = response.json()
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes:**
| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (missing parameters, invalid input) |
| 401 | Unauthorized (invalid or missing API key) |
| 404 | Not Found (row doesn't exist) |
| 500 | Server Error (database error) |
| 503 | Service Unavailable (DB_API_KEY not configured) |

---

## Security Best Practices

1. **Never expose your API key** in client-side code or public repositories
2. **Rotate your API key** periodically by updating the `DB_API_KEY` environment variable
3. **Use parameterized queries** ($1, $2, etc.) to prevent SQL injection
4. **Limit access** to only the endpoints and operations you need
5. **Monitor usage** for unusual patterns or unauthorized access attempts

---

## Current Database Schema

The following tables are pre-configured:

| Table | Description |
|-------|-------------|
| users | User accounts |
| boards | Content boards/projects |
| assets | Media assets (logos, images, PDFs) |
| generated_items | AI-generated content |
| messages | Chat/conversation history |
| brand_identities | Brand styling configuration |
| avatar_identities | Avatar/persona settings |

Use `GET /api/db?action=schema&table=tablename` to see the full column definitions for each table.
