// ─── SLA Engine ───────────────────────────────────────────────────
// Pure functions. Computes payment due dates, days remaining, and SLA tier
// (green/amber/red/overdue) for an invoice based on its payment terms.

import { Invoice, InvoiceStatus } from '../types';

// ── Tier definitions ─────────────────────────────────────────────

export type SlaTier = 'GREEN' | 'AMBER' | 'RED' | 'OVERDUE' | 'PAID';

export interface SlaResult {
  dueDate: Date | null;           // null if we can't compute a due date
  daysRemaining: number;          // negative = overdue, positive = days to due
  tier: SlaTier;
  label: string;                  // "12 days remaining", "3 days overdue", etc
  termsDays: number;              // parsed days from payment terms
}

// Tier thresholds (days remaining)
const AMBER_AT = 7;
const RED_AT = 3;

// ── Payment-term parsing ─────────────────────────────────────────

/**
 * Parse "Net 30", "Net 45", "30 days", "NET30" etc. into a day count.
 * Falls back to 30 days if unparseable.
 */
export function parsePaymentTerms(terms: string | undefined): number {
  if (!terms) return 30;
  const m = terms.match(/(\d+)/);
  if (!m) return 30;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n) || n < 0) return 30;
  // Sanity cap — payment terms over 180 days are almost certainly a parse error
  return Math.min(n, 180);
}

// ── Invoice-date parsing ─────────────────────────────────────────

/**
 * Parse the invoice date which can arrive in multiple formats from upload paths:
 *   - "dd/mm/yyyy"     (seed + PDF extraction)
 *   - "dd-mm-yyyy"
 *   - "yyyy-mm-dd"     (ISO from CSV ingest)
 *   - "15 April 2026"  (Gemini occasional)
 * Returns null if unparseable.
 */
export function parseInvoiceDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const s = raw.trim();

  // ISO yyyy-mm-dd
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  // dd/mm/yyyy or dd-mm-yyyy
  m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
  if (m) {
    const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
    return isNaN(d.getTime()) ? null : d;
  }

  // "15 April 2026" — fallback to Date constructor; works in modern browsers
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// ── Core SLA computation ─────────────────────────────────────────

export function computeSla(invoice: Invoice, asOf: Date = new Date()): SlaResult {
  const termsDays = parsePaymentTerms(invoice.paymentTerm);
  const invoiceDate = parseInvoiceDate(invoice.invoiceDate);

  if (!invoiceDate) {
    return {
      dueDate: null,
      daysRemaining: 0,
      tier: 'AMBER',
      label: 'Date missing',
      termsDays,
    };
  }

  const dueDate = new Date(invoiceDate.getTime());
  dueDate.setUTCDate(dueDate.getUTCDate() + termsDays);

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const asOfUTC = Date.UTC(
    asOf.getUTCFullYear(),
    asOf.getUTCMonth(),
    asOf.getUTCDate()
  );
  const daysRemaining = Math.floor((dueDate.getTime() - asOfUTC) / MS_PER_DAY);

  // Paid invoices: an APPROVED status means it's flowing for payment — SLA paused
  if (invoice.status === InvoiceStatus.APPROVED) {
    return {
      dueDate,
      daysRemaining,
      tier: 'PAID',
      label: daysRemaining >= 0
        ? `Paid · was due in ${daysRemaining}d`
        : `Paid · was ${Math.abs(daysRemaining)}d late`,
      termsDays,
    };
  }

  let tier: SlaTier;
  let label: string;

  if (daysRemaining < 0) {
    tier = 'OVERDUE';
    label = `${Math.abs(daysRemaining)}d overdue`;
  } else if (daysRemaining <= RED_AT) {
    tier = 'RED';
    label = daysRemaining === 0 ? 'Due today' : `${daysRemaining}d remaining`;
  } else if (daysRemaining <= AMBER_AT) {
    tier = 'AMBER';
    label = `${daysRemaining}d remaining`;
  } else {
    tier = 'GREEN';
    label = `${daysRemaining}d remaining`;
  }

  return { dueDate, daysRemaining, tier, label, termsDays };
}

// ── Aggregate KPIs ───────────────────────────────────────────────

export interface SlaAggregate {
  totalOpen: number;             // invoices not yet APPROVED
  overdueCount: number;
  redCount: number;              // due within 3 days
  amberCount: number;            // due within 4–7 days
  greenCount: number;            // due in 8+ days
  paidCount: number;             // APPROVED status
  // DPO = average days from invoice date to (asOf | dueDate | paymentDate)
  // For demo purposes, simple proxy: for paid invoices, days from invoiceDate to today.
  averageDpo: number;
  // % of paid invoices that were paid within terms (daysRemaining >= 0 at time of payment)
  // For demo proxy: of APPROVED invoices, how many have a non-negative daysRemaining today.
  pctPaidWithinTerms: number;
  // Outstanding value at risk (overdue invoices)
  overdueValue: number;
}

export function computeSlaAggregate(invoices: Invoice[], asOf: Date = new Date()): SlaAggregate {
  const results = invoices.map(inv => ({ inv, sla: computeSla(inv, asOf) }));

  let totalOpen = 0, overdueCount = 0, redCount = 0, amberCount = 0, greenCount = 0, paidCount = 0;
  let overdueValue = 0;
  let dpoSum = 0, dpoCount = 0;
  let paidWithinTerms = 0;

  for (const { inv, sla } of results) {
    switch (sla.tier) {
      case 'OVERDUE':
        totalOpen++;
        overdueCount++;
        overdueValue += inv.amount;
        break;
      case 'RED':
        totalOpen++;
        redCount++;
        break;
      case 'AMBER':
        totalOpen++;
        amberCount++;
        break;
      case 'GREEN':
        totalOpen++;
        greenCount++;
        break;
      case 'PAID':
        paidCount++;
        if (sla.daysRemaining >= 0) paidWithinTerms++;
        // DPO proxy: count of days from invoice date to today (we treat 'now' as the payment date for demo)
        if (sla.dueDate) {
          const invDate = parseInvoiceDate(inv.invoiceDate);
          if (invDate) {
            const MS_PER_DAY = 24 * 60 * 60 * 1000;
            const days = Math.floor((asOf.getTime() - invDate.getTime()) / MS_PER_DAY);
            if (days >= 0 && days < 365) {
              dpoSum += days;
              dpoCount++;
            }
          }
        }
        break;
    }
  }

  return {
    totalOpen,
    overdueCount,
    redCount,
    amberCount,
    greenCount,
    paidCount,
    averageDpo: dpoCount ? Math.round(dpoSum / dpoCount) : 0,
    pctPaidWithinTerms: paidCount ? Math.round((paidWithinTerms / paidCount) * 100) : 0,
    overdueValue,
  };
}

// ── Tier → tailwind class lookup ─────────────────────────────────

export const SLA_TIER_STYLES: Record<SlaTier, { bg: string; text: string; border: string; dot: string }> = {
  GREEN:   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  AMBER:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  RED:     { bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    dot: 'bg-rose-500'    },
  OVERDUE: { bg: 'bg-rose-100',   text: 'text-rose-800',    border: 'border-rose-300',    dot: 'bg-rose-700'    },
  PAID:    { bg: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200',   dot: 'bg-slate-400'   },
};
