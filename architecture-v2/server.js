// server.js — Corrected HTTP layer for the RTL voice assistant.
//
// Changes vs v1:
//   - unit lookup returns ALL matches and asks on ambiguity (never silent includes)
//   - policy results carry a source + section citation
//   - /query dispatches to the curated read-only catalog (queries.js)
//   - every call is written to audit.log
//
// Data comes from db.js (the seam where the live DB plugs in).

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { functions } = require('./queries');

const app = express();
const port = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Audit log (recommendation #8) — Q → tool → result → timestamp
// ---------------------------------------------------------------------------
const AUDIT_LOG = path.join(__dirname, 'audit.log');
function audit(entry) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
  fs.appendFile(AUDIT_LOG, line + '\n', () => {});
}

function toolCallId(req) {
  return req.body.message?.toolCallList?.[0]?.id
    || req.body.message?.toolCalls?.[0]?.id
    || 'unknown';
}

// ---------------------------------------------------------------------------
// Unit normalization + ambiguity-safe lookup (recommendation #7)
// ---------------------------------------------------------------------------
function normalizeUnit(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function findTrailers(unitNumber) {
  const target = normalizeUnit(unitNumber);
  if (!target) return { matches: [] };

  // 1. exact match
  const exact = db.getTrailers().filter(t => normalizeUnit(t.unit_number) === target);
  if (exact.length) return { matches: exact };

  // 2. ends-with (e.g. "1002" matches "RTL-1002")
  const ends = db.getTrailers().filter(t => normalizeUnit(t.unit_number).endsWith(target));
  if (ends.length) return { matches: ends };

  // 3. contains — return ALL candidates; NEVER pick one silently
  const contains = db.getTrailers().filter(t => normalizeUnit(t.unit_number).includes(target));
  return { matches: contains };
}

function describeTrailer(t) {
  const STATUS_PHRASE = {
    in_yard: 'in the yard, ready for dispatch',
    on_road: 'on the road',
    leased:  'out on lease',
    in_shop: 'in the shop for service'
  };
  let line = `Trailer ${t.unit_number} is ${STATUS_PHRASE[t.status] || t.status} at ${t.location}.`;
  if (t.status === 'on_road' && t.current_driver) line += ` Driver ${t.current_driver} hauling ${t.current_load}.`;
  if (t.status === 'leased' && t.leased_to) line += ` Leased to ${t.leased_to} through ${t.lease_end_date}.`;
  if (t.status === 'in_shop' && t.notes) line += ` ${t.notes}.`;
  line += ` Mileage ${(t.mileage || 0).toLocaleString()}; next service due ${t.next_service_due}.`;
  return line;
}

// ---------------------------------------------------------------------------
// Asset lookup endpoint
// ---------------------------------------------------------------------------
app.post('/lookup-asset', (req, res) => {
  const id = toolCallId(req);
  const unitNumber = req.body.unit_number
    || req.body.parameters?.unit_number
    || req.body.message?.toolCallList?.[0]?.function?.arguments?.unit_number
    || req.body.message?.toolCalls?.[0]?.function?.arguments?.unit_number;

  audit({ tool: 'lookup_asset', unit_number: unitNumber, result: 'pending' });

  if (!unitNumber) {
    return res.status(400).json({ results: [{ toolCallId: id, result: 'Error: unit_number is required' }] });
  }

  const { matches } = findTrailers(unitNumber);

  if (matches.length === 0) {
    const r = `I couldn't find a trailer matching "${unitNumber}" in our fleet.`;
    audit({ tool: 'lookup_asset', unit_number: unitNumber, result: 'not_found' });
    return res.json({ results: [{ toolCallId: id, result: r }] });
  }

  if (matches.length > 1) {
    // Ambiguity — ask, never pick silently.
    const names = matches.map(m => m.unit_number).join(', ');
    const r = `That matches more than one unit: ${names}. Which one did you mean?`;
    audit({ tool: 'lookup_asset', unit_number: unitNumber, result: 'ambiguous', matches: names });
    return res.json({ results: [{ toolCallId: id, result: r }] });
  }

  const r = describeTrailer(matches[0]);
  audit({ tool: 'lookup_asset', unit_number: unitNumber, result: matches[0].unit_number });
  return res.json({ results: [{ toolCallId: id, result: r }] });
});

// ---------------------------------------------------------------------------
// Policy search — with source + section citation (recommendation #3)
// ---------------------------------------------------------------------------
const POLICY_DIR = path.join(__dirname, 'policy-rag');
let documents = [];

function loadDocuments() {
  documents = [];
  if (!fs.existsSync(POLICY_DIR)) return;
  for (const file of fs.readdirSync(POLICY_DIR)) {
    if (!/\.(md|txt)$/.test(file)) continue;
    const content = fs.readFileSync(path.join(POLICY_DIR, file), 'utf8');
    for (const section of content.split(/(?=##\s)/g).filter(s => s.trim())) {
      const headerLine = section.split('\n')[0].replace(/^#+\s*/, '').trim();
      documents.push({ filename: file, section: headerLine, content: section.trim() });
    }
  }
}

function searchDocuments(query) {
  const keywords = String(query || '').toLowerCase().split(' ').filter(w => w.length > 3);
  return documents
    .map(doc => {
      const lower = doc.content.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        score += (lower.match(new RegExp(kw, 'g')) || []).length;
        if (doc.section.toLowerCase().includes(kw)) score += 10;
      }
      return { ...doc, score };
    })
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

app.post('/search-policies', (req, res) => {
  const id = toolCallId(req);
  const query = req.body.query
    || req.body.parameters?.query
    || req.body.message?.toolCallList?.[0]?.function?.arguments?.query
    || req.body.message?.toolCalls?.[0]?.function?.arguments?.query;

  audit({ tool: 'search_policies', query, result: 'pending' });

  if (!query) {
    return res.status(400).json({ results: [{ toolCallId: id, result: 'Error: query is required' }] });
  }

  const results = searchDocuments(query);
  if (!results.length) {
    const r = 'No policy found for that query.';
    audit({ tool: 'search_policies', query, result: 'no_results' });
    return res.json({ results: [{ toolCallId: id, result: r }] });
  }

  // Citation: name the file + section so the model can quote the source.
  const cited = results.map(r => `[Source: ${r.filename} — ${r.section}] ${r.content}`).join(' ');
  audit({ tool: 'search_policies', query, result: 'ok', sources: results.map(r => `${r.filename}#${r.section}`) });
  return res.json({ results: [{ toolCallId: id, result: cited }] });
});

// ---------------------------------------------------------------------------
// Vendor search — keyword (TODO: replace with embeddings for recall, rec #5)
// ---------------------------------------------------------------------------
function searchVendors(query) {
  const q = String(query || '').toLowerCase();
  const keywords = q.split(' ').filter(w => w.length > 3);
  return db.getVendors()
    .map(v => {
      let score = 0;
      if (v.name.toLowerCase().includes(q)) score += 10;
      for (const kw of keywords) {
        for (const s of (v.skills || [])) if (s.toLowerCase().includes(kw)) score += 5;
        for (const p of (v.pastProjects || [])) if (p.toLowerCase().includes(kw)) score += 3;
      }
      return { ...v, score };
    })
    .filter(v => v.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

app.post('/search-vendors', (req, res) => {
  const id = toolCallId(req);
  const query = req.body.query
    || req.body.parameters?.query
    || req.body.message?.toolCallList?.[0]?.function?.arguments?.query;

  audit({ tool: 'search_vendors', query, result: 'pending' });

  const results = searchVendors(query);
  if (!results.length) {
    audit({ tool: 'search_vendors', query, result: 'no_results' });
    return res.json({ results: [{ toolCallId: id, result: 'No vendors found matching that criteria.' }] });
  }
  const text = results.map(v => `${v.name}: ${(v.skills || []).join(', ')}. Discount ${v.averageDiscount}, rating ${v.rating}.`).join(' ');
  audit({ tool: 'search_vendors', query, result: 'ok', count: results.length });
  return res.json({ results: [{ toolCallId: id, result: text }] });
});

// ---------------------------------------------------------------------------
// Query lane — dispatch to the curated read-only catalog (recommendation #4)
// ---------------------------------------------------------------------------
app.post('/query', (req, res) => {
  const id = toolCallId(req);
  const fnName = req.body.function
    || req.body.name
    || req.body.function_name
    || req.body.parameters?.function
    || req.body.message?.toolCallList?.[0]?.function?.name;

  const args = req.body.arguments
    || req.body.params
    || req.body.parameters?.arguments
    || req.body.message?.toolCallList?.[0]?.function?.arguments
    || {};

  audit({ tool: 'query', function: fnName, args });

  const fn = functions[fnName];
  if (!fn) {
    return res.json({ results: [{ toolCallId: id, result: `Unknown query function: ${fnName}. Allowed: ${Object.keys(functions).join(', ')}` }] });
  }

  const result = fn(args || {});
  audit({ tool: 'query', function: fnName, result: 'ok' });
  return res.json({ results: [{ toolCallId: id, result: JSON.stringify(result) }] });
});

// ---------------------------------------------------------------------------
// Utility endpoints
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    trailers: db.getTrailers().length,
    vendors: db.getVendors().length,
    documents: documents.length,
    functions: Object.keys(functions)
  });
});

app.post('/reload', (req, res) => {
  loadDocuments();
  res.json({ success: true, documents: documents.length });
});

app.get('/data/trailers', (req, res) => res.json({ trailers: db.getTrailers() }));
app.get('/data/vendors', (req, res) => res.json({ vendors: db.getVendors() }));

loadDocuments();

app.listen(port, () => {
  console.log(`RTL Business Assistant (v2) listening on :${port}`);
  console.log(`Curated query functions: ${Object.keys(functions).join(', ')}`);
});
