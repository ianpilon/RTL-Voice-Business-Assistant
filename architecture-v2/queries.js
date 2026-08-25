// queries.js — Curated READ-ONLY query catalog (the "query lane").
//
// This is the accuracy guarantee: the agent can call ONLY these hand-verified
// functions, never free-form SQL. Each is deterministic and read-only.
// Every function takes a single `args` object (or nothing) — this is the shape
// LLM tool-calling passes named arguments in.

const db = require('./db');

// ---------------------------------------------------------------------------
// Deterministic high-stakes facts — the SINGLE source of truth for these values.
// (Do NOT also put these numbers in the system prompt or in prose policy.)
// ---------------------------------------------------------------------------

const APPROVAL_LADDER = [
  { min: 0,        max: 5000,     approver: 'Shop Supervisor' },
  { min: 5000,     max: 25000,    approver: 'Fleet Manager' },
  { min: 25000,    max: 100000,   approver: 'Controller' },
  { min: 100000,   max: 500000,   approver: 'CFO' },
  { min: 500000,   max: Infinity, approver: 'CEO (board notification)' }
];

function approvalThreshold(args = {}) {
  const a = Number(args.amount);
  if (isNaN(a)) return { error: 'invalid amount' };
  const rung = APPROVAL_LADDER.find(r => a >= r.min && a < r.max)
    || APPROVAL_LADDER[APPROVAL_LADDER.length - 1];
  return { amount: a, approver: rung.approver };
}

const PAYMENT_TERMS = {
  standard:            'Net 30',
  capital_over_50k:    'Net 60',
  roadside:            'Net 15',
  customer_lease:      'Monthly in advance, due 1st, 5-day grace'
};

function paymentTerm(args = {}) {
  const context = args.context;
  if (!PAYMENT_TERMS[context]) {
    return { error: 'unknown context', known: Object.keys(PAYMENT_TERMS) };
  }
  return { context, term: PAYMENT_TERMS[context] };
}

function hstRate() {
  return { rate: '13%', jurisdiction: 'Ontario', note: '5% GST + 8% Ontario' };
}

// ---------------------------------------------------------------------------
// Aggregate / money queries (the owner's questions)
// ---------------------------------------------------------------------------

function openWorkOrders() {
  const open = db.getWorkOrders().filter(wo => !['closed', 'cancelled'].includes(wo.status));
  return {
    count: open.length,
    items: open.map(wo => ({ wo_id: wo.wo_id, unit: wo.unit_number, customer: wo.customer, status: wo.status }))
  };
}

function revenueBilled(args = {}) {
  const { division, period } = args;
  const items = db.getInvoices()
    .filter(i => !division || division === 'all' || i.division === division);
  const total = items.reduce((s, i) => s + i.amount, 0);
  return { division: division || 'all', period: period || 'unspecified', billed: total, note: 'billed = issued, not collected' };
}

function revenueCollected(args = {}) {
  const { division, period } = args;
  const items = db.getInvoices()
    .filter(i => i.paid_at && (!division || division === 'all' || i.division === division));
  const total = items.reduce((s, i) => s + i.amount, 0);
  return { division: division || 'all', period: period || 'unspecified', collected: total, note: 'collected = payments received' };
}

function overdueInspections() {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = db.getTrailers().filter(t => t.next_service_due && t.next_service_due < today);
  return { count: overdue.length, items: overdue.map(t => ({ unit: t.unit_number, next_service_due: t.next_service_due })) };
}

function overduePayments() {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = db.getInvoices().filter(i => i.status === 'unpaid' && i.due_at < today);
  return { count: overdue.length, items: overdue.map(i => ({ invoice_id: i.invoice_id, customer: i.customer, amount: i.amount, due_at: i.due_at })) };
}

function activeLeases() {
  const active = db.getLeases().filter(l => ['assigned', 'active'].includes(l.status));
  return { count: active.length, items: active.map(l => ({ lease_id: l.lease_id, customer: l.customer, unit: l.unit_number, end_date: l.end_date })) };
}

function fleetSummary() {
  const ts = db.getTrailers();
  const byStatus = {};
  for (const t of ts) byStatus[t.status] = (byStatus[t.status] || 0) + 1;
  return { total: ts.length, byStatus };
}

function unitHistory(args = {}) {
  const target = String(args.unitNumber || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const wos = db.getWorkOrders().filter(wo =>
    wo.unit_number && wo.unit_number.toUpperCase().replace(/[^A-Z0-9]/g, '').includes(target));
  return { unit: args.unitNumber, work_orders: wos };
}

// ---------------------------------------------------------------------------
// Whitelist — the ONLY functions the /query endpoint may dispatch to.
// ---------------------------------------------------------------------------

module.exports = {
  functions: {
    approvalThreshold, paymentTerm, hstRate,
    openWorkOrders, revenueBilled, revenueCollected,
    overdueInspections, overduePayments, activeLeases,
    fleetSummary, unitHistory
  }
};
