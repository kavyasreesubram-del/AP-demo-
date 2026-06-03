import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Check,
  X,
  UserPlus,
  ShieldCheck,
  FileText,
  Package,
  ShoppingCart,
  TrendingUp,
  ChevronDown,
  Handshake,
  Clock,
  User,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useStore } from '../store';
import { EXCEPTION_ACTIONS } from '../lib/matchEngine';
import { InvoiceStatus } from '../types';
import { computeSla, SLA_TIER_STYLES } from '../lib/slaEngine';
import { suggestResolution, AiSuggestionResult } from '../lib/aiSuggest';

// ─── Exception code → colour treatment ───────────────────────────

const EXCEPTION_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  CLEAN:           { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  PRICE_VARIANCE:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  QTY_VARIANCE:    { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
  GR_MISSING:      { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200' },
  PO_MISSING:      { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200' },
  DUPLICATE:       { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  VENDOR_BLOCKED:  { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200' },
  VENDOR_MISSING:  { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200' },
};

const ValidationDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const store = useStore();

  const [isProcessing, setIsProcessing] = useState(true);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingEscalationAction, setPendingEscalationAction] = useState<string | null>(null);

  // AI suggestion state
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestionResult | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsProcessing(false), 900);
    return () => clearTimeout(timer);
  }, []);

  // ── Resolve everything from the store ───────────────────────────
  const invoice = store.invoices.find((inv) => inv.id === id) || store.invoices[0];
  const matchResult = store.matchedById[invoice?.id];

  // Audit history for this invoice
  const invoiceAuditEntries = useMemo(
    () => store.auditLog.filter((e) => e.invoiceId === invoice?.id).slice().reverse(),
    [store.auditLog, invoice?.id]
  );

  // Reset AI suggestion when invoice changes
  useEffect(() => {
    setAiSuggestion(null);
  }, [invoice?.id]);

  if (!invoice || !matchResult) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-slate-500">Invoice not found.</p>
      </div>
    );
  }

  const purchaseType = invoice.purchaseType;
  const matchedPO = matchResult.matchedPO;
  const matchedGRs = matchResult.matchedGRs || [];
  const matchedVendor = matchResult.matchedVendor;
  const exceptionCode = matchResult.exceptionCode;
  const exceptionLabel = matchResult.exceptionLabel;
  const exceptionDetail = matchResult.exceptionDetail;
  const computed = matchResult.computed;
  const isClean = exceptionCode === 'CLEAN';
  const isAlreadyResolved =
    invoice.status === InvoiceStatus.APPROVED || invoice.status === InvoiceStatus.PARKED;
  const exceptionStyle = EXCEPTION_STYLES[exceptionCode] || EXCEPTION_STYLES.PO_MISSING;
  const availableActions = EXCEPTION_ACTIONS[exceptionCode] || [];

  // ── Live SLA ────────────────────────────────────────────────────
  const sla = computeSla(invoice);
  const slaStyle = SLA_TIER_STYLES[sla.tier];

  // ── AI suggestion fetch ─────────────────────────────────────────
  const handleRequestAiSuggestion = async () => {
    setIsLoadingSuggestion(true);
    setAiSuggestion(null);
    const result = await suggestResolution(invoice, matchResult, availableActions);
    setAiSuggestion(result);
    setIsLoadingSuggestion(false);
  };

  // ── Action handling — records whether AI suggestion was accepted ─
  const handleAction = (action: string) => {
    if (action.toLowerCase().includes('escalate')) {
      setPendingEscalationAction(action);
      setShowApprovalModal(true);
      return;
    }

    // Was this action what the AI suggested?
    const aiSug = (aiSuggestion && aiSuggestion.ok) ? aiSuggestion : null;
    const aiAccepted = aiSug ? aiSug.recommendedAction === action : undefined;

    store.resolveInvoice(
      invoice.id,
      action,
      'AP Associate',
      exceptionDetail,
      aiSug ? { action: aiSug.recommendedAction, accepted: !!aiAccepted } : undefined
    );

    const approvingActions = ['Approve', 'Accept variance', 'Accept short qty', 'Pay anyway (manager override)'];
    if (approvingActions.includes(action)) {
      navigate(`/success/${invoice.id}`);
    } else {
      navigate('/invoices');
    }
  };

  const handleEscalateConfirm = (managerName: string) => {
    if (!pendingEscalationAction) return;

    const aiSug = (aiSuggestion && aiSuggestion.ok) ? aiSuggestion : null;
    const aiAccepted = aiSug ? aiSug.recommendedAction === pendingEscalationAction : undefined;

    store.resolveInvoice(
      invoice.id,
      `${pendingEscalationAction} → ${managerName}`,
      'AP Associate',
      `${exceptionDetail} · Escalated to ${managerName}`,
      aiSug ? { action: aiSug.recommendedAction, accepted: !!aiAccepted } : undefined
    );
    setShowApprovalModal(false);
    setPendingEscalationAction(null);
    navigate('/invoices');
  };

  // ── Computed financials ─────────────────────────────────────────
  const totalInvoiceAmount = invoice.amount;
  const totalPOAmount = matchedPO ? matchedPO.unit_price * matchedPO.quantity : 0;
  const totalGRReceived = matchedGRs.reduce((s, g) => s + g.received_qty, 0);

  // ── Loading state ───────────────────────────────────────────────
  if (isProcessing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
        <div className="relative mb-8">
          <div className="size-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldCheck className="text-primary w-8 h-8" />
          </div>
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">Running 3-Way Match…</h2>
        <p className="text-slate-500 mt-2 text-xs max-w-[280px]">
          Joining {invoice.poNumber} against the PO master, goods receipts, and vendor master.
        </p>
      </div>
    );
  }

  // ─── Main render ────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in duration-500 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm z-30 shrink-0">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="text-slate-500 w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">3-Way Reconciliation</h1>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${exceptionStyle.bg} ${exceptionStyle.text} ${exceptionStyle.border}`}
              >
                {isClean ? 'Fully Matched' : 'Variance Detected'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${exceptionStyle.bg} ${exceptionStyle.text} ${exceptionStyle.border}`}
              >
                {exceptionLabel}
              </span>
              {/* ── NEW: SLA pill ─────────────────────────────────── */}
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${slaStyle.bg} ${slaStyle.text} ${slaStyle.border} flex items-center gap-1`}
              >
                <span className={`size-1.5 rounded-full ${slaStyle.dot}`} />
                {sla.label}
              </span>
              {isAlreadyResolved && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-slate-100 text-slate-600 border-slate-200">
                  {invoice.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-[10px] font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <FileText size={12} /> {invoice.custInvoiceNo} · ID {invoice.id.slice(0, 16)}…
              </span>
              <span className="h-2 w-px bg-slate-200"></span>
              <span className="font-bold text-slate-900">{invoice.supplier}</span>
              {matchedVendor && (
                <>
                  <span className="h-2 w-px bg-slate-200"></span>
                  <span>{matchedVendor.vendor_code} · {matchedVendor.country}</span>
                </>
              )}
              {sla.dueDate && (
                <>
                  <span className="h-2 w-px bg-slate-200"></span>
                  <span>Due {sla.dueDate.toISOString().slice(0, 10)} · Net {sla.termsDays}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Invoice</p>
            <p className="text-lg font-black text-slate-900">
              ${totalInvoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">PO Value</p>
            <p className="text-lg font-black text-slate-700">
              {matchedPO
                ? `$${totalPOAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Exception detail strip */}
      {!isClean && (
        <div className={`px-8 py-3 ${exceptionStyle.bg} border-b ${exceptionStyle.border} shrink-0`}>
          <div className="flex items-center gap-3">
            <AlertCircle className={`w-4 h-4 ${exceptionStyle.text}`} />
            <p className={`text-xs font-bold ${exceptionStyle.text}`}>{exceptionDetail}</p>
          </div>
        </div>
      )}

      {/* 3-column layout */}
      <div className="flex-1 flex overflow-hidden bg-slate-200 gap-px">

        {/* Column 1: Purchase Order */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="size-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <ShoppingCart size={18} />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Purchase Order</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {matchedPO ? `${matchedPO.po_number} · line ${matchedPO.line_number}` : 'NOT FOUND'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 space-y-4">
            {matchedPO ? (
              <>
                <div className="p-5 rounded-2xl bg-blue-50/40 border border-blue-100">
                  <div className="flex items-baseline justify-between mb-3">
                    <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest">PO Line</p>
                    <span className="text-[10px] font-mono text-slate-500">{matchedPO.id}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 mb-1">{matchedPO.description}</p>
                  <p className="text-[10px] font-mono text-slate-500 mb-4">SKU: {matchedPO.sku}</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Ordered Qty</p>
                      <p className="text-lg font-black text-slate-900">{matchedPO.quantity.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Unit Price</p>
                      <p className="text-lg font-black text-slate-900">
                        {matchedPO.currency} {matchedPO.unit_price.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Tolerance</p>
                      <p className="text-sm font-bold text-slate-700">±{(matchedPO.tolerance_pct * 100).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">PO Date</p>
                      <p className="text-sm font-bold text-slate-700">{matchedPO.po_date}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-blue-200/60 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Line Total</p>
                    <p className="text-base font-black text-blue-700">
                      {matchedPO.currency} {totalPOAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {matchedVendor && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Vendor</p>
                    <p className="text-sm font-bold text-slate-900">{matchedVendor.vendor_name}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                      <span className="text-slate-500">Code: <span className="font-mono text-slate-700">{matchedVendor.vendor_code}</span></span>
                      <span className="text-slate-500">Tax: <span className="font-mono text-slate-700">{matchedVendor.tax_id}</span></span>
                      <span className="text-slate-500">Terms: <span className="text-slate-700">{matchedVendor.payment_terms}</span></span>
                      <span className="text-slate-500">Status: <span className={`font-bold ${matchedVendor.status === 'blocked' ? 'text-rose-600' : 'text-green-600'}`}>{matchedVendor.status}</span></span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-rose-400 gap-4">
                <AlertCircle size={48} />
                <div className="text-center">
                  <p className="font-black uppercase tracking-widest text-[10px] text-rose-600">No PO Match Found</p>
                  <p className="text-[10px] text-rose-500 mt-1 max-w-[200px]">
                    Invoice references {invoice.poNumber} line {invoice.line_number ?? 1} — no record in PO master.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Goods Receipt OR Services note */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden border-x border-slate-200">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className={`size-8 rounded-lg flex items-center justify-center ${
                purchaseType === 'Goods' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
              }`}>
                {purchaseType === 'Goods' ? <Package size={18} /> : <Handshake size={18} />}
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                  {purchaseType === 'Goods' ? 'Goods Receipts' : 'Service Acceptance'}
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {purchaseType === 'Goods'
                    ? `${matchedGRs.length} posting${matchedGRs.length === 1 ? '' : 's'}`
                    : 'No GR required for services'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 space-y-4">
            {purchaseType === 'Services' ? (
              <div className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-100">
                <p className="text-[9px] font-black text-indigo-700 uppercase tracking-widest mb-3">
                  Services Match
                </p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Services purchase orders do not require a goods receipt. The match engine validates the
                  invoice against the PO terms (description, unit price, qty) and vendor master directly.
                </p>
                {matchedPO && (
                  <div className="mt-4 pt-4 border-t border-indigo-200/60 grid grid-cols-2 gap-3 text-[10px]">
                    <div>
                      <p className="text-slate-500">PO Total</p>
                      <p className="font-black text-slate-900">{matchedPO.currency} {totalPOAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Invoice Total</p>
                      <p className="font-black text-slate-900">${totalInvoiceAmount.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : matchedGRs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-rose-400 gap-4">
                <AlertCircle size={48} />
                <div className="text-center">
                  <p className="font-black uppercase tracking-widest text-[10px] text-rose-600">No Goods Receipt</p>
                  <p className="text-[10px] text-rose-500 mt-1 max-w-[220px]">
                    Invoice billed but no GR has been posted against {invoice.poNumber} line {invoice.line_number ?? 1}.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-5 rounded-2xl bg-amber-50/40 border border-amber-100">
                  <div className="flex items-baseline justify-between mb-3">
                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Total Received</p>
                    <span className="text-[10px] text-slate-500">
                      {matchedGRs.length} posting{matchedGRs.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="text-3xl font-black text-amber-700 mb-1">{totalGRReceived.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500">
                    {matchedPO && (
                      <>
                        of {matchedPO.quantity.toLocaleString()} ordered ·{' '}
                        {matchedPO.quantity > 0 ? Math.round((totalGRReceived / matchedPO.quantity) * 100) : 0}% complete
                      </>
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Postings</p>
                  {matchedGRs.map((gr) => (
                    <div key={gr.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-mono text-slate-700">{gr.gr_number}</p>
                        <p className="text-[9px] text-slate-500">{gr.received_date}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-slate-900">{gr.received_qty.toLocaleString()} units</p>
                        {gr.plant && (
                          <span className="text-[9px] font-bold text-slate-500 uppercase">Plant {gr.plant}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Column 3: Vendor Invoice + AI suggestion + Actions */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="size-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Vendor Invoice</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{invoice.custInvoiceNo}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 space-y-4">
            {/* Invoice summary */}
            <div className="p-5 rounded-2xl bg-purple-50/40 border border-purple-100">
              <p className="text-[9px] font-black text-purple-700 uppercase tracking-widest mb-3">Billed</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Billed Qty</p>
                  <p className={`text-lg font-black ${exceptionCode === 'QTY_VARIANCE' ? 'text-amber-700' : 'text-slate-900'}`}>
                    {invoice.billed_qty?.toLocaleString() ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Billed Price</p>
                  <p className={`text-lg font-black ${exceptionCode === 'PRICE_VARIANCE' ? 'text-amber-700' : 'text-slate-900'}`}>
                    {invoice.billed_price != null ? `$${invoice.billed_price.toFixed(2)}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Invoice Date</p>
                  <p className="text-sm font-bold text-slate-700">{invoice.invoiceDate}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Terms</p>
                  <p className="text-sm font-bold text-slate-700">{invoice.paymentTerm}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-purple-200/60 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Total Due</p>
                <p className="text-base font-black text-purple-700">
                  ${totalInvoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Engine-computed variance */}
            {(computed.priceVariancePct != null || computed.qtyDelta != null) && !isClean && (
              <div className={`p-4 rounded-2xl border ${exceptionStyle.bg} ${exceptionStyle.border}`}>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${exceptionStyle.text}`}>
                  Engine-Computed Variance
                </p>
                {computed.priceVariancePct != null && exceptionCode === 'PRICE_VARIANCE' && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Price variance</span>
                    <span className={`font-black ${exceptionStyle.text}`}>
                      {(computed.priceVariancePct * 100).toFixed(2)}%
                    </span>
                  </div>
                )}
                {computed.qtyDelta != null && exceptionCode === 'QTY_VARIANCE' && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Qty shortfall</span>
                    <span className={`font-black ${exceptionStyle.text}`}>
                      {computed.qtyDelta.toLocaleString()} units
                    </span>
                  </div>
                )}
                {computed.receivedTotal != null && (
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-slate-600">Total received</span>
                    <span className="font-bold text-slate-700">{computed.receivedTotal.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* ── AI suggestion card ─────────────────────────────── */}
            {!isAlreadyResolved && !isClean && availableActions.length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-blue-50 border border-violet-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-violet-600" />
                    <p className="text-[10px] font-black text-violet-700 uppercase tracking-widest">
                      AI Resolution Assist
                    </p>
                  </div>
                  {aiSuggestion === null && !isLoadingSuggestion && (
                    <button
                      onClick={handleRequestAiSuggestion}
                      className="text-[10px] font-bold text-violet-700 hover:text-violet-900 transition-colors"
                    >
                      Suggest →
                    </button>
                  )}
                </div>

                {/* Idle state */}
                {aiSuggestion === null && !isLoadingSuggestion && (
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Have Gemini review the matched PO, GR, vendor, and SLA context and recommend an action with
                    rationale and confidence. Your decision is recorded in the audit log as accepted or overridden.
                  </p>
                )}

                {/* Loading state */}
                {isLoadingSuggestion && (
                  <div className="flex items-center gap-2 text-[11px] text-violet-700">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Analyzing context…</span>
                  </div>
                )}

                {/* Error state */}
                {aiSuggestion && !aiSuggestion.ok && (
                  <div className="text-[11px] text-rose-700">
                    <p className="font-bold mb-1">Could not generate suggestion</p>
                    <p className="text-[10px] text-rose-600">{aiSuggestion.error}</p>
                    <button
                      onClick={handleRequestAiSuggestion}
                      className="mt-2 text-[10px] font-bold text-violet-700 hover:text-violet-900 transition-colors"
                    >
                      Try again →
                    </button>
                  </div>
                )}

                {/* Success state */}
                {aiSuggestion && aiSuggestion.ok && (
                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <p className="text-sm font-black text-slate-900">{aiSuggestion.recommendedAction}</p>
                      <span className="text-[10px] font-bold text-violet-700 bg-white border border-violet-200 px-2 py-0.5 rounded">
                        {aiSuggestion.confidence}% confidence
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-relaxed mb-2">{aiSuggestion.rationale}</p>
                    {aiSuggestion.evidence.length > 0 && (
                      <ul className="space-y-1 mb-3">
                        {aiSuggestion.evidence.map((e, i) => (
                          <li key={i} className="text-[10px] text-slate-600 flex items-start gap-1.5">
                            <span className="text-violet-500 mt-0.5">•</span>
                            <span>{e}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-[10px] text-violet-600 italic">
                      Click the recommended action button below to accept · click any other action to override (both recorded).
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Resolution actions */}
            {!isAlreadyResolved && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Resolution Actions
                </p>
                <div className="space-y-2">
                  {availableActions.length === 0 ? (
                    <button
                      onClick={() => {
                        store.resolveInvoice(invoice.id, 'Approve', 'AP Associate', exceptionDetail);
                        navigate(`/success/${invoice.id}`);
                      }}
                      className="w-full py-2.5 bg-primary text-white rounded-lg font-bold text-xs hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={14} />
                      Approve & Finalize
                    </button>
                  ) : (
                    availableActions.map((action, idx) => {
                      const isApproving = ['Approve', 'Accept variance', 'Accept short qty', 'Pay anyway (manager override)'].includes(action);
                      const isRejecting = action.includes('Reject') || action.includes('reject');
                      const isEscalating = action.toLowerCase().includes('escalate');
                      const isAiRecommended = !!(aiSuggestion && aiSuggestion.ok && aiSuggestion.recommendedAction === action);
                      return (
                        <button
                          key={idx}
                          onClick={() => handleAction(action)}
                          className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 relative ${
                            isApproving
                              ? 'bg-primary text-white hover:bg-primary-hover'
                              : isRejecting
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                              : isEscalating
                              ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                          } ${isAiRecommended ? 'ring-2 ring-violet-400 ring-offset-1' : ''}`}
                        >
                          {isApproving ? (
                            <Check size={14} strokeWidth={3} />
                          ) : isRejecting ? (
                            <X size={14} strokeWidth={3} />
                          ) : isEscalating ? (
                            <UserPlus size={14} />
                          ) : (
                            <TrendingUp size={14} />
                          )}
                          <span className="flex-1 text-left">{action}</span>
                          {isAiRecommended && (
                            <span className="text-[8px] font-black uppercase tracking-widest bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Sparkles size={8} />
                              AI pick
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {isAlreadyResolved && (
              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                  This invoice is {invoice.status}
                </p>
                <p className="text-[10px] text-slate-500">
                  Resolution already recorded. See audit history below.
                </p>
              </div>
            )}

            {/* Audit history */}
            {invoiceAuditEntries.length > 0 && (
              <div className="p-4 rounded-2xl bg-white border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Audit History
                </p>
                <div className="space-y-2">
                  {invoiceAuditEntries.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2 text-[10px]">
                      <div className="size-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        <User size={10} className="text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900">{entry.action}</p>
                          {entry.aiSuggestedAction && (
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                              entry.aiAccepted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {entry.aiAccepted ? 'AI accepted' : 'AI overridden'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-[9px]">
                          <span>{entry.actorRole}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock size={9} />
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        {entry.detail && (
                          <p className="text-slate-500 mt-0.5 leading-snug">{entry.detail}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approval routing modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900">Escalate for Approval</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Manager</p>
                </div>
              </div>
              <button
                onClick={() => { setShowApprovalModal(false); setPendingEscalationAction(null); }}
                className="p-2 hover:bg-white rounded-lg text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-4">
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                This exception requires manager approval. The escalation will be recorded in the
                audit log and the invoice routed to the selected manager's queue.
              </p>
              <div className="space-y-2">
                {[
                  { name: 'Sarah Jenkins', role: 'Procurement Manager', dept: 'Operations' },
                  { name: 'Michael Chen', role: 'Senior AP Director', dept: 'Finance' },
                  { name: 'Elena Rodriguez', role: 'Category Manager', dept: 'Sourcing' },
                ].map((manager) => (
                  <button
                    key={manager.name}
                    onClick={() => handleEscalateConfirm(manager.name)}
                    className="w-full p-4 rounded-2xl border border-slate-100 hover:border-primary hover:bg-primary/5 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">
                          {manager.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {manager.role} • {manager.dept}
                        </p>
                      </div>
                      <ChevronDown size={16} className="-rotate-90 text-slate-300 group-hover:text-primary transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => { setShowApprovalModal(false); setPendingEscalationAction(null); }}
                className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                Cancel Escalation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationDetail;
