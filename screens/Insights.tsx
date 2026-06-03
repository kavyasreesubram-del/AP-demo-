import React, { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { motion } from 'motion/react';
import { useStore } from '../store';
import { InvoiceStatus } from '../types';
import { computeSlaAggregate, SLA_TIER_STYLES } from '../lib/slaEngine';

// ─── ROI assumptions (configurable in a future Admin panel) ──────
// Industry-typical numbers for AP touchless processing economics.
// Source: Ardent Partners 2023 ePayables benchmarks (typical ranges).
const ROI = {
  manualCostPerInvoice: 18.50,      // USD per invoice with manual touch
  touchlessCostPerInvoice: 2.20,    // USD per invoice via straight-through
  costOfCapitalAnnualPct: 0.06,     // 6% — used for working-capital impact
  annualVolumeMultiplier: 12,       // We treat the current visible volume as a monthly slice for annualisation
};

const Insights: React.FC = () => {
  const { matchedInvoices, invoices } = useStore();

  // ─── Live data: matching outcome breakdown ────────────────────
  const matchingData = useMemo(() => {
    const total = matchedInvoices.length || 1;
    const passThrough = matchedInvoices.filter(m =>
      m.effectiveStatus === InvoiceStatus.APPROVED
    ).length;
    const grMissing = matchedInvoices.filter(m =>
      m.effectiveStatus !== InvoiceStatus.APPROVED && m.exceptionCode === 'GR_MISSING'
    ).length;
    const manual = total - passThrough - grMissing;
    const pct = (n: number) => Math.round((n / total) * 100);
    return [
      { name: 'Straight Pass Through', value: pct(passThrough), color: '#3b82f6' },
      { name: 'Manual Matching',       value: pct(manual),      color: '#f59e0b' },
      { name: 'Without GR',            value: pct(grMissing),   color: '#ef4444' },
    ];
  }, [matchedInvoices]);

  // ─── Live SLA aggregate ────────────────────────────────────────
  const slaAgg = useMemo(() => computeSlaAggregate(invoices), [invoices]);

  // ─── Live ROI computation ──────────────────────────────────────
  // The donut already segments invoices by where they flow. Touchless invoices
  // cost touchlessCostPerInvoice; manual ones cost manualCostPerInvoice.
  // If everything were manual (baseline), we'd be paying the manual cost on
  // every invoice. The ROI is the saving from automation.
  const roi = useMemo(() => {
    const total = matchedInvoices.length || 1;
    const touchless = matchedInvoices.filter(m =>
      m.effectiveStatus === InvoiceStatus.APPROVED && m.exceptionCode === 'CLEAN'
    ).length;
    const manual = total - touchless;

    const currentMonthlyLabor = touchless * ROI.touchlessCostPerInvoice + manual * ROI.manualCostPerInvoice;
    const baselineMonthlyLabor = total * ROI.manualCostPerInvoice;
    const monthlySaving = baselineMonthlyLabor - currentMonthlyLabor;
    const annualSaving = monthlySaving * ROI.annualVolumeMultiplier;

    const totalInvoiceValue = matchedInvoices.reduce((s, m) => s + (m.invoice.amount || 0), 0);
    const overdueValueAtRisk = slaAgg.overdueValue;
    // Working-capital impact: holding overdue invoices ties up cash that could
    // be earning at cost-of-capital. Daily cost of carrying overdue value.
    const dailyCarryingCost = (overdueValueAtRisk * ROI.costOfCapitalAnnualPct) / 365;
    const projectedAnnualCarrying = overdueValueAtRisk * ROI.costOfCapitalAnnualPct;

    const touchlessRate = total ? Math.round((touchless / total) * 100) : 0;

    return {
      touchless,
      manual,
      touchlessRate,
      currentMonthlyLabor,
      baselineMonthlyLabor,
      monthlySaving,
      annualSaving,
      totalInvoiceValue,
      overdueValueAtRisk,
      dailyCarryingCost,
      projectedAnnualCarrying,
    };
  }, [matchedInvoices, slaAgg.overdueValue]);

  // ─── Illustrative reference data ──────────────────────────────
  const cycleTimeData = [
    { month: 'Jun', time: 32 }, { month: 'Jul', time: 30 }, { month: 'Aug', time: 28 },
    { month: 'Sep', time: 29 }, { month: 'Oct', time: 26 }, { month: 'Nov', time: 24 },
    { month: 'Dec', time: 23 }, { month: 'Jan', time: 21 }, { month: 'Feb', time: 22 },
    { month: 'Mar', time: 20 }, { month: 'Apr', time: 19 },
  ];

  const grPerformanceData = [
    { day: 'Monday',    full: 90, disc: 5, missing: 5 },
    { day: 'Tuesday',   full: 92, disc: 4, missing: 4 },
    { day: 'Wednesday', full: 88, disc: 7, missing: 5 },
    { day: 'Thursday',  full: 94, disc: 3, missing: 3 },
    { day: 'Friday',    full: 85, disc: 8, missing: 7 },
  ];

  const agingData = [
    { range: 'Not Due',    count: 420, amount: 2850000 },
    { range: '0-7 Days',   count: 85,  amount: 450000 },
    { range: '7-14 Days',  count: 45,  amount: 250000 },
    { range: '14-21 Days', count: 30,  amount: 150000 },
    { range: '21-30 Days', count: 15,  amount: 80000 },
    { range: '30+ Days',   count: 10,  amount: 50000 },
  ];

  const usd = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const usdCents = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">AP Insights</h1>
          <p className="text-slate-500 mt-1">Performance signals across the invoice lifecycle.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoices in scope</p>
          <p className="text-2xl font-black text-slate-900">{matchedInvoices.length.toLocaleString()}</p>
        </div>
      </div>

      {/* ─── LIVE: ROI panel ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 shadow-lg"
      >
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <h3 className="text-base font-black tracking-tight">Estimated ROI Impact</h3>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Live · derived from current matching mix and SLA aggregate
            </p>
          </div>
          <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest bg-emerald-900/40 border border-emerald-700 px-2 py-0.5 rounded">
            ● Live
          </span>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Touchless Rate</p>
            <p className="text-3xl font-black text-white">{roi.touchlessRate}%</p>
            <p className="text-[10px] text-slate-400 mt-1">
              {roi.touchless} of {matchedInvoices.length} flowing without human touch
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Monthly Labor Saving</p>
            <p className="text-3xl font-black text-emerald-300">{usd(roi.monthlySaving)}</p>
            <p className="text-[10px] text-slate-400 mt-1">
              vs. all-manual baseline · {usd(roi.baselineMonthlyLabor)}/mo
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Annualised Saving</p>
            <p className="text-3xl font-black text-emerald-300">{usd(roi.annualSaving)}</p>
            <p className="text-[10px] text-slate-400 mt-1">
              {usd(ROI.manualCostPerInvoice)}/touch → {usd(ROI.touchlessCostPerInvoice)}/touchless
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Working-Capital At Risk</p>
            <p className="text-3xl font-black text-rose-300">{usd(roi.overdueValueAtRisk)}</p>
            <p className="text-[10px] text-slate-400 mt-1">
              overdue · costing {usdCents(roi.dailyCarryingCost)}/day at {(ROI.costOfCapitalAnnualPct * 100).toFixed(0)}% CoC
            </p>
          </div>
        </div>
      </motion.div>

      {/* ─── LIVE: SLA aggregate strip ───────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6"
      >
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">Payment SLA Status</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Days remaining vs payment terms · DPO · % paid within terms
            </p>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            ● Live
          </span>
        </div>

        <div className="grid grid-cols-6 gap-3">
          <div className={`p-3 rounded-lg ${SLA_TIER_STYLES.OVERDUE.bg} ${SLA_TIER_STYLES.OVERDUE.border} border`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${SLA_TIER_STYLES.OVERDUE.text}`}>Overdue</p>
            <p className={`text-2xl font-black ${SLA_TIER_STYLES.OVERDUE.text}`}>{slaAgg.overdueCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">past due</p>
          </div>
          <div className={`p-3 rounded-lg ${SLA_TIER_STYLES.RED.bg} ${SLA_TIER_STYLES.RED.border} border`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${SLA_TIER_STYLES.RED.text}`}>Critical</p>
            <p className={`text-2xl font-black ${SLA_TIER_STYLES.RED.text}`}>{slaAgg.redCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">≤ 3 days</p>
          </div>
          <div className={`p-3 rounded-lg ${SLA_TIER_STYLES.AMBER.bg} ${SLA_TIER_STYLES.AMBER.border} border`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${SLA_TIER_STYLES.AMBER.text}`}>Watch</p>
            <p className={`text-2xl font-black ${SLA_TIER_STYLES.AMBER.text}`}>{slaAgg.amberCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">4–7 days</p>
          </div>
          <div className={`p-3 rounded-lg ${SLA_TIER_STYLES.GREEN.bg} ${SLA_TIER_STYLES.GREEN.border} border`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${SLA_TIER_STYLES.GREEN.text}`}>Healthy</p>
            <p className={`text-2xl font-black ${SLA_TIER_STYLES.GREEN.text}`}>{slaAgg.greenCount}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">8+ days</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Avg DPO</p>
            <p className="text-2xl font-black text-slate-900">{slaAgg.averageDpo}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">days · paid invoices</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">On-time Pay</p>
            <p className="text-2xl font-black text-slate-900">{slaAgg.pctPaidWithinTerms}%</p>
            <p className="text-[10px] text-slate-500 mt-0.5">of paid invoices</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Matching outcome — LIVE ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
        >
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="text-sm font-black text-slate-900">Matching Performance</h3>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">
              ● Live
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Distribution of {matchedInvoices.length} invoices across match-engine outcomes.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={matchingData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  label={(entry) => `${entry.value}%`}
                >
                  {matchingData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* ── Cycle time trend — illustrative ─────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
        >
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="text-sm font-black text-slate-900">Cycle Time Trend</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded">
              Illustrative
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">Average days from invoice receipt to payment posting.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cycleTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="time" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* ── GR posting performance by weekday — illustrative ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
        >
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="text-sm font-black text-slate-900">Goods Receipt Performance</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded">
              Illustrative
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Receipt quality by weekday — full match, discrepancy, missing.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={grPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="full" stackId="a" fill="#10b981" name="Full match" />
                <Bar dataKey="disc" stackId="a" fill="#f59e0b" name="Discrepancy" />
                <Bar dataKey="missing" stackId="a" fill="#ef4444" name="Missing" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* ── Aging buckets — illustrative ────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6"
        >
          <div className="flex items-baseline justify-between mb-1">
            <h3 className="text-sm font-black text-slate-900">Invoice Aging</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded">
              Illustrative
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">Open invoices grouped by days past invoice date.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={agingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any, name: string) =>
                    name === 'amount'
                      ? `$${Number(value).toLocaleString()}`
                      : Number(value).toLocaleString()
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="#c4b5fd" name="Invoice count" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Footer note about which charts are live */}
      <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-500 leading-relaxed">
        <span className="font-bold text-emerald-700">Live</span> = computed from current invoice store via match engine and SLA engine ·
        <span className="font-bold text-slate-700"> Illustrative</span> = hardcoded reference data, to be wired in a later step.
        ROI assumptions ({usd(ROI.manualCostPerInvoice)}/touch, {usd(ROI.touchlessCostPerInvoice)}/touchless, {(ROI.costOfCapitalAnnualPct * 100).toFixed(0)}% cost-of-capital)
        are based on Ardent Partners 2023 ePayables benchmarks and will become user-configurable in a future Admin panel.
      </div>
    </div>
  );
};

export default Insights;
