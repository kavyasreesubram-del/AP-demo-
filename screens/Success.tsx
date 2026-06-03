
import React, { useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';

const Success: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  
  // Initialize step from query parameter if present (e.g., ?step=2)
  const initialStep = searchParams.get('step') === '2' ? 2 : 1;
  const [step, setStep] = useState<1 | 2>(initialStep as 1 | 2);
  const [isNotifying, setIsNotifying] = useState(false);

  // Status for demo purposes
  const paymentStatus = 'Processed'; // Could be 'Processed', 'In Process', 'Failed'

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Processed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'In Process': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Failed': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const handleNotifyAPManager = () => {
    setIsNotifying(true);
    setTimeout(() => setIsNotifying(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 animate-in fade-in duration-500">
      <div className="max-w-2xl w-full">
        {/* Step 1: Initial Status Message */}
        <div className={`flex flex-col items-center text-center transition-all duration-500 ${step === 2 ? 'mb-6 opacity-60 scale-95' : 'mb-12'}`}>
          <div className="size-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-600/10 animate-in zoom-in-50 duration-700">
            <span className="material-symbols-outlined text-5xl">check_circle</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Invoice Validated</h1>
          <p className="text-slate-500 max-w-md text-lg italic">
            Invoice {id} has been verified.
          </p>

          {step === 1 && (
            <div className="flex flex-col gap-4 w-full mt-10 animate-in slide-in-from-bottom-4 duration-500">
              <button 
                onClick={handleNotifyAPManager}
                disabled={isNotifying}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black text-base shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">{isNotifying ? 'sync' : 'notifications_active'}</span>
                {isNotifying ? 'Sending notification...' : 'Notify AP Manager'}
              </button>
              <button 
                onClick={() => setStep(2)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-base shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">payments</span>
                Check Synchronization Status
              </button>
            </div>
          )}
        </div>

        {/* Step 2: SAP Synchronization Details */}
        {step === 2 && (
          <div className="animate-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden mb-8 transform hover:scale-[1.01] transition-all duration-300">
              <div className="bg-slate-900 px-8 py-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined">data_object</span>
                  </div>
                  <div>
                    <h3 className="font-bold leading-tight">ERP Core Sync</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Integration: LIVE</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-[10px] font-black border border-green-500/20 tracking-widest">CONNECTED</span>
                </div>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Code</p>
                    <p className="text-sm font-mono font-bold text-slate-900">VA01 / VF01</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SAP Reference</p>
                    <p className="text-sm font-mono font-bold text-primary">CN-8829-X922</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Posting Group</p>
                    <p className="text-sm font-bold text-slate-900">Trade Accruals (A02)</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Status</p>
                    <div className="flex justify-end">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-tighter ${getStatusStyles(paymentStatus)}`}>
                        {paymentStatus}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Value Post-Tax</p>
                      <p className="text-2xl font-black text-slate-900">$1,250.00</p>
                    </div>
                    <div className="text-right">
                       <button className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">
                        View in SAP Fiori
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest">Last Updated: Just Now</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <Link 
                to="/invoices" 
                className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-sm text-center hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Back to Approval Queue
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Success;
