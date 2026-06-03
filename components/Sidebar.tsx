
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const userRole = localStorage.getItem('userRole') || 'AP_ASSOCIATE';

  const commonItems = [
    { label: 'AP Insights', icon: 'analytics', path: '/insights' },
  ];

  const associateItems = [
    { label: 'Workflow Overview', icon: 'account_tree', path: '/associate/overview' },
    { label: 'Approval Queue', icon: 'inbox', path: '/invoices' },
  ];

  const managerItems = [
    { label: 'Manager Dashboard', icon: 'dashboard', path: '/manager/dashboard' },
    { label: 'Auto extraction (Invoice)', icon: 'add_circle', path: '/manager/submit' },
    { label: 'Manual ingestion  (PO, GR, Invoice, Vendor master)', icon: 'database', path: '/data-sources' },
    { label: 'SOX Evidence', icon: 'verified_user', path: '/sox-evidence' },
  ];

  const insightsItems = [
    ...commonItems,
    { label: 'SOX Evidence', icon: 'verified_user', path: '/sox-evidence' },
  ];

  const diagnosticsItems = [
    { label: 'DPO Optimization', icon: 'account_tree', path: '/diagnostics' },
  ];

  const navItems =
    userRole === 'AP_MANAGER'
      ? managerItems
      : userRole === 'INSIGHTS'
        ? insightsItems
        : userRole === 'AP diagnostics'
          ? diagnosticsItems
          : associateItems;

  const bottomItems = [
    { label: 'Settings', icon: 'settings', path: '/settings' },
    { label: 'Help Center', icon: 'help', path: '/help' },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-950 flex flex-col border-r border-slate-800 transition-all duration-300">
      <div className="p-6 flex items-center gap-3">
        <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-2xl font-black">verified</span>
        </div>
        <div>
          <h1 className="text-white font-bold leading-none text-sm">
            {userRole === 'AP_MANAGER'
              ? 'AP Manager'
              : userRole === 'INSIGHTS'
                ? 'AP Insights Lead'
                : userRole === 'AP diagnostics'
                  ? 'AP Diagnostics'
                  : 'AP Associate'}
          </h1>
          <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-1">Management</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                isActive
                ? 'bg-primary text-white shadow-md shadow-primary/10'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <span className={`material-symbols-outlined text-xl ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}>
                {item.icon}
              </span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-6 space-y-1 border-t border-slate-900">
        {bottomItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white transition-all duration-200"
          >
            <span className="material-symbols-outlined text-xl text-slate-500">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
        <Link
          to="/login"
          onClick={() => localStorage.removeItem('userRole')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all duration-200 mt-2"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          <span className="text-sm font-medium">Logout</span>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
