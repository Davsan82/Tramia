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
            text: `¡Hola! Soy TramIA Bot, tu asistente inteligente de soporte. Estoy aquí junto a tu asesor asignado, el ${advisorName}, para ayudarte con cualquier duda que tengas sobre tu trámite delegado de "${procedure.title}".\n\n¿En qué te puedo asesorar hoy?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }, 1000);
    }
  }, [isOpen, messages.length, procedure.title, advisorName]);

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
      const pct = Math.round((approvedCount / totalCount) * 100);

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
    { label: 'Hablar con Dr. Rodrigo', query: 'Quiero hablar con el asesor Rodrigo' }
  ];

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 w-full sm:w-[420px] h-full sm:h-[600px] bg-white border border-gray-200 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scaleIn" id="tramia-bot-window">
      
      {/* Bot Header */}
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800" id="tramia-bot-header">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-semibold text-white">
              <Sparkles size={18} className="animate-pulse" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-ping" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-extrabold text-sm tracking-tight text-white">TramIA Bot</h4>
              <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider font-mono">Copiloto</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Asesoría de soporte activo • {advisorName}</p>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Cerrar chat"
        >
          <X size={18} />
        </button>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" id="tramia-bot-messages">
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
            >
              {isBot && (
                <div className="w-8 h-8 rounded-lg bg-slate-850 text-white flex items-center justify-center text-xs font-bold font-mono shrink-0 shadow-sm border border-slate-700/50">
                  IA
                </div>
              )}
              <div className="space-y-1">
                <div
                  className={`rounded-2xl p-3.5 text-xs font-medium leading-relaxed shadow-sm whitespace-pre-wrap ${
                    isBot
                      ? 'bg-white text-slate-800 rounded-tl-none border border-gray-150'
                      : 'bg-blue-600 text-white rounded-tr-none'
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
            <div className="w-8 h-8 rounded-lg bg-slate-850 text-white flex items-center justify-center text-xs font-bold font-mono shrink-0 shadow-sm border border-slate-700/50">
              IA
            </div>
            <div className="space-y-1">
              <div className="bg-white text-slate-800 rounded-2xl rounded-tl-none p-3.5 border border-gray-150 flex items-center gap-1">
                <span className="text-[11px] font-semibold text-slate-500 italic mr-1">TramIA Bot está escribiendo</span>
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
        <div className="p-3 bg-white border-t border-gray-100 flex gap-2 overflow-x-auto scrollbar-none shrink-0" id="tramia-bot-suggestions">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q.query)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold rounded-full text-[10px] whitespace-nowrap transition-all border border-gray-200/60 cursor-pointer hover:scale-[1.01]"
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputValue);
        }}
        className="p-3.5 bg-white border-t border-gray-150 flex gap-2 items-center"
        id="tramia-bot-form"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Escribe tu duda sobre el trámite aquí..."
          className="flex-1 bg-slate-100 text-slate-900 placeholder:text-gray-400 font-bold text-xs px-3 py-2.5 rounded-xl border-0 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
          disabled={isTyping}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isTyping}
          className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
          aria-label="Enviar duda"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
