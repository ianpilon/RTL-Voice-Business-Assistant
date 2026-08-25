# architecture-v2 — Corrected Architecture (reference)

This folder is the **target architecture** for the RTL assistant, rebuilt from eight
accuracy recommendations. It is a *reference implementation* — it runs standalone
with sample data, and it documents the patterns to adopt.

> The v1 files at the repo root (`system-prompt.txt`, `mcp-servers/unified-server.js`)
> are still the **live deployment**. Do not overwrite them. Migrate to this design
> deliberately: deploy the new `system-prompt.txt`, then point `db.js` at the live
> portal database, then swap the search/query paths one at a time.

## Files

| File | Purpose |
|---|---|
| `ARCHITECTURE.md` | The corrected design: three lanes, accuracy equation, canonical source, observability |
| `constitution.md` | Glossary + schema + business rules + routing (feed this to the model) |
| `system-prompt.txt` | Lean grounded prompt — zero policy content, citation + verbatim + read-back rules |
| `db.js` | Data adapter — the seam where the live portal DB plugs in |
| `queries.js` | Curated read-only query catalog (the accuracy guarantee) |
| `server.js` | HTTP layer: ambiguity-safe lookup, cited policy search, `/query` dispatch, audit log |
| `policy-rag/` | Policy markdown — the single source of truth for policy text |

## The eight recommendations this implements

1. Kill the duplicate policy (prompt has zero facts).
2. Live DB via the `db.js` seam, not hand-edited JSON.
3. Citations + verbatim numbers.
4. Curated query catalog (`queries.js`).
5. Deterministic high-stakes facts (`approvalThreshold`, `paymentTerm`, `hstRate`).
6. Constitution (glossary/schema/rules) fed to the model.
7. Ambiguity-safe unit lookup (ask, never silently pick).
8. Audit log (`audit.log`).

## Run it

```bash
cd architecture-v2
npm install
npm start        # listens on :3001
```

Then, e.g.:

```bash
curl -X POST localhost:3001/query \
  -H 'Content-Type: application/json' \
  -d '{"function":"approvalThreshold","arguments":{"amount":75000}}'
```

## The migration path (when you're ready)

1. Deploy `architecture-v2/system-prompt.txt` into Vapi.
2. Replace the sample data in `db.js` with real queries to the portal database.
3. Replace the keyword vendor/policy search with embeddings.
4. Add the guarded action lane (mutations with confirmation).
