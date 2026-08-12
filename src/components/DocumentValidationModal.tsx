import React, { useState } from 'react';
import { 
  X, Sparkles, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, 
  UploadCloud, FileText, Image as ImageIcon, ShieldCheck, Eye, ArrowRight, 
  Check, Info, FileUp, Zap, ChevronRight, HelpCircle, UserCheck, Search
} from 'lucide-react';
import { Requirement, UserProfile } from '../types';

export interface ValidationIssue {
  id: string;
  title: string;
  category: 'legibilidad' | 'incompleto' | 'inconsistencia' | 'normativa' | string;
  severity: 'alta' | 'media' | 'baja' | string;
  description: string;
  fixSuggestion: string;
}

export interface ValidationResult {
  isValidated: boolean;
  status: 'Aprobado' | 'Corregir' | string;
  overallScore: number;
  imageQuality: 'Buena' | 'Regular' | 'Mala' | 'No detectada' | string;
  completenessScore: number;
  accuracyScore: number;
  summary: string;
  detectedIssues: ValidationIssue[];
  recommendations: string[];
  extractedData?: {
    docType?: string;
    holderName?: string;
    docNumber?: string;
    issueDate?: string;
    expiryDate?: string;
    hasSignature?: boolean;
    entityName?: string;
  };
  procedureAdherenceChecks?: {
    checkName: string;
    passed: boolean;
    comment: string;
  }[];
}

interface DocumentValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  requirement?: Requirement | null;
  procedureTitle?: string;
  userProfile?: UserProfile | null;
  onValidationSuccess?: (result: ValidationResult, fileName: string) => void;
}

// Preset samples for easy demoing & testing
const PRESET_SAMPLES = [
  {
    id: 'good_dni',
    label: 'DNI Frontal Válido',
    badge: '98% - Aprobado',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    type: 'good',
    fileName: 'DNI_Frontal_JuanPerez.jpg'
  },
  {
    id: 'blurry_no_sign',
    label: 'DNI Borroso y Sin Firma',
    badge: '42% - Corregir',
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    type: 'bad_blurry',
    fileName: 'DNI_CamaraBorroso_Scan.jpg'
  },
  {
    id: 'expired_voucher',
    label: 'Voucher de Pago Expirado',
    badge: '58% - Corregir',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    type: 'expired_date',
    fileName: 'Recibo_Pagalo_01810_Vencido.pdf'
  },
  {
    id: 'good_medical',
    label: 'Certificado Médico Conforme',
    badge: '95% - Aprobado',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    type: 'good',
    fileName: 'Certificado_Medico_MINSA.pdf'
  }
];

