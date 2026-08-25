// db.js — Data adapter (the "data is correct" seam).
//
// This is the SINGLE place the app reads business data. Every getter must, in
// production, query the live portal database. Right now it returns SAMPLE
// in-memory data so the architecture runs standalone.
//
// RULE: never hand-edit JSON as the source of truth. The live DB is the source
// of truth; this file is the seam where it plugs in.

// ---------------------------------------------------------------------------
// SAMPLE DATA — replace each getter body with a real DB query.
// ---------------------------------------------------------------------------

const trailers = [
  { unit_number: 'RTL-1001', status: 'in_yard',  location: 'Toronto Yard', next_service_due: '2026-10-12', mileage: 87420 },
  { unit_number: 'RTL-1002', status: 'on_road',  location: 'I-90 near Cleveland', current_driver: 'Mike Petrov', current_load: 'Frozen seafood', next_service_due: '2026-08-28', mileage: 142880 },
  { unit_number: 'RTL-1003', status: 'leased',   location: 'Mississauga', leased_to: 'Maple Logistics', lease_end_date: '2026-08-31', next_service_due: '2026-07-15', mileage: 198560 },
  { unit_number: 'RTL-1004', status: 'in_shop',  location: 'Carrier Toronto', notes: 'Compressor replacement', next_service_due: '2026-11-08', mileage: 245100 }
];

const vendors = [
  { name: 'Polar Refrigeration Services', skills: ['Carrier reefer repair', 'compressor replacement'], averageDiscount: '5%', rating: '4.6/5' },
  { name: 'Thermal Edge Mobile Service',  skills: ['mobile reefer repair', 'roadside'], averageDiscount: '0%', rating: '4.5/5' }
];

const workOrders = [
  { wo_id: 'WO-9001', unit_number: 'RTL-1004', customer: 'Maple Logistics', status: 'in_repair', opened_at: '2026-05-08', estimate_amount: 4200, actual_amount: null, warranty: false },
  { wo_id: 'WO-9002', unit_number: 'RTL-1002', customer: 'Internal', status: 'open', opened_at: '2026-05-11', estimate_amount: 800, actual_amount: null, warranty: true },
  { wo_id: 'WO-9003', unit_number: 'RTL-1003', customer: 'Northern Foods', status: 'closed', opened_at: '2026-04-02', estimate_amount: 1500, actual_amount: 1475, warranty: false }
];

const invoices = [
  { invoice_id: 'INV-5001', customer: 'Maple Logistics', amount: 4200, issued_at: '2026-04-15', due_at: '2026-05-15', paid_at: null, status: 'unpaid', division: 'service' },
  { invoice_id: 'INV-5002', customer: 'Apex Distribution', amount: 3000, issued_at: '2026-04-01', due_at: '2026-05-01', paid_at: '2026-04-20', status: 'paid', division: 'leasing' },
  { invoice_id: 'INV-5003', customer: 'Northern Foods', amount: 1475, issued_at: '2026-04-20', due_at: '2026-05-20', paid_at: null, status: 'unpaid', division: 'service' }
];

const leases = [
  { lease_id: 'L-100', customer: 'Maple Logistics', unit_number: 'RTL-1003', term_months: 24, end_date: '2026-08-31', monthly_rate: 1850, status: 'active' },
  { lease_id: 'L-101', customer: 'Apex Distribution', unit_number: 'RTL-1011', term_months: 12, end_date: '2026-06-30', monthly_rate: 1900, status: 'active' }
];

module.exports = {
  getTrailers:    () => trailers,     // → SELECT * FROM trailers
  getVendors:     () => vendors,      // → SELECT * FROM vendors
  getWorkOrders:  () => workOrders,   // → SELECT * FROM work_orders
  getInvoices:    () => invoices,     // → SELECT * FROM invoices
  getLeases:      () => leases        // → SELECT * FROM leases
};
