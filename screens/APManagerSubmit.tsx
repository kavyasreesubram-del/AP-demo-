
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type IngestionMethod = 'EMAIL' | 'EDI' | 'PORTAL' | null;

interface MockSourceItem {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  date: string;
  supplier: string;
}

const APManagerSubmit: React.FC = () => {
  const navigate = useNavigate();
  const [activeMethod, setActiveMethod] = useState<IngestionMethod>(null);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [historySupplier, setHistorySupplier] = useState('');
  const [isAllSelected, setIsAllSelected] = useState(false);
  
  const [formData, setFormData] = useState({
    supplier: '',
    amount: '',
    date: '',
    sku: '',
    description: '',
    docType: ''
  });

  const [ediViewMode, setEdiViewMode] = useState<'DOCUMENT' | 'RAW'>('DOCUMENT');

  const ediDataMap: Record<string, any> = {
    'Pioneer Inc.': {
      raw: `ISA*00*          *00*          *ZZ*PIONEER-INC    *ZZ*ENTERPRISE     *260415*1030*U*00401*000000123*0*P*>~
GS*IN*PIONEER-INC*ENTERPRISE*20260415*1030*123*X*004010~
ST*810*0001~
BIG*20260415*INV-PFI-992*20260410*PO-88772~
N1*ST*Enterprise Regional DC~
N3*10 Hudson Yards~
N4*New York*NY*10001*US~
N1*RE*Pioneer Inc. Group~
N3*123 Industrial Way~
N4*New York*NY*10017*US~
IT1*1*1200*EA*1.50**VC*CON-STR-10ML~
IT1*2*500*EA*4.50**VC*APC-CONS-99~
TDS*405000~
SE*12*0001~
GE*1*123~
IEA*1*000000123~`,
      parsed: {
        invoiceNo: 'INV-PFI-992',
        date: '15/04/2026',
        poRef: 'PO-88772',
        billTo: { name: 'Enterprise Regional DC', address: '10 Hudson Yards', city: 'New York, NY 10001' },
        remitTo: { name: 'Pioneer Inc. Group', address: '123 Industrial Way', city: 'New York, NY 10017' },
        items: [
          { desc: 'Industrial Containers - 10ml', qty: 1200, price: 1.50, code: 'CON-STR-10ML' },
          { desc: 'Advanced Product Component (APC)', qty: 500, price: 4.50, code: 'APC-CONS-99' }
        ],
        total: 4050.00
      }
    },
    'Apex & Co.': {
      raw: `ISA*00*          *00*          *ZZ*APEX-CORP      *ZZ*ENTERPRISE     *260415*1115*U*00401*000000456*0*P*>~
GS*IN*APEX-CORP*ENTERPRISE*20260415*1115*456*X*004010~
ST*810*0001~
BIG*20260415*INV-MRK-441*20260412*PO-99221~
N1*ST*Enterprise Business Services~
N3*99 Logistics Way~
N4*Dallas*TX*75201*US~
N1*RE*Apex & Co. Solutions~
N3*456 Innovation Dr~
N4*Rahway*NJ*07065*US~
IT1*1*2500*EA*0.85**VC*VLV-REG-02~
IT1*2*1000*EA*2.10**VC*CART-STOR-SV~
TDS*422500~
SE*12*0001~
GE*1*456~
IEA*1*000000456~`,
      parsed: {
        invoiceNo: 'INV-MRK-441',
        date: '15/04/2026',
        poRef: 'PO-99221',
        billTo: { name: 'Enterprise Business Services', address: '99 Logistics Way', city: 'Dallas, TX 75201' },
        remitTo: { name: 'Apex & Co. Solutions', address: '456 Innovation Dr', city: 'Rahway, NJ 07065' },
        items: [
          { desc: 'Liquid Dispenser Valves', qty: 2500, price: 0.85, code: 'VLV-REG-02' },
          { desc: 'Storage Cartridges', qty: 1000, price: 2.10, code: 'CART-STOR-SV' }
        ],
        total: 4225.00
      }
    },
    'NovaCorp AG': {
      raw: `ISA*00*          *00*          *ZZ*NOVACORP-INC   *ZZ*ENTERPRISE     *260415*0945*U*00401*000000789*0*P*>~
GS*IN*NOVACORP-INC*ENTERPRISE*20260415*0945*789*X*004010~
ST*810*0001~
BIG*20260415*INV-NOV-772*20260408*PO-77112~
N1*ST*Enterprise Irving HQ~
N3*6555 State Hwy 161~
N4*Irving*TX*75039*US~
N1*RE*NovaCorp AG Corp~
N3*55 Fabrikstrasse~
N4*Basel*BS*4056*CH~
IT1*1*50*KG*450.00**VC*PROD-BASE-01~
IT1*2*25*KG*820.00**VC*PROD-CATL-02~
TDS*4300000~
SE*12*0001~
GE*1*789~
IEA*1*000000789~`,
      parsed: {
        invoiceNo: 'INV-NOV-772',
        date: '15/04/2026',
        poRef: 'PO-77112',
        billTo: { name: 'Enterprise Irving HQ', address: '6555 State Hwy 161', city: 'Irving, TX 75039' },
        remitTo: { name: 'NovaCorp AG Corp', address: '55 Fabrikstrasse', city: 'Basel, CH 4056' },
        items: [
          { desc: 'Product Base Concentrate', qty: 50, price: 450.00, code: 'PROD-BASE-01' },
          { desc: 'Product Formulation Catalyst', qty: 25, price: 820.00, code: 'PROD-CATL-02' }
        ],
        total: 43000.00
      }
    },
    'Jupiter & Jupiter': {
      raw: `ISA*00*          *00*          *ZZ*JUPITER-CORP   *ZZ*ENTERPRISE     *260415*1420*U*00401*000000321*0*P*>~
GS*IN*JUPITER-CORP*ENTERPRISE*20260415*1420*321*X*004010~
ST*810*0001~
BIG*20260415*INV-JNJ-112*20260411*PO-66551~
N1*ST*Enterprise North DC~
N3*10 Hudson Yards~
N4*New York*NY*10001*US~
N1*RE*Jupiter & Jupiter AG~
N3*One Jupiter Plaza~
N4*New York*NY*10001*US~
IT1*1*100*L*125.50**VC*PROD-SOL-01~
IT1*2*200*L*45.00**VC*VISC-BASE-02~
TDS*2155000~
SE*12*0001~
GE*1*321~
IEA*1*000000321~`,
      parsed: {
        invoiceNo: 'INV-JNJ-112',
        date: '15/04/2026',
        poRef: 'PO-66551',
        billTo: { name: 'Enterprise North DC', address: '10 Hudson Yards', city: 'New York, NY 10001' },
        remitTo: { name: 'Jupiter & Jupiter AG', address: 'One Jupiter Plaza', city: 'New York, NY 10001' },
        items: [
          { desc: 'Purified Coating Solvent', qty: 100, price: 125.50, code: 'PROD-SOL-01' },
          { desc: 'Viscous Base Liquid', qty: 200, price: 45.00, code: 'VISC-BASE-02' }
        ],
        total: 21550.00
      }
    }
  };

  const emailInvoices: MockSourceItem[] = [
    { id: 'EML-1', title: 'Invoice: Pioneer Inc. - Q3 Materials', subtitle: 'From: billing@pioneer.com', amount: '12,250.00', date: '2023-10-12', supplier: 'Pioneer Inc.' },
    { id: 'EML-2', title: 'Apex & Co. - Product Cartridge Audit', subtitle: 'From: accounts@apex.com', amount: '3,420.50', date: '2023-07-20', supplier: 'Apex & Co.' },
  ];

  const ediInvoices: MockSourceItem[] = [
    { id: 'EDI-88', title: 'NovaCorp - Material Delivery', subtitle: 'EDI 810 - Transaction #8829', amount: '50,000.00', date: '2023-06-15', supplier: 'NovaCorp AG' },
    { id: 'EDI-92', title: 'Jupiter - Specialty Goods Batch', subtitle: 'EDI 810 - Transaction #00192', amount: '45,450.00', date: '2023-10-22', supplier: 'Jupiter & Jupiter' },
  ];

  const handleMagicFill = (data?: Partial<typeof formData>) => {
    setIsAIProcessing(true);
    // Simulate AI extraction delay
    setTimeout(() => {
      setFormData({
        supplier: data?.supplier || historySupplier || 'Pioneer Inc.',
        amount: data?.amount || '2450.00',
        date: data?.date || '2023-10-25',
        sku: 'APC-SKU-772',
        description: data?.description || `Intelligent historical draft generated for ${data?.supplier || historySupplier || 'Pioneer Inc.'}.`,
        docType: data?.docType || (activeMethod === 'EDI' ? 'PDF' : activeMethod === 'EMAIL' ? 'Excel' : 'PDF')
      });
      setIsAIProcessing(false);
    }, 800);
  };

  const handleSelectSourceItem = (item: MockSourceItem) => {
    setSelectedItemId(item.id);
    handleMagicFill({
      supplier: item.supplier,
      amount: item.amount.replace(',', ''),
      date: item.date,
      description: item.title,
      docType: activeMethod === 'EDI' ? 'PDF' : 'Excel'
    });
  };

  const renderSourceUI = () => {
    switch (activeMethod) {
      case 'EMAIL':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">mail</span>
                Recent Supplier Emails
              </h3>
              <button 
                onClick={() => setIsAllSelected(!isAllSelected)}
                className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
              >
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="space-y-2">
              {emailInvoices.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => handleSelectSourceItem(item)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                    selectedItemId === item.id || isAllSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-slate-100 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`size-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedItemId === item.id || isAllSelected ? 'bg-primary border-primary' : 'border-slate-200 group-hover:border-slate-400'
                    }`}>
                      {(selectedItemId === item.id || isAllSelected) && <span className="material-symbols-outlined text-[14px] text-white">check</span>}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-tight">{item.title}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{item.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900">€{item.amount}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'EDI':
        return (
          <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white space-y-6 animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 size-32 bg-primary/20 blur-3xl rounded-full"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-4xl text-primary">sync_alt</span>
                  <div>
                      <h3 className="text-xl font-black">EDI Sync</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Electronic Data Interchange</p>
                  </div>
              </div>
            </div>
            
            <div className="space-y-4 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Step 1: Select Supplier</label>
                <select 
                  value={historySupplier}
                  onChange={(e) => {
                    const supplier = e.target.value;
                    setHistorySupplier(supplier);
                    if (ediDataMap[supplier]) {
                      const data = ediDataMap[supplier].parsed;
                      setFormData({
                        supplier: supplier,
                        amount: data.total.toString(),
                        date: '2026-04-15',
                        sku: data.items[0].code,
                        description: `EDI 810 Sync: ${data.invoiceNo}`,
                        docType: 'EDI'
                      });
                    }
                  }}
                  className="w-full bg-slate-800 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-primary/40 transition-all text-white outline-none"
                >
                  <option value="" disabled>Choose Supplier...</option>
                  <option value="Pioneer Inc.">Pioneer Inc. (PH-EDI-992)</option>
                  <option value="Apex & Co.">Apex & Co. (PH-EDI-441)</option>
                  <option value="NovaCorp AG">NovaCorp AG (PH-EDI-772)</option>
                  <option value="Jupiter & Jupiter">Jupiter & Jupiter (PH-EDI-112)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Step 2: Sync Transactions</label>
                <button 
                  onClick={() => handleMagicFill()}
                  disabled={!historySupplier}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-30 disabled:grayscale shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">sync</span>
                  Fetch EDI Invoices
                </button>
              </div>
            </div>

            <p className="text-slate-500 text-[10px] font-medium leading-relaxed italic">
              Linking directly to supplier EDI 810 streams for automated ingestion.
            </p>
          </div>
        );
      case 'PORTAL':
        return (
          <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white space-y-6 animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 size-32 bg-primary/20 blur-3xl rounded-full"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-4xl text-primary">hub</span>
                  <div>
                      <h3 className="text-xl font-black">Supplier Portal Sync</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Predictive Ingestion</p>
                  </div>
              </div>
              <button 
                onClick={() => setIsAllSelected(!isAllSelected)}
                className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
              >
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            
            <div className="space-y-4 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Step 1: Select Supplier</label>
                <select 
                  value={historySupplier}
                  onChange={(e) => setHistorySupplier(e.target.value)}
                  className="w-full bg-slate-800 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-primary/40 transition-all text-white outline-none"
                >
                  <option value="" disabled>Choose Supplier...</option>
                  <option value="Pioneer Inc.">Pioneer Inc.</option>
                  <option value="Apex & Co.">Apex & Co.</option>
                  <option value="NovaCorp AG">NovaCorp AG</option>
                  <option value="Jupiter & Jupiter">Jupiter & Jupiter</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Step 2: Generate Details</label>
                <button 
                  onClick={() => handleMagicFill()}
                  disabled={!historySupplier}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-30 disabled:grayscale shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">psychology</span>
                  Populate from Portal
                </button>
              </div>
            </div>

            <p className="text-slate-500 text-[10px] font-medium leading-relaxed italic">
              AI analyzes the last 12 months of patterns for the selected supplier to pre-calculate accruals and SKUs.
            </p>
          </div>
        );
      default:
        return (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 opacity-60">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">dataset</span>
            <p className="text-slate-500 font-medium">Select a source from the left to begin ingestion</p>
          </div>
        );
    }
  };

  const methods = [
    { id: 'PORTAL' as IngestionMethod, label: 'Supplier Portal Sync', icon: 'hub', desc: 'Sync from Enterprise Supplier Hub' },
    { id: 'EMAIL' as IngestionMethod, label: 'Connect to Supplier Inbox', icon: 'mail', desc: 'Sync invoices from dedicated inbox' },
    { id: 'EDI' as IngestionMethod, label: 'EDI Sync', icon: 'sync_alt', desc: 'Link EDI 810 transactions' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/manager/dashboard')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Auto Extraction (Invoice)</h1>
          <p className="text-slate-500 font-medium">Select a wholesale supply chain data source and let the AI Agent handle the validation.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Source Selection - Left (4 cols) */}
        <div className="xl:col-span-4 space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Ingestion Source</label>
          <div className="grid grid-cols-1 gap-3">
            {methods.map((method) => (
              <button 
                key={method.id}
                onClick={() => {
                  setActiveMethod(method.id);
                  setSelectedItemId(null);
                  setHistorySupplier('');
                  setIsAllSelected(false);
                }}
                className={`flex items-start gap-4 p-5 rounded-3xl border-2 transition-all text-left relative overflow-hidden group ${
                  activeMethod === method.id 
                  ? 'border-primary bg-white shadow-xl shadow-primary/10' 
                  : 'border-white bg-white hover:border-slate-200'
                }`}
              >
                <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                  activeMethod === method.id ? 'bg-primary text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'
                }`}>
                  <span className="material-symbols-outlined text-2xl">{method.icon}</span>
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">{method.label}</h3>
                  <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">{method.desc}</p>
                </div>
                {activeMethod === method.id && (
                  <div className="absolute top-2 right-2 size-2 bg-primary rounded-full animate-ping"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Interaction Panel - Middle (4 cols) */}
        <div className="xl:col-span-4 min-h-[400px]">
          {renderSourceUI()}
        </div>

        {/* Form Section - Right (4 cols) */}
        <div className="xl:col-span-4">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 relative overflow-hidden">
            {isAIProcessing && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                <div className="flex gap-2 mb-4">
                  <div className="size-3 bg-primary rounded-full animate-bounce"></div>
                  <div className="size-3 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="size-3 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
                <p className="text-sm font-black text-slate-900">Agentic Extraction...</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">Mapping context to SAP schema</p>
              </div>
            )}
            
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Details Preview</h3>
              {(formData.supplier || isAllSelected) && (
                <span className="flex items-center gap-1 text-green-500 text-[10px] font-black bg-green-50 px-2 py-0.5 rounded">
                  <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                  AI VERIFIED
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Supplier</label>
                  <input 
                    type="text" 
                    value={formData.supplier}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300"
                    placeholder="Supplier name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Doc Type</label>
                  <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="material-symbols-outlined text-primary text-lg">
                      {formData.docType === 'PDF' ? 'picture_as_pdf' : formData.docType === 'Excel' ? 'table_chart' : 'description'}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{formData.docType || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">€</span>
                    <input 
                      type="text" 
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-xl p-3 pl-7 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Primary SKU</label>
                <input 
                  type="text" 
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300"
                  placeholder="e.g. SK-992"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Short Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-slate-300"
                  placeholder="Brief summary..."
                />
              </div>
            </div>

            <button 
              onClick={() => navigate('/manager/dashboard')}
              disabled={(!formData.supplier && !isAllSelected) || isAIProcessing}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black text-base shadow-xl shadow-primary/20 hover:bg-primary-hover disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-2 mt-4"
            >
              Submit for Validation
            </button>

            {/* Document Preview Section */}
            {(formData.supplier || isAllSelected) && (
              <div className="mt-8 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Preview</h4>
                  {activeMethod === 'EDI' ? (
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setEdiViewMode('DOCUMENT')}
                        className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${ediViewMode === 'DOCUMENT' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
                      >
                        Document
                      </button>
                      <button 
                        onClick={() => setEdiViewMode('RAW')}
                        className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-md transition-all ${ediViewMode === 'RAW' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
                      >
                        Raw EDI
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="size-1.5 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Live Rendering</span>
                    </div>
                  )}
                </div>
                
                {activeMethod === 'EDI' ? (
                  <div className="w-full aspect-[3/4] bg-white rounded-2xl border border-slate-200 overflow-hidden relative group shadow-xl ring-1 ring-slate-900/5">
                    {ediViewMode === 'DOCUMENT' ? (
                      <div className="absolute inset-0 p-6 flex flex-col text-[8px] font-sans">
                        {/* Virtual Invoice Header */}
                        <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                          <div>
                            <h5 className="text-lg font-black text-slate-900 leading-none">{formData.supplier}</h5>
                            <p className="text-[7px] text-slate-500 mt-1 font-mono">EDI 810 TRANSACTION</p>
                          </div>
                          <div className="text-right">
                            <div className="size-8 bg-primary rounded flex items-center justify-center text-white text-[10px] font-black ml-auto mb-1">EDI</div>
                            <p className="text-[7px] text-slate-500 font-bold uppercase tracking-tighter">Virtual Renderer</p>
                          </div>
                        </div>

                        {/* Mapping Info */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="space-y-1">
                            <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest">N1/N3/N4 (Bill To):</p>
                            <p className="text-[8px] font-bold text-slate-900">{ediDataMap[formData.supplier]?.parsed.billTo.name}</p>
                            <p className="text-[7px] text-slate-500 leading-tight">{ediDataMap[formData.supplier]?.parsed.billTo.address}<br />{ediDataMap[formData.supplier]?.parsed.billTo.city}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest">BIG (Invoice Info):</p>
                            <div className="grid grid-cols-2 gap-x-2 text-[7px]">
                              <span className="text-slate-400 font-bold">INV NO:</span>
                              <span className="font-black text-slate-900">{ediDataMap[formData.supplier]?.parsed.invoiceNo}</span>
                              <span className="text-slate-400 font-bold">DATE:</span>
                              <span className="font-black text-slate-900">{ediDataMap[formData.supplier]?.parsed.date}</span>
                              <span className="text-slate-400 font-bold">PO REF:</span>
                              <span className="font-black text-slate-900">{ediDataMap[formData.supplier]?.parsed.poRef}</span>
                            </div>
                          </div>
                        </div>

                        {/* IT1 Table */}
                        <div className="flex-1">
                          <div className="grid grid-cols-12 gap-1 border-b border-slate-900 pb-1 mb-2">
                            <div className="col-span-6 text-[6px] font-black uppercase">IT1 Segment (Desc)</div>
                            <div className="col-span-2 text-[6px] font-black uppercase text-center">Qty</div>
                            <div className="col-span-2 text-[6px] font-black uppercase text-right">Price</div>
                            <div className="col-span-2 text-[6px] font-black uppercase text-right">Total</div>
                          </div>
                          <div className="space-y-2">
                            {ediDataMap[formData.supplier]?.parsed.items.map((item: any, i: number) => (
                              <div key={i} className="grid grid-cols-12 gap-1 items-center">
                                <div className="col-span-6">
                                  <p className="text-[7px] font-bold text-slate-900 leading-tight">{item.desc}</p>
                                  <p className="text-[5px] text-slate-400 font-mono">VC*{item.code}</p>
                                </div>
                                <div className="col-span-2 text-[7px] text-center text-slate-500">{item.qty}</div>
                                <div className="col-span-2 text-[7px] text-right text-slate-500">${item.price.toFixed(2)}</div>
                                <div className="col-span-2 text-[7px] text-right font-bold text-slate-900">${(item.qty * item.price).toFixed(2)}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* TDS Total */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <div className="flex justify-end gap-4">
                            <div className="text-right space-y-1">
                              <p className="text-[6px] font-bold text-slate-400 uppercase">TDS Segment (Total):</p>
                              <p className="text-[10px] font-black text-primary">${ediDataMap[formData.supplier]?.parsed.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-slate-900 p-4 font-mono text-[7px] leading-relaxed overflow-auto">
                        {ediDataMap[formData.supplier]?.raw.split('\n').map((line: string, i: number) => {
                          const segments = line.split('*');
                          return (
                            <div key={i} className="mb-0.5 whitespace-nowrap">
                              <span className="text-slate-500 mr-2">{(i + 1).toString().padStart(2, '0')}</span>
                              {segments.map((seg, j) => {
                                let color = 'text-slate-300';
                                if (j === 0) color = 'text-amber-400 font-bold'; // Segment ID
                                else if (seg.includes('INV-') || seg.includes('PO-')) color = 'text-blue-400';
                                else if (!isNaN(Number(seg)) && seg.length > 0) color = 'text-green-400';
                                
                                return (
                                  <React.Fragment key={j}>
                                    <span className={color}>{seg}</span>
                                    {j < segments.length - 1 && <span className="text-slate-600">*</span>}
                                  </React.Fragment>
                                );
                              })}
                              <span className="text-slate-600">~</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : formData.docType === 'PDF' || isAllSelected ? (
                  <div className="w-full aspect-[3/4] bg-white rounded-2xl border border-slate-200 overflow-hidden relative group shadow-xl ring-1 ring-slate-900/5">
                    <div className="absolute inset-0 p-6 flex flex-col">
                      {/* PDF Header */}
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h5 className="text-lg font-black text-slate-900 leading-none">INVOICE</h5>
                          <p className="text-[8px] text-slate-400 mt-1 font-mono">#INV-{selectedItemId?.split('-')[1] || '99281'}</p>
                        </div>
                        <div className="text-right">
                          <div className="size-8 bg-red-500 rounded flex items-center justify-center text-white text-[10px] font-black ml-auto mb-1">PDF</div>
                          <p className="text-[7px] text-slate-500 font-bold uppercase tracking-tighter">Supplier Copy</p>
                        </div>
                      </div>

                      {/* Bill To / Ship To */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="space-y-1">
                          <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Bill To:</p>
                          <p className="text-[8px] font-bold text-slate-900">Enterprise USA</p>
                          <p className="text-[7px] text-slate-500 leading-tight">10 Hudson Yards<br />New York, NY 10001</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Ship To:</p>
                          <p className="text-[8px] font-bold text-slate-900">Wholesale DC #44</p>
                          <p className="text-[7px] text-slate-500 leading-tight">99 Logistics Way<br />Dallas, TX 75201</p>
                        </div>
                      </div>

                      {/* Invoice Table */}
                      <div className="flex-1">
                        <div className="grid grid-cols-12 gap-1 border-b border-slate-900 pb-1 mb-2">
                          <div className="col-span-6 text-[6px] font-black uppercase">Description</div>
                          <div className="col-span-2 text-[6px] font-black uppercase text-center">Qty</div>
                          <div className="col-span-2 text-[6px] font-black uppercase text-right">Price</div>
                          <div className="col-span-2 text-[6px] font-black uppercase text-right">Total</div>
                        </div>
                        <div className="space-y-2">
                          {[
                            { desc: 'Standard Containers - 10ml', qty: 1200, price: 1.50 },
                            { desc: 'Liquid Flow Valves', qty: 500, price: 4.50 },
                            { desc: 'Chemical Concentrate', qty: 10, price: 500.00 }
                          ].map((row, i) => (
                            <div key={i} className="grid grid-cols-12 gap-1 items-center">
                              <div className="col-span-6 text-[7px] font-medium text-slate-700">{row.desc}</div>
                              <div className="col-span-2 text-[7px] text-center text-slate-500">{row.qty}</div>
                              <div className="col-span-2 text-[7px] text-right text-slate-500">€{row.price.toFixed(2)}</div>
                              <div className="col-span-2 text-[7px] text-right font-bold text-slate-900">€{(row.qty * row.price).toFixed(2)}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Totals */}
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="flex justify-end gap-4">
                          <div className="text-right space-y-1">
                            <p className="text-[6px] font-bold text-slate-400">Subtotal:</p>
                            <p className="text-[6px] font-bold text-slate-400">VAT (20%):</p>
                            <p className="text-[8px] font-black text-slate-900">Total Amount:</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-[6px] font-bold text-slate-500">€9,050.00</p>
                            <p className="text-[6px] font-bold text-slate-500">€1,810.00</p>
                            <p className="text-[8px] font-black text-primary">€{formData.amount || '10,860.00'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="absolute bottom-6 right-6 size-12 border-2 border-primary/20 rounded-full flex items-center justify-center rotate-12">
                        <span className="material-symbols-outlined text-primary/30 text-3xl">verified</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors flex items-center justify-center">
                      <button className="opacity-0 group-hover:opacity-100 bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-black shadow-xl transition-all border border-slate-200">Open Full PDF</button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-[4/3] bg-white rounded-2xl border border-slate-200 overflow-hidden relative group shadow-xl ring-1 ring-slate-900/5">
                    <div className="absolute inset-0 flex flex-col">
                      {/* Excel Toolbar */}
                      <div className="h-8 bg-slate-50 border-b border-slate-200 flex items-center px-3 gap-4">
                        <div className="flex items-center gap-1">
                          <div className="size-4 bg-green-600 rounded flex items-center justify-center text-white text-[6px] font-black">XLS</div>
                          <span className="text-[8px] font-bold text-slate-600">Invoice_Data.xlsx</span>
                        </div>
                        <div className="flex gap-2">
                          <div className="h-3 w-8 bg-slate-200 rounded-sm"></div>
                          <div className="h-3 w-12 bg-slate-200 rounded-sm"></div>
                          <div className="h-3 w-6 bg-slate-200 rounded-sm"></div>
                        </div>
                      </div>
                      
                      {/* Excel Grid */}
                      <div className="flex-1 overflow-hidden flex">
                        {/* Row Numbers */}
                        <div className="w-6 bg-slate-50 border-r border-slate-200 flex flex-col">
                          {[...Array(10)].map((_, i) => (
                            <div key={i} className="h-6 border-b border-slate-200 flex items-center justify-center text-[7px] font-bold text-slate-400">{i + 1}</div>
                          ))}
                        </div>
                        {/* Content */}
                        <div className="flex-1 flex flex-col">
                          {/* Column Headers */}
                          <div className="h-6 bg-slate-50 border-b border-slate-200 flex">
                            {colNames.map((col) => (
                              <div key={col} className="flex-1 border-r border-slate-200 flex items-center justify-center text-[7px] font-bold text-slate-400">{col}</div>
                            ))}
                          </div>
                          {/* Data Rows */}
                          <div className="flex-1">
                            <div className="h-6 border-b border-slate-200 flex bg-slate-100/50">
                              {['SKU', 'Description', 'Qty', 'Unit Price', 'Total'].map((header, i) => (
                                <div key={i} className="flex-1 border-r border-slate-200 flex items-center px-2 text-[7px] font-black text-slate-900">{header}</div>
                              ))}
                            </div>
                            {[
                              ['PNE-500', 'Containers', '1200', '1.50', '1800.00'],
                              ['VLV-100', 'Valves', '500', '4.50', '2250.00'],
                              ['CHM-044', 'Concentrates', '1', '500.00', '500.00'],
                              ['', '', '', '', ''],
                              ['TOTAL', '', '', '', formData.amount || '4550.00']
                            ].map((row, i) => (
                              <div key={i} className="h-6 border-b border-slate-200 flex">
                                {row.map((cell, j) => (
                                  <div key={j} className={`flex-1 border-r border-slate-200 flex items-center px-2 text-[7px] ${i === 4 ? 'font-black text-primary' : 'text-slate-600'}`}>
                                    {cell}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-colors flex items-center justify-center">
                      <button className="opacity-0 group-hover:opacity-100 bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-black shadow-xl transition-all border border-slate-200">Edit in Spreadsheet</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const colNames = ['A', 'B', 'C', 'D', 'E'];

export default APManagerSubmit;
