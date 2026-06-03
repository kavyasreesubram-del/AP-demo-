
import React from 'react';

interface HeaderProps {
  onOpenAssistant: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenAssistant }) => {
  return (
    <header className="h-16 flex-shrink-0 flex items-center justify-between px-8 bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="flex items-center gap-8 flex-1">
        {/* Search Bar restored as requested */}
        <div className="relative w-full max-w-md group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-xl">
            search
          </span>
          <input 
            type="text" 
            placeholder="Search invoices, partners, or events..." 
            className="w-full bg-slate-50 border-none rounded-xl py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button 
          onClick={onOpenAssistant}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-all"
        >
          <span className="material-symbols-outlined text-xl">smart_toy</span>
          <span className="text-xs font-bold uppercase tracking-wider">Ask AI</span>
        </button>

        <div className="h-6 w-px bg-slate-200 mx-2"></div>

        <button className="size-10 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full relative">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2.5 right-2.5 size-2 bg-primary rounded-full border-2 border-white"></span>
        </button>

        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block leading-tight">
            <p className="text-sm font-bold text-slate-900">Alex Johnson</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase">
              {localStorage.getItem('userRole') === 'AP_MANAGER' 
                ? 'AP Manager' 
                : localStorage.getItem('userRole') === 'INSIGHTS' 
                  ? 'AP Insights Lead' 
                  : localStorage.getItem('userRole') === 'AP diagnostics' 
                    ? 'AP Diagnostics' 
                    : 'AP Associate'}
            </p>
          </div>
          <div className="size-10 rounded-full bg-slate-200 overflow-hidden ring-2 ring-slate-100">
            <img src="https://picsum.photos/seed/admin/40/40" alt="Profile" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
