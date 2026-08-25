# Architecture (corrected)

## The one rule

**The model is the interface, not the source.** It has tools; it calls them; the
tools are the only source of truth. If a tool returns "no data," the agent says
"no data" — never guesses.

## Accuracy equation

> Accuracy = the query is correct × the data is correct × the answer adds/drops/invents nothing.

- **Query correct** → curated read-only functions (`queries.js`), never free-form SQL.
- **Data correct** → `db.js` reads the live database, never a hand-edited snapshot.
- **Answer faithful** → citations + verbatim numbers + "no data" discipline (`system-prompt.txt`).

## Three lanes

```
caller's question
      │
      ▼
  intent router (the LLM's function-calling, guided by the routing table in constitution.md)
      │
      ├──► QUERY lane       → queries.js (deterministic, read-only) ────► live DB
      ├──► RETRIEVAL lane   → policy-rag/ (markdown, with source citations) ──► files
      └──► ACTION lane      → guarded mutation (explicit confirm) ───────► (future)
                                    │
                                    ▼
                          LLM formats into English,
                          citing the query it ran / the section it read
```

## Canonical source (no duplicates)

| Kind of content | Single source of truth | Must NOT appear in |
|---|---|---|
| Glossary / schema / definitions | `constitution.md` | (this is fine to feed the model) |
| Numbers, thresholds, rates | `queries.js` (deterministic) | `system-prompt.txt` |
| Long-form policy text | `policy-rag/*.md` | `system-prompt.txt` |
| Live records (trailers, WOs, invoices, leases) | the portal database (via `db.js`) | any JSON snapshot |

The v1 bug: policy text was in BOTH the prompt and `policy-rag/`. Two copies drift,
and the model could answer without calling the tool. That's gone.

## Observability

- Every answer is a tool result or cites a source.
- Every call is logged to `audit.log` (Q → tool → result → timestamp), so a wrong
  answer can be traced back to its cause and the cause fixed at the source.

## Why this is "as close to 100% as the industry gets"

For the **fact-query class** (statuses, counts, dollar totals, thresholds), the answer
is a deterministic function of the live database — no generation, so no hallucination.
For the **document class** (policy explanation), the answer is grounded in retrieved
text with a citation, and numbers are quoted verbatim — labeled as generated, never
presented as authoritative.
