import React, { useMemo, useState } from 'react';
import {
  ShieldCheck, AlertTriangle, Download, Clock, User as UserIcon,
  CheckCircle2, FileSearch, Filter, Sparkles
} from 'lucide-react';
import { useStore } from '../store';

// ─── SOX Evidence View ───────────────────────────────────────────
// A control-evidence artifact over the audit log. Targets SOX 404(b)
// requirements for pre-IPO companies:
//   • Segregation of Duties (SoD): no single actor approves an invoice they
//     also raised an exception on or escalated themselves to.
//   • AI-assist acceptance rate: how often human reviewers accepted AI's
//     suggested action vs overrode it.
//   • Control evidence by date: a filterable, exportable trail of every
//     resolution decision with timestamp, actor, action, and detail.

const PRESET_RANGES: { label: string; days: number }[] = [
  { label: 'Last 7 days',  days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time',     days: 365 * 10 },
];

const SoxEvidence: React.FC = () => {
  const { auditLog, matchedInvoices } = useStore();

  // ── Filter state ──────────────────────────────────────────────
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [actorFilter, setActorFilter] = useState<string>('All');

  // ── Filtered audit entries ────────────────────────────────────
  const filteredEntries = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rangeDays);
    return auditLog
      .filter(e => new Date(e.timestamp) >= cutoff)
      .filter(e => actorFilter === 'All' || e.actorRole === actorFilter)
      .slice()
      .reverse(); // most recent first
  }, [auditLog, rangeDays, actorFilter]);

  // ── Segregation of Duties check ───────────────────────────────
  // For each invoice with audit history, check whether the same actor
  // both raised the exception (or escalated) AND approved it. In a real
  // SoD-compliant flow these should be different humans.
  const sodFindings = useMemo(() => {
    const byInvoice: Record<string, typeof auditLog> = {};
    for (const e of filteredEntries) {
      (byInvoice[e.invoiceId] ||= []).push(e);
    }
    const findings: { invoiceId: string; invoiceNumber: string; conflictingActions: string[]; actor: string }[] = [];

    const approvingActions = ['Approve', 'Accept variance', 'Accept short qty', 'Pay anyway (manager override)'];

    for (const [invoiceId, entries] of Object.entries(byInvoice)) {
      // Same actor doing approving AND non-approving actions on same invoice
      const actorActions: Record<string, Set<string>> = {};
      for (const e of entries) {
        (actorActions[e.actorRole] ||= new Set()).add(e.action);
      }
      for (const [actor, actions] of Object.entries(actorActions)) {
        const acts = Array.from(actions);
        const hasApproving = acts.some(a => approvingActions.includes(a));
        const hasOther = acts.some(a => !approvingActions.includes(a));
        if (hasApproving && hasOther) {
          findings.push({
            invoiceId,
            invoiceNumber: entries[0].invoiceNumber,
            conflictingActions: acts,
            actor,
          });
        }
      }
    }
    return findings;
  }, [filteredEntries]);

  // ── AI-assist acceptance rate ─────────────────────────────────
  // Audit entries that record an AI-suggested action and whether it was accepted.
  // For now this depends on aiSuggestedAction / aiAccepted being populated
  // (will be once we wire AI resolution suggestions inline). For demo, we
  // also count any entry with aiSuggestedAction defined.
  const aiAssistStats = useMemo(() => {
    const withSuggestion = filteredEntries.filter(e => e.aiSuggestedAction);
    const accepted = withSuggestion.filter(e => e.aiAccepted === true);
    return {
      totalSuggestions: withSuggestion.length,
      accepted: accepted.length,
      acceptanceRate: withSuggestion.length
        ? Math.round((accepted.length / withSuggestion.length) * 100)
        : null,
    };
  }, [filteredEntries]);

  // ── Actor breakdown ───────────────────────────────────────────
  const actorBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of filteredEntries) {
      counts[e.actorRole] = (counts[e.actorRole] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredEntries]);

  // ── Action breakdown ──────────────────────────────────────────
  const actionBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of filteredEntries) {
      counts[e.action] = (counts[e.action] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filteredEntries]);

  // ── Coverage: invoices touched vs total ───────────────────────
  const touchedInvoiceIds = useMemo(() => {
    return new Set(filteredEntries.map(e => e.invoiceId));
  }, [filteredEntries]);

  // ── Export ────────────────────────────────────────────────────
  const handleExportCsv = () => {
    const headers = ['timestamp', 'invoice_id', 'invoice_number', 'actor_role', 'action', 'detail', 'ai_suggested', 'ai_accepted'];
    const rows = filteredEntries.map(e => [
      e.timestamp,
      e.invoiceId,
      e.invoiceNumber,
      e.actorRole,
      e.action,
      e.detail ?? '',
      e.aiSuggestedAction ?? '',
      e.aiAccepted === true ? 'true' : e.aiAccepted === false ? 'false' : '',
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(cell => {
        const s = String(cell);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sox-evidence-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── All unique actor roles for the filter dropdown ─────────────
  const allActors = useMemo(() => {
    const set = new Set(auditLog.map(e => e.actorRole));
    return Array.from(set).sort();
  }, [auditLog]);

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">SOX Evidence</h1>
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              404(b) Control Surface
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-sm">
            Auditable record of every resolution decision · segregation-of-duties checks · AI-assist acceptance trail.
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={filteredEntries.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={14} />
          Export as evidence pack (.csv)
        </button>
      </div>

      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
        <Filter size={14} className="text-slate-400" />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Range</span>
        {PRESET_RANGES.map(r => (
          <button
            key={r.days}
            onClick={() => setRangeDays(r.days)}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${
              rangeDays === r.days
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {r.label}
          </button>
        ))}
        <span className="h-4 w-px bg-slate-200 mx-2" />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Actor</span>
        <select
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          className="text-[11px] font-bold bg-white border border-slate-200 rounded-md px-2 py-1.5 text-slate-700 focus:outline-none focus:border-slate-400"
        >
          <option value="All">All actors</option>
          {allActors.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* ── KPI tiles ────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <FileSearch size={14} className="text-slate-400" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Audit Entries</p>
          </div>
          <p className="text-3xl font-black text-slate-900">{filteredEntries.length}</p>
          <p className="text-[10px] text-slate-500 mt-1">resolution events in range</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} className="text-slate-400" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Invoices Touched</p>
          </div>
          <p className="text-3xl font-black text-slate-900">{touchedInvoiceIds.size}</p>
          <p className="text-[10px] text-slate-500 mt-1">
            of {matchedInvoices.length} in scope ·{' '}
            {matchedInvoices.length ? Math.round((touchedInvoiceIds.size / matchedInvoices.length) * 100) : 0}% coverage
          </p>
        </div>

        <div className={`p-5 rounded-2xl border ${sodFindings.length > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className={sodFindings.length > 0 ? 'text-rose-500' : 'text-emerald-500'} />
            <p className={`text-[10px] font-bold uppercase tracking-widest ${sodFindings.length > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              SoD Findings
            </p>
          </div>
          <p className={`text-3xl font-black ${sodFindings.length > 0 ? 'text-rose-900' : 'text-emerald-900'}`}>
            {sodFindings.length}
          </p>
          <p className={`text-[10px] mt-1 ${sodFindings.length > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {sodFindings.length === 0
              ? 'no segregation conflicts detected'
              : 'same-actor approve+raise events'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-slate-400" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AI-Assist Acceptance</p>
          </div>
          {aiAssistStats.acceptanceRate === null ? (
            <>
              <p className="text-3xl font-black text-slate-400">—</p>
              <p className="text-[10px] text-slate-500 mt-1">
                no AI suggestions yet · wire in next phase
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl font-black text-slate-900">{aiAssistStats.acceptanceRate}%</p>
              <p className="text-[10px] text-slate-500 mt-1">
                {aiAssistStats.accepted} of {aiAssistStats.totalSuggestions} suggestions accepted
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── SoD findings detail ─────────────────────────────── */}
      {sodFindings.length > 0 && (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-rose-600" />
            <h3 className="text-sm font-black text-rose-900">Segregation-of-Duties Conflicts</h3>
          </div>
          <p className="text-xs text-rose-800 mb-4 leading-relaxed">
            The same actor performed both an approving action and a non-approving action on these invoices.
            In a SOX-compliant flow these should be different humans.
          </p>
          <div className="bg-white rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-rose-100">
                <tr>
                  <th className="text-left px-3 py-2 font-bold text-rose-900">Invoice</th>
                  <th className="text-left px-3 py-2 font-bold text-rose-900">Actor</th>
                  <th className="text-left px-3 py-2 font-bold text-rose-900">Conflicting actions</th>
                </tr>
              </thead>
              <tbody>
                {sodFindings.map((f, i) => (
                  <tr key={i} className="border-t border-rose-100">
                    <td className="px-3 py-2 font-mono text-slate-700">{f.invoiceNumber}</td>
                    <td className="px-3 py-2 font-bold text-rose-900">{f.actor}</td>
                    <td className="px-3 py-2 text-slate-700">{f.conflictingActions.join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Actor & action breakdowns ──────────────────────── */}
      <div className="grid grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <h3 className="text-sm font-black text-slate-900 mb-3">Actions by Actor</h3>
          <div className="space-y-2">
            {actorBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400">No activity in selected range.</p>
            ) : actorBreakdown.map(([actor, count]) => {
              const pct = filteredEntries.length ? (count / filteredEntries.length) * 100 : 0;
              return (
                <div key={actor}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-700 font-medium">{actor}</span>
                    <span className="text-slate-900 font-bold">{count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-700 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200">
          <h3 className="text-sm font-black text-slate-900 mb-3">Top Actions Recorded</h3>
          <div className="space-y-2">
            {actionBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400">No activity in selected range.</p>
            ) : actionBreakdown.map(([action, count]) => {
              const pct = filteredEntries.length ? (count / filteredEntries.length) * 100 : 0;
              return (
                <div key={action}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-700 font-medium truncate pr-2">{action}</span>
                    <span className="text-slate-900 font-bold">{count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-700 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Full audit trail ───────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900">Full Audit Trail</h3>
          <span className="text-[10px] text-slate-500">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-400">No audit events in selected range.</p>
            <p className="text-xs text-slate-400 mt-1">Resolve some invoices to populate the trail.</p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Timestamp</th>
                  <th className="text-left px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Invoice</th>
                  <th className="text-left px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Actor</th>
                  <th className="text-left px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Action</th>
                  <th className="text-left px-4 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Detail</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(entry => (
                  <tr key={entry.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock size={10} className="text-slate-400" />
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-900">{entry.invoiceNumber}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <UserIcon size={10} className="text-slate-400" />
                        <span className="text-slate-700">{entry.actorRole}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-bold text-slate-900">{entry.action}</span>
                      {entry.aiSuggestedAction && (
                        <span className={`ml-2 inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          entry.aiAccepted
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {entry.aiAccepted ? 'AI accepted' : 'AI overridden'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 max-w-md truncate">
                      {entry.detail ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Footer note ──────────────────────────────────────── */}
      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-500 leading-relaxed">
        <span className="font-bold text-slate-700">For SOX 404(b):</span> This evidence pack is generated live from the system's audit log.
        Every approve, reject, escalate, and override action is recorded with timestamp, actor, and reasoning. Export
        the .csv for inclusion in control documentation. SoD checks compare actors per invoice; in production these
        should map to authenticated user identities, not the role aliases shown here.
      </div>
    </div>
  );
};

export default SoxEvidence;
