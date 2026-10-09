# NexusAI Inventory & Order Management Platform

A production-grade, multi-tenant Inventory, Product, Customer, and Manual Order Management Platform with a native **Remote Model Context Protocol (MCP)** server over **Streamable HTTP** and **OAuth 2.1** authorization.

Designed for serverless deployment on **Vercel** with a free-tier managed PostgreSQL database (**Neon**).

---

## 1. System Architecture

```
                    ┌────────────────────────────┐
                    │ AI Assistant (Claude, etc) │
                    └─────────────┬──────────────┘
                                  │ OAuth 2.1 (PKCE S256)
                                  │ MCP over Streamable HTTP (JSON-RPC 2.0)
                                  ▼
                    ┌────────────────────────────┐
                    │    POST /api/mcp Endpoint  │
                    └─────────────┬──────────────┘
                                  │
                                  ▼
      ┌────────────────────────────────────────────────────────┐
      │   Authorization, Tenant Isolation & Confirmation Policy│
      └───────────────────────────┬────────────────────────────┘
                                  │
                                  ▼
      ┌────────────────────────────────────────────────────────┐
      │                  Shared Business Logic                 │
      │  (Inventory Ledger, Manual Orders, Packing, Shipping)  │
      └───────────────────────────┬────────────────────────────┘
                                  │
                                  ▼
      ┌────────────────────────────────────────────────────────┐
      │         PostgreSQL Database (Neon / Vercel PG)         │
      │       with Embedded Transactional Engine Fallback      │
      └────────────────────────────────────────────────────────┘
                                  ▲
                                  │
                    ┌─────────────┴──────────────┐
                    │    Human Web Dashboard     │
                    │   (React 19 + Tailwind v4) │
                    └────────────────────────────┘
```

---

## 2. Core Features

### Web Dashboard
- **Executive KPIs**: Real-time physical, reserved, and available stock (`Available = Physical - Reserved`), stockout alerts, cash collected vs uncollected receivables.
- **Product Management**: Full CRUD, SKU uniqueness per tenant, purchase cost vs retail price, inventory thresholds.
- **Inventory Ledger**: Immutable stock movement ledger (`OPENING_STOCK`, `STOCK_RECEIVED`, `MANUAL_ADJUSTMENT`, `STOCK_RESERVED`, `RESERVATION_RELEASED`, `ORDER_DISPATCHED`, `RETURN_APPROVED_FOR_RESALE`, `DAMAGED_GOODS`).
- **Manual Order Desk**: Multi-item line item entry, instant stock reservation, live exact decimal calculation (`Subtotal - Discount + Shipping`), status lifecycle transitions (`NEW` → `CONFIRMED` → `PROCESSING` → `PACKED` → `SHIPPED` → `DELIVERED`).
- **Packing Management**: Packing queue, item checklists, and formal printable packing slips with shipping address and line items.
- **Shipping & Dispatch**: Carrier assignment, tracking number, atomic deduction of physical stock and release of reserved stock.
- **Payments**: Partial advances, multi-payment allocation, cash flow vs receivable balance tracking.
- **Returns Inspection**: Quarantined returns, inspection for damaged vs sellable condition, resale approval with ledger restoration.
- **Reporting & Exports**: Date-filtered sales velocity, gross vs net revenue, inventory valuations, and CSV exports.
- **AI Activity & Audit**: Real-time execution logs with actor attribution and human confirmation approvals.

### Remote MCP Server
- **Endpoint**: `POST /api/mcp`
- **Protocol**: Streamable HTTP with JSON-RPC 2.0 (`2024-11-05` specification).
- **Tool Registry**: Over 70 tools spanning products, stock, customers, orders, packing, shipping, payments, returns, and reports.
- **Resources**: `inventory://summary`, `inventory://low-stock`, `orders://recent`, `orders://packing-queue`, `reports://dashboard`.
- **Prompts**: `daily_business_summary`, `prepare_packing_list`, `identify_low_stock`, `review_unpaid_orders`, etc.
- **Confirmation Policy**: High-impact modifications (`adjust_inventory`, `create_order`, `cancel_order`, `mark_order_shipped`, `record_payment`) require confirmation token or explicit user confirmation.

### OAuth 2.1 Authorization Server
- `/.well-known/oauth-authorization-server` (RFC 8414)
- `/.well-known/oauth-protected-resource` (RFC 9728)
- PKCE using SHA-256 (`S256`) challenge verification
- Dynamic Client Registration (RFC 7591)
- Token revocation (RFC 7009)
- Instant 1-click personal access token generation for rapid desktop client connection.

---

## 3. Free-Tier Deployment Guide (Vercel + Neon)

