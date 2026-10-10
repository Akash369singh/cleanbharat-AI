import React, { useState } from 'react';
import { api } from '../api/client';
import { Sparkles, X, Send, Bot, User as UserIcon, ShieldCheck } from 'lucide-react';

interface AssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  mode?: string;
}

export const AssistantModal: React.FC<AssistantModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: "Namaste! I am SmartRoute AI's local operational intelligence assistant. Ask me about ticket counts, SLA delays, urgent priority issues, or why a specific report scored the way it did.",
      mode: 'deterministic_local_rules'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const q = queryText || input;
    if (!q.trim() || loading) return;

    const userMsg: Message = { sender: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.askAssistant(q);
      const assistantMsg: Message = {
        sender: 'assistant',
        text: res.answer,
        mode: res.mode
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: `Query error: ${err.message || 'Unable to connect to assistant service.'}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'How many reports are pending or resolved?',
    'Show top priority urgent reports',
    'Which reports are overdue on SLA?',
    'Explain priority score for CB-1001',
    'Ward summary'
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-left">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col h-[560px] overflow-hidden text-xs">
        {/* Header */}
        <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Clean Bharat Operational Assistant</h3>
              <div className="flex items-center space-x-1.5 text-[10px] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Deterministic Database Intent Parser Active</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Prompts Bar */}
        <div className="p-2 bg-slate-50 border-b border-slate-200 overflow-x-auto flex space-x-1.5">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              disabled={loading}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 whitespace-nowrap text-[11px] font-medium transition"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
          {messages.map((m, idx) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={idx}
                className={`flex items-start space-x-2 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                    isUser ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isUser ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div
                  className={`max-w-[80%] p-3 rounded-xl whitespace-pre-wrap leading-relaxed ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200 shadow-xs rounded-tl-none'
                  }`}
                >
                  {m.text}
                  {m.mode && (
                    <div className="mt-1 text-[10px] text-slate-400 font-mono border-t border-slate-100 pt-1">
                      Mode: {m.mode}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="text-slate-400 italic text-[11px] flex items-center gap-1.5 pl-8">
              <span>Querying database intents...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask: 'Show top priority reports' or 'Explain score for CB-1001'..."
            className="flex-1 p-2.5 border border-slate-300 rounded-lg text-xs outline-none focus:border-emerald-600"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="p-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
