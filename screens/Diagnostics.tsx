import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Hypothesis {
  code: string;
  title: string;
  statement: string;
  tables: string[];
  root_cause: string;
  agent: string;
  diagnostic: {
    records: string;
    status: string;
    metric: string;
    metric_label: string;
    percentage: string;
    finding: string;
  };
}

interface Category {
  id: number;
  color: string;
  title: string;
  theme: string;
  hypotheses: Hypothesis[];
}

const libraryData: Category[] = [
  {
    id: 1,
    color: '#ef4444', // var(--c1)
    title: '1. PAYMENT TERM OPTIMIZATION',
    theme: 'Suboptimal or inconsistently applied vendor terms',
    hypotheses: [
      {
        code: 'H1.1',
        title: 'Vendors have shorter terms than policy',
        statement: 'Suppliers are not aligned with corporate net terms.',
        tables: ['LFB1', 'T052', 'LFA1'],
        root_cause: 'Weak procurement negotiation, legacy contracts.',
        agent: "Deploy a 'Contract AI Agent' to scan vendor agreements.",
        diagnostic: {
          records: '45,000',
          status: 'Confirmed',
          metric: '-4.2 Days',
          metric_label: 'DPO Leakage',
          percentage: '55%',
          finding: 'Top 20 vendors by spend are configured as Net 15, violating the corporate standard policy of Net 45.',
        },
      },
      {
        code: 'H1.2',
        title: 'Payments executed before due date',
        statement: 'Cash is leaving the business unnecessarily early.',
        tables: ['BSAK', 'REGUH'],
        root_cause: 'Overly aggressive weekly payment run schedules.',
        agent: "Deploy a 'Payment Run Optimizer Agent'.",
        diagnostic: {
          records: '210,000',
          status: 'Confirmed',
          metric: '-2.8 Days',
          metric_label: 'DPO Leakage',
          percentage: '35%',
          finding: '18% of payment volume is executed 5+ days before the net due date due to F110 batch scheduling.',
        },
      },
      {
        code: 'H1.3',
        title: 'Inconsistent terms for same vendor',
        statement: 'Multiple vendor master records hold different terms.',
        tables: ['LFA1', 'LFB1'],
        root_cause: 'Decentralized vendor onboarding, lack of MDG.',
        agent: "Deploy a 'Master Data Harmonization Agent'.",
        diagnostic: {
          records: '12,000',
          status: 'Confirmed',
          metric: '-0.8 Days',
          metric_label: 'DPO Leakage',
          percentage: '10%',
          finding: 'Found 420 duplicate vendor records where one entity has Net 30 and the duplicate has Net 60.',
        },
      },
    ],
  },
  {
    id: 2,
    color: '#3b82f6', // var(--c2)
    title: '2. INVOICE PROCESSING',
    theme: 'Friction in the Procure-to-Pay process',
    hypotheses: [
      {
        code: 'H2.1',
        title: 'Invoice blocks delay term start dates',
        statement: 'Price/Qty blocks prevent timely baseline date commencement.',
        tables: ['RBKP', 'RSEG'],
        root_cause: 'PO vs. Invoice mismatches.',
        agent: "Deploy a 'Block Resolution Agent' to auto-investigate.",
        diagnostic: {
          records: '340,000',
          status: 'Confirmed',
          metric: '+3.5 Days',
          metric_label: 'Processing Delay',
          percentage: '45%',
          finding: '12% of invoices require manual unblocking due to tight tolerance limits, pushing baseline dates forward.',
        },
      },
      {
        code: 'H2.2',
        title: 'GR/IR processing delays',
        statement: 'Delayed Goods Receipts push out invoice processing.',
        tables: ['EKBE', 'EKPO'],
        root_cause: 'Warehouse staff batching GR entries.',
        agent: "Deploy a 'Goods Receipt Auto-Prompt Agent'.",
        diagnostic: {
          records: '89,000',
          status: 'Confirmed',
          metric: '+2.5 Days',
          metric_label: 'Processing Delay',
          percentage: '35%',
          finding: 'Average delay between physical delivery and SAP GR posting is 4 days.',
        },
      },
      {
        code: 'H2.3',
        title: 'High rate of manual FI invoices',
        statement: 'Non-PO invoices bypass workflow and default to immediate terms.',
        tables: ['BKPF', 'BSEG', 'RBKP'],
        root_cause: "Lack of 'No PO, No Pay' policy enforcement.",
        agent: "Deploy an 'AI Procurement Guide Agent'.",
        diagnostic: {
          records: '110,000',
          status: 'Confirmed',
          metric: '+1.5 Days',
          metric_label: 'Processing Delay',
          percentage: '20%',
          finding: "High volume of FI-only invoices are being pushed through with 'Pay Immediately' flags.",
        },
      },
    ],
  },
  {
    id: 3,
    color: '#eab308', // var(--c3)
    title: '3. DISCOUNT CAPTURE',
    theme: 'Failing to capitalize on early payment incentives',
    hypotheses: [
      {
        code: 'H3.1',
        title: 'High volume of lost cash discounts',
        statement: 'Valuable discounts are missed due to slow processing.',
        tables: ['BSAK', 'BSEG'],
        root_cause: 'Slow approval workflows.',
        agent: "Deploy a 'Discount Capture Agent'.",
        diagnostic: {
          records: '14,500',
          status: 'Confirmed',
          metric: '$145k Lost',
          metric_label: 'Discount Leakage',
          percentage: '85%',
          finding: 'Over $145k in 2% Net 10 discounts were lost this quarter because invoice approvals took > 12 days.',
        },
      },
      {
        code: 'H3.2',
        title: 'Payment runs miss discount windows',
        statement: 'Scheduled payment batches are not aligned with discount due dates.',
        tables: ['REGUH', 'BSIK'],
        root_cause: 'Payment runs scheduled only 1x/week.',
        agent: "Deploy a 'Smart Batching Agent'.",
        diagnostic: {
          records: '4,200',
          status: 'Partially Confirmed',
          metric: '$25k Lost',
          metric_label: 'Discount Leakage',
          percentage: '15%',
          finding: 'Weekly Thursday runs miss discounts that expire on Mondays and Tuesdays.',
        },
      },
    ],
  },
  {
    id: 4,
    color: '#22c55e', // var(--c4)
    title: '4. PAYMENT EXECUTION',
    theme: 'Mechanics of how and when funds are dispersed',
    hypotheses: [
      {
        code: 'H4.1',
        title: 'Excessive out-of-cycle payments',
        statement: 'Manual payments bypass working capital controls.',
        tables: ['REGUH', 'PAYR', 'BKPF'],
        root_cause: 'Emergency supplier demands.',
        agent: "Deploy an 'Out-of-Cycle Triage Agent'.",
        diagnostic: {
          records: '22,000',
          status: 'Confirmed',
          metric: '$8.5M',
          metric_label: 'Off-Cycle Spend',
          percentage: '60%',
          finding: '22% of total spend value is pushed via manual emergency wire transfers, completely bypassing DPO strategy.',
        },
      },
      {
        code: 'H4.2',
        title: 'Suboptimal payment methods used',
        statement: 'Paying by wire/ACH instead of Virtual Card leaves rebate value.',
        tables: ['REGUH', 'LFB1'],
        root_cause: 'Procurement not pushing card acceptance.',
        agent: "Deploy a 'Payment Modality Agent'.",
        diagnostic: {
          records: '150,000',
          status: 'Confirmed',
          metric: '$120k',
          metric_label: 'Rebate Opportunity',
          percentage: '40%',
          finding: 'Very low Virtual Card adoption among mid-tail suppliers, missing out on standard 1.5% cash rebates.',
        },
      },
    ],
  },
];

