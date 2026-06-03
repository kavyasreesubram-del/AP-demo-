// ─── Ask AI Tools ─────────────────────────────────────────────────
// Each tool has two parts:
//   1. A FunctionDeclaration (the schema Gemini sees)
//   2. An implementation that takes (args, snapshot) and returns JSON
//
// All tools are READ-ONLY. They query the store snapshot — they never mutate.

import { Type, FunctionDeclaration } from '@google/genai';
import { Invoice, InvoiceStatus, Vendor, PurchaseOrder, GoodsReceipt } from '../types';
import { MatchResult, ExceptionCode } from './matchEngine';
import { computeSla, computeSlaAggregate, SlaTier } from './slaEngine';
import { AuditEntry } from '../store';

// ─── Snapshot passed to every tool ───────────────────────────────

export interface StoreSnapshot {
  invoices: Invoice[];
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  auditLog: AuditEntry[];
  matchedInvoices: MatchResult[];
  matchedById: Record<string, MatchResult>;
}

// ─── Tool 1: get_aggregate_kpis ──────────────────────────────────

const get_aggregate_kpis_decl: FunctionDeclaration = {
  name: 'get_aggregate_kpis',
  description:
    'Get high-level KPIs across the entire invoice store — touchless rate, exception counts, ' +
    'SLA tier distribution, average DPO, total invoice value, overdue value at risk, and ROI estimates. ' +
    'Use this when the user asks broad status or summary questions like "how are we doing?", ' +
    '"what\'s our touchless rate?", "how many invoices are overdue?", or "what\'s the working capital at risk?".',
  parameters: { type: Type.OBJECT, properties: {} },
};

function get_aggregate_kpis(_args: any, snap: StoreSnapshot) {
  const total = snap.matchedInvoices.length;
  const touchless = snap.matchedInvoices.filter(
    (m) => m.effectiveStatus === InvoiceStatus.APPROVED && m.exceptionCode === 'CLEAN'
  ).length;
  const approved = snap.matchedInvoices.filter(
    (m) => m.effectiveStatus === InvoiceStatus.APPROVED
  ).length;
  const blocked = snap.matchedInvoices.filter(
    (m) => m.effectiveStatus === InvoiceStatus.BLOCKED
  ).length;
  const parked = snap.matchedInvoices.filter(
    (m) => m.effectiveStatus === InvoiceStatus.PARKED
  ).length;

  const exceptionCounts: Record<string, number> = {};
  for (const m of snap.matchedInvoices) {
    exceptionCounts[m.exceptionCode] = (exceptionCounts[m.exceptionCode] || 0) + 1;
  }

  const slaAgg = computeSlaAggregate(snap.invoices);

  const MANUAL_COST = 18.5;
  const TOUCHLESS_COST = 2.2;
  const manualBaseline = total * MANUAL_COST;
  const currentLabor = touchless * TOUCHLESS_COST + (total - touchless) * MANUAL_COST;
  const monthlySaving = manualBaseline - currentLabor;

  const totalInvoiceValue = snap.matchedInvoices.reduce((s, m) => s + (m.invoice.amount || 0), 0);

  return {
    totals: {
      invoices: total,
      vendors: snap.vendors.length,
      purchase_orders: snap.purchaseOrders.length,
      goods_receipts: snap.goodsReceipts.length,
      audit_entries: snap.auditLog.length,
    },
    status_counts: { approved, blocked, parked },
    touchless: {
      count: touchless,
      rate_pct: total ? Math.round((touchless / total) * 100) : 0,
    },
    exception_counts: exceptionCounts,
    sla: {
      overdue_count: slaAgg.overdueCount,
      red_count: slaAgg.redCount,
      amber_count: slaAgg.amberCount,
      green_count: slaAgg.greenCount,
      paid_count: slaAgg.paidCount,
      avg_dpo_days: slaAgg.averageDpo,
      pct_paid_within_terms: slaAgg.pctPaidWithinTerms,
      overdue_value_usd: Math.round(slaAgg.overdueValue),
    },
    financials: {
      total_invoice_value_usd: Math.round(totalInvoiceValue),
      monthly_labor_saving_usd: Math.round(monthlySaving),
      annual_labor_saving_usd: Math.round(monthlySaving * 12),
    },
  };
}

// ─── Tool 2: find_invoices ───────────────────────────────────────

