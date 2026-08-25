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

The backend runs on Ian's Mac mini (launchd service `com.voiceclaw.rtl-business`, plain `node mcp-servers/unified-server.js`, `PORT=8106`), exposed at `https://rtl-business.voiceclaw.ca` via Cloudflare Tunnel. It previously ran on Render's free tier; that service was deleted and the backend migrated on 2026-07-05.

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

`configure-complete-system.js` defaults to the deployed mini URL if no argument is passed.

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

---

## Corrected Architecture (v2)

A reference implementation of the corrected design lives in [`architecture-v2/`](architecture-v2/).
It fixes the gaps between the live v1 assistant and the "100% accuracy" goal, and is
built around one rule:

> **The model is the interface, not the source.** It has tools; it calls them; the
> tools are the only source of truth. If a tool returns "no data," the agent says
> "no data" — never guesses.

The accuracy equation:

> Accuracy = the query is correct × the data is correct × the answer adds/drops/invents nothing.

Three lanes:

```
caller's question
   ├──► QUERY lane      → queries.js (deterministic, read-only) ──► live DB
   ├──► RETRIEVAL lane  → policy-rag/ (markdown, with source citations)
   └──► ACTION lane     → guarded mutation (explicit confirm)
```

The eight recommendations it implements (see `architecture-v2/ARCHITECTURE.md` for detail):

1. Kill the duplicate policy — the prompt contains **zero** facts; policy lives only in `policy-rag/`.
2. Live DB via the `db.js` seam, not hand-edited JSON.
3. Citations + verbatim numbers (name the source; never paraphrase an amount).
4. Curated read-only query catalog (`queries.js`) — never free-form SQL.
5. Deterministic high-stakes facts (`approvalThreshold`, `paymentTerm`, `hstRate`).
6. A "constitution" (`constitution.md`) — glossary + schema + business rules fed to the model.
7. Ambiguity-safe unit lookup — ask "which one?" instead of silently picking.
8. An audit log (`audit.log`) — every Q → tool → result → timestamp.

## How to follow this architecture on the RTL app later

The RTL portal (work-order + leasing features) is the **system of record**. When the
chat/voice layer ("talk to your data") is added on top, follow this pattern:

1. **Keep the portal database as the single source of truth.** The chat layer never
   holds its own copy of numbers. `architecture-v2/db.js` is the seam — each getter
   maps to a portal query (`SELECT …`), so swap the sample data for real queries.

2. **Build the chat as a tool-grounded agent, not a freeform generator.** Expose the
   owner's questions as a *curated read-only query catalog* (`queries.js`):
   `openWorkOrders()`, `revenueBilled(division, period)`, `revenueCollected(...)`,
   `overdueInspections()`, `overduePayments()`, `activeLeases()`, `fleetSummary()`,
   `unitHistory(...)`, plus the deterministic facts (`approvalThreshold`,
   `paymentTerm`, `hstRate`). To add a question, add a function — never free-form SQL.

3. **Feed it the constitution.** `architecture-v2/constitution.md` is the glossary +
   schema + business rules. It makes "open", "overdue", and "billed vs collected"
   unambiguous — the difference between a wrong answer that's technically correct and
   a right one.

4. **Three lanes, three accuracy profiles.**
   - *Fact queries* (counts, dollar totals, statuses) → deterministic functions, essentially 100% accurate.
   - *Document questions* (policy, "summarize WO 456") → retrieve + cite + verbatim numbers, labeled as generated.
   - *Actions* (create WO, mark invoiced) → explicit confirmation, typed read-back for VINs / part numbers / amounts.

5. **Show your work.** Every answer cites the query it ran or the policy section it
   read. Log every call to `audit.log` so a wrong answer can be traced and fixed at
   the source.

6. **Voice: read back precise values.** Fine for retrieval ("how many open work
   orders?"); require typed confirmation for precise input (unit numbers, VINs,
   dollar amounts).
