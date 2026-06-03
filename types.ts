export enum InvoiceStatus {
  PARKED = 'Parked',
  BLOCKED = 'Blocked',
  APPROVED = 'Approved',
}

export enum UserRole {
  AP_MANAGER = 'AP_MANAGER',
  AP_ASSOCIATE = 'AP_ASSOCIATE',
  INSIGHTS = 'INSIGHTS',
  AP_DIAGNOSTICS = 'AP diagnostics',
}

// ─── Core master + transactional records ───────────────────────────

export interface Vendor {
  id: string;
  vendor_code: string;          // SAP LFA1-LIFNR
  vendor_name: string;
  tax_id: string;
  status: 'active' | 'blocked' | 'inactive';
  payment_terms: string;        // e.g. "Net 30"
  country?: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;            // SAP EKKO-EBELN
  line_number: number;          // SAP EKPO-EBELP
  vendor_code: string;
  sku: string;
  description: string;
  unit_price: number;
  quantity: number;
  tolerance_pct: number;        // 0.005 = 0.5%
  currency: string;
  po_date: string;              // ISO yyyy-mm-dd
}

export interface GoodsReceipt {
  id: string;
  gr_number: string;            // SAP MKPF-MBLNR
  po_number: string;            // join key
  line_number: number;          // join key
  received_qty: number;
  received_date: string;
  plant?: string;
  storage_location?: string;
}

// ─── Existing invoice type, extended slightly ──────────────────────

export interface Invoice {
  id: string;
  supplier: string;
  poNumber: string;
  line_number?: number;         // NEW — for PO/GR joins
  invoiceDate: string;
  postingDate: string;
  paymentTerm: string;
  payerId: string;
  payerName: string;
  paymentType: string;
  amount: number;
  status: InvoiceStatus;
  purchaseType: 'Goods' | 'Services';
  disputeId: string;
  custInvoiceNo: string;
  serviceDate: string;
  initiationDate: string;
  confidence: number;
  popAttached: boolean;
  sapCn?: string;
  disputeReason?: string;
  paymentStatus: 'Overdue' | 'Not yet due';
  priorityScore: number;
  billed_qty?: number;          // NEW — drives qty variance
  billed_price?: number;        // NEW — drives price variance
  vendor_code?: string;         // NEW — drives vendor join
}

export interface TacticValidationItem {
  id: string;
  tacticName: string;
  amount: number;
  status: 'matched' | 'discrepancy' | 'missing_pop';
  aiRec: string;
  isApproved: boolean;
}

export interface ValidationItem {
  id: string;
  label: string;
  systemValue: string;
  detectedValue: string;
  isMatch: boolean;
}