const find_invoices_decl: FunctionDeclaration = {
  name: 'find_invoices',
  description:
    'Search the invoice queue with optional filters. Returns a list of matching invoices ' +
    '(up to 20 results). Use this for questions like "show me Schneider invoices", ' +
    '"which invoices are overdue?", "what\'s blocked?", or "invoices over $100k". ' +
    'Multiple filters are combined with AND.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      vendor_name: {
        type: Type.STRING,
        description: 'Filter by vendor name (case-insensitive substring match).',
      },
      vendor_code: {
        type: Type.STRING,
        description: 'Filter by vendor code (exact match, e.g. SCHNEIDER, BOEING).',
      },
      exception_code: {
        type: Type.STRING,
        description:
          'Filter by exception code. One of: CLEAN, PO_MISSING, GR_MISSING, PRICE_VARIANCE, ' +
          'QTY_VARIANCE, DUPLICATE, VENDOR_BLOCKED, VENDOR_MISSING.',
      },
      status: {
        type: Type.STRING,
        description: 'Filter by effective status. One of: Approved, Blocked, Parked.',
      },
      sla_tier: {
        type: Type.STRING,
        description: 'Filter by SLA tier. One of: OVERDUE, RED, AMBER, GREEN, PAID.',
      },
      min_amount: {
        type: Type.NUMBER,
        description: 'Filter by minimum amount (USD).',
      },
      max_amount: {
        type: Type.NUMBER,
        description: 'Filter by maximum amount (USD).',
      },
      purchase_type: {
        type: Type.STRING,
        description: 'Filter by purchase type. One of: Goods, Services.',
      },
    },
  },
};

function find_invoices(args: any, snap: StoreSnapshot) {
  let results = snap.matchedInvoices.slice();

  if (args.vendor_name) {
    const q = String(args.vendor_name).toLowerCase();
    results = results.filter((m) => m.invoice.supplier.toLowerCase().includes(q));
  }
  if (args.vendor_code) {
    const q = String(args.vendor_code).toUpperCase();
    results = results.filter((m) => (m.invoice.vendor_code || '').toUpperCase() === q);
  }
  if (args.exception_code) {
    const q = String(args.exception_code).toUpperCase() as ExceptionCode;
    results = results.filter((m) => m.exceptionCode === q);
  }
  if (args.status) {
    const q = String(args.status);
    results = results.filter((m) => m.effectiveStatus === q);
  }
  if (args.sla_tier) {
    const q = String(args.sla_tier).toUpperCase() as SlaTier;
    results = results.filter((m) => computeSla(m.invoice).tier === q);
  }
  if (typeof args.min_amount === 'number') {
    results = results.filter((m) => m.invoice.amount >= args.min_amount);
  }
  if (typeof args.max_amount === 'number') {
    results = results.filter((m) => m.invoice.amount <= args.max_amount);
  }
  if (args.purchase_type) {
    results = results.filter((m) => m.invoice.purchaseType === args.purchase_type);
  }

  const totalMatched = results.length;
  const limited = results.slice(0, 20);

  return {
    total_matched: totalMatched,
    showing: limited.length,
    truncated: totalMatched > 20,
    invoices: limited.map((m) => {
      const sla = computeSla(m.invoice);
      return {
        id: m.invoice.id,
        invoice_number: m.invoice.custInvoiceNo,
        supplier: m.invoice.supplier,
        vendor_code: m.invoice.vendor_code,
        po_number: m.invoice.poNumber,
        invoice_date: m.invoice.invoiceDate,
        amount_usd: m.invoice.amount,
        purchase_type: m.invoice.purchaseType,
        effective_status: m.effectiveStatus,
        exception_code: m.exceptionCode,
        exception_label: m.exceptionLabel,
        sla_tier: sla.tier,
        sla_label: sla.label,
        days_remaining: sla.daysRemaining,
        due_date: sla.dueDate ? sla.dueDate.toISOString().slice(0, 10) : null,
      };
    }),
  };
}

// ─── Tool 3: get_invoice_details ─────────────────────────────────

const get_invoice_details_decl: FunctionDeclaration = {
  name: 'get_invoice_details',
  description:
    'Get full details on one specific invoice — its matched PO, all goods receipts, vendor master record, ' +
    'computed variance, SLA status, and complete audit trail. Use this when the user references a ' +
    'specific invoice by number, ID, supplier name, or vendor code. Handles natural phrasing like ' +
    '"why is X blocked?", "tell me about the Schneider invoice", or "details on BOE-INV-2026-9921". ' +
    'If multiple invoices match (e.g. user said "Honeywell" and there are 2 Honeywell invoices), ' +
    'returns the first match — tell the user there are others and offer to list them via find_invoices.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      invoice_number_or_id: {
        type: Type.STRING,
        description:
          'Search term — can be an invoice number (e.g. "SCH-INV-2026-0512"), invoice ID, ' +
          'supplier name (e.g. "Schneider"), or vendor code (e.g. "SCHNEIDER"). ' +
          'Matches case-insensitively as a substring against all four fields.',
      },
    },
    required: ['invoice_number_or_id'],
  },
};

