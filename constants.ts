import { Invoice, InvoiceStatus, Vendor, PurchaseOrder, GoodsReceipt } from './types';

// ─── Vendor master ─────────────────────────────────────────────────

export const seedVendors: Vendor[] = [
  { id: 'V001', vendor_code: 'PIONEER',   vendor_name: 'Pioneer Inc.',         tax_id: '83-4521987', status: 'active', payment_terms: 'Net 30', country: 'US' },
  { id: 'V002', vendor_code: 'APEX',      vendor_name: 'Apex & Co.',           tax_id: '61-7834521', status: 'active', payment_terms: 'Net 45', country: 'CA' },
  { id: 'V003', vendor_code: 'NOVA',      vendor_name: 'NovaCorp AG',          tax_id: '74-2198345', status: 'active', payment_terms: 'Net 60', country: 'UK' },
  { id: 'V004', vendor_code: 'GLOBALLOG', vendor_name: 'Global Logistics',     tax_id: '52-8763412', status: 'active', payment_terms: 'Net 30', country: 'DE' },
  { id: 'V005', vendor_code: 'STARLIGHT', vendor_name: 'Starlight S.A.',       tax_id: '39-5672198', status: 'active', payment_terms: 'Net 45', country: 'FR' },
  { id: 'V006', vendor_code: 'ASTRA',     vendor_name: 'Astra Industries',     tax_id: '47-1234567', status: 'active', payment_terms: 'Net 30', country: 'CN' },
  { id: 'V007', vendor_code: 'JUPITER',   vendor_name: 'Jupiter & Jupiter',    tax_id: '58-9876543', status: 'active', payment_terms: 'Net 45', country: 'IN' },
  { id: 'V008', vendor_code: 'ACCENTURE', vendor_name: 'Accenture Consulting', tax_id: '66-1357924', status: 'active', payment_terms: 'Net 30', country: 'US' },
  { id: 'V009', vendor_code: 'CAPGEMINI', vendor_name: 'Capgemini Solutions',  tax_id: '72-4681357', status: 'active', payment_terms: 'Net 30', country: 'US' },
  { id: 'V010', vendor_code: 'BAYES',     vendor_name: 'Bayes Enterprises',    tax_id: '85-3692581', status: 'active', payment_terms: 'Net 60', country: 'BR' },
  { id: 'V011', vendor_code: 'LILLY',     vendor_name: 'Lilly Enterprises',    tax_id: '91-7412589', status: 'active', payment_terms: 'Net 30', country: 'MX' },
];

// ─── PO master — one line per invoice in the seed ──────────────────

