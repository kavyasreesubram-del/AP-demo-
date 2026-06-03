import { GoogleGenAI } from '@google/genai';
import {
  Invoice,
  PurchaseOrder,
  GoodsReceipt,
  Vendor,
} from '../types';
import { ExceptionCode, MatchResult } from './matchEngine';
import { computeSla } from './slaEngine';

// ─── Shape returned to the caller ─────────────────────────────────

export interface AiSuggestion {
  ok: true;
  recommendedAction: string;          // must be one of EXCEPTION_ACTIONS[code]
  confidence: number;                 // 0-100
  rationale: string;                  // 1-3 sentences explaining the choice
  evidence: string[];                 // 2-5 short factual bullet points
}

export interface AiSuggestionError {
  ok: false;
  error: string;
}

export type AiSuggestionResult = AiSuggestion | AiSuggestionError;

// ─── Prompt builder ───────────────────────────────────────────────

function buildContext(
  invoice: Invoice,
  match: MatchResult,
  availableActions: string[],
): string {
  const po = match.matchedPO;
  const grs = match.matchedGRs || [];
  const vendor = match.matchedVendor;
  const sla = computeSla(invoice);

  const lines: string[] = [
    '## Exception',
    `Code: ${match.exceptionCode}`,
    `Label: ${match.exceptionLabel}`,
    `Detail: ${match.exceptionDetail}`,
    '',
    '## Invoice',
    `Number: ${invoice.custInvoiceNo}`,
    `Supplier: ${invoice.supplier}${invoice.vendor_code ? ' (vendor code ' + invoice.vendor_code + ')' : ''}`,
    `PO referenced: ${invoice.poNumber} line ${invoice.line_number ?? 1}`,
    `Invoice date: ${invoice.invoiceDate}`,
    `Payment terms: ${invoice.paymentTerm}`,
    `Amount: ${invoice.amount}`,
    invoice.billed_qty != null ? `Billed qty: ${invoice.billed_qty}` : '',
    invoice.billed_price != null ? `Billed unit price: ${invoice.billed_price}` : '',
    `Purchase type: ${invoice.purchaseType}`,
    '',
    '## SLA',
    `Days remaining: ${sla.daysRemaining}`,
    `Tier: ${sla.tier}`,
    `Label: ${sla.label}`,
    '',
  ];

  if (po) {
    lines.push('## Matched Purchase Order');
    lines.push(`PO number: ${po.po_number} line ${po.line_number}`);
    lines.push(`Description: ${po.description} (SKU ${po.sku})`);
    lines.push(`PO unit price: ${po.unit_price} ${po.currency}`);
    lines.push(`PO quantity: ${po.quantity}`);
    lines.push(`Tolerance: ±${(po.tolerance_pct * 100).toFixed(2)}%`);
    lines.push(`PO date: ${po.po_date}`);
    lines.push('');
  } else {
    lines.push('## Matched Purchase Order');
    lines.push('NO PO MATCH FOUND.');
    lines.push('');
  }

  if (grs.length > 0) {
    lines.push('## Goods Receipts');
    const totalReceived = grs.reduce((s, g) => s + g.received_qty, 0);
    lines.push(`Total received: ${totalReceived} units across ${grs.length} posting(s)`);
    grs.forEach(gr => {
      lines.push(`  - ${gr.gr_number}: ${gr.received_qty} units on ${gr.received_date}${gr.plant ? ' at plant ' + gr.plant : ''}`);
    });
    lines.push('');
  } else if (invoice.purchaseType === 'Goods') {
    lines.push('## Goods Receipts');
    lines.push('NO GOODS RECEIPT POSTED against this PO line.');
    lines.push('');
  } else {
    lines.push('## Goods Receipts');
    lines.push('N/A (services — GR not required).');
    lines.push('');
  }

  if (vendor) {
    lines.push('## Vendor');
    lines.push(`Name: ${vendor.vendor_name} (${vendor.vendor_code})`);
    lines.push(`Status: ${vendor.status}`);
    lines.push(`Tax ID: ${vendor.tax_id}`);
    lines.push(`Payment terms: ${vendor.payment_terms}`);
    if (vendor.country) lines.push(`Country: ${vendor.country}`);
    lines.push('');
  } else {
    lines.push('## Vendor');
    lines.push('NOT FOUND in vendor master.');
    lines.push('');
  }

  if (match.computed.priceVariancePct != null) {
    lines.push('## Computed Variance');
    lines.push(`Price variance: ${(match.computed.priceVariancePct * 100).toFixed(2)}%`);
  }
  if (match.computed.qtyDelta != null) {
    if (!match.computed.priceVariancePct) lines.push('## Computed Variance');
    lines.push(`Qty delta: ${match.computed.qtyDelta} units short`);
  }

  lines.push('');
  lines.push('## Available Resolution Actions');
  availableActions.forEach(a => lines.push(`- ${a}`));

  return lines.filter(l => l !== '').join('\n');
}