function get_invoice_details(args: any, snap: StoreSnapshot) {
  const q = String(args.invoice_number_or_id || '').toLowerCase();
  if (!q) return { error: 'No invoice identifier provided.' };

  // Match against invoice number, internal ID, supplier name, OR vendor code
  const matchedAll = snap.matchedInvoices.filter(
    (m) =>
      (m.invoice.custInvoiceNo || '').toLowerCase().includes(q) ||
      m.invoice.id.toLowerCase().includes(q) ||
      m.invoice.supplier.toLowerCase().includes(q) ||
      (m.invoice.vendor_code || '').toLowerCase().includes(q)
  );

  if (matchedAll.length === 0) {
    return { error: `No invoice found matching "${args.invoice_number_or_id}".` };
  }

  const matched = matchedAll[0];
  const sla = computeSla(matched.invoice);
  const auditEntries = snap.auditLog.filter((e) => e.invoiceId === matched.invoice.id);

  return {
    // If more than one matched, surface that fact so Gemini can mention it
    multiple_matches_found: matchedAll.length > 1 ? matchedAll.length : undefined,
    showing_first_of_n: matchedAll.length > 1
      ? matchedAll.slice(0, 5).map(m => `${m.invoice.custInvoiceNo} (${m.invoice.supplier}, ${m.exceptionLabel})`)
      : undefined,
    invoice: {
      id: matched.invoice.id,
      invoice_number: matched.invoice.custInvoiceNo,
      supplier: matched.invoice.supplier,
      vendor_code: matched.invoice.vendor_code,
      po_referenced: matched.invoice.poNumber,
      po_line_referenced: matched.invoice.line_number,
      invoice_date: matched.invoice.invoiceDate,
      amount_usd: matched.invoice.amount,
      billed_qty: matched.invoice.billed_qty,
      billed_price: matched.invoice.billed_price,
      payment_terms: matched.invoice.paymentTerm,
      purchase_type: matched.invoice.purchaseType,
      status: matched.invoice.status,
    },
    effective_status: matched.effectiveStatus,
    exception: {
      code: matched.exceptionCode,
      label: matched.exceptionLabel,
      detail: matched.exceptionDetail,
    },
    sla: {
      tier: sla.tier,
      label: sla.label,
      days_remaining: sla.daysRemaining,
      due_date: sla.dueDate ? sla.dueDate.toISOString().slice(0, 10) : null,
      terms_days: sla.termsDays,
    },
    matched_po: matched.matchedPO
      ? {
          po_number: matched.matchedPO.po_number,
          line_number: matched.matchedPO.line_number,
          description: matched.matchedPO.description,
          sku: matched.matchedPO.sku,
          unit_price: matched.matchedPO.unit_price,
          quantity: matched.matchedPO.quantity,
          tolerance_pct: matched.matchedPO.tolerance_pct,
          currency: matched.matchedPO.currency,
          po_date: matched.matchedPO.po_date,
        }
      : null,
    matched_grs:
      matched.matchedGRs && matched.matchedGRs.length > 0
        ? matched.matchedGRs.map((gr) => ({
            gr_number: gr.gr_number,
            received_qty: gr.received_qty,
            received_date: gr.received_date,
            plant: gr.plant,
          }))
        : [],
    total_received_qty: matched.computed.receivedTotal ?? null,
    matched_vendor: matched.matchedVendor
      ? {
          vendor_code: matched.matchedVendor.vendor_code,
          vendor_name: matched.matchedVendor.vendor_name,
          tax_id: matched.matchedVendor.tax_id,
          status: matched.matchedVendor.status,
          payment_terms: matched.matchedVendor.payment_terms,
          country: matched.matchedVendor.country,
        }
      : null,
    computed_variance: {
      price_variance_pct: matched.computed.priceVariancePct ?? null,
      qty_delta: matched.computed.qtyDelta ?? null,
    },
    audit_history: auditEntries.map((e) => ({
      timestamp: e.timestamp,
      actor_role: e.actorRole,
      action: e.action,
      detail: e.detail,
      ai_suggested_action: e.aiSuggestedAction,
      ai_accepted: e.aiAccepted,
    })),
  };
}

