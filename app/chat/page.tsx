'use client';

import { useState, useRef, useEffect } from 'react';
import type { Message } from '@/lib/types';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const quickPrompts = [
    'Cuántos conductores hay disponibles?',
    'Dime sus nombres',
    'Qué vehículos están en mantenimiento?',
    'Qué rutas están activas?',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    setError(null);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory = nextMessages.slice(-12).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Send to NLP query endpoint (which will handle DB query via MCP)
      const response = await fetch('/api/db/nlp-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input, conversationHistory }),
      });

      if (!response.ok) {
        throw new Error('Failed to process your query');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.result || 'No data returned from the database',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);

      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendQuickPrompt = async (prompt: string) => {
    if (isLoading) return;
    setInput(prompt);
    setTimeout(() => {
      const form = document.getElementById('chat-form') as HTMLFormElement | null;
      form?.requestSubmit();
    }, 0);
  };

  return (
    <div className="min-h-screen px-4 py-4 md:px-8 md:py-6 flex items-center justify-center">
      <div className="mx-auto flex h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[2.5rem] glass-card md:h-[calc(100vh-3rem)]">
        <div className="flex items-center justify-between border-b border-black/5 px-6 py-5 md:px-8">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-neon-cyan shadow-[0_0_12px_rgba(6,182,212,0.5)] animate-pulse" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-black md:text-2xl">Query AI</h1>
              <p className="text-[10px] font-medium uppercase tracking-widest text-black/40">Powered by MCP</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setError(null);
              }}
              className="rounded-full bg-black/3 hover:bg-black/6 border border-black/5 px-4 py-2 text-xs font-semibold text-black/70 transition md:text-sm"
            >
              Reset
            </button>
            <a
              href="/"
              className="rounded-full bg-black text-white px-4 py-2 text-xs font-semibold transition hover:bg-black/80 md:text-sm"
            >
              Cerrar
            </a>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8 md:px-10 md:py-12">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center max-w-2xl mx-auto">
              <div className="mb-8 p-4 rounded-3xl bg-linear-to-br from-neon-cyan/10 to-neon-purple/10 border border-white/40 shadow-xl">
                 <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                    <span className="text-3xl">✨</span>
                 </div>
              </div>
              <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-black md:text-5xl">Tu base de datos, ahora es inteligente</h2>
              <p className="mb-10 text-base leading-relaxed text-black/60 md:text-lg">
                Consulta indicadores, estados y reportes en segundos. Solo escribe lo que necesitas saber.
              </p>
              <div className="grid w-full gap-3 sm:grid-cols-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendQuickPrompt(prompt)}
                    className="group relative overflow-hidden rounded-2xl border border-black/5 bg-white/50 p-4 text-left text-sm font-medium text-black/80 transition hover:border-neon-cyan/30 hover:bg-white active:scale-[0.98]"
                  >
                    <div className="absolute inset-0 bg-linear-to-r from-neon-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`relative max-w-[85%] rounded-[1.8rem] px-5 py-4 text-[15px] leading-relaxed shadow-sm transition-all md:max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-black text-white rounded-tr-none'
                        : message.content.startsWith('Error:')
                          ? 'bg-red-50/80 border border-red-100 text-red-900 rounded-tl-none'
                          : 'bg-white/80 border border-black/5 text-black rounded-tl-none backdrop-blur-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap font-medium">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start max-w-4xl mx-auto mt-6">
              <div className="rounded-[1.8rem] rounded-tl-none bg-white border border-black/5 px-6 py-4 shadow-sm">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-neon-cyan rounded-full animate-bounce" style={{ animationDuration: '1s' }}></div>
                  <div
                    className="w-2.5 h-2.5 bg-neon-purple rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s', animationDuration: '1s' }}
                  ></div>
                  <div
                    className="w-2.5 h-2.5 bg-neon-pink rounded-full animate-bounce"
                    style={{ animationDelay: '0.4s', animationDuration: '1s' }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="px-6 py-6 md:px-10 md:py-8 border-t border-black/5 bg-white/30 backdrop-blur-md">
          <form id="chat-form" onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3 relative group">
            <div className="absolute -inset-1 bg-linear-to-r from-neon-cyan to-neon-purple rounded-2xl blur opacity-10 group-focus-within:opacity-20 transition-opacity" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta algo sobre tu base de datos..."
              className="flex-1 relative rounded-2xl border border-black/10 bg-white px-6 py-4 text-[15px] text-black placeholder-black/30 transition shadow-inner focus:border-neon-cyan/50 focus:ring-4 focus:ring-neon-cyan/5 focus:outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="relative rounded-2xl bg-black px-8 py-4 text-sm font-bold text-white transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/10"
            >
              {isLoading ? '...' : 'Consultar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