export const seedPurchaseOrders: PurchaseOrder[] = [
  { id: 'P-88291-1', po_number: 'PO-88291-ENT', line_number: 1, vendor_code: 'PIONEER',   sku: 'CON-STR-10ML', description: 'Industrial Containers - 10ml', unit_price: 1.50,   quantity: 1200, tolerance_pct: 0.005, currency: 'USD', po_date: '2026-02-01' },
  { id: 'P-99281-1', po_number: 'PO-99281-ENT', line_number: 1, vendor_code: 'APEX',      sku: 'VLV-REG-02',   description: 'Regulator Valve',              unit_price: 0.85,   quantity: 2500, tolerance_pct: 0.005, currency: 'USD', po_date: '2026-03-10' },
  { id: 'P-77281-1', po_number: 'PO-77281-ENT', line_number: 1, vendor_code: 'NOVA',      sku: 'NOVA-A-9',     description: 'Specialty Compound',           unit_price: 104.25, quantity: 100,  tolerance_pct: 0.005, currency: 'USD', po_date: '2026-03-15' },
  { id: 'P-66281-1', po_number: 'PO-66281-ENT', line_number: 1, vendor_code: 'GLOBALLOG', sku: 'FRT-EU-01',    description: 'Freight Services EU',          unit_price: 15.00,  quantity: 100,  tolerance_pct: 0.005, currency: 'USD', po_date: '2026-02-20' },
  { id: 'P-55281-1', po_number: 'PO-55281-ENT', line_number: 1, vendor_code: 'STARLIGHT', sku: 'STR-LX-04',    description: 'Luxury Specialty',             unit_price: 22.50,  quantity: 20,   tolerance_pct: 0.005, currency: 'EUR', po_date: '2026-03-01' },
  { id: 'P-44281-1', po_number: 'PO-44281-ENT', line_number: 1, vendor_code: 'ASTRA',     sku: 'AST-IND-7',    description: 'Industrial Component',         unit_price: 51.50,  quantity: 100,  tolerance_pct: 0.005, currency: 'USD', po_date: '2026-02-10' },
  { id: 'P-11281-1', po_number: 'PO-11281-ENT', line_number: 1, vendor_code: 'JUPITER',   sku: 'JJ-MAT-2',     description: 'Raw Material',                 unit_price: 110.77, quantity: 20,   tolerance_pct: 0.005, currency: 'USD', po_date: '2026-03-25' },
  { id: 'P-SVC-001-1', po_number: 'PO-SVC-001', line_number: 1, vendor_code: 'ACCENTURE', sku: 'SVC-CONS',     description: 'Consulting Services',          unit_price: 15000,  quantity: 1,    tolerance_pct: 0.000, currency: 'USD', po_date: '2026-03-30' },
  { id: 'P-SVC-002-1', po_number: 'PO-SVC-002', line_number: 1, vendor_code: 'CAPGEMINI', sku: 'SVC-CONS',     description: 'Consulting Services',          unit_price: 25000,  quantity: 1,    tolerance_pct: 0.000, currency: 'USD', po_date: '2026-04-01' },
  { id: 'P-33281-1', po_number: 'PO-33281-ENT', line_number: 1, vendor_code: 'BAYES',     sku: 'BYR-CHEM-1',   description: 'Specialty Chemical',           unit_price: 91.04,  quantity: 30,   tolerance_pct: 0.005, currency: 'USD', po_date: '2026-04-05' },
  { id: 'P-22281-1', po_number: 'PO-22281-ENT', line_number: 1, vendor_code: 'LILLY',     sku: 'LLY-PRO-3',    description: 'Pharma Product',               unit_price: 124.00, quantity: 100,  tolerance_pct: 0.005, currency: 'USD', po_date: '2026-03-01' },
];

// ─── GR master — most lines match PO qty; some deliberately partial/missing
// so the match engine in Step 3 surfaces realistic exceptions ──────

export const seedGoodsReceipts: GoodsReceipt[] = [
  { id: 'GR-88291', gr_number: '50001001', po_number: 'PO-88291-ENT', line_number: 1, received_qty: 1200, received_date: '2026-02-10', plant: '1000' },
  { id: 'GR-99281', gr_number: '50001002', po_number: 'PO-99281-ENT', line_number: 1, received_qty: 2200, received_date: '2026-03-20', plant: '1000' }, // partial → qty variance
  // PO-77281-ENT (NOVA)  → no GR → GRN missing exception
  { id: 'GR-66281', gr_number: '50001004', po_number: 'PO-66281-ENT', line_number: 1, received_qty: 100,  received_date: '2026-03-01', plant: '2000' },
  { id: 'GR-55281', gr_number: '50001005', po_number: 'PO-55281-ENT', line_number: 1, received_qty: 20,   received_date: '2026-03-15', plant: '2000' },
  { id: 'GR-44281', gr_number: '50001006', po_number: 'PO-44281-ENT', line_number: 1, received_qty: 100,  received_date: '2026-02-26', plant: '3000' },
  { id: 'GR-11281', gr_number: '50001007', po_number: 'PO-11281-ENT', line_number: 1, received_qty: 20,   received_date: '2026-04-10', plant: '3000' },
  { id: 'GR-33281', gr_number: '50001010', po_number: 'PO-33281-ENT', line_number: 1, received_qty: 30,   received_date: '2026-04-20', plant: '4000' },
  { id: 'GR-22281', gr_number: '50001011', po_number: 'PO-22281-ENT', line_number: 1, received_qty: 100,  received_date: '2026-03-13', plant: '4000' },
];

// ─── Invoices — your original 12, with billed_qty / billed_price added
// so the match engine in Step 3 has something to compute against ───

