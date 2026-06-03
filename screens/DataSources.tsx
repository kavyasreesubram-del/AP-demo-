import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import {
  parseVendorsCsv,
  parsePurchaseOrdersCsv,
  parseGoodsReceiptsCsv,
  parseInvoicesCsv,
  ParseResult,
} from '../lib/csvParse';
import {
  extractInvoiceFromPdf,
  extractedToInvoice,
  ExtractionResult,
} from '../lib/invoiceExtract';
import { Vendor, PurchaseOrder, GoodsReceipt, Invoice } from '../types';

// ─── Schema definitions shown in the UI above each drop zone ──────

const SCHEMAS = {
  vendors: {
    title: 'Vendor master',
    sapTable: 'LFA1',
    columns: [
      ['vendor_code',    'LFA1-LIFNR',  'required', 'Supplier code'],
      ['vendor_name',    'LFA1-NAME1',  'required', 'Supplier name'],
      ['tax_id',         'LFA1-STCD1',  'required', 'Tax identifier'],
      ['payment_terms',  'LFB1-ZTERM',  'required', 'e.g. Net 30'],
      ['status',         '',            'optional', 'active | blocked | inactive (default: active)'],
      ['country',        'LFA1-LAND1',  'optional', 'ISO country code'],
    ],
  },
  pos: {
    title: 'Purchase Orders',
    sapTable: 'EKKO header + EKPO line items',
    columns: [
      ['po_number',     'EKKO-EBELN',  'required', 'PO document number'],
      ['line_number',   'EKPO-EBELP',  'required', 'PO line item number'],
      ['vendor_code',   'EKKO-LIFNR',  'required', 'Supplier code (matches vendor master)'],
      ['sku',           'EKPO-MATNR',  'required', 'Material number'],
      ['description',   'EKPO-TXZ01',  'required', 'Material short text'],
      ['unit_price',    'EKPO-NETPR',  'required', 'Net price per unit'],
      ['quantity',      'EKPO-MENGE',  'required', 'Ordered quantity'],
      ['tolerance_pct', '',            'optional', 'Price tolerance e.g. 0.005 (default: 0.005)'],
      ['currency',      'EKKO-WAERS',  'optional', '3-letter currency code (default: USD)'],
      ['po_date',       'EKKO-AEDAT',  'required', 'PO date yyyy-mm-dd or dd/mm/yyyy'],
    ],
  },
  grs: {
    title: 'Goods Receipts',
    sapTable: 'MKPF header + MSEG line items',
    columns: [
      ['gr_number',        'MKPF-MBLNR',  'required', 'Material document number'],
      ['po_number',        'MSEG-EBELN',  'required', 'Referenced PO (join key)'],
      ['line_number',      'MSEG-EBELP',  'required', 'Referenced PO line (join key)'],
      ['received_qty',     'MSEG-MENGE',  'required', 'Received quantity'],
      ['received_date',    'MKPF-BUDAT',  'required', 'Posting date yyyy-mm-dd or dd/mm/yyyy'],
      ['plant',            'MSEG-WERKS',  'optional', 'Plant code'],
      ['storage_location', 'MSEG-LGORT',  'optional', 'Storage location'],
    ],
  },
  invoices_csv: {
    title: 'Synthetic Invoice CSV',
    sapTable: 'RBKP header + RSEG line items (or any structured export)',
    columns: [
      ['invoice_number',  'RBKP-XBLNR', 'required', 'Supplier invoice number'],
      ['supplier',        '',           'required', 'Supplier name (free text)'],
      ['vendor_code',     'RBKP-LIFNR', 'optional', 'Vendor code (preferred — drives vendor match)'],
      ['po_number',       'RSEG-EBELN', 'optional', 'Referenced PO'],
      ['line_number',     'RSEG-EBELP', 'optional', 'PO line (default 1)'],
      ['invoice_date',    'RBKP-BLDAT', 'required', 'Invoice date yyyy-mm-dd or dd/mm/yyyy'],
      ['amount',          'RBKP-RMWWR', 'required', 'Net invoice amount'],
      ['billed_qty',      'RSEG-MENGE', 'optional', 'Billed quantity (drives qty variance)'],
      ['billed_price',    'RSEG-WRBTR', 'optional', 'Billed unit price (drives price variance)'],
      ['payment_terms',   'RBKP-ZTERM', 'optional', 'e.g. Net 30 (default: Net 30)'],
      ['purchase_type',   '',           'optional', '"Goods" or "Services" (default: Goods)'],
    ],
  },
} as const;

