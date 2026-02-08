'use client';

import { useState, useRef, useEffect } from 'react';
import { chatAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'bot';
  text: string;
  time: string;
}

export default function ChatPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'bot', text: 'Hallo! Schreib mir etwas auf Deutsch und ich helfe dir mit Korrekturen und Erklaerungen. Los geht\'s! 😊', time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const now = () => new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text, time: now() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setSending(true);

    try {
      const data = await chatAPI.sendMessage(text);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: data.aiResponse || data.message || 'Hmm, ich habe keine Antwort erhalten.',
        time: now(),
      };
      setMessages((m) => [...m, botMsg]);

      if (data.xpAwarded) {
        const xpMsg: Message = {
          id: (Date.now() + 2).toString(),
          role: 'bot',
          text: `+${data.xpAwarded} XP ⭐`,
          time: now(),
        };
        setMessages((m) => [...m, xpMsg]);
      }
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { error?: string } } };
      if (error.response?.status === 429) {
        setLimitReached(true);
      }
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: error.response?.data?.error || 'Fehler beim Senden. Bitte versuche es erneut.',
        time: now(),
      };
      setMessages((m) => [...m, errMsg]);
    }

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 rounded-t-xl">
        <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-sm font-bold text-primary-700">DL</div>
        <div>
          <p className="font-semibold text-gray-800 text-sm">Deutschlehrer Chat</p>
          <p className="text-xs text-gray-500">Dein Level: {profile?.german_level || '—'}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
              msg.role === 'user'
                ? 'bg-primary-600 text-white rounded-br-md'
                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
            }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
              <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-primary-200' : 'text-gray-400'}`}>{msg.time}</p>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <span className="text-gray-400 text-sm">Schreibt...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Limit Banner */}
      {limitReached && profile?.subscription_tier !== 'premium' && (
        <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-3 text-center">
          <p className="text-sm text-yellow-800">Du hast dein Tageslimit erreicht.
            <Link href="/settings" className="text-primary-600 font-medium ml-1 hover:underline">Upgrade auf Premium</Link>
          </p>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 rounded-b-xl">
        <div className="flex items-end gap-2">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Schreib etwas auf Deutsch..." rows={1}
            className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
            disabled={sending} />
          <button onClick={send} disabled={sending || !input.trim()}
            className="bg-primary-600 hover:bg-primary-700 text-white p-2.5 rounded-xl disabled:bg-gray-300 transition flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
