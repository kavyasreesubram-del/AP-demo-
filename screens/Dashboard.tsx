
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InvoiceStatus, Invoice } from '../types';
import { useStore } from '../store';
import { computeSla, SLA_TIER_STYLES } from '../lib/slaEngine';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { matchedInvoices } = useStore();
  const mockInvoices = matchedInvoices.map(m => ({
    ...m.invoice,
    // Override the stale hardcoded fields with the live engine result
    status: m.effectiveStatus,
    disputeReason: m.exceptionCode === 'CLEAN' ? undefined : m.exceptionLabel,
  }));
  const [activeTab, setActiveTab] = useState<'review' | 'history'>('review');
  const [filters, setFilters] = useState({
    search: '',
    purchaseType: 'All',
    paymentStatus: 'All',
    confidence: 'All'
  });

  const filteredInvoices = mockInvoices.filter(invoice => {
    // Tab filter
    const matchesTab = activeTab === 'review'
      ? invoice.status !== InvoiceStatus.APPROVED
      : invoice.status === InvoiceStatus.APPROVED;

    if (!matchesTab) return false;

    // Search filter
    const matchesSearch = invoice.supplier.toLowerCase().includes(filters.search.toLowerCase()) ||
                          invoice.id.toLowerCase().includes(filters.search.toLowerCase()) ||
                          invoice.poNumber.toLowerCase().includes(filters.search.toLowerCase());

    if (!matchesSearch) return false;

    // Purchase Type filter
    if (filters.purchaseType !== 'All' && invoice.purchaseType !== filters.purchaseType) return false;

    // Payment Status filter
    if (filters.paymentStatus !== 'All' && invoice.paymentStatus !== filters.paymentStatus) return false;

    // Confidence filter
    if (filters.confidence !== 'All') {
      if (filters.confidence === 'High' && invoice.confidence < 90) return false;
      if (filters.confidence === 'Medium' && (invoice.confidence < 75 || invoice.confidence >= 90)) return false;
      if (filters.confidence === 'Low' && invoice.confidence >= 75) return false;
    }

    return true;
  });

  const getStatusComponent = (status: InvoiceStatus) => {
    switch(status) {
      case InvoiceStatus.PARKED:
        return (
          <div className="flex flex-col gap-1 min-w-[120px]">
            <span className="inline-flex items-center gap-1 text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">
              <span className="material-symbols-outlined text-[12px]">pause_circle</span> Parked
            </span>
          </div>
        );
      case InvoiceStatus.BLOCKED:
        return (
          <div className="flex flex-col gap-1 min-w-[120px]">
            <span className="inline-flex items-center gap-1 text-[9px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 uppercase tracking-tighter">
              <span className="material-symbols-outlined text-[12px]">block</span> Blocked
            </span>
          </div>
        );
      case InvoiceStatus.APPROVED:
        return (
          <div className="flex flex-col gap-1 min-w-[120px]">
            <span className="inline-flex items-center gap-1 text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100 uppercase tracking-tighter">
              <span className="material-symbols-outlined text-[12px]">check_circle</span> Approved
            </span>
          </div>
        );
      default:
        return <span className="text-slate-400">Unknown</span>;
    }
  };

  const getRecLabel = (conf: number) => {
    if (conf > 90) return { label: 'Rec. Approval', color: 'text-green-600 bg-green-50' };
    if (conf > 75) return { label: 'Review Disc.', color: 'text-amber-600 bg-amber-50' };
    return { label: 'Flag Rejection', color: 'text-red-600 bg-red-50' };
  };

  const handleReviewClick = (invoice: Invoice) => {
    navigate(`/validation/${invoice.id}`);
  };

  const stats = [
    { label: 'Pending Value', val: '€142.5k', change: '+12%', icon: 'payments', color: 'text-primary', desc: 'Total financial exposure awaiting human review' },
    { label: 'AI Match Rate', val: '88.4%', change: '+4.2%', icon: 'bolt', color: 'text-blue-500', desc: 'Success rate of AI matching invoices to trade events' },
    { label: 'Avg. Review Time', val: '1.2h', change: '-22m', icon: 'timer', color: 'text-green-500', desc: 'Average time for a human to approve an AI recommendation' },
    { label: 'Verified & Ready', val: '42', desc: 'Invoices with >90% confidence waiting for final human approval', change: '+5', icon: 'task_alt', color: 'text-purple-500' },
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Approval Queue</h1>
          <p className="text-slate-500 mt-1">Wholesale supply chain invoices requiring final human-in-the-loop validation.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className={`p-2.5 rounded-xl bg-slate-50 ${stat.color} group-hover:bg-white transition-colors`}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${stat.change.startsWith('+') && stat.label !== 'Avg. Review Time' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {stat.change}
                </span>
              </div>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{stat.label}</p>
                <span title={stat.desc} className="material-symbols-outlined text-[14px] text-slate-300 cursor-help">info</span>
              </div>
              <h3 className="text-3xl font-black text-slate-900">{stat.val}</h3>
            </div>
            <div className={`absolute -right-4 -bottom-4 size-24 rounded-full opacity-[0.03] group-hover:scale-150 transition-transform duration-500 ${stat.color.replace('text', 'bg')}`}></div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('review')}
              className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${activeTab === 'review' ? 'bg-white border border-slate-200 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Review Required
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${activeTab === 'history' ? 'bg-white border border-slate-200 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              History
            </button>
          </div>
          <div className="flex items-center gap-2">
             <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><span className="material-symbols-outlined text-xl">filter_list</span></button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center gap-6 bg-white">
          <div className="relative flex-1 min-w-[240px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input
              type="text"
              placeholder="Search supplier, ID, or PO..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Purchase Type</span>
              <select
                value={filters.purchaseType}
                onChange={(e) => setFilters(prev => ({ ...prev, purchaseType: e.target.value }))}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-700 min-w-[120px]"
              >
                <option value="All">All Types</option>
                <option value="Goods">Goods</option>
                <option value="Services">Services</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Status</span>
              <select
                value={filters.paymentStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-700 min-w-[120px]"
              >
                <option value="All">All Status</option>
                <option value="Overdue">Overdue</option>
                <option value="Not yet due">Not yet due</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">AI Confidence</span>
              <select
                value={filters.confidence}
                onChange={(e) => setFilters(prev => ({ ...prev, confidence: e.target.value }))}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-700 min-w-[140px]"
              >
                <option value="All">All Confidence</option>
                <option value="High">High (&gt;90%)</option>
                <option value="Medium">Medium (75-90%)</option>
                <option value="Low">Low (&lt;75%)</option>
              </select>
            </div>

            <button
              onClick={() => setFilters({ search: '', purchaseType: 'All', paymentStatus: 'All', confidence: 'All' })}
              className="mt-4 px-3 py-1.5 text-[10px] font-black text-primary hover:text-primary-hover uppercase tracking-widest transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              Reset
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1500px]">
            <thead>
              <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50 whitespace-nowrap">
                <th className="px-4 py-4 sticky left-0 bg-slate-50 z-20 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Invoice ID #</th>
                <th className="px-4 py-4">Supplier Name</th>
                <th className="px-4 py-4">PO Number</th>
                <th className="px-4 py-4">Invoice Date</th>
                <th className="px-4 py-4">Posting Date</th>
                <th className="px-4 py-4">Payment Term</th>
                <th className="px-4 py-4">SLA</th>{/* ── NEW ── */}
                <th className="px-4 py-4">Payer Name</th>
                <th className="px-4 py-4 text-right">Amount</th>
                <th className="px-4 py-4">AI Rec.</th>
                <th className="px-4 py-4">Approval Status</th>
                <th className="px-4 py-4">Dispute Reason</th>
                <th className="px-4 py-4">Purchase Type</th>
                {activeTab === 'review' && (
                  <>
                    <th className="px-4 py-4">Payment Status</th>
                    <th className="px-4 py-4">Prioritization Score</th>
                  </>
                )}
                {activeTab === 'history' && <th className="px-4 py-4">SAP CN</th>}
                <th className="px-4 py-4 text-center sticky right-0 bg-slate-50 z-20 border-l border-slate-100">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredInvoices.map((invoice) => {
                const rec = getRecLabel(invoice.confidence);
                const sla = computeSla(invoice);
                const slaStyle = SLA_TIER_STYLES[sla.tier];
                return (
                  <tr key={invoice.id} className="group hover:bg-slate-50/80 transition-all text-xs whitespace-nowrap">
                    <td className="px-4 py-4 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100 font-bold text-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                      {invoice.id}
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-700">
                      {invoice.supplier}
                    </td>
                    <td className="px-4 py-4 text-slate-500 font-mono">
                      {invoice.poNumber}
                    </td>
                    <td className="px-4 py-4 text-slate-500 font-medium">
                      {invoice.invoiceDate}
                    </td>
                    <td className="px-4 py-4 text-slate-500 font-medium">
                      {invoice.postingDate}
                    </td>
                    <td className="px-4 py-4 text-slate-500 font-medium">
                      {invoice.paymentTerm}
                    </td>
                    {/* ── NEW: SLA pill ───────────────────────── */}
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[9px] font-black uppercase tracking-tight border ${slaStyle.bg} ${slaStyle.text} ${slaStyle.border}`}
                        title={sla.dueDate ? `Due ${sla.dueDate.toISOString().slice(0, 10)} · Net ${sla.termsDays}` : ''}
                      >
                        <span className={`size-1.5 rounded-full ${slaStyle.dot}`} />
                        {sla.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {invoice.payerName}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-slate-900 font-black">${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1 w-[120px]">
                        <div className="flex items-center justify-between">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${rec.color}`}>
                            {rec.label}
                          </span>
                          <span className="text-[9px] font-black text-slate-600">{invoice.confidence}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${invoice.confidence > 85 ? 'bg-green-500' : invoice.confidence > 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${invoice.confidence}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusComponent(invoice.status)}
                    </td>
                    <td className="px-4 py-4 text-slate-500 italic">
                      {invoice.disputeReason || '-'}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                        invoice.purchaseType === 'Goods' ? 'bg-slate-100 text-slate-700' : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {invoice.purchaseType}
                      </span>
                    </td>
                    {activeTab === 'review' && (
                      <>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                            invoice.paymentStatus === 'Overdue' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'
                          }`}>
                            {invoice.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[60px]">
                              <div
                                className={`h-full rounded-full ${invoice.priorityScore > 80 ? 'bg-red-500' : invoice.priorityScore > 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                style={{ width: `${invoice.priorityScore}%` }}
                              ></div>
                            </div>
                            <span className="font-black text-slate-900">{invoice.priorityScore}</span>
                          </div>
                        </td>
                      </>
                    )}
                    {activeTab === 'history' && (
                      <td className="px-4 py-4 font-mono text-primary font-bold">
                        {invoice.sapCn || '-'}
                      </td>
                    )}
                    <td className="px-4 py-4 text-center sticky right-0 bg-white group-hover:bg-slate-50 z-10 border-l border-slate-100">
                      <button
                        onClick={() => handleReviewClick(invoice)}
                        className="px-4 py-1.5 bg-slate-900 text-white hover:bg-primary rounded-lg text-[10px] font-black transition-all shadow-sm"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Showing {filteredInvoices.length} invoices</p>
          <div className="flex items-center gap-2">
             <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors border border-slate-200 rounded-lg bg-white"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
             <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors border border-slate-200 rounded-lg bg-white"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
