
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { askAi, ChatTurn, ToolCallTrace } from '../lib/askAi';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DisplayMessage {
  role: 'user' | 'assistant';
  text: string;
  toolCalls?: ToolCallTrace[];   // tools that were called while producing THIS assistant message
  isError?: boolean;
}

const GREETING: DisplayMessage = {
  role: 'assistant',
  text:
    "Hi — I'm your AP IQ assistant. I can answer questions about your invoice queue, " +
    "vendors, exceptions, SLA status, and audit trail by looking up real data from this " +
    "session. Try: \"how many invoices are overdue?\", \"which vendors are blocked?\", " +
    'or "tell me about the Schneider invoice".',
};

// Example prompts the user can tap when the drawer first opens.
const SUGGESTED_PROMPTS = [
  'How many invoices are overdue?',
  'Show me everything blocked',
  "What's our touchless rate?",
  'Why is Schneider blocked?',
];

const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({ isOpen, onClose }) => {
  const store = useStore();

  const [messages, setMessages] = useState<DisplayMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Live tool-call indicators while a query is in flight
  const [liveTools, setLiveTools] = useState<ToolCallTrace[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, liveTools]);

  // Build the snapshot once per send — it's read-only so this is safe
  const snapshot = useMemo(
    () => ({
      invoices: store.invoices,
      vendors: store.vendors,
      purchaseOrders: store.purchaseOrders,
      goodsReceipts: store.goodsReceipts,
      auditLog: store.auditLog,
      matchedInvoices: store.matchedInvoices,
      matchedById: store.matchedById,
    }),
    [store.invoices, store.vendors, store.purchaseOrders, store.goodsReceipts, store.auditLog, store.matchedInvoices, store.matchedById]
  );

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    // Build conversation history from existing messages (skip the greeting)
    const history: ChatTurn[] = messages
      .filter((m, i) => i > 0 && !m.isError)  // greeting and errors don't go to model
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setIsLoading(true);
    setLiveTools([]);

    const result = await askAi(text, history, snapshot, {
      onToolCall: (trace) => {
        setLiveTools((prev) => [...prev, trace]);
      },
    });

    setIsLoading(false);
    setLiveTools([]);

    if (result.ok === true) {
      const answer = result.answer;
      const toolCalls = result.toolCalls;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: answer, toolCalls },
      ]);
    } else {
      // Narrow explicitly — the discriminated union sometimes loses narrowing across React state setters
      const errorText = (result as { ok: false; error: string }).error;
      const toolCalls = result.toolCalls;
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: errorText,
          toolCalls,
          isError: true,
        },
      ]);
    }
  };

  const handleReset = () => {
    setMessages([GREETING]);
    setInput('');
    setLiveTools([]);
  };

  // Render a small "called X tool(s)" affordance under assistant messages
  const renderToolTrace = (toolCalls?: ToolCallTrace[]) => {
    if (!toolCalls || toolCalls.length === 0) return null;
    return (
      <div className="mt-2 pt-2 border-t border-slate-200/70 flex flex-wrap gap-1">
        {toolCalls.map((tc, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded"
            title={JSON.stringify(tc.args)}
          >
            <span className="material-symbols-outlined text-[10px]">database</span>
            {tc.label}
          </span>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[440px] bg-white shadow-2xl z-50 transform transition-transform duration-500 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-primary text-white rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined">smart_toy</span>
              </div>
              <div>
                <h3 className="font-black text-slate-900 leading-tight">Ask AI</h3>
                <div className="flex items-center gap-1">
                  <span className="size-1.5 bg-green-500 rounded-full"></span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Data-aware · read-only
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                title="Clear conversation"
                className="p-2 hover:bg-white rounded-lg text-slate-400 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">restart_alt</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white rounded-lg text-slate-400 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-none shadow-lg'
                      : m.isError
                      ? 'bg-rose-50 text-rose-800 rounded-tl-none border border-rose-200'
                      : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                  }`}
                >
                  {m.text}
                  {m.role === 'assistant' && renderToolTrace(m.toolCalls)}
                </div>
              </div>
            ))}

            {/* Loading indicator with live tool calls */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none border border-slate-200 min-w-[200px]">
                  {liveTools.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <div className="flex gap-1">
                        <div className="size-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="size-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="size-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                      <span>Thinking…</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {liveTools.map((tc, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-slate-600">
                          <span className="material-symbols-outlined text-[14px] text-violet-500 animate-pulse">
                            database
                          </span>
                          <span className="font-medium">{tc.label}…</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Suggested prompts shown only when the chat is fresh */}
            {messages.length === 1 && !isLoading && (
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Try one of these
                </p>
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleSend(p)}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-5 border-t border-slate-100">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isLoading}
                placeholder={isLoading ? 'Waiting for response…' : 'Ask about your queue, vendors, or SLA…'}
                className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 size-8 bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary-hover disabled:opacity-30 transition-all shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined text-lg">send</span>
              </button>
            </div>
            <p className="mt-3 text-[10px] text-center text-slate-400 font-medium">
              Powered by Gemini · queries live store data · cannot modify invoices
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIAssistantDrawer;
