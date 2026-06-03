import { GoogleGenAI } from '@google/genai';
import { Invoice, InvoiceStatus } from '../types';

// ─── Extracted shape — what we ask Gemini to return ───────────────

export interface ExtractedInvoice {
  invoice_number: string;
  vendor_name: string;
  vendor_code?: string;
  po_number?: string;
  line_number?: number;
  invoice_date: string;          // ISO yyyy-mm-dd
  amount: number;
  billed_qty?: number;
  billed_price?: number;
  currency?: string;
  payment_terms?: string;
  confidence: number;            // 0-100, AI's self-assessed extraction confidence
  raw_text?: string;             // optional, for debugging
}

export interface ExtractionResult {
  ok: boolean;
  extracted?: ExtractedInvoice;
  error?: string;
  fileName: string;
}

// ─── Convert a File to base64 (strip the data:...;base64, prefix) ──

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ─── Call Gemini with the PDF + a strict JSON instruction ──────────

export async function extractInvoiceFromPdf(file: File): Promise<ExtractionResult> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const base64 = await fileToBase64(file);
    const mimeType = file.type || 'application/pdf';

    const prompt = `You are an invoice data extraction assistant. Read this invoice document and return STRICT JSON ONLY (no prose, no markdown, no code fences) with this exact shape:

{
  "invoice_number": "string — the supplier's invoice number",
  "vendor_name": "string — the supplier name",
  "vendor_code": "string or null — the buyer's vendor code if visible",
  "po_number": "string or null — the PO number referenced",
  "line_number": "number or null — the PO line number if visible, else 1",
  "invoice_date": "string — invoice date in yyyy-mm-dd",
  "amount": "number — net invoice total",
  "billed_qty": "number or null — total quantity billed",
  "billed_price": "number or null — unit price",
  "currency": "string — 3-letter currency code, default USD",
  "payment_terms": "string or null — e.g. 'Net 30'",
  "confidence": "number 0-100 — your self-assessed extraction confidence"
}

If a field isn't visible, use null (not empty string). Return ONLY the JSON object.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: prompt },
          ],
        },
      ],
    });

    let text = response.text || '';
    // Strip code fences if Gemini wraps the JSON despite instructions
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return { ok: false, error: `Could not parse extraction as JSON. Raw output: ${text.slice(0, 200)}`, fileName: file.name };
    }

    return {
      ok: true,
      extracted: {
        invoice_number: parsed.invoice_number ?? '',
        vendor_name:    parsed.vendor_name    ?? '',
        vendor_code:    parsed.vendor_code    ?? undefined,
        po_number:      parsed.po_number      ?? undefined,
        line_number:    parsed.line_number    ?? 1,
        invoice_date:   parsed.invoice_date   ?? '',
        amount:         Number(parsed.amount) || 0,
        billed_qty:     parsed.billed_qty != null ? Number(parsed.billed_qty) : undefined,
        billed_price:   parsed.billed_price != null ? Number(parsed.billed_price) : undefined,
        currency:       parsed.currency ?? 'USD',
        payment_terms:  parsed.payment_terms ?? undefined,
        confidence:     Math.min(100, Math.max(0, Number(parsed.confidence) || 50)),
      },
      fileName: file.name,
    };
  } catch (e: any) {
    return { ok: false, error: e.message || 'Extraction failed', fileName: file.name };
  }
}

// ─── Convert ExtractedInvoice → Invoice store record ───────────────

export function extractedToInvoice(ext: ExtractedInvoice, supplier: string): Invoice {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `INV-${ext.invoice_number}-${Date.now()}`,
    supplier: supplier || ext.vendor_name,
    poNumber: ext.po_number ?? '',
    line_number: ext.line_number ?? 1,
    invoiceDate: ext.invoice_date,
    postingDate: today,
    paymentTerm: ext.payment_terms ?? 'Net 30',
    payerId: 'EXTRACTED',
    payerName: 'EXTRACTED',
    paymentType: 'Standard',
    amount: ext.amount,
    status: InvoiceStatus.BLOCKED,            // Step 3's match engine will set this properly
    purchaseType: 'Goods',
    disputeId: `D-${ext.invoice_number}`,
    custInvoiceNo: ext.invoice_number,
    serviceDate: ext.invoice_date,
    initiationDate: today,
    confidence: ext.confidence,
    popAttached: true,
    paymentStatus: 'Not yet due',
    priorityScore: 50,
    billed_qty: ext.billed_qty,
    billed_price: ext.billed_price,
    vendor_code: ext.vendor_code,
  };
}