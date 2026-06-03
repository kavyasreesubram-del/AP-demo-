import Papa from 'papaparse';
import { Vendor, PurchaseOrder, GoodsReceipt, Invoice, InvoiceStatus } from '../types';


// ─── Result shape ─────────────────────────────────────────────────

export interface ParseResult<T> {
  valid: T[];
  rejected: { rowNumber: number; reasons: string[]; raw: Record<string, string> }[];
  totalRows: number;
}

// ─── Helpers ──────────────────────────────────────────────────────

function readCsv(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => resolve(res.data),
      error: (err) => reject(err),
    });
  });
}

function req(row: Record<string, string>, col: string, reasons: string[]): string {
  const v = (row[col] ?? '').toString().trim();
  if (!v) reasons.push(`Missing required column: ${col}`);
  return v;
}

function opt(row: Record<string, string>, col: string): string | undefined {
  const v = (row[col] ?? '').toString().trim();
  return v || undefined;
}

function num(raw: string, col: string, reasons: string[], { allowZero = true } = {}): number {
  if (!raw) return NaN;
  const cleaned = raw.replace(/,/g, '').replace(/[€$£]/g, '').trim();
  const n = Number(cleaned);
  if (Number.isNaN(n)) {
    reasons.push(`${col} is not a number: "${raw}"`);
    return NaN;
  }
  if (!allowZero && n === 0) {
    reasons.push(`${col} cannot be zero`);
  }
  return n;
}

function isoDate(raw: string, col: string, reasons: string[]): string {
  if (!raw) return '';
  // accept yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy
  let s = raw.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  reasons.push(`${col} is not a recognised date: "${raw}" (expected yyyy-mm-dd or dd/mm/yyyy)`);
  return '';
}

// ─── Vendor (SAP table: LFA1) ─────────────────────────────────────

export async function parseVendorsCsv(file: File): Promise<ParseResult<Vendor>> {
  const rows = await readCsv(file);
  const valid: Vendor[] = [];
  const rejected: ParseResult<Vendor>['rejected'] = [];

  rows.forEach((row, i) => {
    const reasons: string[] = [];
    const vendor_code = req(row, 'vendor_code', reasons);
    const vendor_name = req(row, 'vendor_name', reasons);
    const tax_id      = req(row, 'tax_id', reasons);
    const statusRaw   = (opt(row, 'status') ?? 'active').toLowerCase();
    const status: Vendor['status'] =
      statusRaw === 'blocked' ? 'blocked' :
      statusRaw === 'inactive' ? 'inactive' : 'active';
    const payment_terms = req(row, 'payment_terms', reasons);
    const country = opt(row, 'country');

    if (reasons.length) {
      rejected.push({ rowNumber: i + 2, reasons, raw: row });
    } else {
      valid.push({
        id: `V-${vendor_code}`,
        vendor_code,
        vendor_name,
        tax_id,
        status,
        payment_terms,
        country,
      });
    }
  });

  return { valid, rejected, totalRows: rows.length };
}

// ─── Purchase Order (SAP tables: EKKO header + EKPO line items) ────

export async function parsePurchaseOrdersCsv(file: File): Promise<ParseResult<PurchaseOrder>> {
  const rows = await readCsv(file);
  const valid: PurchaseOrder[] = [];
  const rejected: ParseResult<PurchaseOrder>['rejected'] = [];

  rows.forEach((row, i) => {
    const reasons: string[] = [];
    const po_number   = req(row, 'po_number', reasons);
    const line_number = num(req(row, 'line_number', reasons), 'line_number', reasons);
    const vendor_code = req(row, 'vendor_code', reasons);
    const sku         = req(row, 'sku', reasons);
    const description = req(row, 'description', reasons);
    const unit_price  = num(req(row, 'unit_price', reasons), 'unit_price', reasons);
    const quantity    = num(req(row, 'quantity', reasons), 'quantity', reasons, { allowZero: false });
    const toleranceRaw = opt(row, 'tolerance_pct');
    const tolerance_pct = toleranceRaw ? num(toleranceRaw, 'tolerance_pct', reasons) : 0.005;
    const currency = opt(row, 'currency') ?? 'USD';
    const po_date  = isoDate(req(row, 'po_date', reasons), 'po_date', reasons);

    if (reasons.length) {
      rejected.push({ rowNumber: i + 2, reasons, raw: row });
    } else {
      valid.push({
        id: `P-${po_number}-${line_number}`,
        po_number,
        line_number,
        vendor_code,
        sku,
        description,
        unit_price,
        quantity,
        tolerance_pct,
        currency,
        po_date,
      });
    }
  });

  return { valid, rejected, totalRows: rows.length };
}

