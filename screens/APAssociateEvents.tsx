
import React from 'react';

const APAssociateEvents: React.FC = () => {
  const events = [
    { id: 'E-4492', name: 'Q3 Marketing Co-Op', retailer: 'Apex Retailers', budget: 50000, spend: 12400, status: 'Active' },
    { id: 'E-4493', name: 'Logistics Inventory Audit', retailer: 'Wally Goods', budget: 75000, spend: 68000, status: 'Closing' },
    { id: 'E-4501', name: 'Hardware Kit Distribution', retailer: 'Standard Store Corp', budget: 15000, spend: 0, status: 'Planned' },
    { id: 'E-4505', name: 'Premium Cold Logistics', retailer: 'Pioneer Inc.', budget: 120000, spend: 45000, status: 'Active' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Validation Events</h1>
        <p className="text-slate-500 mt-1">Manage invoice validation budgets and retailer marketing agreements.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50">
              <th className="px-6 py-4">Event ID</th>
              <th className="px-6 py-4">Event Name</th>
              <th className="px-6 py-4">Retailer</th>
              <th className="px-6 py-4">Budget Utilization</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs font-bold text-primary">{event.id}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900">{event.name}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{event.retailer}</td>
                <td className="px-6 py-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-400">${event.spend.toLocaleString()} spent</span>
                      <span className="text-slate-900">${event.budget.toLocaleString()} total</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full" 
                        style={{ width: `${(event.spend / event.budget) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    event.status === 'Active' ? 'bg-green-100 text-green-700' : 
                    event.status === 'Planned' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {event.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default APAssociateEvents;
