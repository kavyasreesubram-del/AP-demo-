
import React from 'react';
import { useNavigate } from 'react-router-dom';

const WorkflowOverview: React.FC = () => {
  const navigate = useNavigate();

  const steps = [
    {
      id: 1,
      title: 'Invoice Ingestion & Digitization',
      role: 'AP Associate',
      desc: 'Multi-channel ingestion (Email, EDI, Portal) and OCR extraction of header and line-item data from incoming vendor invoices.',
      icon: 'dashboard_customize',
      color: 'border-slate-200 bg-white',
      badge: 'Step 1: Ingestion',
      cta: 'Open Queue'
    },
    {
      id: 2,
      title: 'AI-Powered 3-Way Matching',
      role: 'Agent 1 (AI)',
      desc: 'Autonomous reconciliation against Purchase Orders (PO) and Goods Receipts (GR) to identify price, quantity, and tax variances.',
      icon: 'psychology',
      color: 'border-blue-100 bg-blue-50/30 text-blue-900',
      badge: 'Step 2: AI Validation',
      isAI: true
    },
    {
      id: 3,
      title: 'Exception Management',
      role: 'AP Associate',
      desc: 'AP Associates review flagged discrepancies, price disputes, or missing documentation for final human-in-the-loop approval.',
      icon: 'person_search',
      color: 'border-primary/20 bg-primary/5',
      badge: 'Step 3: Human Review'
    },
    {
      id: 4,
      title: 'ERP Posting & Payment',
      role: 'Agent 2 (AI)',
      desc: 'Validated invoices are synchronized with the SAP ERP system for automated posting and payment scheduling based on negotiated terms.',
      icon: 'payments',
      color: 'border-green-100 bg-green-50/30 text-green-900',
      badge: 'Step 4: Settlement',
      isAI: true
    }
  ];

  return (
    <div className="min-h-full bg-slate-50/50 p-8 md:p-12 animate-in fade-in duration-700">
      <div className="max-w-3xl mx-auto space-y-4 mb-16 text-center">
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Enterprise AP IQ Invoice Validation Workflow</h1>
        <p className="text-slate-500 text-lg font-medium">
          A professional, multi-agent workflow designed for automated supply chain invoice reconciliation and exception management.
        </p>
      </div>

      <div className="max-w-2xl mx-auto relative pb-20">
        {/* The "Spine" of the flowchart */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-slate-200 -translate-x-1/2 z-0 hidden md:block"></div>

        <div className="space-y-0 relative z-10">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              {/* Step Card */}
              <div className="flex flex-col items-center">
                <div className={`group relative w-full flex flex-col md:flex-row items-start md:items-center gap-6 p-8 rounded-[2.5rem] border-2 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${step.color} shadow-sm bg-white`}>
                  
                  {/* Icon Section */}
                  <div className="shrink-0 relative">
                    <div className={`size-20 rounded-3xl flex items-center justify-center shadow-lg ${step.isAI ? 'bg-slate-900 text-white' : 'bg-primary text-white'}`}>
                      <span className="material-symbols-outlined text-4xl">{step.icon}</span>
                    </div>
                    {/* Step Number Circle */}
                    <div className="absolute -top-3 -left-3 size-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-sm font-black text-slate-400 group-hover:border-primary group-hover:text-primary transition-colors shadow-sm">
                      {step.id}
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{step.role}</p>
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${step.isAI ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {step.badge}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-3 leading-tight">{step.title}</h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
                      {step.desc}
                    </p>
                    
                    <div>
                      {step.cta ? (
                        <button 
                          onClick={() => navigate('/invoices')}
                          className="flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-slate-800 shadow-xl shadow-slate-900/10 transition-all active:scale-95"
                        >
                          {step.cta}
                          <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </button>
                      ) : step.isAI ? (
                        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 w-fit">
                          <div className="flex gap-1">
                            <div className="size-1.5 bg-primary rounded-full animate-bounce"></div>
                            <div className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                            <div className="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent Logic Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 w-fit">
                          <span className="material-symbols-outlined text-amber-500 text-lg">verified_user</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting Oversight</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Arrow Connector between steps */}
                {index < steps.length - 1 && (
                  <div className="h-20 flex flex-col items-center justify-center py-4">
                    <div className="w-1 h-full bg-slate-200 relative">
                       <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 size-10 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center text-slate-300">
                          <span className="material-symbols-outlined text-2xl font-bold">arrow_downward</span>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Final Success Node */}
      <div className="max-w-md mx-auto mt-8 p-6 bg-slate-900 rounded-3xl text-center text-white border border-white/10 shadow-2xl">
         <div className="size-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined font-black">check_circle</span>
         </div>
         <h4 className="font-black text-lg">Workflow Complete</h4>
         <p className="text-slate-400 text-xs mt-1">Validation logs synced and ERP entries finalized.</p>
      </div>

      <footer className="max-w-2xl mx-auto mt-16 pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compliance Engine v2.4</span>
          <div className="size-1.5 bg-green-500 rounded-full"></div>
        </div>
        <div className="flex gap-4">
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SOC2 Type II</span>
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GDPR</span>
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SOX Compliant</span>
        </div>
      </footer>
    </div>
  );
};

export default WorkflowOverview;