export const seedInvoices: Invoice[] = [
  { id: '000002954471404B', supplier: 'Pioneer Inc.',        vendor_code: 'PIONEER',   poNumber: 'PO-88291-ENT', line_number: 1, billed_qty: 1200, billed_price: 1.50,
    invoiceDate: '15/02/2026', postingDate: '16/02/2026', paymentTerm: 'Net 30', payerId: '00101933494041051B', payerName: 'ENTERPRISE CORP USA', paymentType: 'Deduction', amount: 5150.00, serviceDate: '20/02/2026', initiationDate: '24/02/2026', disputeId: '000002954471', custInvoiceNo: 'PZ-2026-0372', status: InvoiceStatus.BLOCKED, purchaseType: 'Goods', confidence: 94, popAttached: true, disputeReason: 'Price mismatch', paymentStatus: 'Overdue', priorityScore: 95 },
  { id: '000002964644404B', supplier: 'Apex & Co.',          vendor_code: 'APEX',      poNumber: 'PO-99281-ENT', line_number: 1, billed_qty: 2500, billed_price: 0.85,
    invoiceDate: '25/03/2026', postingDate: '26/03/2026', paymentTerm: 'Net 45', payerId: '00101933494041051B', payerName: 'ENTERPRISE CANADA',   paymentType: 'Deduction', amount: 5425.00, serviceDate: '30/03/2026', initiationDate: '05/04/2026', disputeId: '000002964644', custInvoiceNo: 'MRK-202606-0', status: InvoiceStatus.BLOCKED, purchaseType: 'Goods', confidence: 78, popAttached: true, disputeReason: 'quantity mismatch', paymentStatus: 'Overdue', priorityScore: 65 },
  { id: '000002964645404B', supplier: 'NovaCorp AG',         vendor_code: 'NOVA',      poNumber: 'PO-77281-ENT', line_number: 1, billed_qty: 100,  billed_price: 104.25,
    invoiceDate: '28/03/2026', postingDate: '29/03/2026', paymentTerm: 'Net 60', payerId: '00101933494041051B', payerName: 'ENTERPRISE UK',       paymentType: 'Deduction', amount: 10425.33, serviceDate: '05/04/2026', initiationDate: '10/04/2026', disputeId: '000002964645', custInvoiceNo: 'NOV-2026-X', status: InvoiceStatus.BLOCKED, purchaseType: 'Goods', confidence: 68, popAttached: true, disputeReason: 'GRN missing', paymentStatus: 'Overdue', priorityScore: 45 },
  { id: '000002964648404B', supplier: 'Global Logistics',    vendor_code: 'GLOBALLOG', poNumber: 'PO-66281-ENT', line_number: 1, billed_qty: 100,  billed_price: 15.00,
    invoiceDate: '05/03/2026', postingDate: '06/03/2026', paymentTerm: 'Net 30', payerId: '00101933494041052C', payerName: 'ENTERPRISE EUROPE',   paymentType: 'Deduction', amount: 1500.00, serviceDate: '12/03/2026', initiationDate: '15/03/2026', disputeId: '000002964648', custInvoiceNo: 'GSK-INV-26', status: InvoiceStatus.BLOCKED, purchaseType: 'Goods', confidence: 92, popAttached: true, disputeReason: 'Tax error', paymentStatus: 'Overdue', priorityScore: 88 },
  { id: '000002964649404B', supplier: 'Starlight S.A.',      vendor_code: 'STARLIGHT', poNumber: 'PO-55281-ENT', line_number: 1, billed_qty: 20,   billed_price: 22.50,
    invoiceDate: '10/03/2026', postingDate: '11/03/2026', paymentTerm: 'Net 45', payerId: '00101933494041053D', payerName: 'ENTERPRISE FRANCE',   paymentType: 'Deduction', amount: 450.75, serviceDate: '20/03/2026', initiationDate: '22/03/2026', disputeId: '000002964649', custInvoiceNo: 'SNF-2026-09', status: InvoiceStatus.BLOCKED, purchaseType: 'Goods', confidence: 72, popAttached: true, disputeReason: 'Duplicate invoice', paymentStatus: 'Overdue', priorityScore: 55 },
  { id: '000002964646404B', supplier: 'Astra Industries',    vendor_code: 'ASTRA',     poNumber: 'PO-44281-ENT', line_number: 1, billed_qty: 100,  billed_price: 51.50,
    invoiceDate: '20/02/2026', postingDate: '21/02/2026', paymentTerm: 'Net 30', payerId: '00101933494041051B', payerName: 'ENTERPRISE CHINA',    paymentType: 'Deduction', amount: 5150.00, serviceDate: '28/02/2026', initiationDate: '05/03/2026', disputeId: '000002964646', custInvoiceNo: 'AZ-202606-1', status: InvoiceStatus.BLOCKED, purchaseType: 'Goods', confidence: 62, popAttached: false, disputeReason: 'PO missing', paymentStatus: 'Overdue', priorityScore: 92 },
  { id: '000002964652404B', supplier: 'Jupiter & Jupiter',   vendor_code: 'JUPITER',   poNumber: 'PO-11281-ENT', line_number: 1, billed_qty: 20,   billed_price: 110.77,
    invoiceDate: '05/04/2026', postingDate: '06/04/2026', paymentTerm: 'Net 45', payerId: '00101933494041055F', payerName: 'ENTERPRISE INDIA',    paymentType: 'Deduction', amount: 2215.40, serviceDate: '10/04/2026', initiationDate: '15/04/2026', disputeId: '000002964652', custInvoiceNo: 'JJ-JULY-26', status: InvoiceStatus.BLOCKED, purchaseType: 'Goods', confidence: 91, popAttached: true, disputeReason: 'Master data error', paymentStatus: 'Overdue', priorityScore: 15 },
  { id: '000002964653404B', supplier: 'Accenture Consulting',vendor_code: 'ACCENTURE', poNumber: 'PO-SVC-001',   line_number: 1, billed_qty: 1,    billed_price: 15000,
    invoiceDate: '10/04/2026', postingDate: '11/04/2026', paymentTerm: 'Net 30', payerId: '00101933494041051B', payerName: 'ENTERPRISE GLOBAL',   paymentType: 'Service Fee', amount: 15000.00, serviceDate: '31/03/2026', initiationDate: '05/04/2026', disputeId: '000002964653', custInvoiceNo: 'ACC-2026-04', status: InvoiceStatus.BLOCKED, purchaseType: 'Services', confidence: 85, popAttached: true, disputeReason: 'Service not approved', paymentStatus: 'Overdue', priorityScore: 70 },
  { id: '000002964654404B', supplier: 'Capgemini Solutions', vendor_code: 'CAPGEMINI', poNumber: 'PO-SVC-002',   line_number: 1, billed_qty: 1,    billed_price: 25000,
    invoiceDate: '12/04/2026', postingDate: '13/04/2026', paymentTerm: 'Net 30', payerId: '00101933494041051B', payerName: 'ENTERPRISE GLOBAL',   paymentType: 'Consulting', amount: 25000.00, serviceDate: '31/03/2026', initiationDate: '05/04/2026', disputeId: '000002964654', custInvoiceNo: 'CAP-2026-04', status: InvoiceStatus.BLOCKED, purchaseType: 'Services', confidence: 82, popAttached: true, disputeReason: 'Contract violation', paymentStatus: 'Overdue', priorityScore: 75 },
  { id: '000002964655404B', supplier: 'Bayes Enterprises',   vendor_code: 'BAYES',     poNumber: 'PO-33281-ENT', line_number: 1, billed_qty: 30,   billed_price: 91.04,
    invoiceDate: '18/04/2026', postingDate: '19/04/2026', paymentTerm: 'Net 60', payerId: '00101933494041051B', payerName: 'ENTERPRISE BRAZIL',   paymentType: 'Deduction', amount: 2731.26, serviceDate: '25/04/2026', initiationDate: '30/04/2026', disputeId: '000002964647', custInvoiceNo: 'BYR-202606-1', status: InvoiceStatus.PARKED,  purchaseType: 'Goods', confidence: 88, popAttached: true, paymentStatus: 'Not yet due', priorityScore: 30 },
  { id: '000002964650404B', supplier: 'Lilly Enterprises',   vendor_code: 'LILLY',     poNumber: 'PO-22281-ENT', line_number: 1, billed_qty: 100,  billed_price: 124.00,
    invoiceDate: '10/03/2026', postingDate: '11/03/2026', paymentTerm: 'Net 30', payerId: '00101933494041054E', payerName: 'ENTERPRISE MEXICO',   paymentType: 'Deduction', amount: 12400.00, serviceDate: '15/03/2026', initiationDate: '20/03/2026', disputeId: '000002964650', custInvoiceNo: 'LLY-2026-9921', status: InvoiceStatus.APPROVED, purchaseType: 'Goods', confidence: 96, popAttached: true, sapCn: 'CN-9001-A123', paymentStatus: 'Overdue', priorityScore: 20 },
];

// ─── Backwards-compat export so existing screens keep compiling ────
// Every screen currently doing `import { mockInvoices } from '../constants'`
// keeps working until we migrate them.

export const mockInvoices: Invoice[] = seedInvoices;