const Diagnostics: React.FC = () => {
  const navigate = useNavigate();
  
  // Scoped state for toggles and models
  const [openCategories, setOpenCategories] = useState<Record<number, boolean>>({});
  const [openHypotheses, setOpenHypotheses] = useState<Record<string, boolean>>({});
  const [revealedDiagnostics, setRevealedDiagnostics] = useState<Record<string, boolean>>({});
  const [activeModalHypothesis, setActiveModalHypothesis] = useState<Hypothesis | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  const userRole = localStorage.getItem('userRole');

  if (userRole !== 'AP diagnostics') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[calc(100vh-4rem)]">
        <span className="material-symbols-outlined text-red-500 text-6xl mb-4">gpp_maybe</span>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500 max-w-sm mb-6">
          You must be logged in with the <strong>AP diagnostics</strong> role to view this workspace.
        </p>
        <button 
          onClick={() => navigate('/login')}
          className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl shadow-md shadow-primary/20 hover:bg-primary-dark transition-all"
        >
          Go to Login page
        </button>
      </div>
    );
  }

  const toggleCategory = (id: number) => {
    setOpenCategories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleHypothesis = (code: string) => {
    setOpenHypotheses((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const toggleDiagnosticReveal = (code: string) => {
    setRevealedDiagnostics((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const startAnalysis = (hypo: Hypothesis) => {
    setActiveModalHypothesis(hypo);
    setIsModalLoading(true);
    setTimeout(() => {
      setIsModalLoading(false);
    }, 1500);
  };

  const closeDiagnosticModal = () => {
    setActiveModalHypothesis(null);
  };

  return (
    <div id="diagnostics-root" className="min-h-full">
      {/* Dynamic injection of the exact styled tree design matching provided layout */}
      <style dangerouslySetInnerHTML={{ __html: `
        #diagnostics-root {
          --bg-color: #f8fafc;
          --text-main: #0f172a;
          --text-muted: #64748b;
          --border-color: #cbd5e1;
          --c1: #ef4444;
          --c2: #3b82f6;
          --c3: #eab308;
          --c4: #22c55e;
          --c5: #a855f7;
          --c6: #475569;
        }
        #diagnostics-root {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: var(--text-main);
          overflow-x: auto;
          position: relative;
        }
        #diagnostics-root .ai-badge {
          position: absolute;
          top: 24px;
          right: 24px;
          background: #1e293b;
          color: #f8fafc;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          border: 1px solid #334155;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        #diagnostics-root .ai-badge span { color: #34d399; }
        #diagnostics-root h1 { text-align: center; margin-bottom: 40px; color: var(--text-main); position: sticky; left: 0; }
        #diagnostics-root .tree-container { display: flex; align-items: center; justify-content: flex-start; min-width: max-content; padding: 20px; }
        #diagnostics-root .branch { display: flex; align-items: center; position: relative; }
        #diagnostics-root .children-wrapper { display: flex; flex-direction: column; justify-content: center; gap: 15px; position: relative; padding-left: 40px; margin-left: 20px; border-left: 2px solid var(--border-color); transition: all 0.3s ease; }
        #diagnostics-root .children-wrapper.hidden { display: none; }
        #diagnostics-root .children-wrapper .branch::before { content: ''; position: absolute; left: -40px; top: 50%; width: 40px; height: 2px; background: var(--border-color); transform: translateY(-50%); }
        #diagnostics-root .node.open::after { content: ''; position: absolute; right: -20px; top: 50%; width: 20px; height: 2px; background: var(--border-color); transform: translateY(-50%); z-index: 0; }
        #diagnostics-root .node { position: relative; background: white; border-radius: 8px; box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.05); z-index: 2; flex-shrink: 0; }
        #diagnostics-root .root-node { background: #1e293b; color: white; padding: 20px 30px; font-weight: bold; font-size: 1.2rem; text-align: center; border: 2px solid #0f172a; }
        #diagnostics-root .root-node::after { content: ''; position: absolute; right: -20px; top: 50%; width: 20px; height: 2px; background: var(--border-color); transform: translateY(-50%); }
        #diagnostics-root .clickable-node { cursor: pointer; border: 1px solid var(--border-color); transition: all 0.2s ease; display: flex; justify-content: space-between; align-items: center; }
        #diagnostics-root .clickable-node:hover { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-color: #94a3b8; }
        #diagnostics-root .indicator { background: #f1f5f9; color: var(--text-muted); border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-family: monospace; margin-left: 15px; transition: background 0.2s; }
        #diagnostics-root .clickable-node:hover .indicator { background: #e2e8f0; color: var(--text-main); }
        #diagnostics-root .category-node { padding: 15px 20px; width: 280px; border-left: 6px solid var(--color); }
        #diagnostics-root .category-node h3 { margin: 0 0 5px 0; font-size: 1rem; color: var(--text-main); font-weight: bold; }
        #diagnostics-root .category-node p { margin: 0; font-size: 0.8rem; color: var(--text-muted); }
        #diagnostics-root .hypothesis-node { padding: 12px 15px; width: 340px; font-size: 0.9rem; }
        #diagnostics-root .hypothesis-node strong { display: block; margin-bottom: 2px; font-weight: bold; }
        #diagnostics-root .detail-node { width: 450px; background: #ffffff; border: 1px solid #e2e8f0; padding: 20px; cursor: default; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        #diagnostics-root .detail-group { margin-bottom: 15px; }
        #diagnostics-root .detail-group:last-child { margin-bottom: 0; }
        #diagnostics-root .detail-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; margin-bottom: 5px; display: block; }
        #diagnostics-root .detail-value { font-size: 0.9rem; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #f1f5f9; line-height: 1.4; }
        #diagnostics-root .code-box { font-family: monospace; background: #1e293b; color: #34d399; padding: 10px; border-radius: 6px; font-size: 0.85rem; display: block; }
        #diagnostics-root .tag { display: inline-block; background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; margin-right: 5px; margin-bottom: 5px; font-family: monospace; color: #334155; }
        #diagnostics-root .root-cause-box { border-left: 4px solid #ef4444; background: #fef2f2; }

        /* Diagnostic Nodes */
        #diagnostics-root .sap-node { width: 380px; background: #fdf4ff; border: 2px dashed #d946ef; padding: 15px; cursor: pointer; display: block; }
        #diagnostics-root .sap-node:hover { background: #fae8ff; border-color: #c026d3; }
        #diagnostics-root .sap-status-tag { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; margin-top: 10px; background: #fdf2f8; color: #be185d; border: 1px solid #f472b6; }
        
        #sap-modal-overlay { display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(4px); z-index: 2000; justify-content: center; align-items: center; }
        .sap-modal { background: white; padding: 30px; border-radius: 12px; width: 550px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); position: relative; }
        .modal-loader { border: 4px solid #f3f3f3; border-top: 4px solid #d946ef; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 15px auto; }
        .impact-bar-bg { background: #e2e8f0; height: 12px; border-radius: 6px; width: 100%; margin-top: 5px; overflow: hidden; }
        .impact-bar-fill { background: #d946ef; height: 100%; border-radius: 6px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      ` }} />

      <div className="ai-badge select-none">
        ✨ <span>AI For Process</span> - Data Driven Discovery
      </div>

      <div className="p-8 max-w-full">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight text-center mb-8">
          Interactive DPO Optimization Tree
        </h1>

        <div className="tree-container overflow-x-auto pb-8">
          <div className="branch">
            <div className="node root-node">
              DPO OPTIMIZATION
              <br />
              <span className="text-xs font-normal opacity-80">(Drivers & Hypotheses)</span>
            </div>

            <div className="children-wrapper">
              {libraryData.map((cat) => {
                const isCatOpen = !!openCategories[cat.id];
                return (
                  <div key={cat.id} className="branch">
                    <div 
                      className={`node clickable-node category-node ${isCatOpen ? 'open' : ''}`}
                      style={{ '--color': cat.color } as React.CSSProperties}
                      onClick={() => toggleCategory(cat.id)}
                    >
                      <div>
                        <h3>{cat.title}</h3>
                        <p>{cat.theme}</p>
                      </div>
                      <div className="indicator">
                        {isCatOpen ? '−' : '+'}
                      </div>
                    </div>

                    <div className={`children-wrapper ${isCatOpen ? '' : 'hidden'}`}>
                      {cat.hypotheses.map((hypo) => {
                        const isHypoOpen = !!openHypotheses[hypo.code];
                        const isDiagRevealed = !!revealedDiagnostics[hypo.code];
                        return (
                          <div key={hypo.code} className="branch">
                            <div 
                              className={`node clickable-node hypothesis-node ${isHypoOpen ? 'open' : ''}`}
                              onClick={() => toggleHypothesis(hypo.code)}
                            >
                              <div>
                                <strong>{hypo.code}</strong>
                                {hypo.title}
                              </div>
                              <div className="indicator">
                                {isHypoOpen ? '−' : '+'}
                              </div>
                            </div>

                            <div className={`children-wrapper ${isHypoOpen ? '' : 'hidden'}`}>
                              <div className="branch">
                                <div className="node detail-node">
                                  <div className="detail-group">
                                    <span className="detail-label">Hypothesis Statement</span>
                                    <div className="detail-value">{hypo.statement}</div>
                                  </div>
                                  <div className="detail-group">
                                    <span className="detail-label">Required SAP Tables</span>
                                    <div>
                                      {hypo.tables.map((t) => (
                                        <span key={t} className="tag">{t}</span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="detail-group">
                                    <span className="detail-label">Likely Root Cause</span>
                                    <div className="detail-value root-cause-box">
                                      🔍 {hypo.root_cause}
                                    </div>
                                  </div>
                                  <div className="text-center mt-5 border-t border-dashed border-slate-200 pt-4">
                                    <button 
                                      onClick={() => toggleDiagnosticReveal(hypo.code)}
                                      className="bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 hover:border-purple-300 px-4 py-2 rounded-lg font-semibold cursor-pointer transition-all text-xs"
                                    >
                                      {isDiagRevealed ? 'Hide Data Diagnostic' : 'Run Data Diagnostic & Quantify Impact ↓'}
                                    </button>
                                  </div>
                                </div>

                                <div className={`children-wrapper ${isDiagRevealed ? '' : 'hidden'}`}>
                                  <div className="branch">
                                    <div 
                                      className="node clickable-node sap-node"
                                      onClick={() => startAnalysis(hypo)}
                                    >
                                      <span className="detail-label text-purple-600">Data Analysis Engine</span>
                                      <strong className="text-slate-900 block mb-1">
                                        Simulate Hypothesis Verification
                                      </strong>
                                      <p className="text-[10px] text-slate-500 m-0">
                                        Click to fetch SAP data, test hypothesis, and calculate magnitude of DPO contribution.
                                      </p>
                                      <div className="sap-status-tag">
                                        Tap to Extract & Analyze
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {activeModalHypothesis && (
        <div id="sap-modal-overlay" onClick={closeDiagnosticModal}>
          <div className="sap-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mt-0 pb-3 border-b border-slate-200 text-purple-600 mb-4">
              Diagnostic Data Analysis
            </h2>
            
            {isModalLoading ? (
              <div className="text-center py-8">
                <div className="modal-loader mb-4" />
                <p className="text-slate-600 font-bold text-lg">Querying SAP HANA Database...</p>
                <p className="text-xs text-slate-400 mt-1">
                  Extracting {activeModalHypothesis.diagnostic.records} records...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                    Hypothesis Analyzed
                  </span>
                  <h3 className="text-lg font-bold text-slate-950 mt-1">
                    {activeModalHypothesis.title}
                  </h3>
                </div>

                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                  <h4 className="m-0 text-xs text-slate-500 uppercase tracking-widest font-bold mb-3">
                    Magnitude of Contribution
                  </h4>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <span className="text-3xl font-black text-purple-600">
                        {activeModalHypothesis.diagnostic.metric}
                      </span>
                      <span className="text-slate-500 text-sm ml-2 font-medium">
                        {activeModalHypothesis.diagnostic.metric_label}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-900">
                        {activeModalHypothesis.diagnostic.percentage}
                      </span>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        of category
                      </div>
                    </div>
                  </div>
                  <div className="impact-bar-bg">
                    <div 
                      className="impact-bar-fill" 
                      style={{ width: activeModalHypothesis.diagnostic.percentage }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-lg border-l-4" style={{
                  backgroundColor: activeModalHypothesis.diagnostic.status === 'Confirmed' ? '#dcfce7' : '#fef3c7',
                  borderColor: activeModalHypothesis.diagnostic.status === 'Confirmed' ? '#166534' : '#b45309',
                }}>
                  <div className="flex justify-between items-center mb-2">
                    <strong style={{
                      color: activeModalHypothesis.diagnostic.status === 'Confirmed' ? '#166534' : '#b45309',
                      fontSize: '0.95rem'
                    }}>
                      Validation: {activeModalHypothesis.diagnostic.status}
                    </strong>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Rows: {activeModalHypothesis.diagnostic.records}
                    </span>
                  </div>
                  <p className="m-0 text-sm text-slate-800 leading-relaxed font-medium">
                    <strong>Analytical Finding:</strong> {activeModalHypothesis.diagnostic.finding}
                  </p>
                </div>

                <div className="bg-purple-50 p-4 border border-purple-100 rounded-lg">
                  <strong className="text-purple-700 text-xs uppercase tracking-wider block mb-1">
                    AI Agent Recommendation:
                  </strong>
                  <p className="m-0 text-sm text-purple-950 font-semibold leading-relaxed">
                    {activeModalHypothesis.agent}
                  </p>
                </div>
              </div>
            )}

            <div className="text-right mt-6 pt-4 border-t border-slate-100">
              <button 
                onClick={closeDiagnosticModal}
                className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-lg cursor-pointer hover:bg-slate-800 transition-all text-sm"
              >
                Close Analysis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Diagnostics;