// ─── Goods Receipt (SAP tables: MKPF header + MSEG line items) ────

export async function parseGoodsReceiptsCsv(file: File): Promise<ParseResult<GoodsReceipt>> {
  const rows = await readCsv(file);
  const valid: GoodsReceipt[] = [];
  const rejected: ParseResult<GoodsReceipt>['rejected'] = [];

  rows.forEach((row, i) => {
    const reasons: string[] = [];
    const gr_number   = req(row, 'gr_number', reasons);
    const po_number   = req(row, 'po_number', reasons);
    const line_number = num(req(row, 'line_number', reasons), 'line_number', reasons);
    const received_qty = num(req(row, 'received_qty', reasons), 'received_qty', reasons, { allowZero: false });
    const received_date = isoDate(req(row, 'received_date', reasons), 'received_date', reasons);
    const plant = opt(row, 'plant');
    const storage_location = opt(row, 'storage_location');

    if (reasons.length) {
      rejected.push({ rowNumber: i + 2, reasons, raw: row });
    } else {
      valid.push({
        id: `GR-${gr_number}-${line_number}`,
        gr_number,
        po_number,
        line_number,
        received_qty,
        received_date,
        plant,
        storage_location,
      });
    }
  });

  return { valid, rejected, totalRows: rows.length };
}
// ─── Synthetic Invoice CSV (for bulk demo loading without PDFs) ──

export async function parseInvoicesCsv(file: File): Promise<ParseResult<Invoice>> {
  const rows = await readCsv(file);
  const valid: Invoice[] = [];
  const rejected: ParseResult<Invoice>['rejected'] = [];
  const today = new Date().toISOString().slice(0, 10);

  rows.forEach((row, i) => {
    const reasons: string[] = [];
    const invoice_number = req(row, 'invoice_number', reasons);
    const supplier       = req(row, 'supplier', reasons);
    const vendor_code    = opt(row, 'vendor_code');
    const po_number      = opt(row, 'po_number') ?? '';
    const lineRaw        = opt(row, 'line_number');
    const line_number    = lineRaw ? num(lineRaw, 'line_number', reasons) : 1;
    const invoice_date   = isoDate(req(row, 'invoice_date', reasons), 'invoice_date', reasons);
    const amount         = num(req(row, 'amount', reasons), 'amount', reasons);
    const billedQtyRaw   = opt(row, 'billed_qty');
    const billed_qty     = billedQtyRaw ? num(billedQtyRaw, 'billed_qty', reasons) : undefined;
    const billedPriceRaw = opt(row, 'billed_price');
    const billed_price   = billedPriceRaw ? num(billedPriceRaw, 'billed_price', reasons) : undefined;
    const payment_terms  = opt(row, 'payment_terms') ?? 'Net 30';
    const purchase_type  = (opt(row, 'purchase_type') ?? 'Goods').toLowerCase() === 'services' ? 'Services' : 'Goods';

    if (reasons.length) {
      rejected.push({ rowNumber: i + 2, reasons, raw: row });
    } else {
      valid.push({
        id: `INV-CSV-${invoice_number}-${Date.now()}-${i}`,
        supplier,
        vendor_code,
        poNumber: po_number,
        line_number,
        invoiceDate: invoice_date,
        postingDate: today,
        paymentTerm: payment_terms,
        payerId: 'CSV-INGESTED',
        payerName: 'CSV-INGESTED',
        paymentType: 'Standard',
        amount,
        status: InvoiceStatus.BLOCKED,        // match engine will compute effectiveStatus
        purchaseType: purchase_type as 'Goods' | 'Services',
        disputeId: `D-CSV-${invoice_number}`,
        custInvoiceNo: invoice_number,
        serviceDate: invoice_date,
        initiationDate: today,
        confidence: 100,                      // CSV ingestion is deterministic, not AI-extracted
        popAttached: true,
        paymentStatus: 'Not yet due',
        priorityScore: 50,
        billed_qty,
        billed_price,
      });
    }
  });

  return { valid, rejected, totalRows: rows.length };
}