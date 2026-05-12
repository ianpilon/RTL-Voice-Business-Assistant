# MCP Servers

This folder contains all Model Context Protocol (MCP) servers for the IOG Legal Services AI.

## Structure

```
mcp-servers/
├── employee-context/          # Employee lookup and context
│   ├── server.js             # Server implementation
│   └── employee-database.json # Employee data
│
└── legal-rag/                # Legal policy document search
    ├── server.js             # Server implementation
    └── legal-docs/           # Policy documents folder
        ├── sample-policy.txt
        └── social-media-policy.txt
```

## What are MCP Servers?

MCP (Model Context Protocol) servers provide context and data to AI assistants. Each server:
- Runs independently
- Has its own data storage
- Exposes API endpoints
- Gets called by Vapi when the AI needs information

## Available Servers

### 1. Employee Context Server
**Port:** 3002
**Purpose:** Look up employees by name to provide context

**Features:**
- Employee lookup by name
- Team and department information
- Communication preferences
- Past legal interaction history
- Project and specialty tracking

**Start:**
```bash
cd mcp-servers/employee-context
node server.js
```

**Test:**
```bash
curl -X POST http://localhost:3002/lookup-employee \
  -H "Content-Type: application/json" \
  -d '{"name":"Billy"}'
```

### 2. Legal RAG Server
**Port:** 3001
**Purpose:** Search legal policy documents

**Features:**
- Keyword-based document search
- Supports .txt and .md files
- Returns top 3 relevant sections
- Hot-reload documents

**Start:**
```bash
cd mcp-servers/legal-rag
node server.js
```

**Test:**
```bash
curl -X POST http://localhost:3001/search-policies \
  -H "Content-Type: application/json" \
  -d '{"query":"social media policy"}'
```

## Starting All Servers

From the project root:

```bash
# Start employee context server
cd mcp-servers/employee-context && node server.js &

# Start legal RAG server
cd mcp-servers/legal-rag && node server.js &
```

Or use the convenience script (from project root):
```bash
npm run start:mcp
```

## Adding New MCP Servers

When adding a new MCP server:

1. Create a new folder: `mcp-servers/your-server-name/`
2. Add `server.js` and any data files
3. Document the port and purpose
4. Add startup commands to this README
5. Update the main project README

## Best Practices

- **One server per concern** (employee data, policies, etc.)
- **Keep data local** in each server's folder
- **Use relative paths** for portability
- **Document API endpoints** in each server
- **Version your data** (backup JSON files)
- **Test independently** before integrating with Vapi

## Ports Reference

| Server | Port | Purpose |
|--------|------|---------|
| Legal RAG | 3001 | Policy document search |
| Employee Context | 3002 | Employee lookup |
| (Future) | 3003+ | Additional servers |
