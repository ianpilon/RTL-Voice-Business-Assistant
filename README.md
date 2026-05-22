# RTL Voice Business Assistant

A voice AI business assistant for RTL, a reefer trailer leasing and fleet operation. Internal staff (drivers, dispatchers, shop, fleet managers) call a phone number and the assistant answers fleet, vendor, policy, and procurement questions, and validates new procurement requests before they reach Andrea's procurement team.

(The repo name and folder layout still say "procurement system" for historical reasons; the live product covers a broader internal-ops scope.)

## What it does

Callers can:

- **Look up a reefer trailer by unit number** — get its status (in yard, on road, leased, in shop), location, current driver and load, lease info, mileage, and next service date.
- **Search the approved vendor list** — find vendors by skill or past job (Carrier reefer repair, tire retreading, telematics, refrigerant, mobile roadside, etc.) with discount history and rating.
- **Ask procurement and policy questions** — payment terms, approval levels, vendor onboarding, contract templates, CAD/HST, WSIB and insurance requirements.
- **Submit a procurement request** — the assistant collects budget number, milestones, costs, and description, validates completeness, and only routes complete requests to the procurement team.

The system prompt and policies are Canadian-fleet-specific: CAD currency, Ontario HST, WSIB clearance, EPA Section 608 / Environment Canada refrigerant certification, dispatcher emergency roadside authority up to 10,000 CAD.

## Architecture

```
Caller → Vapi (phone + STT/TTS + GPT-4 function calling) → Express server → JSON / markdown data
```

- **Voice layer:** Vapi assistant configured with the system prompt in `procurement-services-prompt.txt` and four function tools.
- **Backend:** single Node/Express server, `mcp-servers/unified-server.js`.
- **Data:** flat files in `mcp-servers/` — no database.

### Backend endpoints

| Endpoint | Purpose |
|---|---|
| `POST /lookup-asset` | Reefer trailer lookup by unit number. Tolerant matching across "1042", "RTL-1042", and "trailer ten oh four two". |
| `POST /search-vendors` | Keyword-scored search of the approved vendor list. |
| `POST /search-policies` | Keyword-scored search over policy markdown chunked on `##` / `###` headers. |
| `POST /validate-request` | Checks required procurement-request fields and returns the list of any that are missing. |
| `GET /health` | Counts of trailers, vendors, and policy chunks loaded. |
| `POST /reload` | Reload all three data sources without restarting. |
| `GET /data/trailers` | Read-only view of the trailer database (debugging / UI). |
| `GET /data/vendors` | Read-only view of the vendor database. |
| `GET /data/policies` | Read-only view of the policy chunks grouped by file. |

### Data sources

- `mcp-servers/asset-context/asset-database.json` — 15 reefer trailers.
- `mcp-servers/vendor-context/vendor-database.json` — 12 approved vendors.
- `mcp-servers/procurement-rag/procurement-docs/` — 4 policy markdown files (contract templates, payment rules, procurement FAQ, vendor onboarding), chunked at load time.

## Deployment

The backend runs on Render. `render.yaml` builds with `npm install` and starts with `node mcp-servers/unified-server.js`, with `/health` as the health check.

`npm start` runs the same entrypoint locally.

## Local development

```bash
npm install
npm start
```

The server listens on `PORT` (defaults to 3001).

To expose it to Vapi during development, tunnel with ngrok and point the Vapi assistant's tool URLs at the tunnel:

```bash
ngrok http 3001
```

## Configuration

Environment variables (loaded via `dotenv`):

- `PORT` — server port (default 3001).
- `VAPI_API_KEY` — only needed by the `configure-*.js` and `update-vapi-*.js` helper scripts that push assistant config to Vapi. The runtime server itself does not call the Vapi API.
- `OPENAI_API_KEY` — only used by helper scripts that touch OpenAI; the runtime server does not call OpenAI directly (Vapi handles that).

## Updating data

- **Trailers:** edit `mcp-servers/asset-context/asset-database.json`.
- **Vendors:** edit `mcp-servers/vendor-context/vendor-database.json`.
- **Policies:** add or edit markdown files in `mcp-servers/procurement-rag/procurement-docs/`. Section chunking uses `##` headers, with `###` subsection splits inside long sections.

After any change, hit `POST /reload` to refresh in place without restarting.

## Assistant prompt

The full conversation flow, tool-use rules, tone, and policy reference is in `procurement-services-prompt.txt`. Editing that file changes how the assistant behaves on calls; it is pushed into the Vapi assistant via the helper scripts in the repo root, not loaded by the server at runtime.

## Repo notes

The repo root contains a number of legacy `server-*.js` files and `MEMORY-*.md` design docs from earlier experiments (Hume EVI, memory backends, WebSocket bridges). They are not part of the live system — `mcp-servers/unified-server.js` is the only server that runs in production.