// ─── Reusable: schema documentation panel ─────────────────────────

const SchemaPanel: React.FC<{ schema: typeof SCHEMAS[keyof typeof SCHEMAS] }> = ({ schema }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 text-xs">
    <div className="flex items-baseline gap-2 mb-2">
      <span className="font-bold text-slate-900">{schema.title}</span>
      <span className="text-slate-500">· SAP source: <code className="font-mono text-[10px] bg-white px-1 py-0.5 rounded">{schema.sapTable}</code></span>
    </div>
    <table className="w-full">
      <thead>
        <tr className="text-[10px] uppercase tracking-wider text-slate-400">
          <th className="text-left py-1">CSV column</th>
          <th className="text-left py-1">SAP field</th>
          <th className="text-left py-1">Req.</th>
          <th className="text-left py-1">Notes</th>
        </tr>
      </thead>
      <tbody>
        {schema.columns.map(([col, sap, req, notes]) => (
          <tr key={col} className="border-t border-slate-100">
            <td className="py-1 font-mono text-[11px] text-slate-900">{col}</td>
            <td className="py-1 font-mono text-[10px] text-slate-500">{sap || '—'}</td>
            <td className="py-1">
              <span className={req === 'required' ? 'text-rose-600 font-bold' : 'text-slate-400'}>{req}</span>
            </td>
            <td className="py-1 text-slate-600">{notes}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ─── Reusable: result strip showing valid vs rejected ─────────────

function ResultStrip<T>({ result, onCommit, onClear }: {
  result: ParseResult<T> | null;
  onCommit: () => void;
  onClear: () => void;
}) {
  if (!result) return null;
  const okRate = result.totalRows ? Math.round((result.valid.length / result.totalRows) * 100) : 0;
  return (
    <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
      <div className="grid grid-cols-3 divide-x divide-slate-200 text-center">
        <div className="p-3">
          <div className="text-2xl font-bold text-slate-900">{result.totalRows}</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">rows parsed</div>
        </div>
        <div className="p-3 bg-emerald-50">
          <div className="text-2xl font-bold text-emerald-700">{result.valid.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-emerald-700">valid · {okRate}%</div>
        </div>
        <div className="p-3 bg-rose-50">
          <div className="text-2xl font-bold text-rose-700">{result.rejected.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-rose-700">rejected</div>
        </div>
      </div>

      {result.rejected.length > 0 && (
        <div className="bg-rose-50/50 border-t border-rose-200 max-h-40 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-rose-700 bg-rose-50">
              <tr><th className="text-left px-3 py-1.5">Row #</th><th className="text-left px-3 py-1.5">Rejection reasons</th></tr>
            </thead>
            <tbody>
              {result.rejected.slice(0, 50).map((r, i) => (
                <tr key={i} className="border-t border-rose-100">
                  <td className="px-3 py-1.5 font-mono text-rose-900">{r.rowNumber}</td>
                  <td className="px-3 py-1.5 text-rose-800">{r.reasons.join(' · ')}</td>
                </tr>
              ))}
              {result.rejected.length > 50 && (
                <tr><td colSpan={2} className="px-3 py-1.5 text-rose-600 italic">… and {result.rejected.length - 50} more</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white border-t border-slate-200 p-3 flex gap-2 justify-end">
        <button onClick={onClear} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded">
          Clear
        </button>
        <button
          onClick={onCommit}
          disabled={result.valid.length === 0}
          className="px-3 py-1.5 text-xs font-bold bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Commit {result.valid.length} valid rows →
        </button>
      </div>
    </div>
  );
}

// ─── Reusable: CSV drop zone ──────────────────────────────────────

function CsvDropZone<T>({
  schemaKey,
  parser,
  onCommit,
}: {
  schemaKey: keyof typeof SCHEMAS;
  parser: (file: File) => Promise<ParseResult<T>>;
  onCommit: (rows: T[]) => void;
}) {
  const [result, setResult] = useState<ParseResult<T> | null>(null);
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    try {
      const r = await parser(file);
      setResult(r);
    } catch (e: any) {
      setResult({ valid: [], rejected: [{ rowNumber: 0, reasons: [`Parse failed: ${e.message}`], raw: {} }], totalRows: 0 });
    } finally {
      setParsing(false);
    }
  };

  return (
    <div>
      <SchemaPanel schema={SCHEMAS[schemaKey]} />

      <div
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-slate-50 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {parsing ? (
          <div className="text-slate-500 text-sm">Parsing {fileName}…</div>
        ) : fileName ? (
          <div>
            <div className="text-sm text-slate-900 font-bold">{fileName}</div>
            <div className="text-xs text-slate-500 mt-1">Click or drop another file to replace</div>
          </div>
        ) : (
          <div>
            <div className="text-sm text-slate-900 font-bold">Drop CSV here or click to browse</div>
            <div className="text-xs text-slate-500 mt-1">UTF-8, comma-separated, first row is header</div>
          </div>
        )}
      </div>

      <ResultStrip
        result={result}
        onCommit={() => { if (result) { onCommit(result.valid); setResult(null); setFileName(''); } }}
        onClear={() => { setResult(null); setFileName(''); }}
      />
    </div>
  );
}

// ─── Invoice PDF zone ─────────────────────────────────────────────

const InvoicePdfZone: React.FC = () => {
  const { appendInvoices } = useStore();
  const [extractions, setExtractions] = useState<ExtractionResult[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    setBusy(true);
    const results: ExtractionResult[] = [];
    for (const f of Array.from(files)) {
      const r = await extractInvoiceFromPdf(f);
      results.push(r);
      setExtractions([...results]);
    }
    setBusy(false);
  };

  const commitOne = (idx: number) => {
    const r = extractions[idx];
    if (!r.ok || !r.extracted) return;
    appendInvoices([extractedToInvoice(r.extracted, r.extracted.vendor_name)]);
    setExtractions(extractions.filter((_, i) => i !== idx));
  };

  const commitAll = () => {
    const invoices = extractions
      .filter((r) => r.ok && r.extracted)
      .map((r) => extractedToInvoice(r.extracted!, r.extracted!.vendor_name));
    appendInvoices(invoices);
    setExtractions([]);
  };

  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-xs">
        <div className="font-bold text-blue-900 mb-1">Invoice PDFs · AI extraction via Gemini vision</div>
        <div className="text-blue-800 leading-relaxed">
          Drop one or more invoice PDFs (or scanned images). Each is sent to Gemini, which extracts
          invoice number, vendor, PO reference, line, amount, qty, and date as structured JSON.
          You confirm before commit — no auto-write.
        </div>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-slate-50 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/png,image/jpeg,image/jpg"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); }}
        />
        {busy ? (
          <div className="text-slate-500 text-sm">Extracting with Gemini…</div>
        ) : (
          <div>
            <div className="text-sm text-slate-900 font-bold">Drop invoice PDFs/images here or click to browse</div>
            <div className="text-xs text-slate-500 mt-1">PDF · PNG · JPG · multi-file supported</div>
          </div>
        )}
      </div>

      {extractions.length > 0 && (
        <div className="mt-4 space-y-2">
          {extractions.map((r, i) => (
            <div key={i} className={`border rounded-lg p-3 text-xs ${r.ok ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-200 bg-rose-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-slate-900">{r.fileName}</div>
                {r.ok ? (
                  <span className="text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">extracted · {r.extracted?.confidence}%</span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded">failed</span>
                )}
              </div>
              {r.ok && r.extracted ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-700">
                  <div><span className="text-slate-500">Invoice #:</span> <span className="font-mono">{r.extracted.invoice_number || '—'}</span></div>
                  <div><span className="text-slate-500">Vendor:</span> {r.extracted.vendor_name || '—'}</div>
                  <div><span className="text-slate-500">PO #:</span> <span className="font-mono">{r.extracted.po_number || '—'}</span></div>
                  <div><span className="text-slate-500">Line:</span> {r.extracted.line_number ?? '—'}</div>
                  <div><span className="text-slate-500">Date:</span> {r.extracted.invoice_date || '—'}</div>
                  <div><span className="text-slate-500">Amount:</span> {r.extracted.currency} {r.extracted.amount?.toLocaleString()}</div>
                  <div><span className="text-slate-500">Billed qty:</span> {r.extracted.billed_qty ?? '—'}</div>
                  <div><span className="text-slate-500">Billed price:</span> {r.extracted.billed_price ?? '—'}</div>
                </div>
              ) : (
                <div className="text-rose-700">{r.error}</div>
              )}
              <div className="mt-2 flex justify-end gap-2">
                <button onClick={() => setExtractions(extractions.filter((_, j) => j !== i))} className="px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-100 rounded">
                  Discard
                </button>
                {r.ok && (
                  <button onClick={() => commitOne(i)} className="px-2 py-1 text-[10px] font-bold bg-primary text-white rounded hover:bg-primary/90">
                    Commit this invoice →
                  </button>
                )}
              </div>
            </div>
          ))}
          {extractions.filter((r) => r.ok).length > 1 && (
            <button onClick={commitAll} className="w-full px-3 py-2 text-xs font-bold bg-primary text-white rounded hover:bg-primary/90">
              Commit all {extractions.filter((r) => r.ok).length} extracted invoices →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Top-level screen ─────────────────────────────────────────────

const DataSources: React.FC = () => {
  const store = useStore();
  const [activeTab, setActiveTab] = useState<'invoices' | 'pos' | 'grs' | 'vendors'>('invoices');
  const [invoiceUploadMode, setInvoiceUploadMode] = useState<'pdf' | 'csv'>('pdf');

  const tabs: { id: typeof activeTab; label: string; count: number; sublabel: string }[] = [
    { id: 'invoices', label: 'Invoices',        count: store.counts.invoices,        sublabel: 'PDFs (AI extract) + bulk CSV' },
    { id: 'pos',      label: 'Purchase Orders', count: store.counts.purchaseOrders,  sublabel: 'SAP CSV: EKKO + EKPO' },
    { id: 'grs',      label: 'Goods Receipts',  count: store.counts.goodsReceipts,   sublabel: 'SAP CSV: MKPF + MSEG' },
    { id: 'vendors',  label: 'Vendor master',   count: store.counts.vendors,         sublabel: 'SAP CSV: LFA1' },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Manual Ingestion  (PO, GR, Invoice, Vendor Master)</h1>
        <p className="text-slate-500 mt-1">
          Invoices come from AP as PDF documents (extracted by AI) or as bulk CSV.
          PO, GR, and vendor data are CSV extracts from SAP.
        </p>
      </div>

      {/* Counts banner — 4 tiles, one per logical collection */}
      <div className="grid grid-cols-4 gap-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`text-left p-4 rounded-lg border-2 transition-all ${
              activeTab === t.id ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{t.label}</div>
            <div className="text-2xl font-bold text-slate-900">{t.count}</div>
            <div className="text-[10px] text-slate-400 mt-1">{t.sublabel}</div>
          </button>
        ))}
      </div>

      {/* Active uploader */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

        {/* Invoices section — toggle between PDF (AI) and CSV (bulk) */}
        {activeTab === 'invoices' && (
          <div>
            <div className="mb-6 inline-flex p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setInvoiceUploadMode('pdf')}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                  invoiceUploadMode === 'pdf'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-sm align-middle mr-1.5">picture_as_pdf</span>
                Upload PDFs · AI extract
              </button>
              <button
                onClick={() => setInvoiceUploadMode('csv')}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                  invoiceUploadMode === 'csv'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-sm align-middle mr-1.5">table_chart</span>
                Bulk CSV
              </button>
            </div>

            {invoiceUploadMode === 'pdf' && <InvoicePdfZone />}
            {invoiceUploadMode === 'csv' && (
              <CsvDropZone<Invoice>
                schemaKey="invoices_csv"
                parser={parseInvoicesCsv}
                onCommit={(rows) => store.appendInvoices(rows)}
              />
            )}
          </div>
        )}

        {activeTab === 'pos' && (
          <CsvDropZone<PurchaseOrder>
            schemaKey="pos"
            parser={parsePurchaseOrdersCsv}
            onCommit={(rows) => store.appendPurchaseOrders(rows)}
          />
        )}
        {activeTab === 'grs' && (
          <CsvDropZone<GoodsReceipt>
            schemaKey="grs"
            parser={parseGoodsReceiptsCsv}
            onCommit={(rows) => store.appendGoodsReceipts(rows)}
          />
        )}
        {activeTab === 'vendors' && (
          <CsvDropZone<Vendor>
            schemaKey="vendors"
            parser={parseVendorsCsv}
            onCommit={(rows) => store.appendVendors(rows)}
          />
        )}
      </div>

      {/* Reset */}
      <div className="text-right">
        <button
          onClick={() => { if (confirm('Reset all four collections to seed data?')) store.resetToSeed(); }}
          className="text-xs text-slate-500 hover:text-rose-600 underline"
        >
          Reset all to seed data
        </button>
      </div>
    </div>
  );
};

export default DataSources;