// ─── Tool 4: get_audit_trail ─────────────────────────────────────

const get_audit_trail_decl: FunctionDeclaration = {
  name: 'get_audit_trail',
  description:
    'Query the audit log of all resolution decisions. Returns up to 30 entries, most recent first. ' +
    'Use this for questions like "what actions has AP taken this week?", ' +
    '"show me audit history", "how many decisions were AI-assisted?", or "what was approved recently?".',
  parameters: {
    type: Type.OBJECT,
    properties: {
      actor_role: {
        type: Type.STRING,
        description: 'Filter by actor role (e.g. "AP Associate", "AP Manager").',
      },
      action_substring: {
        type: Type.STRING,
        description: 'Filter to entries whose action contains this substring (case-insensitive).',
      },
      days_back: {
        type: Type.NUMBER,
        description: 'Only entries from the last N days. Defaults to all-time if omitted.',
      },
      ai_assisted_only: {
        type: Type.BOOLEAN,
        description: 'If true, only return entries that had an AI-suggested action recorded.',
      },
    },
  },
};

function get_audit_trail(args: any, snap: StoreSnapshot) {
  let entries = snap.auditLog.slice().reverse();

  if (args.actor_role) {
    const q = String(args.actor_role).toLowerCase();
    entries = entries.filter((e) => e.actorRole.toLowerCase() === q);
  }
  if (args.action_substring) {
    const q = String(args.action_substring).toLowerCase();
    entries = entries.filter((e) => e.action.toLowerCase().includes(q));
  }
  if (typeof args.days_back === 'number' && args.days_back > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - args.days_back);
    entries = entries.filter((e) => new Date(e.timestamp) >= cutoff);
  }
  if (args.ai_assisted_only === true) {
    entries = entries.filter((e) => !!e.aiSuggestedAction);
  }

  const total = entries.length;
  const limited = entries.slice(0, 30);

  const aiAssistedCount = entries.filter((e) => !!e.aiSuggestedAction).length;
  const aiAcceptedCount = entries.filter((e) => e.aiAccepted === true).length;
  const acceptanceRate =
    aiAssistedCount > 0 ? Math.round((aiAcceptedCount / aiAssistedCount) * 100) : null;

  return {
    total_matched: total,
    showing: limited.length,
    truncated: total > 30,
    summary: {
      ai_assisted_entries: aiAssistedCount,
      ai_accepted_entries: aiAcceptedCount,
      ai_acceptance_rate_pct: acceptanceRate,
    },
    entries: limited.map((e) => ({
      timestamp: e.timestamp,
      invoice_number: e.invoiceNumber,
      actor_role: e.actorRole,
      action: e.action,
      detail: e.detail,
      ai_suggested: e.aiSuggestedAction,
      ai_accepted: e.aiAccepted,
    })),
  };
}

// ─── Tool 5: list_vendors ────────────────────────────────────────

const list_vendors_decl: FunctionDeclaration = {
  name: 'list_vendors',
  description:
    'List vendors in the master, optionally filtered by status. Each row includes how many invoices ' +
    'are associated with that vendor and how many have exceptions. Use this for questions like ' +
    '"which vendors are blocked?", "show me my vendors", "who has the most exceptions?".',
  parameters: {
    type: Type.OBJECT,
    properties: {
      status: {
        type: Type.STRING,
        description: 'Filter by vendor status. One of: active, blocked, inactive.',
      },
      country: {
        type: Type.STRING,
        description: 'Filter by 2-letter ISO country code (e.g. US, DE, FR).',
      },
    },
  },
};

function list_vendors(args: any, snap: StoreSnapshot) {
  let vendors = snap.vendors.slice();
  if (args.status) {
    const q = String(args.status).toLowerCase();
    vendors = vendors.filter((v) => v.status === q);
  }
  if (args.country) {
    const q = String(args.country).toUpperCase();
    vendors = vendors.filter((v) => (v.country || '').toUpperCase() === q);
  }

  return {
    total: vendors.length,
    vendors: vendors.map((v) => {
      const invoicesForVendor = snap.matchedInvoices.filter(
        (m) => m.invoice.vendor_code === v.vendor_code
      );
      const exceptionsForVendor = invoicesForVendor.filter((m) => m.exceptionCode !== 'CLEAN');
      return {
        vendor_code: v.vendor_code,
        vendor_name: v.vendor_name,
        tax_id: v.tax_id,
        status: v.status,
        payment_terms: v.payment_terms,
        country: v.country,
        invoice_count: invoicesForVendor.length,
        exception_count: exceptionsForVendor.length,
      };
    }),
  };
}

