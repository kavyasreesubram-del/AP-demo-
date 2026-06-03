import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import {
  Invoice,
  Vendor,
  PurchaseOrder,
  GoodsReceipt,
  InvoiceStatus,
} from './types';
import {
  seedInvoices,
  seedVendors,
  seedPurchaseOrders,
  seedGoodsReceipts,
} from './constants';
import { matchAllInvoices, MatchResult, ExceptionCode } from './lib/matchEngine';

// ─── Audit log entry ──────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  timestamp: string;
  invoiceId: string;
  invoiceNumber: string;
  actorRole: 'AP Associate' | 'AP Manager' | 'Admin' | 'System';
  action: string;
  exceptionCode?: ExceptionCode;
  detail?: string;
  aiSuggestedAction?: string;
  aiAccepted?: boolean;
}

// ─── localStorage persistence helpers ─────────────────────────────

const STORAGE_KEY = 'enterprise-ap-iq-store-v1';
// Bump the version suffix when you change the shape of the persisted data.
// Old payloads under a different version will be ignored and seeds used instead.

interface PersistedShape {
  version: 1;
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  invoices: Invoice[];
  auditLog: AuditEntry[];
}

function loadFromStorage(): PersistedShape | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return null;
    // Basic shape validation — bail if anything is missing
    if (!Array.isArray(parsed.vendors) || !Array.isArray(parsed.invoices)) return null;
    return parsed as PersistedShape;
  } catch {
    return null;
  }
}

function saveToStorage(payload: PersistedShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    // Quota exceeded or storage disabled — fail silently. The app still works
    // in-memory; user just loses persistence across refresh.
    console.warn('[store] localStorage write failed', e);
  }
}

function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ─── Shape of the store ───────────────────────────────────────────

interface StoreState {
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  invoices: Invoice[];
  auditLog: AuditEntry[];

  matchedInvoices: MatchResult[];
  matchedById: Record<string, MatchResult>;

  setVendors: (rows: Vendor[]) => void;
  setPurchaseOrders: (rows: PurchaseOrder[]) => void;
  setGoodsReceipts: (rows: GoodsReceipt[]) => void;
  setInvoices: (rows: Invoice[]) => void;

  appendInvoices: (rows: Invoice[]) => void;
  appendPurchaseOrders: (rows: PurchaseOrder[]) => void;
  appendGoodsReceipts: (rows: GoodsReceipt[]) => void;
  appendVendors: (rows: Vendor[]) => void;

  resolveInvoice: (
    invoiceId: string,
    action: string,
    actorRole: AuditEntry['actorRole'],
    detail?: string,
    aiSuggested?: { action: string; accepted: boolean }
  ) => void;
  setInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => void;
  appendAuditEntry: (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => void;

  resetToSeed: () => void;

  counts: {
    vendors: number;
    purchaseOrders: number;
    goodsReceipts: number;
    invoices: number;
    auditLog: number;
  };
}

const StoreContext = createContext<StoreState | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialise from localStorage if present, otherwise seeds.
  // useState's initializer function runs only once on mount, so this is safe.
  const persisted = loadFromStorage();

  const [vendors, setVendorsState]               = useState<Vendor[]>(persisted?.vendors        ?? seedVendors);
  const [purchaseOrders, setPurchaseOrdersState] = useState<PurchaseOrder[]>(persisted?.purchaseOrders ?? seedPurchaseOrders);
  const [goodsReceipts, setGoodsReceiptsState]   = useState<GoodsReceipt[]>(persisted?.goodsReceipts   ?? seedGoodsReceipts);
  const [invoices, setInvoicesState]             = useState<Invoice[]>(persisted?.invoices             ?? seedInvoices);
  const [auditLog, setAuditLog]                  = useState<AuditEntry[]>(persisted?.auditLog          ?? []);

  // Persist on every change.
  useEffect(() => {
    saveToStorage({
      version: 1,
      vendors,
      purchaseOrders,
      goodsReceipts,
      invoices,
      auditLog,
    });
  }, [vendors, purchaseOrders, goodsReceipts, invoices, auditLog]);

