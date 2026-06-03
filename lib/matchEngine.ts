import {
  Invoice,
  InvoiceStatus,
  PurchaseOrder,
  GoodsReceipt,
  Vendor,
} from '../types';

// ─── Exception taxonomy ──────────────────────────────────────────

export type ExceptionCode =
  | 'CLEAN'
  | 'PO_MISSING'
  | 'GR_MISSING'
  | 'PRICE_VARIANCE'
  | 'QTY_VARIANCE'
  | 'DUPLICATE'
  | 'VENDOR_BLOCKED'
  | 'VENDOR_MISSING';

// Human-readable labels (used in UI in place of the old free-text disputeReason)
export const EXCEPTION_LABELS: Record<ExceptionCode, string> = {
  CLEAN:           'Clean (3-way match)',
  PO_MISSING:      'PO missing',
  GR_MISSING:      'GR missing',
  PRICE_VARIANCE:  'Price variance',
  QTY_VARIANCE:    'Quantity variance',
  DUPLICATE:       'Duplicate invoice',
  VENDOR_BLOCKED:  'Vendor blocked',
  VENDOR_MISSING:  'Vendor not in master',
};

// Which actions are valid for a given exception (used by ValidationDetail in File 4)
export const EXCEPTION_ACTIONS: Record<ExceptionCode, string[]> = {
  CLEAN:           ['Approve'],
  PO_MISSING:      ['Request PO from buyer', 'Reject invoice', 'Escalate to AP Manager'],
  GR_MISSING:      ['Request GR from receiving', 'Pay anyway (manager override)', 'Reject invoice'],
  PRICE_VARIANCE:  ['Accept variance', 'Request credit note', 'Escalate to AP Manager', 'Reject'],
  QTY_VARIANCE:    ['Request credit note', 'Accept short qty', 'Escalate to AP Manager'],
  DUPLICATE:       ['Mark duplicate · reject', 'Investigate'],
  VENDOR_BLOCKED:  ['Escalate to AP Manager', 'Reject'],
  VENDOR_MISSING:  ['Add vendor to master', 'Reject', 'Escalate'],
};

// ─── Result shape per invoice ────────────────────────────────────

export interface MatchResult {
  invoice: Invoice;
  exceptionCode: ExceptionCode;
  exceptionLabel: string;
  exceptionDetail: string;
  matchedPO?: PurchaseOrder;
  matchedGRs?: GoodsReceipt[];        // multiple GRs can post against one PO line
  matchedVendor?: Vendor;
  computed: {
    priceVariancePct?: number;        // (billed - po) / po
    qtyDelta?: number;                 // billed - sum(received)
    receivedTotal?: number;
  };
  // Derived "effective" status — what the Dashboard pill should show
  effectiveStatus: InvoiceStatus;
  assignedTo: 'AP Associate' | 'AP Manager';
}

// ─── Helpers ─────────────────────────────────────────────────────

const APPROVAL_THRESHOLD = 10_000;       // amounts above this route to AP Manager
const PRICE_FLOOR_ABS = 500;             // tolerate any variance under $500 regardless of pct

// ─── The match function ──────────────────────────────────────────

