// ─── Ask AI Orchestrator ──────────────────────────────────────────
// Runs the Gemini function-calling loop: send conversation → if Gemini
// requests a tool call, execute it locally and feed the result back →
// repeat until Gemini returns a final text answer.

import { GoogleGenAI, Content } from '@google/genai';
import {
  FUNCTION_DECLARATIONS,
  TOOL_IMPLEMENTATIONS,
  TOOL_LABELS,
  StoreSnapshot,
} from './askAiTools';

// ─── Public types ─────────────────────────────────────────────────

export interface ToolCallTrace {
  toolName: string;
  label: string;
  args: any;
}

export interface AskAiSuccess {
  ok: true;
  answer: string;
  toolCalls: ToolCallTrace[];
}

export interface AskAiError {
  ok: false;
  error: string;
  toolCalls: ToolCallTrace[];
}

export type AskAiResult = AskAiSuccess | AskAiError;

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

// ─── Hooks the drawer uses for live progress display ──────────────

export interface AskAiHooks {
  onToolCall?: (trace: ToolCallTrace) => void;
}

// ─── System prompt ────────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `You are the Enterprise AP IQ assistant — a data-aware helper embedded in an AI-native accounts payable platform.

Your job is to answer the user's questions about their invoice queue, vendors, exceptions, audit trail, and SLA status by calling the provided tools to look up real data — never by guessing or fabricating numbers.

Guidelines:
- ALWAYS call a tool when the user asks about specific data ("how many", "show me", "what's the status of", "tell me about vendor X"). Never make up numbers, vendor names, or exception counts.
- If a single tool call gives you everything you need, answer immediately.
- If a question needs multiple lookups, chain tools (e.g. first list_exceptions then find_invoices for the worst one).
- For drill-down questions like "why is X blocked?", call get_invoice_details with the invoice number or vendor name as the search key.
- Keep answers concise — typically 2-5 sentences plus a small table or bulleted list when listing items. Don't dump entire tool-result JSON. Summarize and surface the most relevant numbers.
- When listing invoices, show invoice_number + supplier + amount + exception/SLA — not full IDs.
- Format currency as $X,XXX or $X.XM. Round large numbers.
- If a tool returns zero results, say so plainly — don't speculate about what might be in another system.
- This is a read-only assistant. You cannot approve, reject, or modify invoices. If a user asks for an action, explain that they'll need to use the Approval Queue and offer to look up the relevant invoice for them.
- Today's date is implicit — work with the SLA labels the tools return (e.g. "5d overdue", "12d remaining").
- Stay professional and CFO-appropriate. No emojis.`;

// ─── Build a fresh conversation including the new user turn ──────

function buildContents(history: ChatTurn[], newUserMessage: string): Content[] {
  const contents: Content[] = [];
  for (const turn of history) {
    contents.push({
      role: turn.role === 'user' ? 'user' : 'model',
      parts: [{ text: turn.text }],
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: newUserMessage }],
  });
  return contents;
}

// ─── Main entry point ────────────────────────────────────────────

export async function askAi(
  userMessage: string,
  history: ChatTurn[],
  snapshot: StoreSnapshot,
  hooks?: AskAiHooks,
): Promise<AskAiResult> {
  if (!process.env.API_KEY) {
    return {
      ok: false,
      error: 'AI assistant unavailable: API key not configured in this environment.',
      toolCalls: [],
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const toolCallTrace: ToolCallTrace[] = [];

  // The conversation we'll keep extending as Gemini calls tools.
  // We start with the user's history + their new message.
  const contents: Content[] = buildContents(history, userMessage);

  const MAX_ITERATIONS = 6; // safety cap — should usually finish in 1-2
  let iteration = 0;

  try {
    while (iteration < MAX_ITERATIONS) {
      iteration++;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
        },
      });

      // Did Gemini ask to call a tool?
      const fnCalls = response.functionCalls;

      if (!fnCalls || fnCalls.length === 0) {
        // No function call → this is the final text answer
        const answer = (response.text || '').trim();
        if (!answer) {
          return {
            ok: false,
            error: 'AI returned an empty response. Please try rephrasing your question.',
            toolCalls: toolCallTrace,
          };
        }
        return { ok: true, answer, toolCalls: toolCallTrace };
      }

      // Gemini wants to call one or more tools.
      // Append the model's tool-call request to the conversation.
      const candidate = response.candidates?.[0];
      const modelParts = candidate?.content?.parts || [];
      contents.push({
        role: 'model',
        parts: modelParts,
      });

      // Execute each requested tool and collect responses.
      const functionResponseParts: any[] = [];
      for (const call of fnCalls) {
        const toolName = call.name || '';
        const args = (call.args || {}) as Record<string, any>;
        const label = TOOL_LABELS[toolName] || `Running ${toolName}`;

        const trace: ToolCallTrace = { toolName, label, args };
        toolCallTrace.push(trace);
        hooks?.onToolCall?.(trace);

        const impl = TOOL_IMPLEMENTATIONS[toolName];
        let result: any;
        if (!impl) {
          result = { error: `Unknown tool: ${toolName}` };
        } else {
          try {
            result = impl(args, snapshot);
          } catch (e: any) {
            result = { error: `Tool execution error: ${e.message || e}` };
          }
        }

        functionResponseParts.push({
          functionResponse: {
            name: toolName,
            response: { result },
          },
        });
      }

      // Feed the tool responses back to Gemini for the next iteration.
      contents.push({
        role: 'user',
        parts: functionResponseParts,
      });
    }

    return {
      ok: false,
      error: `AI exceeded ${MAX_ITERATIONS} tool-call iterations without producing an answer. Try a more specific question.`,
      toolCalls: toolCallTrace,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e.message || 'Unknown error from Gemini.',
      toolCalls: toolCallTrace,
    };
  }
}