  // Bulk + append
  const setVendors        = useCallback((rows: Vendor[])         => setVendorsState(rows), []);
  const setPurchaseOrders = useCallback((rows: PurchaseOrder[])  => setPurchaseOrdersState(rows), []);
  const setGoodsReceipts  = useCallback((rows: GoodsReceipt[])   => setGoodsReceiptsState(rows), []);
  const setInvoices       = useCallback((rows: Invoice[])        => setInvoicesState(rows), []);

  const appendInvoices        = useCallback((rows: Invoice[])        => setInvoicesState(prev => [...prev, ...rows]), []);
  const appendPurchaseOrders  = useCallback((rows: PurchaseOrder[])  => setPurchaseOrdersState(prev => [...prev, ...rows]), []);
  const appendGoodsReceipts   = useCallback((rows: GoodsReceipt[])   => setGoodsReceiptsState(prev => [...prev, ...rows]), []);
  const appendVendors         = useCallback((rows: Vendor[])         => setVendorsState(prev => [...prev, ...rows]), []);

  const appendAuditEntry = useCallback((entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
    setAuditLog(prev => [
      ...prev,
      {
        ...entry,
        id: `A-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  const setInvoiceStatus = useCallback((invoiceId: string, status: InvoiceStatus) => {
    setInvoicesState(prev => prev.map(i => i.id === invoiceId ? { ...i, status } : i));
  }, []);

  const resolveInvoice = useCallback((
    invoiceId: string,
    action: string,
    actorRole: AuditEntry['actorRole'],
    detail?: string,
    aiSuggested?: { action: string; accepted: boolean },
  ) => {
    const approvingActions = ['Approve', 'Accept variance', 'Accept short qty', 'Pay anyway (manager override)'];
    const rejectingActions = ['Reject', 'Reject invoice', 'Mark duplicate · reject'];
    let newStatus: InvoiceStatus | null = null;
    if (approvingActions.includes(action)) newStatus = InvoiceStatus.APPROVED;
    if (rejectingActions.some(a => action.startsWith(a))) newStatus = InvoiceStatus.PARKED;

    let invoiceNumber = '';
    setInvoicesState(prev => prev.map(i => {
      if (i.id !== invoiceId) return i;
      invoiceNumber = i.custInvoiceNo || i.id;
      if (newStatus) return { ...i, status: newStatus };
      return i;
    }));

    setAuditLog(prev => [
      ...prev,
      {
        id: `A-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        invoiceId,
        invoiceNumber,
        actorRole,
        action,
        detail,
        aiSuggestedAction: aiSuggested?.action,
        aiAccepted: aiSuggested?.accepted,
      },
    ]);
  }, []);

  // Live match results
  const matchedInvoices = useMemo(
    () => matchAllInvoices(invoices, purchaseOrders, goodsReceipts, vendors),
    [invoices, purchaseOrders, goodsReceipts, vendors],
  );
  const matchedById = useMemo(() => {
    const out: Record<string, MatchResult> = {};
    matchedInvoices.forEach(m => { out[m.invoice.id] = m; });
    return out;
  }, [matchedInvoices]);

  // Reset — also clears localStorage so the persisted state goes back to seeds
  const resetToSeed = useCallback(() => {
    clearStorage();
    setVendorsState(seedVendors);
    setPurchaseOrdersState(seedPurchaseOrders);
    setGoodsReceiptsState(seedGoodsReceipts);
    setInvoicesState(seedInvoices);
    setAuditLog([]);
  }, []);

  const value: StoreState = {
    vendors,
    purchaseOrders,
    goodsReceipts,
    invoices,
    auditLog,
    matchedInvoices,
    matchedById,
    setVendors,
    setPurchaseOrders,
    setGoodsReceipts,
    setInvoices,
    appendInvoices,
    appendPurchaseOrders,
    appendGoodsReceipts,
    appendVendors,
    resolveInvoice,
    setInvoiceStatus,
    appendAuditEntry,
    resetToSeed,
    counts: {
      vendors: vendors.length,
      purchaseOrders: purchaseOrders.length,
      goodsReceipts: goodsReceipts.length,
      invoices: invoices.length,
      auditLog: auditLog.length,
    },
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = (): StoreState => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
};