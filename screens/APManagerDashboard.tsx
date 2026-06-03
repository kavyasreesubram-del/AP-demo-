
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { InvoiceStatus } from '../types';

const APManagerDashboard: React.FC = () => {
  const navigate = useNavigate();

  const myInvoices = [
    { id: 'INV-9001', supplier: 'Pioneer Inc.', amount: 4500.00, status: InvoiceStatus.PARKED, date: 'Today', docType: 'PDF' },
    { id: 'INV-9002', supplier: 'Apex & Co.', amount: 1200.50, status: InvoiceStatus.APPROVED, date: 'Today', docType: 'Excel' },
    { id: 'INV-8954', supplier: 'NovaCorp AG', amount: 8900.00, status: InvoiceStatus.APPROVED, date: '15/03/2026', docType: 'JPEG' },
  ];

  const stats = [
    { label: 'Total Submitted', val: '$14.6k', icon: 'upload_file', color: 'text-blue-500' },
    { label: 'Approved Value', val: '$8.9k', icon: 'check_circle', color: 'text-green-500' },
    { label: 'Pending AI', val: '2', icon: 'psychology', color: 'text-primary' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">AP Manager Dashboard</h1>
          <p className="text-slate-500 font-medium">Overview of your submitted wholesale supply chain invoices and status tracking.</p>
        </div>
        <button 
          onClick={() => navigate('/manager/submit')}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:scale-105 transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          New Invoice Submission
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6">
            <div className={`size-14 rounded-2xl flex items-center justify-center ${stat.color} bg-slate-50`}>
              <span className="material-symbols-outlined text-3xl">{stat.icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-900">{stat.val}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-slate-900">Recent Invoices History</h3>
          <span className="text-xs font-bold text-slate-400">Showing last 30 days</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Doc Type</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {myInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                   <td className="px-6 py-4 font-bold text-slate-900">{invoice.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-600">{invoice.supplier}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black ${
                      invoice.docType === 'PDF' ? 'bg-red-50 text-red-600' :
                      invoice.docType === 'Excel' ? 'bg-green-50 text-green-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {invoice.docType}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-black text-slate-900 text-right">€{invoice.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-400">{invoice.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default APManagerDashboard;