// ─── Tool 6: list_exceptions ─────────────────────────────────────

const list_exceptions_decl: FunctionDeclaration = {
  name: 'list_exceptions',
  description:
    'Group invoices by exception type and return summary counts and totals. Use this for ' +
    '"what exception types are in the queue?", "give me a breakdown of issues", ' +
    'or "which exception type is most common?".',
  parameters: { type: Type.OBJECT, properties: {} },
};

function list_exceptions(_args: any, snap: StoreSnapshot) {
  const byCode: Record<string, { count: number; total_value_usd: number; example_invoices: string[] }> = {};
  for (const m of snap.matchedInvoices) {
    const code = m.exceptionCode;
    if (!byCode[code]) byCode[code] = { count: 0, total_value_usd: 0, example_invoices: [] };
    byCode[code].count++;
    byCode[code].total_value_usd += m.invoice.amount || 0;
    if (byCode[code].example_invoices.length < 3) {
      byCode[code].example_invoices.push(`${m.invoice.custInvoiceNo} (${m.invoice.supplier})`);
    }
  }
  for (const code of Object.keys(byCode)) {
    byCode[code].total_value_usd = Math.round(byCode[code].total_value_usd);
  }
  return { by_exception_code: byCode };
}

// ─── Tool 7: get_sla_breakdown ───────────────────────────────────

const get_sla_breakdown_decl: FunctionDeclaration = {
  name: 'get_sla_breakdown',
  description:
    'Get the SLA tier breakdown — how many invoices are overdue, critical, in watch, healthy, or paid — ' +
    'with totals by value. Use this for questions about payment health, "are we paying on time?", ' +
    '"what\'s overdue and by how much?".',
  parameters: { type: Type.OBJECT, properties: {} },
};

function get_sla_breakdown(_args: any, snap: StoreSnapshot) {
  const byTier: Record<string, { count: number; total_value_usd: number; example_invoices: string[] }> = {
    OVERDUE: { count: 0, total_value_usd: 0, example_invoices: [] },
    RED: { count: 0, total_value_usd: 0, example_invoices: [] },
    AMBER: { count: 0, total_value_usd: 0, example_invoices: [] },
    GREEN: { count: 0, total_value_usd: 0, example_invoices: [] },
    PAID: { count: 0, total_value_usd: 0, example_invoices: [] },
  };

  for (const inv of snap.invoices) {
    const sla = computeSla(inv);
    const t = sla.tier;
    byTier[t].count++;
    byTier[t].total_value_usd += inv.amount || 0;
    if (byTier[t].example_invoices.length < 3) {
      byTier[t].example_invoices.push(
        `${inv.custInvoiceNo} (${inv.supplier}, ${sla.label})`
      );
    }
  }

  for (const t of Object.keys(byTier)) {
    byTier[t].total_value_usd = Math.round(byTier[t].total_value_usd);
  }

  const agg = computeSlaAggregate(snap.invoices);

  return {
    by_sla_tier: byTier,
    avg_dpo_days: agg.averageDpo,
    pct_paid_within_terms: agg.pctPaidWithinTerms,
  };
}

// ─── Registry ────────────────────────────────────────────────────

export const FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  get_aggregate_kpis_decl,
  find_invoices_decl,
  get_invoice_details_decl,
  get_audit_trail_decl,
  list_vendors_decl,
  list_exceptions_decl,
  get_sla_breakdown_decl,
];

type ToolImpl = (args: any, snap: StoreSnapshot) => any;

export const TOOL_IMPLEMENTATIONS: Record<string, ToolImpl> = {
  get_aggregate_kpis,
  find_invoices,
  get_invoice_details,
  get_audit_trail,
  list_vendors,
  list_exceptions,
  get_sla_breakdown,
};

export const TOOL_LABELS: Record<string, string> = {
  get_aggregate_kpis: 'Reading aggregate KPIs',
  find_invoices: 'Searching invoices',
  get_invoice_details: 'Loading invoice details',
  get_audit_trail: 'Reading audit trail',
  list_vendors: 'Listing vendors',
  list_exceptions: 'Grouping exceptions',
  get_sla_breakdown: 'Computing SLA breakdown',
};
