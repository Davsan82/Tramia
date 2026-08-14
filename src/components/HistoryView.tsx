import React from 'react';
import { History, Calendar, FileDown, AlertTriangle, Sparkles, AlertCircle, ArrowRight, Eye, CheckCircle2 } from 'lucide-react';
import { HistoryRecord, ExpirationReminder, Procedure, ActiveProcedure } from '../types';
import { alertTramia } from './TramiaDialog';

interface HistoryViewProps {
  history: HistoryRecord[];
  activeCompletedProcedures?: ActiveProcedure[];
  reminders: ExpirationReminder[];
  onTriggerReminderRenew: (type: 'DNI' | 'SOAT' | 'Licencia' | 'Pasaporte') => void;
  onSelectProcedure: (proc: Procedure) => void;
  onSelectProcedureById?: (procedureId: string) => void;
  procedures: Procedure[];
}

export default function HistoryView({
  history,
  activeCompletedProcedures = [],
  reminders,
  onTriggerReminderRenew,
  onSelectProcedure,
  onSelectProcedureById,
  procedures
}: HistoryViewProps) {
  
  // Custom helper to quickly open renewal procedure via reminder click
  const handleReminderClick = (type: string) => {
    if (type === 'DNI') {
      const Proc = procedures.find(p => p.id === 'renovar-dni');
      if (Proc) onSelectProcedure(Proc);
    } else if (type === 'Licencia') {
      const Proc = procedures.find(p => p.id === 'licencia-conducir');
      if (Proc) onSelectProcedure(Proc);
    } else if (type === 'Pasaporte') {
      const Proc = procedures.find(p => p.id === 'sacar-pasaporte');
      if (Proc) onSelectProcedure(Proc);
    } else {
      // General feedback
      onTriggerReminderRenew('SOAT');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      
      {/* SECTION 1: CRITICAL EXPIRATION WARNINGS & NOTIFICATIONS */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="text-amber-500 animate-pulse" size={20} />
            Alertas de vencimiento y renovación
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            TramIA monitorea de forma proactiva tus documentos peruanos para prevenir multas en notarías, bancos y aeropuertos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reminders.map((rem) => (
            <div
              key={rem.id}
              onClick={() => handleReminderClick(rem.type)}
              id={`expiration-alert-${rem.id}`}
              className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 hover:shadow-md ${
                rem.critical
                  ? 'bg-amber-50/45 border-amber-200 hover:border-amber-400'
                  : 'bg-white border-gray-200 hover:border-blue-400'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl h-fit ${
                  rem.critical ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-700'
                }`}>
                  <AlertTriangle size={18} />
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm text-slate-900 leading-none">{rem.title}</h3>
                    {rem.critical && (
                      <span className="bg-red-100 text-red-700 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase font-mono">
                        Urgente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{rem.subtitle}</p>
                </div>
              </div>

              {/* Action row */}
              <div className="pt-3 border-t border-gray-150/60 flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-500">
                  <Calendar size={13} />
                  <span>Vence: {rem.expirationDate} ({rem.daysRemaining} días)</span>
                </div>

                <span className="text-blue-600 flex items-center gap-0.5 group hover:translate-x-0.5 transition-transform text-[11px] font-bold">
                  Renovar con IA →
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 2: HISTORY OF COMPLETED TRÁMITES AND SECURE DOC STORAGE */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <History className="text-blue-600" size={20} />
            Historial de trámites completados
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Revisa las constancias aprobadas por RENIEC, SUNARP y ministerios de tus trámites pasados. Todo cifrado de forma segura.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs divide-y divide-gray-100" id="completed-history-list">
          {/* Active Completed Procedures (100% finished from user interactions) */}
          {activeCompletedProcedures.map((proc) => (
            <div
              key={proc.id}
              id={`history-active-${proc.id}`}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/20 hover:bg-emerald-50/40 transition-colors"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 text-[9px] font-bold font-mono tracking-wider bg-slate-100 text-slate-600 border border-slate-200 uppercase rounded">
                    {proc.category}
                  </span>
                  <span className="text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.2 rounded font-extrabold flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    Finalizado (100%)
                  </span>
                  {proc.isDelegated && (
                    <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.2 rounded font-bold">
                      Delegado a Asesor
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm md:text-base text-slate-900">{proc.title}</h3>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-medium">
                  <span>Estado: 100% Completado</span>
                  <span>•</span>
                  <span>{proc.isDelegated ? 'Gestión Delegada' : 'Auto-gestionado'}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold">Todas las actividades validadas</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onSelectProcedureById && (
                  <button
                    onClick={() => onSelectProcedureById(proc.procedureId)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Eye size={14} />
                    Ver detalles
                  </button>
                )}

                <button
                  onClick={() => void alertTramia({title:'Constancia en preparación',message:`Estamos preparando la constancia de respaldo de “${proc.title}”.`,variant:'info',confirmLabel:'Entendido'})}
                  className="px-3.5 py-2 border border-gray-200 hover:border-blue-400 text-slate-700 hover:text-blue-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 bg-white cursor-pointer"
                >
                  <FileDown size={14} />
                  Constancia
                </button>
              </div>
            </div>
          ))}

          {/* Static history records */}
          {history.length === 0 && activeCompletedProcedures.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">Ningún trámite en el archivo histórico todavía.</div>
          ) : (
            history.map((record) => (
              <div
                key={record.id}
                id={`history-row-${record.id}`}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[9px] font-bold font-mono tracking-wider bg-slate-100 text-slate-600 border border-slate-200 uppercase rounded">
                      {record.category}
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.2 rounded font-bold">
                      Aprobado
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-sm md:text-base text-slate-900">{record.title}</h3>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 font-medium">
                    <span>Completado el: {record.completedAt}</span>
                    <span>•</span>
                    {record.advisorName ? (
                      <span className="text-blue-600">Asesor: {record.advisorName}</span>
                    ) : (
                      <span>Canal Web Directo</span>
                    )}
                    <span>•</span>
                    <span>Costo: {record.cost}</span>
                  </div>
                </div>

                {/* Stored documents download preview simulation */}
                <button
                  onClick={() => void alertTramia({title:'Descarga de respaldo',message:`El respaldo protegido de “${record.title}” está listo para continuar con la descarga de prueba.`,variant:'success',confirmLabel:'Entendido'})}
                  className="px-4 py-2 border border-gray-200 hover:border-blue-400 text-slate-700 hover:text-blue-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-white cursor-pointer"
                >
                  <FileDown size={14} />
                  Descargar Constancia
                </button>
              </div>
            ))
          )}
        </div>
      </section>

    </div>
  );
}
