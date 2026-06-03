
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';

const Login: React.FC = () => {
  const navigate = useNavigate();

  const handleLogin = (role: UserRole) => {
    localStorage.setItem('userRole', role);
    if (role === UserRole.AP_MANAGER) {
      navigate('/manager/dashboard');
    } else if (role === UserRole.INSIGHTS) {
      navigate('/insights');
    } else if (role === UserRole.AP_DIAGNOSTICS) {
      navigate('/diagnostics');
    } else {
      // Navigate to the AP Associate specific overview path
      navigate('/associate/overview');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-50 via-white to-slate-100">
      <div className="mb-12 text-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="size-20 bg-primary rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-primary/30 mx-auto mb-6">
          <span className="material-symbols-outlined text-4xl font-black">verified</span>
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Enterprise AP IQ</h1>
        <p className="text-slate-500 mt-2 font-medium">Next-gen multi-agentic supply chain invoice validation platform</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl w-full">
        {/* AP Insights Card */}
        <button 
          onClick={() => handleLogin(UserRole.INSIGHTS)}
          className="group relative bg-white p-8 rounded-[2.5rem] border-2 border-transparent hover:border-primary transition-all duration-500 shadow-xl shadow-slate-200/50 hover:shadow-primary/10 text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 size-32 bg-primary/5 rounded-bl-full group-hover:bg-primary/10 transition-colors"></div>
          <div className="size-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-2xl">analytics</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">AP Insights</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Access high-level P2P performance dashboards, AI-driven trend analysis, and strategic cash flow simulations.
          </p>
          <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest">
            Enter Insights Hub
            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </div>
        </button>

        {/* AP Manager Card */}
        <button 
          onClick={() => handleLogin(UserRole.AP_MANAGER)}
          className="group relative bg-white p-8 rounded-[2.5rem] border-2 border-transparent hover:border-primary transition-all duration-500 shadow-xl shadow-slate-200/50 hover:shadow-primary/10 text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 size-32 bg-primary/5 rounded-bl-full group-hover:bg-primary/10 transition-colors"></div>
          <div className="size-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-2xl">person_pin</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">AP Manager</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Oversee invoice validation workflows, review high-value discrepancies, and manage accounts payable performance.
          </p>
          <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest">
            Enter Management Suite
            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </div>
        </button>

        {/* AP Associate Card */}
        <button 
          onClick={() => handleLogin(UserRole.AP_ASSOCIATE)}
          className="group relative bg-white p-8 rounded-[2.5rem] border-2 border-transparent hover:border-primary transition-all duration-500 shadow-xl shadow-slate-200/50 hover:shadow-primary/10 text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 size-32 bg-primary/5 rounded-bl-full group-hover:bg-primary/10 transition-colors"></div>
          <div className="size-14 bg-primary text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">AP Associate</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Process incoming invoices, verify line items with AI assistance, and ensure accurate ERP synchronization.
          </p>
          <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest">
            Enter Processing Suite
            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </div>
        </button>
      </div>

      <footer className="mt-16 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
        Proprietary Enterprise Software • v2.4.0-Stable
      </footer>
    </div>
  );
};

export default Login;