### Step 1: Create Free Neon PostgreSQL Database
1. Go to [neon.tech](https://neon.tech) and create a free tier account.
2. Create a new project (e.g. `nexus-inventory`).
3. Copy the pooled connection string from your Neon dashboard:
   ```
   postgres://username:password@ep-sample-1234.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. **Automated Migration (No Manual SQL Execution Needed)**:
   - **Method A (Web Dashboard - Recommended)**: Open **Settings** in the web app, paste your connection string under **Connect to Neon PostgreSQL**, and click **Connect & Activate Neon Database**. All 18 schema tables are created, verified, and migrated automatically in one step.
   - **Method B (Automated CLI)**: Run `npm run db:migrate` with your database URL:
     ```bash
     DATABASE_URL="YOUR_NEON_DATABASE_URL" npm run db:migrate
     ```
   - **Method C (Manual Fallback)**: If you prefer manual execution via `psql` or the Neon SQL Editor:
     ```bash
     psql "YOUR_NEON_DATABASE_URL" -f server/db/schema.sql
     ```

### Step 2: Configure Environment Variables
Create `.env` using `.env.example`:
```env
DATABASE_URL="postgres://username:password@ep-sample-1234.us-east-2.aws.neon.tech/neondb?sslmode=require"
AUTH_SECRET="your_32_character_random_hex_secret_key"
APP_URL="https://your-project.vercel.app"
MCP_SERVER_URL="https://your-project.vercel.app/api/mcp"
```

### Step 3: Deploy to Vercel
1. Push your repository to GitHub.
2. In [vercel.com](https://vercel.com), click **Add New Project** and select your GitHub repository.
3. Add the environment variables configured in Step 2 under **Settings > Environment Variables**.
4. Click **Deploy**.

*Note on Free Tier Limits*:
- **Neon Free Tier**: Includes 0.5 GiB storage, scale-to-zero compute after 5 minutes of inactivity, and up to 100 simultaneous pooled connections.
- **Vercel Free Hobby Tier**: 100 GB bandwidth/month, 10s max serverless function execution timeout.

---

## 4. Connecting AI Assistants via MCP

### Endpoints
The Streamable HTTP MCP server is available at two interchangeable paths:
- `http://localhost:3000/mcp` (OpenAI / standard default)
- `http://localhost:3000/api/mcp` (Vercel API route)

### MCP Inspector
Test the server locally using the official inspector:
```bash
npx @modelcontextprotocol/inspector
```
Select **Streamable HTTP** transport and connect to:
```
http://localhost:3000/mcp
```

### OpenAI ChatGPT & Codex Integration
NexusAI fully adheres to OpenAI's developer specifications:
1. **Server Instructions**: Returns high-priority initialization guidance in `instructions` (order verification, confirmation rules).
2. **Tool Safety Annotations**: Declares `readOnlyHint`, `destructiveHint`, and `openWorldHint` across all tools.
3. **Structured Content**: Tools return both `structuredContent` and readable `content` text blocks.
4. **Account Identification (`_meta["openai/profile"]`)**: Exposes `get_profile` tool marked with `_meta: { "openai/profile": true }` to identify connected accounts and multi-account workspaces.
5. **Company Knowledge Compatibility**: Implements standard `search` and `fetch` tools for company knowledge citation indexing.
6. **SEP-2640 Skills Extension**: Implements `io.modelcontextprotocol/skills` extension advertising:
   - `skills/list`: Paginated skill manifest with SHA-256 digests.
   - `skills/get`: Fetching full skill metadata by URI.
   - `resources/read`: Fetching supporting skill markdown documents (`skill://nexus-inventory/inventory-order-ops/...`).

### Claude Desktop
Open your Claude Desktop configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the following configuration:
```json
{
  "mcpServers": {
    "nexus-inventory": {
      "url": "https://your-project.vercel.app/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ACCESS_TOKEN"
      }
    }
  }
}
```
*(You can generate your token in one click under the **MCP & OAuth 2.1** page in the dashboard).*

### Testing with cURL
```bash
curl -X POST "http://localhost:3000/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_dashboard_summary",
      "arguments": {}
    }
  }'
```

---

## 5. Automated Verification & Testing

Run all unit, integration, isolation, and security tests:
```bash
# In the Web Dashboard: Open "Automated Tests" tab and click "Run All Automated Tests"
# Or run via API:
curl -s http://localhost:3000/api/tests/run
```

Tests verify:
- Accurate available stock calculation (`Physical - Reserved`)
- Oversell rejection under concurrent orders
- Atomic stock decrement and reservation release on order dispatch
- Quarantined returns until inspection approval
- OpenAI profile metadata and company knowledge `search`/`fetch`
- OAuth 2.1 RFC 7636 PKCE S256 challenge verification
- Cross-workspace tenant data isolation