export function matchInvoice(
  invoice: Invoice,
  purchaseOrders: PurchaseOrder[],
  goodsReceipts: GoodsReceipt[],
  vendors: Vendor[],
  allInvoices: Invoice[],               // for duplicate detection
): MatchResult {
  const computed: MatchResult['computed'] = {};

  // 1. Find vendor — by vendor_code if present, else fuzzy on name
  const matchedVendor = invoice.vendor_code
    ? vendors.find(v => v.vendor_code === invoice.vendor_code)
    : vendors.find(v => v.vendor_name.toLowerCase() === invoice.supplier.toLowerCase());

  if (invoice.vendor_code && !matchedVendor) {
    return finalize(invoice, 'VENDOR_MISSING',
      `Vendor code "${invoice.vendor_code}" not found in vendor master`,
      undefined, undefined, undefined, computed);
  }
  if (matchedVendor && matchedVendor.status === 'blocked') {
    return finalize(invoice, 'VENDOR_BLOCKED',
      `Vendor ${matchedVendor.vendor_name} is in BLOCKED status`,
      undefined, undefined, matchedVendor, computed);
  }

  // 2. Duplicate detection — same vendor + same custInvoiceNo (or invoice_number)
  //    appearing more than once across the invoice set
  const candidateKey = (invoice.custInvoiceNo || '').toLowerCase().trim();
  if (candidateKey) {
    const dupes = allInvoices.filter(i =>
      i.id !== invoice.id &&
      (i.custInvoiceNo || '').toLowerCase().trim() === candidateKey &&
      i.supplier.toLowerCase() === invoice.supplier.toLowerCase()
    );
    if (dupes.length > 0) {
      return finalize(invoice, 'DUPLICATE',
        `Duplicate of ${dupes[0].id} — same vendor and invoice number`,
        undefined, undefined, matchedVendor, computed);
    }
  }

  // 3. Find PO line
  const matchedPO = purchaseOrders.find(po =>
    po.po_number === invoice.poNumber &&
    po.line_number === (invoice.line_number ?? 1)
  );
  if (!matchedPO) {
    return finalize(invoice, 'PO_MISSING',
      `No PO row found for ${invoice.poNumber} line ${invoice.line_number ?? 1}`,
      undefined, undefined, matchedVendor, computed);
  }

  // 4. Find GRs for this PO line (services don't need GR)
  const matchedGRs = goodsReceipts.filter(gr =>
    gr.po_number === invoice.poNumber &&
    gr.line_number === (invoice.line_number ?? 1)
  );
  const receivedTotal = matchedGRs.reduce((s, g) => s + g.received_qty, 0);
  computed.receivedTotal = receivedTotal;

  if (invoice.purchaseType === 'Goods' && matchedGRs.length === 0) {
    return finalize(invoice, 'GR_MISSING',
      `No goods receipt posted against PO ${matchedPO.po_number} line ${matchedPO.line_number}`,
      matchedPO, matchedGRs, matchedVendor, computed);
  }

  // 5. Price variance (only if we have billed_price)
  if (invoice.billed_price != null && matchedPO.unit_price > 0) {
    const pct = Math.abs(invoice.billed_price - matchedPO.unit_price) / matchedPO.unit_price;
    computed.priceVariancePct = pct;
    const absDelta = Math.abs(invoice.billed_price - matchedPO.unit_price);
    const overTolerance = pct > matchedPO.tolerance_pct;
    const overFloor = absDelta > PRICE_FLOOR_ABS;
    if (overTolerance && overFloor) {
      return finalize(invoice, 'PRICE_VARIANCE',
        `Billed ${matchedPO.currency} ${invoice.billed_price.toFixed(2)} vs PO ${matchedPO.unit_price.toFixed(2)} ` +
        `— ${(pct * 100).toFixed(2)}% variance (tolerance ${(matchedPO.tolerance_pct * 100).toFixed(2)}%)`,
        matchedPO, matchedGRs, matchedVendor, computed);
    }
  }

  // 6. Qty variance — for goods only
  if (invoice.purchaseType === 'Goods' && invoice.billed_qty != null) {
    const delta = invoice.billed_qty - receivedTotal;
    computed.qtyDelta = delta;
    if (delta > 0) {
      return finalize(invoice, 'QTY_VARIANCE',
        `Billed ${invoice.billed_qty} units, only ${receivedTotal} received (short by ${delta})`,
        matchedPO, matchedGRs, matchedVendor, computed);
    }
  }

  // 7. Clean
  return finalize(invoice, 'CLEAN',
    'All checks passed: vendor active, PO matched, GR posted, price within tolerance, qty matches receipt',
    matchedPO, matchedGRs, matchedVendor, computed);
}

function finalize(
  invoice: Invoice,
  code: ExceptionCode,
  detail: string,
  po: PurchaseOrder | undefined,
  grs: GoodsReceipt[] | undefined,
  vendor: Vendor | undefined,
  computed: MatchResult['computed'],
): MatchResult {
  const effectiveStatus: InvoiceStatus =
  invoice.status === InvoiceStatus.PARKED ? InvoiceStatus.PARKED :       // PARKED is sticky — never auto-promote
  invoice.status === InvoiceStatus.APPROVED ? InvoiceStatus.APPROVED :   // already approved, leave alone
  code === 'CLEAN' ? InvoiceStatus.APPROVED :                            // engine found nothing wrong → promote
  InvoiceStatus.BLOCKED;                                                  // exception detected → block

  const assignedTo: 'AP Associate' | 'AP Manager' =
    invoice.amount > APPROVAL_THRESHOLD ? 'AP Manager' : 'AP Associate';

  return {
    invoice,
    exceptionCode: code,
    exceptionLabel: EXCEPTION_LABELS[code],
    exceptionDetail: detail,
    matchedPO: po,
    matchedGRs: grs,
    matchedVendor: vendor,
    computed,
    effectiveStatus,
    assignedTo,
  };
}

// ─── Batch helper — used by the store ────────────────────────────

export function matchAllInvoices(
  invoices: Invoice[],
  purchaseOrders: PurchaseOrder[],
  goodsReceipts: GoodsReceipt[],
  vendors: Vendor[],
): MatchResult[] {
  return invoices.map(inv => matchInvoice(inv, purchaseOrders, goodsReceipts, vendors, invoices));
}