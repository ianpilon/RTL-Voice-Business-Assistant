# RTL Voice Business Assistant

A voice AI business assistant for RTL, a reefer trailer leasing and fleet operation. Internal staff (drivers, dispatchers, shop, fleet managers) call a phone number and the assistant handles three things: trailer status lookups, approved vendor search, and policy questions.

## What it does

Callers can:

- **Look up a reefer trailer by unit number** — get its status (in yard, on road, leased, in shop), location, current driver and load, lease info, mileage, and next service date.
- **Search the approved vendor list** — find vendors by skill or past job (Carrier reefer repair, tire retreading, telematics, refrigerant, mobile roadside, etc.) with discount history and rating.
- **Ask policy questions** — payment terms, approval levels, vendor onboarding requirements, contract templates, CAD/HST, WSIB and insurance rules.

The system prompt and policies are Canadian-fleet-specific: CAD currency, Ontario HST, WSIB clearance, EPA Section 608 / Environment Canada refrigerant certification, dispatcher emergency roadside authority up to 10,000 CAD.

## Architecture

```
Caller → Vapi (phone + STT/TTS + GPT-4 function calling) → Express server → JSON / markdown data
```

- **Voice layer:** Vapi assistant configured with the system prompt in `system-prompt.txt` and three function tools.
- **Backend:** single Node/Express server, `mcp-servers/unified-server.js`.
- **Data:** flat files in `mcp-servers/` — no database.

### Backend endpoints

| Endpoint | Purpose |
|---|---|
| `POST /lookup-asset` | Reefer trailer lookup by unit number. Tolerant matching across "1042", "RTL-1042", and "trailer ten oh four two". |
| `POST /search-vendors` | Keyword-scored search of the approved vendor list. |
| `POST /search-policies` | Keyword-scored search over policy markdown chunked on `##` / `###` headers. |
| `GET /health` | Counts of trailers, vendors, and policy chunks loaded. |
| `POST /reload` | Reload all three data sources without restarting. |
| `GET /data/trailers` | Read-only view of the trailer database (debugging / UI). |
| `GET /data/vendors` | Read-only view of the vendor database. |
| `GET /data/policies` | Read-only view of the policy chunks grouped by file. |

### Data sources

- `mcp-servers/asset-context/asset-database.json` — 15 reefer trailers.
- `mcp-servers/vendor-context/vendor-database.json` — 12 approved vendors.
- `mcp-servers/policy-rag/` — 4 policy markdown files (contract templates, payment rules, policy FAQ, vendor onboarding), chunked at load time.

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
node configure-complete-system.js https://your-ngrok-url.ngrok-free.app
```

`configure-complete-system.js` defaults to the deployed Render URL if no argument is passed.

## Configuration

Environment variables (loaded via `dotenv`):

- `PORT` — server port (default 3001).
- `VAPI_API_KEY` and `VAPI_ASSISTANT_ID` — only needed by `configure-complete-system.js` to push assistant config to Vapi. The runtime server itself does not call the Vapi API.

## Updating data

- **Trailers:** edit `mcp-servers/asset-context/asset-database.json`.
- **Vendors:** edit `mcp-servers/vendor-context/vendor-database.json`.
- **Policies:** add or edit markdown files in `mcp-servers/policy-rag/`. Section chunking uses `##` headers, with `###` subsection splits inside long sections.

After any change, hit `POST /reload` to refresh in place without restarting.

## Assistant prompt

The full conversation flow, tool-use rules, tone, and policy reference is in `system-prompt.txt`. Editing that file does not change the deployed assistant on its own; run `node configure-complete-system.js` to push the updated prompt into Vapi.
