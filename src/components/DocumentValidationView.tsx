import React, { useState } from 'react';
import { 
  Sparkles, UploadCloud, CheckCircle2, AlertTriangle, FileText, 
  RefreshCw, ShieldCheck, Search, Info, HelpCircle, ArrowRight, Eye, ChevronRight, Zap, Building, AlertCircle
} from 'lucide-react';
import { PROCEDURES } from '../data';
import { UserProfile } from '../types';
import DocumentValidationModal, { ValidationResult } from './DocumentValidationModal';

interface DocumentValidationViewProps {
  userProfile?: UserProfile | null;
  onSelectProcedure?: (procedureId: string) => void;
}

export default function DocumentValidationView({
  userProfile,
  onSelectProcedure
}: DocumentValidationViewProps) {
  const [selectedProcedureId, setSelectedProcedureId] = useState<string>('renovar-dni');
  const [selectedReqName, setSelectedReqName] = useState<string>('Fotografía tamaño pasaporte');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [lastValidationResult, setLastValidationResult] = useState<{ result: ValidationResult; fileName: string } | null>(null);

  const activeProcedure = PROCEDURES.find(p => p.id === selectedProcedureId) || PROCEDURES[0];

  const handleProcedureChange = (pId: string) => {
    setSelectedProcedureId(pId);
    const proc = PROCEDURES.find(p => p.id === pId);
    if (proc && proc.requirements.length > 0) {
      setSelectedReqName(proc.requirements[0].name);
    }
  };

  const selectedRequirementObj = activeProcedure.requirements.find(r => r.name === selectedReqName) || activeProcedure.requirements[0];

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto px-4" id="ai-document-validation-view-root">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 md:p-8 border border-blue-800/40 shadow-lg relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 font-bold font-mono text-[10px] uppercase tracking-wider rounded-full border border-blue-400/30">
              Copiloto IA de TramIA
            </span>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-bold font-mono text-[10px] uppercase tracking-wider rounded-full border border-emerald-400/30">
              Motor de Visión Computacional 3.6
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Validador e Inspector de Documentos con IA
          </h1>

          <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl font-medium leading-relaxed">
            Evita rechazos burocráticos en RENIEC, SUNAT, MTC y Migraciones. Nuestro validador inteligente analiza la nitidez, completitud, firmas y vigencia de tus documentos antes de enviarlos.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-2 hover:scale-[1.02]"
            >
              <Sparkles size={16} />
              <span>Lanzar Auditoría de Documento</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Procedure & Requirement Selection Controls */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-5">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
            <Search size={16} className="text-blue-600" />
            Configurar Parámetros del Trámite a Auditar
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecciona la entidad y el requisito oficial para que la IA evalúe la normativa exacta.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Procedure Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 font-mono uppercase">
              Trámite Oficial
            </label>
            <select
              value={selectedProcedureId}
              onChange={(e) => handleProcedureChange(e.target.value)}
              className="w-full bg-slate-50 text-slate-900 font-bold text-xs p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              {PROCEDURES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.category})
                </option>
              ))}
            </select>
          </div>

          {/* Requirement Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 font-mono uppercase">
              Requisito Específico
            </label>
            <select
              value={selectedReqName}
              onChange={(e) => setSelectedReqName(e.target.value)}
              className="w-full bg-slate-50 text-slate-900 font-bold text-xs p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              {activeProcedure.requirements.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name} {r.critical ? ' (Crítico)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Info Capsule for selected requirement */}
        <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl flex items-start gap-3">
          <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-blue-950">
              Regla de Validación para "{selectedReqName}":
            </p>
            <p className="text-xs text-blue-900/90 font-medium leading-relaxed">
              {selectedRequirementObj?.description || 'Asegúrate de que la imagen o documento sea perfectamente legible y cuente con los sellos correspondientes.'}
            </p>
          </div>
        </div>

        {/* Action Trigger Card */}
        <div className="p-5 bg-slate-50 border border-gray-200/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
              <UploadCloud size={20} />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-900">
                Subir o Probar Muestra de Documento
              </h4>
              <p className="text-[11px] text-slate-500">
                Recibe análisis inmediato con puntuación de calidad (0-100%) y guía de correcciones.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles size={14} />
            <span>Probar Auditoría por IA</span>
          </button>
        </div>
      </div>

      {/* Last Validation Audit Report if available */}
      {lastValidationResult && (
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b pb-3 border-gray-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <h3 className="text-sm font-black uppercase text-slate-900 font-mono">
                Último Informe Guardado ({lastValidationResult.fileName})
              </h3>
            </div>
            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md font-mono ${
              lastValidationResult.result.isValidated ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}>
              Puntaje: {lastValidationResult.result.overallScore}%
            </span>
          </div>

          <p className="text-xs text-slate-700 font-medium">
            {lastValidationResult.result.summary}
          </p>

          {lastValidationResult.result.detectedIssues && lastValidationResult.result.detectedIssues.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-slate-400 font-mono">Observaciones:</p>
              {lastValidationResult.result.detectedIssues.map(issue => (
                <div key={issue.id} className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs space-y-0.5">
                  <p className="font-bold text-red-950">{issue.title}</p>
                  <p className="text-red-900">{issue.fixSuggestion}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Guide: Common Document Rejection Causes in Peruvian Institutions */}
      <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-500" />
            Principales Motivos de Rechazo Documental en Perú (RENIEC, SUNAT, MTC)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Nuestra IA entrena con las causas habituales de devolución de expedientes en mesa de partes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200/70 space-y-2">
            <span className="p-2 bg-red-100 text-red-700 rounded-xl inline-block text-xs font-bold font-mono">
              01. RENIEC
            </span>
            <h4 className="text-xs font-extrabold text-slate-900">Fotos con reflejo o sombras en rostro</h4>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              La foto del DNI debe tener fondo blanco uniforme, ojos descubiertos sin montura gruesa de lentes y orejas despejadas.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200/70 space-y-2">
            <span className="p-2 bg-amber-100 text-amber-700 rounded-xl inline-block text-xs font-bold font-mono">
              02. SUNAT / MTC
            </span>
            <h4 className="text-xs font-extrabold text-slate-900">Ausencia de firma manuscrita legible</h4>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              Las declaraciones juradas e inscripciones requieren firma física en tinta azul o negra, no recortada ni superpuesta.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200/70 space-y-2">
            <span className="p-2 bg-blue-100 text-blue-700 rounded-xl inline-block text-xs font-bold font-mono">
              03. PÁGALO.PE
            </span>
            <h4 className="text-xs font-extrabold text-slate-900">Código de Tasa Incorrecto o Vencido</h4>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              Cada trámite tiene un arancel específico (ej. 02119 para DNI e, 01810 para Pasaporte). El voucher debe estar dentro de vigencia.
            </p>
          </div>
        </div>
      </div>

      {/* Validation Modal Component */}
      <DocumentValidationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        requirement={selectedRequirementObj}
        procedureTitle={activeProcedure.title}
        userProfile={userProfile}
        onValidationSuccess={(result, fileName) => {
          setLastValidationResult({ result, fileName });
        }}
      />

    </div>
  );
}
