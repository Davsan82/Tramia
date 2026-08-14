import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, User, HelpCircle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Procedure, Requirement } from '../types';

interface TramIABotProps {
  procedure: Procedure;
  requirements: Requirement[];
  isPaid: boolean;
  advisorName?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
}

export default function TramIABot({
  procedure,
  requirements,
  isPaid,
  advisorName = "Dr. Rodrigo Peralta",
  isOpen,
  onClose
}: TramIABotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasAssignedAdvisor = isPaid && Boolean(advisorName) && !advisorName.toLowerCase().includes('copiloto');

  // Initialize with greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages([
          {
            id: 'welcome',
            sender: 'bot',
            text: hasAssignedAdvisor
              ? `¡Hola! Soy TramIA Bot. Te acompaño junto a ${advisorName} para resolver dudas sobre "${procedure.title}" y ayudarte a identificar tu siguiente paso.\n\n¿Qué necesitas revisar hoy?`
              : `¡Hola! Soy TramIA Bot, tu copiloto para "${procedure.title}". Puedo orientarte sobre requisitos, duración, costos y cada paso antes de que empieces.\n\n¿Qué te gustaría conocer?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }, 1000);
    }
  }, [isOpen, messages.length, procedure.title, advisorName, hasAssignedAdvisor]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate smart agent response based on keywords
    setTimeout(() => {
      setIsTyping(false);
      let replyText = "";
      const textLower = textToSend.toLowerCase();

      const approvedCount = requirements.filter(r => r.status === 'Aprobado').length;
      const totalCount = requirements.length;
      const pct = totalCount ? Math.round((approvedCount / totalCount) * 100) : 0;

      if (textLower.includes('hola') || textLower.includes('buen') || textLower.includes('saludo')) {
        replyText = `¡Hola! Un gusto saludarte. Cuéntame, ¿tienes alguna pregunta sobre los requisitos o el proceso de delegación para "${procedure.title}"?`;
      } else if (textLower.includes('estado') || textLower.includes('progreso') || textLower.includes('cómo va') || textLower.includes('como va') || textLower.includes('avance')) {
        replyText = `Actualmente tu trámite de "${procedure.title}" se encuentra en el siguiente estado:\n\n` +
          `• **Documentos aprobados:** ${approvedCount} de ${totalCount} (${pct}%).\n` +
          `• **Estado de pago:** ${isPaid ? 'Completado ✓' : 'Pendiente de pago ⏳'}.\n\n` +
          `${isPaid 
            ? `Tu asesor ${advisorName} ya cuenta con el expediente completo y validado para su presentación oficial.` 
            : `Una vez que todos los documentos estén aprobados y realices el pago de la tasa, ${advisorName} procederá de inmediato.`}`;
      } else if (textLower.includes('requisito') || textLower.includes('documento') || textLower.includes('foto') || textLower.includes('dni') || textLower.includes('firma')) {
        const reqList = requirements.map(r => `• **${r.name}**: ${r.status}`).join('\n');
        replyText = `Estos son los requisitos obligatorios para "${procedure.title}" y su estado actual de validación:\n\n${reqList}\n\nRecuerda que todos deben ser aprobados por nuestro validador inteligente para poder continuar.`;
      } else if (textLower.includes('tiempo') || textLower.includes('demora') || textLower.includes('días') || textLower.includes('tarda') || textLower.includes('plazo')) {
        replyText = `El trámite de "${procedure.title}" tiene un tiempo estimado de resolución de **${procedure.estimatedDuration || procedure.duration || '5 días hábiles'}**.\n\nAl delegarlo a TramIA, ${advisorName} agiliza la presentación digital directa ante la mesa de partes para evitar demoras burocráticas ordinarias.`;
      } else if (textLower.includes('pago') || textLower.includes('precio') || textLower.includes('costo') || textLower.includes('tarifa') || textLower.includes('tasa') || textLower.includes('cuanto cuesta') || textLower.includes('cuánto cuesta') || textLower.includes('soles') || textLower.includes('s/.')) {
        replyText = `La tarifa única de delegación para "${procedure.title}" es de **${procedure.feeAmount || 'S/. 65.00'}**.\n\nEste monto cubre los honorarios del asesor ${advisorName}, las revisiones notariales, tasas de envío digital y el soporte continuo hasta la resolución de tu caso. El pago se realiza a través de nuestra pasarela segura cifrada.`;
      } else if (textLower.includes('rodrigo') || textLower.includes('asesor') || textLower.includes('humano') || textLower.includes('persona')) {
        replyText = `¡Claro! El ${advisorName} está supervisando directamente tu expediente. \n\nMe comenta que ya está listo para procesar tu caso en cuanto se completen las validaciones automáticas. Si deseas dejarle una nota específica, puedes escribirla por aquí y él la revisará personalmente en su panel de gestor.`;
      } else if (textLower.includes('gracias') || textLower.includes('buenisimo') || textLower.includes('buenísimo') || textLower.includes('ok') || textLower.includes('perfecto')) {
        replyText = `¡De nada! Es un placer ayudarte. Recuerda que TramIA Bot está activo las 24 horas para resolver cualquier duda sobre tu trámite. ¡Muchos éxitos en tu gestión!`;
      } else {
        replyText = `Entiendo tu consulta sobre tu trámite de "${procedure.title}". En base a ello, te confirmo que el ${advisorName} revisará esta anotación.\n\nComo pauta general, recuerda que puedes seguir subiendo los requisitos solicitados para que nuestro validador inteligente los apruebe. ¿Hay algún requisito en específico con el que tengas dificultades?`;
      }

      const botMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'bot',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    }, 1500);
  };

  if (!isOpen) return null;

  const quickQuestions = [
    { label: '¿Cómo va mi trámite?', query: '¿Cómo va mi progreso?' },
    { label: '¿Cuánto tiempo demora?', query: '¿Cuánto tiempo demora el trámite?' },
    { label: '¿Cuáles son los requisitos?', query: '¿Cuáles son los requisitos del trámite?' },
    { label: 'Consultar tarifa del trámite', query: '¿Cuánto cuesta este trámite delegado?' },
    hasAssignedAdvisor
      ? { label: `Hablar con ${advisorName}`, query: `Quiero hablar con mi asesor ${advisorName}` }
      : { label: '¿Cuándo necesito un asesor?', query: '¿En qué momento me conviene elegir un asesor?' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex h-full w-full flex-col overflow-hidden border-blue-100 bg-white shadow-2xl animate-scaleIn sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(720px,calc(100dvh-2.5rem))] sm:w-[460px] sm:rounded-[2rem] sm:border" id="tramia-bot-window" role="dialog" aria-modal="true" aria-label="Chat con TramIA Bot">
      
      {/* Bot Header */}
      <div className="relative overflow-hidden bg-[linear-gradient(125deg,#071a3d_0%,#0d4fc4_64%,#13b5d1_130%)] px-5 py-4 text-white" id="tramia-bot-header">
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative grid size-14 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/12">
              <img src="/assets/mascot/tramia-bot-contact.png" alt="TramIA Bot" className="h-16 w-16 object-contain drop-shadow-lg" />
              <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-blue-800 bg-emerald-400" />
            </div>
            <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-base font-black tracking-tight text-white">TramIA Bot</h4>
              <span className="rounded-full border border-cyan-200/30 bg-cyan-200/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-cyan-100">Copiloto</span>
            </div>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-blue-100">En línea · Orientación sobre tu trámite</p>
            <p className="mt-1 truncate text-[10px] text-cyan-100/80">{procedure.title}</p>
            </div>
          </div>
          <button
          onClick={onClose}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
          aria-label="Cerrar chat"
        >
          <X size={18} />
        </button>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 space-y-5 overflow-y-auto bg-[linear-gradient(180deg,#f7fbff,#f8fafc)] p-4 sm:p-5" id="tramia-bot-messages" aria-live="polite">
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
            >
              {isBot && (
                <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
                  <img src="/assets/mascot/tramia-bot-guiding.png" alt="" className="h-10 w-10 object-contain" />
                </div>
              )}
              <div className="space-y-1">
                <div
                  className={`rounded-2xl p-3.5 text-xs font-medium leading-relaxed shadow-sm whitespace-pre-wrap ${
                    isBot
                      ? 'rounded-tl-md border border-blue-100 bg-white text-slate-700 shadow-[0_8px_25px_-18px_rgba(15,50,100,.45)]'
                      : 'rounded-tr-md bg-[linear-gradient(135deg,#2563eb,#0d4fc4)] text-white shadow-lg shadow-blue-700/10'
                  }`}
                >
                  {msg.text}
                </div>
                <p className={`text-[9px] text-gray-400 font-mono ${isBot ? 'text-left' : 'text-right'}`}>
                  {msg.timestamp}
                </p>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-start gap-2.5 mr-auto max-w-[85%]">
            <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm">
              <img src="/assets/mascot/tramia-bot-guiding.png" alt="" className="h-10 w-10 object-contain" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-blue-100 bg-white p-3.5 text-slate-800 shadow-sm">
                <span className="mr-1 text-[11px] font-semibold text-slate-500">TramIA está preparando una respuesta</span>
                <span className="w-1.5 h-1.5 bg-slate-450 rounded-full animate-bounce delay-0" />
                <span className="w-1.5 h-1.5 bg-slate-450 rounded-full animate-bounce delay-150" />
                <span className="w-1.5 h-1.5 bg-slate-450 rounded-full animate-bounce delay-300" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions Chips */}
      {messages.length > 0 && !isTyping && (
        <div className="shrink-0 border-t border-blue-50 bg-white px-4 py-3" id="tramia-bot-suggestions">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.12em] text-blue-600"><Sparkles size={13}/> Preguntas rápidas</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">{quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q.query)}
              className="min-h-9 whitespace-nowrap rounded-full border border-blue-100 bg-blue-50 px-3 text-[10px] font-black text-blue-800 transition hover:border-blue-300 hover:bg-blue-100"
            >
              {q.label}
            </button>
          ))}</div>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputValue);
        }}
        className="flex items-center gap-2 border-t border-blue-100 bg-white p-3.5 sm:p-4"
        id="tramia-bot-form"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Escribe tu duda sobre el trámite aquí..."
          className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100"
          disabled={isTyping}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isTyping}
          className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
          aria-label="Enviar duda"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
