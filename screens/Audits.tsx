
import React from 'react';

const Audits: React.FC = () => {
  const logs = [
    { time: '10:42 AM', user: 'Kavya V', action: 'Approved INV-8821', context: 'Based on AI Rec (94%)', status: 'Approved' },
    { time: '09:15 AM', user: 'Kavya V', action: 'Manual Correction', context: 'Adjusted SKU CLT-992', status: 'Manual' },
    { time: '08:02 AM', user: 'System Agent', action: 'Validation Complete', context: 'Matched 12 new wholesale supply invoices', status: 'System' },
    { time: 'Yesterday', user: 'AP Manager', action: 'Rejected INV-8804', context: 'Invalid Batch Log', status: 'Alert' },
    { time: 'Yesterday', user: 'Kavya V', action: 'Session Started', context: 'IP: 192.168.1.45', status: 'Info' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Compliance Audit Log</h1>
          <p className="text-slate-500 mt-1">Tracing every human decision assisted by Agentic AI validation.</p>
        </div>
      </div>

      <div className="space-y-3">
        {logs.map((log, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group">
            <div className="flex items-center gap-6">
              <div className="text-right w-24">
                <p className="text-xs font-black text-slate-900">{log.time}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Timestamp</p>
              </div>
              <div className="h-10 w-px bg-slate-100"></div>
              <div>
                <p className="text-sm font-bold text-slate-900">{log.action}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-slate-500">Actor: <span className="text-slate-900 font-bold">{log.user}</span> • {log.context}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                 log.status === 'Alert' ? 'bg-red-50 text-red-600 border-red-100' :
                 log.status === 'Approved' ? 'bg-green-50 text-green-600 border-green-100' :
                 'bg-slate-50 text-slate-600 border-slate-100'
               }`}>
                 {log.status}
               </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Audits;