const SYSTEM_INSTRUCTION = `You are an experienced enterprise AP analyst advising on invoice exception resolution.
Your job is to recommend ONE action from the provided list of available actions, with a clear rationale
grounded in the facts of the case.

Guidelines:
- ALWAYS pick from the available actions list. Do not invent new actions.
- Prefer Approve / Accept variance only when the variance is small, the vendor is trusted, and amounts are immaterial.
- Prefer Request credit note when a vendor has overbilled and the variance is clearly their error.
- Prefer Escalate to AP Manager when amounts exceed routine thresholds (>$10k) or the case is ambiguous.
- Prefer Reject only when there is a clear policy violation (blocked vendor, no PO, duplicate).
- Be concise. 2-3 sentence rationale max.
- Cite specific numbers from the context as evidence.`;

const RESPONSE_PROMPT = `Respond with STRICT JSON ONLY (no prose, no markdown, no code fences) with this exact shape:

{
  "recommended_action": "string — must be one of the available actions, character-for-character",
  "confidence": "number 0-100 — how confident you are in this recommendation",
  "rationale": "string — 1 to 3 sentences explaining the choice",
  "evidence": ["string", "string", ...] — 2 to 5 short factual bullet points citing data
}

Return ONLY the JSON object.`;

// ─── Public function ──────────────────────────────────────────────

export async function suggestResolution(
  invoice: Invoice,
  match: MatchResult,
  availableActions: string[],
): Promise<AiSuggestionResult> {
  // No suggestion available if no actions to choose from
  if (availableActions.length === 0) {
    return { ok: false, error: 'No actions available to recommend.' };
  }

  // No API key (rare — AI Studio injects it) → return graceful fallback
  if (!process.env.API_KEY) {
    return { ok: false, error: 'AI suggestion unavailable: API key not configured in this environment.' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const context = buildContext(invoice, match, availableActions);
    const fullPrompt = `${SYSTEM_INSTRUCTION}\n\n# Case\n\n${context}\n\n${RESPONSE_PROMPT}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts: [{ text: fullPrompt }],
        },
      ],
    });

    let text = response.text || '';
    // Strip code fences if Gemini wraps the JSON
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return {
        ok: false,
        error: `Could not parse AI response as JSON. Raw output: ${text.slice(0, 200)}`,
      };
    }

    // Validate that recommended action is in the available list — Gemini sometimes
    // returns slight variations of the action label
    let recommendedAction: string = parsed.recommended_action || '';
    const exactMatch = availableActions.find(a => a === recommendedAction);
    if (!exactMatch) {
      // Try case-insensitive
      const ciMatch = availableActions.find(a => a.toLowerCase() === recommendedAction.toLowerCase());
      if (ciMatch) {
        recommendedAction = ciMatch;
      } else {
        // Try partial / startsWith match
        const partial = availableActions.find(a =>
          a.toLowerCase().startsWith(recommendedAction.toLowerCase().slice(0, 10)) ||
          recommendedAction.toLowerCase().startsWith(a.toLowerCase().slice(0, 10))
        );
        if (partial) {
          recommendedAction = partial;
        } else {
          // Last resort: surface the discrepancy explicitly rather than silently picking something wrong
          return {
            ok: false,
            error: `AI recommended "${recommendedAction}" which doesn't match any available action. Available: ${availableActions.join(' | ')}`,
          };
        }
      }
    }

    return {
      ok: true,
      recommendedAction,
      confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 70)),
      rationale: String(parsed.rationale || ''),
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence.slice(0, 5).map(String) : [],
    };
  } catch (e: any) {
    return { ok: false, error: e.message || 'Unknown error from Gemini.' };
  }
}
