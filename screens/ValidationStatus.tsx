
import React from 'react';

const ValidationStatus: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">System Performance</h1>
        <p className="text-slate-500 mt-1">Monitoring the accuracy of AI recommendations and human review efficiency.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">OCR Extraction Quality</p>
          <div className="flex items-end gap-3">
            <h3 className="text-4xl font-black text-slate-900">98.2%</h3>
            <span className="text-green-500 text-xs font-bold mb-1">+0.4% Accuracy</span>
          </div>
          <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: '98%' }}></div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">AI Rec. Confidence</p>
          <div className="flex items-end gap-3">
            <h3 className="text-4xl font-black text-slate-900">91.5%</h3>
            <span className="text-primary text-xs font-bold mb-1">Benchmark 95%</span>
          </div>
          <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: '91%' }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">Human Intervention Rate</p>
          <div className="flex items-end gap-3">
            <h3 className="text-4xl font-black text-slate-900">100%</h3>
            <span className="text-slate-400 text-[10px] font-bold mb-1">Human-In-Loop</span>
          </div>
          <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-slate-900 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>

      <div className="bg-slate-950 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h4 className="text-xl font-bold mb-2">Recommendation Heatmap</h4>
          <p className="text-slate-400 text-sm mb-8">Where the AI is providing the strongest matching support for humans.</p>
          
          <div className="grid grid-cols-4 gap-4">
            {['Apex Retailers', 'Wally Goods', 'Standard Store Corp', 'Alliance Corp'].map(retailer => (
              <div key={retailer} className="space-y-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{retailer}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="aspect-square bg-green-500/20 border border-green-500/40 rounded flex items-center justify-center text-[8px] font-black text-green-400">HIGH CONF</div>
                  <div className="aspect-square bg-green-500/30 border border-green-500/50 rounded flex items-center justify-center text-[8px] font-black text-green-400">HIGH CONF</div>
                  <div className="aspect-square bg-amber-500/20 border border-amber-500/40 rounded flex items-center justify-center text-[8px] font-black text-amber-400">MED CONF</div>
                  <div className="aspect-square bg-green-500/10 border border-green-500/30 rounded flex items-center justify-center text-[8px] font-black text-green-400">HIGH CONF</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationStatus;