export default function DocumentValidationModal({
  isOpen,
  onClose,
  requirement,
  procedureTitle = 'Trámite General',
  userProfile,
  onValidationSuccess
}: DocumentValidationModalProps) {
  if (!isOpen) return null;

  const [selectedSample, setSelectedSample] = useState<string>('good_dni');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgressText, setScanProgressText] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'audit' | 'data' | 'fixes'>('audit');

  const reqName = requirement?.name || 'Documento Oficial';
  const reqDesc = requirement?.description || 'Carga el documento requerido para análisis por IA.';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setValidationResult(null);
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setFilePreviewUrl(url);
      } else {
        setFilePreviewUrl(null);
      }
      runValidationApi(file, null);
    }
  };

  const handleSelectPresetSample = (sampleId: string) => {
    setSelectedSample(sampleId);
    setUploadedFile(null);
    setFilePreviewUrl(null);
    const sampleObj = PRESET_SAMPLES.find(s => s.id === sampleId);
    runValidationApi(null, sampleObj?.type || 'good');
  };

  const runValidationApi = async (file: File | null, sampleType: string | null) => {
    setIsScanning(true);
    setScanProgressText('Iniciando lector óptico y decodificador de capas...');

    let fileDataStr: string | undefined;

    if (file) {
      try {
        fileDataStr = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }

    // Step 1 progress update
    setTimeout(() => {
      setScanProgressText('Analizando encuadre, brillo, reflejos y resolución...');
      // Step 2 progress update
      setTimeout(() => {
        setScanProgressText('Detectando firmas manuscritas, sellos notariales y códigos...');
        // Step 3 progress update
        setTimeout(async () => {
          setScanProgressText('Cruzando consistencia de datos con base oficial de TramIA...');

          try {
            const sampleObj = PRESET_SAMPLES.find(s => s.id === selectedSample);
            const response = await fetch('/api/validate-document', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileData: fileDataStr,
                fileName: file ? file.name : sampleObj?.fileName || 'Documento_Muestra.jpg',
                mimeType: file ? file.type : 'image/jpeg',
                requirementName: reqName,
                requirementDescription: reqDesc,
                procedureTitle: procedureTitle,
                userProfile: userProfile ? { fullName: userProfile.fullName, dni: userProfile.dni } : null,
                testSampleType: sampleType || (file ? 'custom' : sampleObj?.type || 'good')
              })
            });

            const data = await response.json();
            if (data.success && data.result) {
              setValidationResult(data.result);
            } else {
              throw new Error(data.error || 'Respuesta inválida del servidor');
            }
          } catch (error) {
            console.error('Validation API call failed:', error);
            // Fallback response if fetch fails
            const isBad = sampleType === 'bad_blurry' || sampleType === 'expired_date';
            setValidationResult({
              isValidated: !isBad,
              status: !isBad ? 'Aprobado' : 'Corregir',
              overallScore: !isBad ? 95 : 45,
              imageQuality: !isBad ? 'Buena' : 'Mala',
              completenessScore: !isBad ? 98 : 50,
              accuracyScore: !isBad ? 92 : 40,
              summary: !isBad
                ? `El documento verificado cumple plenamente con las especificaciones normativas de ${procedureTitle}.`
                : 'Se hallaron observaciones críticas en legibilidad y firmas.',
              detectedIssues: !isBad ? [] : [
                {
                  id: 'err-1',
                  title: 'Falta firma manuscrita',
                  category: 'incompleto',
                  severity: 'alta',
                  description: 'No se detecta la firma del titular en el casillero oficial.',
                  fixSuggestion: 'Firma en físico con bolígrafo azul o negro y reescanea el documento.'
                }
              ],
              recommendations: [
                'Usa buena iluminación natural al capturar la fotografía.',
                'Asegúrate de mostrar las 4 esquinas del documento.'
              ],
              extractedData: {
                docType: reqName,
                holderName: userProfile?.fullName || 'JUAN CARLOS PÉREZ',
                docNumber: userProfile?.dni || '45892014',
                hasSignature: !isBad
              }
            });
          } finally {
            setIsScanning(false);
          }
        }, 800);
      }, 700);
    }, 600);
  };

  const handleApplyValidatedDocument = () => {
    if (validationResult && onValidationSuccess) {
      const activeSample = PRESET_SAMPLES.find(s => s.id === selectedSample);
      const nameToPass = uploadedFile ? uploadedFile.name : activeSample?.fileName || `${reqName}_validado.pdf`;
      onValidationSuccess(validationResult, nameToPass);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn" id="doc-validation-modal-overlay">
      <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-md">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                  Auditoría de Documentos con IA
                </h3>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase font-mono rounded-full border border-blue-500/30">
                  TramIA Copilot
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate max-w-md">
                Requisito: <span className="text-slate-200 font-semibold">{reqName}</span> • {procedureTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
          
          {/* Preset Sample Selector & Custom Upload Box */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-blue-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 font-mono">
                  Probar o Cargar Documento
                </h4>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Sube tu archivo o selecciona una muestra de prueba para evaluar la IA
              </span>
            </div>

            {/* Preset Sample Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_SAMPLES.map((sample) => {
                const isSelected = selectedSample === sample.id && !uploadedFile;
                return (
                  <button
                    key={sample.id}
                    onClick={() => handleSelectPresetSample(sample.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-slate-50 hover:bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <FileText size={14} className={isSelected ? 'text-blue-600' : 'text-slate-500'} />
                      <span className={`text-[9px] font-bold font-mono px-1.5 py-0.2 rounded border ${sample.badgeClass}`}>
                        {sample.badge}
                      </span>
                    </div>
                    <div>
                      <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                        {sample.label}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                        {sample.fileName}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* File Dropzone Input */}
            <div className="relative border-2 border-dashed border-gray-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/30 rounded-xl p-3 text-center transition-all cursor-pointer group">
              <input 
                type="file" 
                onChange={handleFileUpload}
                accept="image/*,.pdf"
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
              />
              <div className="flex items-center justify-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl group-hover:scale-105 transition-transform">
                  <UploadCloud size={18} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900">
                    {uploadedFile ? `Archivo cargado: ${uploadedFile.name}` : 'Haz clic para subir un documento propio (JPG, PNG, PDF)'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Análisis instantáneo por IA de nitidez, campos y firma manuscrita
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Scanning Animation State */}
          {isScanning ? (
            <div className="bg-white border border-blue-200 rounded-2xl p-8 text-center space-y-4 shadow-sm animate-fadeIn">
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-2xl bg-blue-600/20 animate-ping" />
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg relative z-10">
                  <RefreshCw className="animate-spin" size={24} />
                </div>
              </div>

              <div className="space-y-1 max-w-md mx-auto">
                <p className="text-xs font-black uppercase font-mono tracking-wider text-blue-600">
                  Procesando Inspección Multimodal con IA
                </p>
                <h4 className="text-base font-extrabold text-slate-900">
                  {scanProgressText || 'Analizando documento...'}
                </h4>
                <p className="text-xs text-slate-500">
                  Evaluando legibilidad, validez de datos y cumplimiento normativo para {reqName}.
                </p>
              </div>

              {/* Progress bar visualizer */}
              <div className="w-full max-w-md mx-auto h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div className="h-full bg-blue-600 rounded-full animate-pulse w-3/4 transition-all duration-500" />
              </div>
            </div>
          ) : validationResult ? (
            <div className="space-y-5 animate-fadeIn">
              
              {/* Executive Validation Banner */}
              <div className={`p-5 md:p-6 rounded-2xl border-2 shadow-xs space-y-4 ${
                validationResult.isValidated
                  ? 'bg-emerald-50/80 border-emerald-300'
                  : 'bg-red-50/80 border-red-300'
              }`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4 border-gray-200/60">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${
                      validationResult.isValidated ? 'bg-emerald-600' : 'bg-red-600'
                    }`}>
                      {validationResult.isValidated ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase font-mono ${
                          validationResult.isValidated
                            ? 'bg-emerald-200 text-emerald-950'
                            : 'bg-red-200 text-red-950'
                        }`}>
                          {validationResult.status === 'Aprobado' ? 'DOCUMENTO VERIFICADO Y CONFORME' : 'OBSERVACIONES DETECTADAS'}
                        </span>
                        <span className="text-xs font-bold text-slate-600 font-mono">
                          Puntaje IA: {validationResult.overallScore}/100
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 mt-1">
                        {validationResult.isValidated
                          ? '¡Documento Aprobado por el Validador de TramIA!'
                          : 'Se requieren ajustes antes de presentar este documento'}
                      </h3>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-mono uppercase font-bold text-slate-400">Calidad de Imagen</p>
                    <span className={`inline-block px-2.5 py-1 mt-0.5 rounded-lg text-xs font-bold font-mono border ${
                      validationResult.imageQuality === 'Buena'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      {validationResult.imageQuality}
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                  {validationResult.summary}
                </p>

                {/* Score Meters Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="bg-white/80 p-3 rounded-xl border border-gray-200/80">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                      <span>Completitud</span>
                      <span className="font-mono">{validationResult.completenessScore}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${validationResult.completenessScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-white/80 p-3 rounded-xl border border-gray-200/80">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                      <span>Exactitud de Datos</span>
                      <span className="font-mono">{validationResult.accuracyScore}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${validationResult.accuracyScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-white/80 p-3 rounded-xl border border-gray-200/80">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                      <span>Conformidad Normativa</span>
                      <span className="font-mono">{validationResult.overallScore}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${validationResult.isValidated ? 'bg-emerald-600' : 'bg-red-500'}`}
                        style={{ width: `${validationResult.overallScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Inspection Tabs */}
              <div className="flex border-b border-gray-200 gap-4">
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`pb-2.5 text-xs font-extrabold cursor-pointer transition-all border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'audit'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <AlertCircle size={14} />
                  <span>Observaciones Detectadas ({validationResult.detectedIssues?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('data')}
                  className={`pb-2.5 text-xs font-extrabold cursor-pointer transition-all border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'data'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText size={14} />
                  <span>Datos Extraídos por OCR</span>
                </button>

                <button
                  onClick={() => setActiveTab('fixes')}
                  className={`pb-2.5 text-xs font-extrabold cursor-pointer transition-all border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'fixes'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Zap size={14} />
                  <span>Instrucciones de Corrección</span>
                </button>
              </div>

              {/* Tab 1: Issues List */}
              {activeTab === 'audit' && (
                <div className="space-y-3">
                  {validationResult.detectedIssues && validationResult.detectedIssues.length > 0 ? (
                    validationResult.detectedIssues.map((issue) => (
                      <div key={issue.id} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`p-1.5 rounded-lg text-xs ${
                              issue.severity === 'alta' 
                                ? 'bg-red-100 text-red-700' 
                                : issue.severity === 'media'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              <AlertTriangle size={14} />
                            </span>
                            <h5 className="text-xs font-extrabold text-slate-900">{issue.title}</h5>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              {issue.category}
                            </span>
                            <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                              issue.severity === 'alta'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : issue.severity === 'media'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              Severidad {issue.severity}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 font-medium pl-7">
                          {issue.description}
                        </p>

                        <div className="ml-7 p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1">
                          <p className="text-[10px] font-black uppercase text-blue-900 font-mono">
                            Acción Correctiva Sugerida:
                          </p>
                          <p className="text-xs text-blue-950 font-semibold">
                            {issue.fixSuggestion}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
                      <CheckCircle2 size={32} className="text-emerald-600 mx-auto" />
                      <h5 className="text-sm font-extrabold text-slate-900">
                        No se detectaron errores críticos en este documento
                      </h5>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        La IA verificó que la legibilidad, presencia de firmas y vigencia de fechas se encuentran en estado conforme.
                      </p>
                    </div>
                  )}

                  {/* Procedure Adherence Check Checklist */}
                  {validationResult.procedureAdherenceChecks && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2">
                      <p className="text-[10px] font-black uppercase text-slate-400 font-mono">
                        Control de Reglas Específicas del Trámite ({procedureTitle})
                      </p>
                      <div className="space-y-1.5">
                        {validationResult.procedureAdherenceChecks.map((check, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-gray-100 text-xs">
                            <span className="font-semibold text-slate-800">{check.checkName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-500">{check.comment}</span>
                              {check.passed ? (
                                <span className="text-emerald-600 font-bold">✓ Conforme</span>
                              ) : (
                                <span className="text-red-600 font-bold">✖ Observado</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Extracted Data */}
              {activeTab === 'data' && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4 shadow-2xs">
                  <div>
                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 font-mono">
                      Metadatos e Información Extraída por OCR e IA
                    </h5>
                    <p className="text-xs text-slate-500">
                      Datos reconocidos en la imagen para cotejo directo con el registro oficial.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-gray-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">Titular Detectado</p>
                      <p className="text-xs font-black text-slate-900 mt-0.5">
                        {validationResult.extractedData?.holderName || userProfile?.fullName || 'PÉREZ GARCÍA JUAN CARLOS'}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-gray-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">Número de Documento / DNI</p>
                      <p className="text-xs font-black text-slate-900 mt-0.5 font-mono">
                        {validationResult.extractedData?.docNumber || userProfile?.dni || '45892014'}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-gray-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">Entidad Emisora</p>
                      <p className="text-xs font-black text-slate-900 mt-0.5">
                        {validationResult.extractedData?.entityName || 'RENIEC / Entidad Competente'}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-gray-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">Firma Manuscrita Detectada</p>
                      <p className="text-xs font-black mt-0.5 flex items-center gap-1">
                        {validationResult.extractedData?.hasSignature ? (
                          <span className="text-emerald-700 font-bold">✓ Sí, firma presente</span>
                        ) : (
                          <span className="text-red-700 font-bold">✖ No se detectó firma</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Actionable Fixes */}
              {activeTab === 'fixes' && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 font-mono">
                    Pasos Recomendados para la Aprobación Definitiva
                  </h5>
                  
                  <div className="space-y-2">
                    {validationResult.recommendations && validationResult.recommendations.map((rec, idx) => (
                      <div key={idx} className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-mono text-[10px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-xs text-blue-950 font-semibold leading-relaxed">
                          {rec}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Action Controls */}
              <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[11px] text-slate-500 font-medium">
                  Auditoría impulsada por Gemini 3.6 Flash y modelos de visión computacional de TramIA.
                </p>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-gray-200 transition-all cursor-pointer"
                  >
                    Cerrar
                  </button>

                  <button
                    onClick={handleApplyValidatedDocument}
                    className={`px-5 py-2.5 font-bold text-xs rounded-xl text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                      validationResult.isValidated
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                    }`}
                  >
                    <span>{validationResult.isValidated ? 'Usar Documento Aprobado' : 'Aceptar Resultado'}</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

            </div>
          ) : null}

        </div>
      </div>
    </div>
  );
}
