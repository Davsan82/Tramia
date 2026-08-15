import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, LoaderCircle, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { Procedure, Requirement } from '../types';

interface TramIABotProps {
  procedure: Procedure;
  requirements: Requirement[];
  isPaid: boolean;
  advisorName?: string;
  userProcedureId?: string;
  isOpen: boolean;
  onClose: () => void;
}

type Message = { id: string; role: 'assistant' | 'user'; content: string; createdAt: string };

const DEFAULT_SUGGESTIONS = ['¿Cuáles son los requisitos?', '¿Cuánto tiempo demora?', '¿Cuánto cuesta este trámite?'];

function visitorKey() {
  const storageKey = 'tramia_bot_visitor_key';
  let value = localStorage.getItem(storageKey);
  if (!value) { value = crypto.randomUUID(); localStorage.setItem(storageKey, value); }
  return value;
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export default function TramIABot({ procedure, requirements: _requirements, isPaid, advisorName = 'Copiloto de orientación', userProcedureId, isOpen, onClose }: TramIABotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);
  const [inputValue, setInputValue] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextKey = useMemo(() => `tramia_bot_conversation_${userProcedureId || procedure.id}`, [procedure.id, userProcedureId]);
  const hasAssignedAdvisor = isPaid && Boolean(advisorName) && !advisorName.toLowerCase().includes('copiloto');
  const welcome: Message = useMemo(() => ({
    id: 'welcome', role: 'assistant', createdAt: new Date().toISOString(),
    content: hasAssignedAdvisor
      ? `¡Hola! Soy TramIA Bot. Te acompaño junto a ${advisorName} y puedo orientarte sobre el estado y los siguientes pasos de “${procedure.title}”. ¿Qué necesitas revisar?`
      : `¡Hola! Soy TramIA Bot, tu copiloto para “${procedure.title}”. Puedo orientarte sobre requisitos, costos, duración, asesores y otros trámites disponibles en TramIA. ¿Qué te gustaría conocer?`,
  }), [advisorName, hasAssignedAdvisor, procedure.title]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const conversationId = localStorage.getItem(contextKey);
    if (!conversationId) { setMessages([welcome]); setSuggestions(DEFAULT_SUGGESTIONS); return; }
    setIsLoadingHistory(true);
    fetch(`/api/v1/ai/chat/${encodeURIComponent(conversationId)}`, {
      credentials: 'include',
      headers: { 'X-TramIA-Visitor': visitorKey() },
    })
      .then(async (response) => { const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(); return payload; })
      .then((payload) => { if (!cancelled) { const history = (payload.messages || []) as Message[]; setMessages(history.length ? [welcome, ...history] : [welcome]); } })
      .catch(() => { localStorage.removeItem(contextKey); if (!cancelled) setMessages([welcome]); })
      .finally(() => { if (!cancelled) setIsLoadingHistory(false); });
    return () => { cancelled = true; };
  }, [contextKey, isOpen, welcome]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const startNewConversation = () => { localStorage.removeItem(contextKey); setMessages([welcome]); setSuggestions(DEFAULT_SUGGESTIONS); setError(''); };

  const handleSendMessage = async (textToSend: string) => {
    const cleanText = textToSend.trim();
    if (!cleanText || isTyping) return;
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', content: cleanText, createdAt: new Date().toISOString() }]);
    setInputValue(''); setError(''); setIsTyping(true);
    try {
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ conversationId: localStorage.getItem(contextKey), visitorKey: visitorKey(), procedureSlug: procedure.id, userProcedureId: userProcedureId || undefined, message: cleanText }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'TramIA Bot no pudo responder.');
      localStorage.setItem(contextKey, payload.conversationId);
      setMessages((current) => [...current, payload.message as Message]);
      setSuggestions(payload.suggestions?.length ? payload.suggestions : DEFAULT_SUGGESTIONS);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'TramIA Bot no pudo responder.'); }
    finally { setIsTyping(false); }
  };

  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex h-full w-full flex-col overflow-hidden border-blue-100 bg-white shadow-2xl animate-scaleIn sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(720px,calc(100dvh-2.5rem))] sm:w-[460px] sm:rounded-[2rem] sm:border" role="dialog" aria-modal="true" aria-label="Chat con TramIA Bot">
    <header className="relative overflow-hidden bg-[linear-gradient(125deg,#071a3d_0%,#0d4fc4_64%,#13b5d1_130%)] px-5 py-4 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:20px_20px]" />
      <div className="relative flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3">
        <div className="relative grid size-14 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10"><img src="/assets/mascot/tramia-bot-contact.png" alt="TramIA Bot" className="h-16 w-16 object-contain drop-shadow-lg" /><span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-blue-800 bg-emerald-400" /></div>
        <div className="min-w-0"><div className="flex items-center gap-2"><h4 className="text-base font-black">TramIA Bot</h4><span className="rounded-full bg-cyan-200/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-cyan-100">Copiloto IA</span></div><p className="mt-0.5 text-[11px] font-semibold text-blue-100">En línea · Orientación sobre trámites</p><p className="mt-1 truncate text-[10px] text-cyan-100/80">{procedure.title}</p></div>
      </div><div className="flex gap-1.5"><button onClick={startNewConversation} className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/10 text-white/80 hover:bg-white/20" aria-label="Iniciar una conversación nueva"><RotateCcw size={17} /></button><button onClick={onClose} className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/10 text-white/80 hover:bg-white/20" aria-label="Cerrar chat"><X size={18} /></button></div></div>
    </header>
    <div className="flex-1 space-y-5 overflow-y-auto bg-[linear-gradient(180deg,#f7fbff,#f8fafc)] p-4 sm:p-5" aria-live="polite">
      {isLoadingHistory && <div className="flex items-center justify-center gap-2 py-8 text-xs font-bold text-slate-500"><LoaderCircle className="animate-spin" size={17} /> Recuperando tu conversación…</div>}
      {!isLoadingHistory && messages.map((message) => { const isBot = message.role === 'assistant'; return <div key={message.id} className={`flex max-w-[88%] items-start gap-2.5 ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>{isBot && <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm"><img src="/assets/mascot/tramia-bot-guiding.png" alt="" className="h-10 w-10 object-contain" /></div>}<div className="space-y-1"><div className={`whitespace-pre-wrap rounded-2xl p-3.5 text-xs font-medium leading-relaxed shadow-sm ${isBot ? 'rounded-tl-md border border-blue-100 bg-white text-slate-700' : 'rounded-tr-md bg-[linear-gradient(135deg,#2563eb,#0d4fc4)] text-white'}`}>{message.content}</div><p className={`font-mono text-[9px] text-slate-400 ${isBot ? 'text-left' : 'text-right'}`}>{timeLabel(message.createdAt)}</p></div></div>; })}
      {isTyping && <div className="flex max-w-[88%] items-start gap-2.5"><div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-blue-100 bg-white"><img src="/assets/mascot/tramia-bot-guiding.png" alt="" className="h-10 w-10 object-contain" /></div><div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-blue-100 bg-white p-3.5 text-[11px] font-semibold text-slate-500"><LoaderCircle className="animate-spin text-blue-600" size={15} /> TramIA está revisando la información…</div></div>}
      {error && <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800"><AlertCircle className="mt-0.5 shrink-0" size={16} />{error}</div>}<div ref={messagesEndRef} />
    </div>
    {!isTyping && !isLoadingHistory && <div className="shrink-0 border-t border-blue-50 bg-white px-4 py-3"><p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.12em] text-blue-600"><Sparkles size={13} /> Preguntas rápidas</p><div className="flex gap-2 overflow-x-auto pb-1">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => void handleSendMessage(suggestion)} className="min-h-9 whitespace-nowrap rounded-full border border-blue-100 bg-blue-50 px-3 text-[10px] font-black text-blue-800 hover:bg-blue-100">{suggestion}</button>)}</div></div>}
    <form onSubmit={(event) => { event.preventDefault(); void handleSendMessage(inputValue); }} className="flex items-center gap-2 border-t border-blue-100 bg-white p-3.5 sm:p-4"><input type="text" maxLength={1000} value={inputValue} onChange={(event) => setInputValue(event.target.value)} placeholder="Escribe tu consulta sobre trámites…" className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100" disabled={isTyping || isLoadingHistory} /><button type="submit" disabled={!inputValue.trim() || isTyping || isLoadingHistory} className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none" aria-label="Enviar consulta"><Send size={18} /></button></form>
  </div>;
}
