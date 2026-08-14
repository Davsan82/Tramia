import React, { useState } from 'react';
import { Clock, ArrowRight, User, AlertCircle, CheckCircle2, ShieldAlert, Trash2, X } from 'lucide-react';
import { ActiveProcedure } from '../types';
import { MOCK_ADVISOR } from '../data';

interface InProgressViewProps {
  activeProcedures: ActiveProcedure[];
  onSelectProcedureById: (procedureId: string) => void;
  onNavigateToTab: (tab: 'inicio' | 'proceso' | 'historial' | 'perfil') => void;
  onDeleteProcedure?: (procedureId: string) => void;
}

export default function InProgressView({
  activeProcedures,
  onSelectProcedureById,
  onNavigateToTab,
  onDeleteProcedure
}: InProgressViewProps) {
  const [procToDelete, setProcToDelete] = useState<ActiveProcedure | null>(null);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header section with counts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Trámites en curso</h2>
          <p className="text-sm text-gray-500 mt-1">Supervisa en tiempo real el estado de tus gestiones gubernamentales.</p>
        </div>
        
        {activeProcedures.length > 0 && (
          <div className="bg-blue-50 text-blue-700 border border-blue-100 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            {activeProcedures.length} {activeProcedures.length === 1 ? 'trámite activo' : 'trámites activos'}
          </div>
        )}
      </div>

      {activeProcedures.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400">
            <Clock size={24} />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-slate-900 text-sm">No tienes trámites en curso</p>
            <p className="text-xs text-gray-400">
              ¿Tienes algún documento por caducar o un negocio por constituir? Empieza de forma rápida.
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('inicio')}
            className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl block mx-auto cursor-pointer"
          >
            Preguntar a la IA / Buscar Trámite
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="active-procedures-grid">
          {activeProcedures.map((proc) => {
            const IsCompleted = proc.completionPercentage === 100;
            const HasErrors = proc.requirements.some(r => r.status === 'Corregir');
            const isPendingPickup = proc.completionPercentage < 100 && proc.completionPercentage >= 75;
            
            return (
              <div
                key={proc.id}
                onClick={() => onSelectProcedureById(proc.procedureId)}
                id={`active-card-${proc.id}`}
                className="bg-white border border-gray-200 hover:border-blue-400 p-6 rounded-3xl hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between space-y-6 group"
              >
                {/* Top card bar (Category, isDelegated badge) */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-blue-600">{proc.category}</span>
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                      {proc.title}
                    </h3>
                  </div>

                  {proc.isDelegated ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 bg-blue-900 text-cyan-400 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
                        {proc.isPaid ? 'Asesor asignado' : 'Delegación pendiente de pago'}
                      </div>
                      {!proc.isPaid && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProcToDelete(proc);
                          }}
                          title="Eliminar trámite"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                        Auto-gestionado
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setProcToDelete(proc);
                        }}
                        title="Eliminar trámite"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Completion percentage slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="font-semibold text-gray-500">Progreso aprobado</span>
                    <span className={`font-mono ${IsCompleted ? 'text-emerald-600' : isPendingPickup ? 'text-amber-600' : 'text-blue-600'}`}>
                      {IsCompleted 
                        ? "100% (Trámite finalizado)" 
                        : isPendingPickup 
                        ? `${proc.completionPercentage}% (Pendiente de recoger documento)` 
                        : `${proc.completionPercentage}%`}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        HasErrors ? 'bg-amber-500' : IsCompleted ? 'bg-emerald-600' : isPendingPickup ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${proc.completionPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Sequential timelines - required for Screen 6 */}
                <div className="space-y-3.5 bg-slate-50/70 rounded-2xl p-4 border border-gray-150">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">Línea de tiempo de estados:</p>
                  
                  <div className="space-y-2.5 text-xs">
                    {proc.timeline && proc.timeline.length > 0 ? (
                      proc.timeline.map((line, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          {line.status === 'completado' ? (
                            <span className="text-emerald-600 font-bold">✓</span>
                          ) : line.status === 'actual' ? (
                            <span className="text-blue-500 animate-pulse font-bold">●</span>
                          ) : (
                            <span className="text-gray-300 font-medium font-mono">⏳</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className={`font-medium ${
                              line.status === 'completado' ? 'text-slate-400 line-through' :
                              line.status === 'actual' ? 'text-slate-900 font-semibold' :
                              'text-gray-400'
                            }`}>
                              {line.title}
                            </span>
                            {line.time && (
                              <span className="text-[9px] text-gray-400 block font-mono">{line.time}</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400">Sin hitos registrados de momento.</div>
                    )}
                  </div>
                </div>

                {/* Multi-state warnings warning indicators / Delegation tags */}
                {HasErrors && (
                  <div className="flex items-start gap-2 bg-amber-50 text-amber-900 p-3 rounded-xl border border-amber-100/50 text-xs">
                    <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Correcciones requeridas con urgencia</p>
                      <p className="text-gray-500 text-[11px] mt-0.5">La IA o tu asesor detectaron observaciones en tu documentación.</p>
                    </div>
                  </div>
                )}

                {/* Bottom interactive card bar */}
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-gray-400" />
                    <span className="text-[11px] text-slate-500">Estimación de recojo: {proc.estimatedCompletion}</span>
                  </div>

                  <span className="text-blue-600 text-xs font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Ir al panel de control
                    <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {procToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white border border-gray-200 text-slate-900 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                <Trash2 size={22} />
              </div>
              <button
                type="button"
                onClick={() => setProcToDelete(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-slate-900">
                Eliminar trámite en proceso
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                ¿Estás seguro de que deseas eliminar <strong className="text-slate-900">"{procToDelete.title}"</strong> de tus trámites en curso? Esta acción quitará el procedimiento de tu lista.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setProcToDelete(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteProcedure) {
                    onDeleteProcedure(procToDelete.procedureId || procToDelete.id);
                  }
                  setProcToDelete(null);
                }}
                className="px-4 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
