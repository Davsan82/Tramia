import React, { Suspense, lazy, useState, useEffect, useMemo, useRef } from 'react';
import Topbar from './components/Topbar';
import HomeView from './components/HomeView';
import PrivacyView from './components/PrivacyView';
import AboutView from './components/AboutView';
import TermsView from './components/TermsView';
import ContactView from './components/ContactView';
import EmailVerificationView from './components/EmailVerificationView';
import PasswordResetView from './components/PasswordResetView';
const AdminDashboardView=lazy(()=>import('./components/AdminDashboardView'));
const AdvisorPortalView=lazy(()=>import('./components/AdvisorPortalView'));
import CatalogView from './components/CatalogView';
import PanelView from './components/PanelView';
import SearchView from './components/SearchView';
import ProcedureDetailView from './components/ModernProcedureDetailView';
import WorkspaceView from './components/WorkspaceView';
import MyProceduresView from './components/MyProceduresView';
import HistoryView from './components/HistoryView';
import ProfileView from './components/ProfileView';
import LoginView from './components/LoginView';
import DocumentValidationView from './components/DocumentValidationView';
import { trackEvent } from './utils/analytics';
import { confirmTramia } from './components/TramiaDialog';

import { EXPIRATION_REMINDERS } from './data';
import { loadProcedureCatalog } from './services/catalog';
import { Procedure, ActiveProcedure, ExpirationReminder, Requirement, UserProfile } from './types';
import { Sparkles, Calendar, Bell, ShieldX, X, Home, Clock, History, User, LayoutDashboard, Lock, UserCheck, ChevronRight, CheckCircle2, Headphones, ListChecks } from 'lucide-react';

export default function App() {
  if (window.location.pathname === '/admin') return <Suspense fallback={<div className="grid min-h-screen place-items-center font-bold text-blue-700">Cargando administración…</div>}><AdminDashboardView onExit={() => { window.location.assign('/'); }} /></Suspense>;
  if (window.location.pathname === '/asesor') return <Suspense fallback={<div className="grid min-h-screen place-items-center font-bold text-blue-700">Cargando portal…</div>}><AdvisorPortalView onExit={() => { window.location.assign('/'); }} /></Suspense>;
  const [procedures, setProcedures] = useState<Procedure[]>([]);

  useEffect(() => {
    let active = true;
    loadProcedureCatalog().then((catalog) => {
      if (active && catalog.length > 0) setProcedures(catalog);
    });
    return () => { active = false; };
  }, []);
  // Navigation: primary tabs associated with left sidebar
  const [currentTab, setCurrentTab] = useState<'inicio' | 'panel' | 'proceso' | 'validador' | 'historial' | 'perfil'>('inicio');

  // Multi-level secondary tabs / navigation nested inside 'inicio' tab:
  // 'home' | 'search' | 'detail' | 'workspace'
  type InicioView = 'home' | 'catalog' | 'search' | 'detail' | 'workspace' | 'privacy' | 'about' | 'terms' | 'contact' | 'verifyEmail' | 'resetPassword';
  const initialInstitutionalView = (): InicioView => ({ '/tramites': 'catalog', '/privacidad': 'privacy', '/sobre-tramia': 'about', '/terminos': 'terms', '/contacto': 'contact', '/verificar-correo': 'verifyEmail', '/restablecer-contrasena': 'resetPassword' }[window.location.pathname] as InicioView || 'home');
  const [inicioSubView, setInicioSubView] = useState<InicioView>(initialInstitutionalView);
  const detailReturnRef = useRef<{ tab: typeof currentTab; view: InicioView; path: string; scrollY: number }>({ tab: 'inicio', view: 'catalog', path: '/tramites', scrollY: 0 });
  const openInstitutional = (view: Extract<InicioView, 'privacy' | 'about' | 'terms' | 'contact'>) => { const path = { privacy: '/privacidad', about: '/sobre-tramia', terms: '/terminos', contact: '/contacto' }[view]; window.history.pushState({}, '', path); setInicioSubView(view); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const closeInstitutional = () => { window.history.replaceState({}, '', '/'); setCurrentTab('inicio'); setInicioSubView('home'); window.scrollTo({ top: 0 }); };

  // Active selected procedure for Screen 3 Details and Screens 4/5/7 Workspace
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);

  // Global search text focused from top bar or search view
  const [searchText, setSearchText] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
  const [catalogCategory, setCatalogCategory] = useState(() => new URLSearchParams(window.location.search).get('categoria') || 'Todos');

  // Track selection of "Hacerlo yo mismo" vs "Delegar a TramIA" from the Detail View
  const [isDelegatedSelected, setIsDelegatedSelected] = useState(false);
  const [openDelegationAfterStart, setOpenDelegationAfterStart] = useState(false);

  // Completion mode selection modal (Hazlo tú mismo vs Delegar)
  const [isMethodSelectionModalOpen, setIsMethodSelectionModalOpen] = useState(false);
  const [pendingProcedureToStart, setPendingProcedureToStart] = useState<Procedure | null>(null);
  const [advisorPricing, setAdvisorPricing] = useState<{ fromAmountMinor: number | null; currency: string } | null>(null);

  useEffect(() => {
    if (!isMethodSelectionModalOpen) return;
    let active = true;
    fetch('/api/v1/public/advisors/pricing')
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => { if (active) setAdvisorPricing(payload.pricing || null); })
      .catch(() => { if (active) setAdvisorPricing(null); });
    return () => { active = false; };
  }, [isMethodSelectionModalOpen]);

  // Mobile sidebar visibility state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Estado transitorio del flujo heredado. La fuente persistente del usuario es Neon.
  const [activeProcedures, setActiveProcedures] = useState<ActiveProcedure[]>([]);

  useEffect(() => {
    // Elimina progresos demo guardados por versiones anteriores sin tocar Analytics.
    localStorage.removeItem('tramia_active_procedures');
  }, []);

  // Derived filtered procedures for "En proceso" (< 100%) and "Historial" (=== 100%)
  const inProgressProcedures = useMemo(() => {
    return activeProcedures.filter(ap => (ap.completionPercentage || 0) < 100);
  }, [activeProcedures]);

  const completedActiveProcedures = useMemo(() => {
    return activeProcedures.filter(ap => (ap.completionPercentage || 0) === 100);
  }, [activeProcedures]);

  const [reminders, setReminders] = useState<ExpirationReminder[]>(EXPIRATION_REMINDERS);

  // Toast / floating notifications alerts state
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'alert' } | null>(null);

  // Profile authenticated state manager (starts on Login / Create Profile mode)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [serverActiveProcedureCount, setServerActiveProcedureCount] = useState(0);
  const [sessionRemainingSeconds, setSessionRemainingSeconds] = useState(15 * 60);

  const logout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
    setUserProfile(null); setSessionResolved(true); setServerActiveProcedureCount(0); setCurrentTab('inicio'); setInicioSubView('home'); setSessionRemainingSeconds(15 * 60);
    window.history.replaceState({}, '', '/');
  };

  // Restore the server-backed HttpOnly session without exposing its token to JavaScript.
  useEffect(() => {
    let active = true;
    fetch('/api/v1/auth/session', { credentials: 'include' })
      .then(async (response) => response.ok ? response.json() : { user: null })
      .then((result) => { if (active) setUserProfile(result.user || null); })
      .catch(() => undefined)
      .finally(() => { if (active) setSessionResolved(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!userProfile) return;
    let deadline = Date.now() + 15 * 60_000;
    let lastServerTouch = 0;
    const reset = () => { deadline = Date.now() + 15 * 60_000; setSessionRemainingSeconds(15 * 60); const now=Date.now(); if(now-lastServerTouch>60_000){lastServerTouch=now;void fetch('/api/v1/auth/session/touch',{method:'POST',credentials:'include'}).then(response=>{if(response.status===401)void logout()}).catch(()=>undefined);} };
    const events: Array<keyof WindowEventMap> = ['pointerdown','keydown','scroll','touchstart'];
    events.forEach(event => window.addEventListener(event, reset, { passive: true }));
    const timer = window.setInterval(() => { const remaining = Math.max(0, Math.ceil((deadline-Date.now())/1000)); setSessionRemainingSeconds(remaining); if (remaining===0) { window.clearInterval(timer); void logout(); } }, 1000);
    return () => { window.clearInterval(timer); events.forEach(event => window.removeEventListener(event, reset)); };
  }, [userProfile]);

  // Auth modal visibility and callback state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [authSuccessCallback, setAuthSuccessCallback] = useState<(() => void) | null>(null);

  // Helper trigger to auto-dismiss toasts
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Track search text typing from top bar (debounced)
  useEffect(() => {
    if (!searchText || !searchText.trim()) return;
    const delayDebounceFn = setTimeout(() => {
      trackEvent('busqueda_realizada', { query: searchText });
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchText]);

  // Navigate to query search immediately
  const handleTopSearchFocus = () => {
    setCurrentTab('inicio');
    setInicioSubView('search');
  };

  // Select particular procedure
  const handleSelectProcedure = (proc: Procedure) => {
    detailReturnRef.current = {
      tab: currentTab,
      view: inicioSubView,
      path: window.location.pathname === '/tramites' ? '/tramites' : '/',
      scrollY: window.scrollY,
    };
    setSelectedProcedure(proc);
    setCurrentTab('inicio');
    setInicioSubView('detail');
    trackEvent('tramite_revisado', {
      procedure_id: proc.id,
      procedure_title: proc.title,
      category: proc.category
    });
  };

  const handleBackFromProcedureDetail = () => {
    const origin = detailReturnRef.current;
    setCurrentTab(origin.tab);
    setInicioSubView(origin.view === 'detail' || origin.view === 'workspace' ? 'catalog' : origin.view);
    window.history.replaceState({}, '', origin.path);
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: origin.scrollY, behavior: 'auto' })));
  };

  // Go to Details/Checklist Workspace
  const handleStartProcedure = (proc: Procedure, _isDelegatedPlaceholder: boolean, authMode?: 'login' | 'signup') => {
    const showMethodSelection = () => {
      setPendingProcedureToStart(proc);
      setIsMethodSelectionModalOpen(true);
    };

    if (!userProfile) {
      setAuthSuccessCallback(() => showMethodSelection);
      setAuthModalInitialMode(authMode || 'signup');
      setIsAuthModalOpen(true);
      return;
    }

    showMethodSelection();
  };

  const handleTriggerLogin = (mode?: 'login' | 'signup') => {
    setAuthModalInitialMode(mode || 'login');
    setIsAuthModalOpen(true);
  };

  // Actually finalize starting the procedure once the choice (Hazlo tú mismo or Delegar) has been selected
  const handleFinalizeProcedureStart = async (proc: Procedure, isDelegated: boolean) => {
    let createdCaseId = '';
    try {
      const response = await fetch('/api/v1/my-procedures', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedureId: proc.databaseId || proc.id,
          mode: isDelegated ? 'hybrid' : 'self_service',
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'No pudimos iniciar este trámite.');
      createdCaseId = String(payload.data?.id || '');
      if (!createdCaseId) throw new Error('No recibimos el identificador de la nueva gestión.');
      // La solicitud de delegación se crea recién después de completar los
      // prerrequisitos personales y elegir un asesor en Mis trámites.
    } catch (error) {
      setToastMessage({ title: 'No pudimos iniciar el trámite', desc: error instanceof Error ? error.message : 'Inténtalo nuevamente.', type: 'error' });
      return;
    }
    // La modalidad solo cambia a delegada después de elegir asesor y aprobar
    // el pago. Mientras tanto, abrimos el panel de preparación de delegación.
    setIsDelegatedSelected(false);
    setOpenDelegationAfterStart(isDelegated);
    if (isDelegated) {
      trackEvent('tramite_delegado_elegido', {
        procedure_id: proc.id,
        procedure_title: proc.title,
        category: proc.category
      });
    } else {
      trackEvent('tramite_auto_elegido', {
        procedure_id: proc.id,
        procedure_title: proc.title,
        category: proc.category
      });
    }

    // Cada inicio crea una gestión independiente, aunque exista otra activa
    // del mismo trámite del catálogo.
    const cleanRequirements: Requirement[] = proc.requirements.map(r => ({
      ...r,
      status: 'Pendiente',
      uploadedFileName: undefined,
      feedbackMessage: undefined,
      imageQuality: undefined,
      detectedErrors: undefined,
      recommendations: undefined,
      isValidated: false
    }));
    const cleanSteps = proc.steps.map(s => ({ ...s, status: 'PENDIENTE' as const }));
    setSelectedProcedure({
      ...proc,
      userProcedureId: createdCaseId,
      steps: cleanSteps,
      requirements: cleanRequirements,
      completedStepIds: [],
      currentStepId: cleanSteps[0]?.id || 'step-1'
    } as any);

    setIsMethodSelectionModalOpen(false);
    setPendingProcedureToStart(null);
    setCurrentTab('proceso');
    setInicioSubView('workspace');
  };

  // Add standard procedure to active in-progress pool when custom Checklist is started or Delegated
  const handleAddActiveProcedure = (
    proc: Procedure,
    currentPercentage: number,
    isDelegated: boolean,
    customReqs: Requirement[],
    currentStepId?: string,
    isQuiet?: boolean,
    isPaidParam?: boolean,
    completedStepIdsParam?: string[]
  ) => {
    const addAction = () => {
      const userProcedureId = String(proc.userProcedureId || '');
      // El estado transitorio también se identifica por la instancia, no por
      // el tipo de trámite del catálogo.
      const existsIdx = activeProcedures.findIndex(ap => ap.id === userProcedureId);
      
      const stepId = currentStepId || (existsIdx > -1 ? activeProcedures[existsIdx].currentStepId : (proc.steps[0]?.id || 'step-1'));

      const pctToUse = currentPercentage;
      const isPaidToUse = isPaidParam !== undefined 
        ? isPaidParam 
        : (existsIdx > -1 ? (activeProcedures[existsIdx].isPaid || false) : false);

      // Generate dynamic timeline based on actual curated steps of the procedure
      let dynamicTimeline: ActiveProcedure['timeline'] = [];
      if (proc.steps && proc.steps.length > 0) {
        const totalSteps = proc.steps.length;
        
        let completedStepsCount = 0;
        if (pctToUse >= 95 && pctToUse < 100) {
          completedStepsCount = totalSteps - 1;
        } else if (pctToUse === 100) {
          completedStepsCount = totalSteps;
        } else {
          // If the user is on a specific step, use that index as the active step
          const stepIndex = proc.steps.findIndex(s => s.id === stepId);
          completedStepsCount = stepIndex > -1 ? stepIndex : 0;
        }

        dynamicTimeline = proc.steps.map((step, idx) => {
          let status: 'completado' | 'actual' | 'pendiente' = 'pendiente';
          let time: string | undefined = undefined;
          
          if (idx < completedStepsCount) {
            status = 'completado';
            time = isDelegated ? "Validado con el asesor asignado" : "Validado por el usuario";
          } else if (idx === completedStepsCount) {
            status = 'actual';
            time = (idx === totalSteps - 1) 
              ? "Pendiente de recoger documento" 
              : (isDelegated ? "En gestión con el asesor asignado" : "En curso");
          } else {
            status = 'pendiente';
          }

          if (idx === totalSteps - 1 && pctToUse < 100 && completedStepsCount === totalSteps - 1) {
            status = 'actual';
            time = "Pendiente de recoger documento";
          } else if (idx === totalSteps - 1 && pctToUse === 100) {
            status = 'completado';
            time = "Trámite finalizado exitosamente";
          }

          return {
            title: step.title,
            status,
            time
          };
        });
      } else {
        dynamicTimeline = isDelegated ? [
          { title: "Preparación de requisitos personales", status: "completado" as const, time: "Validado" },
          { title: "Asignación del asesor seleccionado", status: "completado" as const, time: "Confirmada" },
          { title: "Gestión del expediente", status: "actual" as const, time: "En curso" },
          { title: "Entrega del resultado", status: "pendiente" as const, time: "Pendiente" }
        ] : [
          { title: "Preparación del trámite", status: "completado" as const, time: "Iniciada" },
          { title: "Revisión de requisitos", status: "actual" as const, time: "En curso" },
          { title: "Entrega del resultado", status: "pendiente" as const, time: "Pendiente" }
        ];
      }

      // Generate new active template
      const newActive: ActiveProcedure = {
        id: userProcedureId || `active-${Date.now()}`,
        procedureId: proc.id,
        title: proc.title,
        category: proc.category,
        currentStepId: stepId,
        startedAt: new Date().toISOString().split('T')[0],
        estimatedCompletion: isDelegated ? "En 48 horas con asesor" : "15 días hábiles",
        completionPercentage: pctToUse,
        isDelegated: isDelegated,
        isPaid: isPaidToUse,
        requirements: customReqs,
        completedStepIds: completedStepIdsParam || [],
        timeline: dynamicTimeline
      };

      if (existsIdx > -1) {
        // Overwrite state
        const copy = [...activeProcedures];
        copy[existsIdx] = {
          ...copy[existsIdx],
          completionPercentage: pctToUse,
          isDelegated: isDelegated,
          isPaid: isPaidToUse,
          requirements: customReqs,
          completedStepIds: completedStepIdsParam || copy[existsIdx].completedStepIds || [],
          currentStepId: stepId,
          timeline: dynamicTimeline
        };
        setActiveProcedures(copy);
      } else {
        setActiveProcedures(prev => [newActive, ...prev]);
      }

      if (!isQuiet && userProcedureId) void fetch(`/api/v1/my-procedures/${userProcedureId}/progress`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progressPercentage: pctToUse, currentStepId: stepId, completedStepIds: completedStepIdsParam || [] }),
      }).then(async response => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          console.warn('[procedure-progress]', payload.message || response.statusText);
        }
      }).catch(error => console.warn('[procedure-progress]', error));

      if (!isQuiet) {
        setToastMessage({
          title: isDelegated ? "¡Trámite Delegado!" : "Trámite registrado",
          desc: isDelegated 
            ? "Tu asesor fue asignado y la gestión acompañada ya está en curso."
            : "Se registró exitosamente en tu panel de 'En proceso'.",
          type: "success"
        });

        // Automatically transition to 'En proceso' tab to track
        setCurrentTab('proceso');
      }
    };

    if (!userProfile) {
      setAuthSuccessCallback(() => addAction);
      setIsAuthModalOpen(true);
      return;
    }

    addAction();
  };

  // Find procedure details by ID to allow easy checklist jump
  const handleSelectProcedureById = async (procedureId: string, userProcedureId?: string) => {
    const found = procedures.find(p => p.id === procedureId || p.databaseId === procedureId);
    if (found) {
      // Find custom requirements from active states if any
      const activeCopy = userProcedureId
        ? activeProcedures.find(ap => ap.id === userProcedureId)
        : activeProcedures.find(ap => ap.procedureId === procedureId || ap.procedureId === found.databaseId || ap.procedureId === found.id);
      if (activeCopy) {
        setIsDelegatedSelected(activeCopy.isDelegated);
        setSelectedProcedure({
          ...found,
          userProcedureId: userProcedureId || activeCopy.id,
          currentStepId: activeCopy.currentStepId,
          requirements: activeCopy.requirements,
          completedStepIds: activeCopy.completedStepIds || []
        } as any);
      } else {
        let persistedWorkspace: any = null;
        if (userProfile) {
          try {
            const workspaceUrl = userProcedureId
              ? `/api/v1/my-procedures/${userProcedureId}/workspace`
              : `/api/v1/my-procedures/by-procedure/${found.databaseId || procedureId}/workspace`;
            const response = await fetch(workspaceUrl, { credentials: 'include' });
            if (response.ok) persistedWorkspace = await response.json();
          } catch (error) {
            console.warn('[procedure-workspace]', error);
          }
        }
        const persistedRequirements = new Map<string, string>((persistedWorkspace?.requirements || []).map((item: any) => [item.requirementId, item.status]));
        const statusLabels: Record<string, Requirement['status']> = { approved: 'Aprobado', rejected: 'Corregir', uploaded: 'Validando', validating: 'Validando', pending: 'Pendiente' };
        const cleanRequirements: Requirement[] = found.requirements.map(r => ({
          ...r,
          status: statusLabels[persistedRequirements.get(r.id) || 'pending'] || 'Pendiente',
          userProcedureRequirementId: (persistedWorkspace?.requirements || []).find((item: any) => item.requirementId === r.id)?.instanceId,
          uploadedFileName: undefined,
          feedbackMessage: undefined,
          imageQuality: undefined,
          detectedErrors: undefined,
          recommendations: undefined,
          isValidated: false
        }));

        const completedStepIds: string[] = persistedWorkspace?.completedStepIds || [];
        const cleanSteps = found.steps.map(s => ({
          ...s,
          status: completedStepIds.includes(s.id) ? 'COMPLETADO' as const : 'PENDIENTE' as const
        }));

        setIsDelegatedSelected(Boolean(persistedWorkspace?.instance?.mode && persistedWorkspace.instance.mode !== 'self_service'));
        setSelectedProcedure({
          ...found,
          userProcedureId: persistedWorkspace?.instance?.id || userProcedureId,
          steps: cleanSteps,
          requirements: cleanRequirements,
          completedStepIds,
          currentStepId: persistedWorkspace?.instance?.currentStepId || cleanSteps[0]?.id || 'step-1'
        } as any);
      }
      setCurrentTab('proceso');
      setInicioSubView('workspace');
      trackEvent('tramite_revisado', {
        procedure_id: found.id,
        procedure_title: found.title,
        category: found.category
      });
    }
  };

  const handleDeleteActiveProcedure = async (userProcedureId: string, requestedAction: 'delete' | 'cancel') => {
    const target = activeProcedures.find(ap => ap.id === userProcedureId);
    if (target) {
      trackEvent(requestedAction === 'delete' ? 'tramite_eliminado' : 'tramite_cancelado', {
        procedure_id: target.procedureId,
        procedure_title: target.title,
        procedure_mode: target.isDelegated ? 'delegated' : 'self_service',
      });
    }

    try {
      const remove = (action: 'delete' | 'cancel', acknowledgeNoRefund = false) => fetch(`/api/v1/my-procedures/${userProcedureId}`, { method: 'DELETE', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, reason: action === 'cancel' ? 'Cancelado por el usuario desde su espacio de trabajo.' : 'Eliminado por el usuario antes de registrar avances.', acknowledgeNoRefund }) });
      let response = await remove(requestedAction, requestedAction === 'cancel');
      let payload = await response.json().catch(() => ({}));
      if (response.status === 409 && payload.error === 'cancellation_acknowledgement_required') {
        const confirmed = await confirmTramia({title:'Este trámite ya tiene avances',message:`${payload.message} Los pagos realizados no serán reembolsados.`,variant:'danger',confirmLabel:'Cancelar trámite',cancelLabel:'Volver'});
        if (!confirmed) return;
        response = await remove('cancel', true);
        payload = await response.json().catch(() => ({}));
      }
      if (!response.ok) throw new Error(payload.message || 'No pudimos retirar este trámite.');
      requestedAction = payload.cancelled ? 'cancel' : 'delete';
    } catch (error) {
      setToastMessage({ title: 'No pudimos actualizar el trámite', desc: error instanceof Error ? error.message : 'Inténtalo nuevamente.', type: 'error' });
      return;
    }
    setActiveProcedures(prev => prev.filter(ap => ap.id !== userProcedureId));
    setServerActiveProcedureCount(value => Math.max(0, value - 1));
    setSelectedProcedure(null);
    setInicioSubView('home');
    setCurrentTab('proceso');
    setToastMessage({
      title: requestedAction === 'cancel' ? 'Trámite cancelado' : 'Trámite eliminado',
      desc: requestedAction === 'cancel' ? 'Lo encontrarás en tu historial con el estado Cancelado.' : 'Se retiró porque todavía no tenía avances ni pagos.',
      type: 'success'
    });
  };

  // Notification / Alarm Renewal Trigger
  const handleTriggerReminderRenew = (reminder: ExpirationReminder) => {
    const correspondingProc = procedures.find(p => {
      if (reminder.type === 'DNI' && p.id === 'renovar-dni') return true;
      if (reminder.type === 'Pasaporte' && p.id === 'sacar-pasaporte') return true;
      if (reminder.type === 'Licencia' && p.id === 'licencia-conducir') return true;
      return false;
    });

    if (correspondingProc) {
      handleSelectProcedure(correspondingProc);
      setToastMessage({
        title: "Recordatorio activado",
        desc: `Abriendo el canal inteligente para renovar tu ${reminder.type} de forma proactiva.`,
        type: 'success'
      });
    } else {
      setToastMessage({
        title: "Monitoreo habilitado",
        desc: `Nuestros asesores de TramIA están verificando de forma externa el estado de tu ${reminder.type}.`,
        type: 'success'
      });
    }
  };

  const renderGuestTabPrompt = (tabName: string, desc: string) => {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-6 bg-white border border-gray-200 rounded-3xl shadow-sm space-y-6 my-12 animate-fadeIn" id="guest-tab-prompt">
        <div className="w-16 h-16 mx-auto bg-slate-50 text-slate-800 rounded-2xl flex items-center justify-center border border-gray-150">
          <Lock size={26} />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-extrabold text-slate-900">Se requiere iniciar sesión</h3>
          <p className="text-xs text-gray-500 leading-relaxed font-medium">
            {desc}
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            onClick={() => {
              setAuthSuccessCallback(() => () => setCurrentTab(currentTab));
              setIsAuthModalOpen(true);
            }}
            className="w-full py-3 bg-slate-950 hover:bg-slate-850 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99]"
          >
            Iniciar Sesión / Crear Cuenta
          </button>
          
          <button
            onClick={() => {
              setCurrentTab('inicio');
              setInicioSubView('home');
            }}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Explorar trámites gratuitos
          </button>
        </div>
      </div>
    );
  };

  const renderActiveTabContent = () => {
    return (
      <>
        {/* TAB 1: INICIO (HOME / SEARCH / DETAIL / WORKSPACE FLOWS) */}
        {currentTab === 'inicio' && (
          <>
            {inicioSubView === 'home' && (
              <HomeView
                onViewAll={() => { setSearchText(''); setCatalogCategory('Todos'); window.history.pushState({}, '', '/tramites'); setInicioSubView('catalog'); window.scrollTo({top:0}); }}
                onSelectCategory={(category) => { setSearchText(''); setCatalogCategory(category); window.history.pushState({}, '', `/tramites?categoria=${encodeURIComponent(category)}`); setInicioSubView('catalog'); window.scrollTo({top:0,behavior:'smooth'}); }}
                onStartSearch={() => {
                  setInicioSubView('search');
                }}
                onSelectProcedure={handleSelectProcedure}
                popularProcedures={procedures.filter(p => p.popular)}
                procedures={procedures}
                activeCount={inProgressProcedures.length}
                onViewActive={() => setCurrentTab('proceso')}
                activeProcedures={inProgressProcedures}
                reminders={reminders}
                userProfile={userProfile || undefined}
                onSelectProcedureById={handleSelectProcedureById}
                onTriggerReminder={handleTriggerReminderRenew}
                onTriggerLogin={handleTriggerLogin}
                onOpenPrivacy={() => openInstitutional('privacy')}
                onOpenInstitutional={(page) => openInstitutional(page)}
                onSearch={(text) => {
                  setSearchText(text);
                  setCatalogCategory('Todos');
                  window.history.pushState({}, '', `/tramites?q=${encodeURIComponent(text)}`);
                  setInicioSubView('catalog');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  trackEvent('buscar_tramite', { query: text });
                }}
              />
            )}

            {inicioSubView === 'privacy' && <PrivacyView onBack={closeInstitutional} />}
            {inicioSubView === 'about' && <AboutView onBack={closeInstitutional} />}
            {inicioSubView === 'terms' && <TermsView onBack={closeInstitutional} />}
            {inicioSubView === 'contact' && <ContactView onBack={closeInstitutional} />}
            {inicioSubView === 'verifyEmail' && <EmailVerificationView onOpenProfile={() => { window.history.replaceState({}, '', '/'); setCurrentTab(userProfile ? 'perfil' : 'inicio'); setInicioSubView('home'); if (!userProfile) handleTriggerLogin('login'); }} onLogin={() => handleTriggerLogin('login')} />}
            {inicioSubView === 'resetPassword' && <PasswordResetView
              onLogin={() => { window.history.replaceState({}, '', '/'); setInicioSubView('home'); setAuthModalInitialMode('login'); setIsAuthModalOpen(true); }}
              onRequestNew={() => { window.history.replaceState({}, '', '/'); setInicioSubView('home'); setAuthModalInitialMode('forgot'); setIsAuthModalOpen(true); }}
            />}
            {inicioSubView === 'catalog' && <CatalogView procedures={procedures} userProfile={userProfile} onBack={closeInstitutional} onSelectProcedure={handleSelectProcedure} onCreateAccount={()=>handleTriggerLogin('signup')} onLogin={()=>handleTriggerLogin('login')} initialQuery={searchText} initialCategory={catalogCategory} />}

            {inicioSubView === 'search' && (
              <SearchView
                procedures={procedures}
                onSelectProcedure={handleSelectProcedure}
                initialSearchText={searchText}
                onAddActiveProcedure={(proc, isDelegated) => {
                  const freshRequirements = proc.requirements.map(r => ({
                    ...r,
                    status: 'Pendiente' as const,
                    uploadedFileName: undefined,
                    feedbackMessage: undefined,
                    imageQuality: undefined,
                    detectedErrors: undefined,
                    recommendations: undefined,
                    isValidated: false
                  }));
                  handleAddActiveProcedure(proc, 0, isDelegated, freshRequirements);
                }}
                activeProcedures={activeProcedures}
              />
            )}

            {inicioSubView === 'detail' && selectedProcedure && (
              <ProcedureDetailView
                procedure={selectedProcedure}
                onBack={handleBackFromProcedureDetail}
                onStartProcedure={handleStartProcedure}
                userProfile={userProfile}
                onTriggerLogin={handleTriggerLogin}
              />
            )}

            {/* Workspace view is now rendered inside the 'proceso' tab block */}
          </>
        )}

        {/* TAB: PANEL (DASHBOARD) */}
        {currentTab === 'panel' && (
          !userProfile ? (
            renderGuestTabPrompt('Mi Panel', 'Sincroniza tu cuenta para acceder a tu panel de control, ver indicadores clave de tus trámites y gestionar alertas.')
          ) : (
            <PanelView
              onSelectProcedure={handleSelectProcedure}
              popularProcedures={procedures}
              activeCount={inProgressProcedures.length}
              onViewActive={() => setCurrentTab('proceso')}
              activeProcedures={inProgressProcedures}
              reminders={reminders}
              userProfile={userProfile || undefined}
              onSelectProcedureById={handleSelectProcedureById}
              onTriggerReminder={handleTriggerReminderRenew}
              onSearch={(text) => {
                setSearchText(text);
                setInicioSubView('search');
                setCurrentTab('inicio');
                trackEvent('buscar_tramite', { query: text });
              }}
              onStartSearch={() => {
                setCurrentTab('inicio');
                setInicioSubView('search');
              }}
            />
          )
        )}

        {/* TAB 2: ACTIVE PROCEDURES STATE OVERVIEW */}
        {(currentTab === 'proceso' || currentTab === 'historial') && (
          !userProfile ? (
            renderGuestTabPrompt('En proceso', 'Regístrate o inicia sesión para ver tus trámites en curso, cargar requisitos biográficos e interactuar con el validador.')
          ) : (
            selectedProcedure && inicioSubView === 'workspace' ? (
              <WorkspaceView
                key={String(selectedProcedure.userProcedureId || selectedProcedure.id)}
                procedure={selectedProcedure}
                onBack={() => {
                  setSelectedProcedure(null);
                  setInicioSubView('home');
                  setCurrentTab('proceso');
                }}
                onAddActiveProcedure={handleAddActiveProcedure}
                isNewUser={userProfile?.isNew}
                initialIsDelegated={isDelegatedSelected}
                initialDelegationOpen={openDelegationAfterStart}
                onDelegationOpened={() => setOpenDelegationAfterStart(false)}
                initialIsPaid={activeProcedures.find(ap => ap.id === String(selectedProcedure.userProcedureId || ''))?.isPaid}
                onDeleteProcedure={handleDeleteActiveProcedure}
              />
            ) : (
              <MyProceduresView
                onOpenProcedure={handleSelectProcedureById}
                onSummaryChange={(summary) => setServerActiveProcedureCount(summary.activeCount)}
                onExplore={() => {
                  setCurrentTab('inicio');
                  setInicioSubView('catalog');
                  window.history.pushState({}, '', '/tramites');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )
          )
        )}

        {/* TAB: VALIDADOR DE DOCUMENTOS CON IA */}
        {currentTab === 'validador' && (
          <DocumentValidationView
            userProfile={userProfile}
            onSelectProcedure={handleSelectProcedureById}
          />
        )}

        {/* TAB 3: DOCUMENT EXPIRATION LIST AND COMPLETED HISTORICS */}
        {false && currentTab === 'historial' && (
          !userProfile ? (
            renderGuestTabPrompt('Historial', 'Accede a tu cuenta ciudadana para consultar tu historial consolidado de trámites resueltos y renovaciones automáticas.')
          ) : (
            <HistoryView
              history={[]}
              activeCompletedProcedures={completedActiveProcedures}
              reminders={reminders}
              onTriggerReminderRenew={(type) => {
                // Find and trigger a reminder renewal directly
                const foundRem = reminders.find(r => r.type === type);
                if (foundRem) handleTriggerReminderRenew(foundRem);
              }}
              onSelectProcedure={handleSelectProcedure}
              onSelectProcedureById={handleSelectProcedureById}
              procedures={procedures}
            />
          )
        )}

        {/* TAB 4: PROFILE SETTINGS TABS (INFO, PAYMENTS, SECURITY) */}
        {currentTab === 'perfil' && (
          !userProfile ? (
            renderGuestTabPrompt('Perfil', 'Crea una cuenta para configurar tus direcciones, datos biométricos, clave digital y mesa de partes personalizada.')
          ) : (
            <div className="space-y-6">
              <ProfileView 
                profile={userProfile}
                onUpdateProfile={(updated) => {
                  setUserProfile(updated);
                  setToastMessage({
                    title: "Perfil Guardado",
                    desc: "Tus datos biográficos y de mesa de partes han sido registrados.",
                    type: "success"
                  });
                }}
              />
              {/* Elegant Logout control element */}
              <div className="max-w-3xl mx-auto flex justify-center pb-8">
                <button
                  onClick={async () => {
                    await logout();
                  }}
                  className="px-6 py-2.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-xl text-xs font-bold transition-all cursor-pointer font-sans duration-150 border border-red-200"
                >
                  Cerrar Sesión Ciudadana
                </button>
              </div>
            </div>
          )
        )}
      </>
    );
  };

  const isHomeView = currentTab === 'inicio' && inicioSubView === 'home';
  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 overflow-x-hidden antialiased font-sans">
      {/* Main SaaS panel Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen pb-16 md:pb-0">
        
        {/* Topbar navigation interface */}
        <Topbar
          onSearchFocus={handleTopSearchFocus}
          searchText={searchText}
          setSearchText={(txt) => {
            setSearchText(txt);
            if (inicioSubView !== 'search') setInicioSubView('search');
          }}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          reminders={reminders}
          onTriggerReminder={handleTriggerReminderRenew}
          profile={userProfile}
          sessionResolved={sessionResolved}
          onTriggerLogin={handleTriggerLogin}
          isHomeView={isHomeView}
          currentTab={currentTab}
          setCurrentTab={(tab) => {
            setSelectedProcedure(null);
            setOpenDelegationAfterStart(false);
            setCurrentTab(tab);
            if (tab === 'inicio') window.history.replaceState({}, '', '/');
          }}
          setInicioSubView={(view) => {
            setInicioSubView(view);
            if (view === 'home') window.history.replaceState({}, '', '/');
          }}
          activeCount={userProfile ? serverActiveProcedureCount : 0}
          onLogout={logout}
          sessionRemainingSeconds={sessionRemainingSeconds}
        />

        {/* Global Floating Toast Alert Status banner */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 animate-slideIn max-w-sm w-full bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl p-4 flex gap-3">
            <div className={`p-2 rounded-xl h-fit ${
              toastMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}>
              <Sparkles size={16} />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-xs text-white">{toastMessage.title}</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">{toastMessage.desc}</p>
            </div>
            
            <button 
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white h-fit p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Dynamic content canvas area */}
        <main className={`flex-1 w-full mx-auto ${currentTab === 'inicio' && ['home','catalog','privacy','about','terms','contact','verifyEmail','resetPassword'].includes(inicioSubView) ? 'max-w-none p-0' : 'max-w-6xl p-4 pb-8 sm:p-6 lg:p-8 space-y-8'}`}>
          {renderActiveTabContent()}
        </main>
      </div>

      {/* Auth Modal Overlay */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <LoginView 
            initialMode={authModalInitialMode}
            onClose={() => {
              setIsAuthModalOpen(false);
              setAuthSuccessCallback(null);
            }}
            onAuthSuccess={(profile) => {
              setUserProfile(profile);
              setIsAuthModalOpen(false);
              trackEvent('iniciar_sesion', { is_new_user: profile.isNew });
              if (profile.isNew) {
                setActiveProcedures([]);
                setReminders([]);
                setSelectedProcedure(null);
                setCurrentTab('perfil');
                setInicioSubView('home');
                window.history.replaceState({}, '', '/');
              }
              setToastMessage({
                title: "¡Perfil Sincronizado!",
                desc: `Bienvenido a TramIA, ${profile.fullName.split(' ')[0]}. Tu Copiloto inteligente se encuentra activo.`,
                type: 'success'
              });
              if (authSuccessCallback && !profile.isNew) {
                authSuccessCallback();
              }
              setAuthSuccessCallback(null);
            }}
          />
        </div>
      )}

      {/* Method Selection Modal Overlay */}
      {isMethodSelectionModalOpen && pendingProcedureToStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#06142f]/75 p-3 backdrop-blur-md sm:p-5" role="dialog" aria-modal="true" aria-labelledby="procedure-method-title" onMouseDown={(event)=>{if(event.target===event.currentTarget){setIsMethodSelectionModalOpen(false);setPendingProcedureToStart(null)}}}>
          <div className="relative my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-white/60 bg-[#f7faff] text-slate-950 shadow-[0_32px_100px_rgba(3,18,52,.38)] animate-scaleIn sm:max-h-[calc(100dvh-2.5rem)]">
            <button
              onClick={() => {
                setIsMethodSelectionModalOpen(false);
                setPendingProcedureToStart(null);
              }}
              className="absolute right-4 top-4 z-50 grid size-10 place-items-center rounded-full border border-white/20 bg-white/15 text-white backdrop-blur transition hover:bg-white/25 sm:right-5 sm:top-5"
              aria-label="Cerrar selección de modalidad"
            >
              <X size={19} />
            </button>

            <header className="relative overflow-hidden bg-[linear-gradient(120deg,#071a3d,#0d55c7_62%,#12afd1)] px-5 py-7 text-white sm:px-8 sm:py-8 lg:pr-64">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-size-[22px_22px]"/>
              <div className="relative max-w-2xl">
                <p className="text-[11px] font-black uppercase tracking-[.18em] text-cyan-200">Elige cómo quieres avanzar</p>
                <h3 id="procedure-method-title" className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">¿Cómo quieres realizar este trámite?</h3>
                <p className="mt-2 text-sm leading-6 text-blue-100">Puedes hacerlo con nuestra guía paso a paso o solicitar el acompañamiento de un asesor especializado.</p>
                <p className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold backdrop-blur"><ListChecks size={15} className="shrink-0 text-cyan-200"/><span className="truncate">{pendingProcedureToStart.title}</span></p>
              </div>
              <img src="/assets/mascot/tramia-bot-guiding.png" alt="TramIA te ayuda a elegir cómo realizar el trámite" className="absolute -bottom-6 right-10 hidden h-52 object-contain drop-shadow-2xl lg:block"/>
            </header>

            <div className="p-4 sm:p-6 lg:p-8">
              <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
                <article className="group flex flex-col overflow-hidden rounded-3xl border-2 border-blue-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-xl sm:p-6">
                  <div className="flex items-start gap-4"><span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-700"><UserCheck size={26}/></span><div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.12em] text-blue-700">Ruta guiada</span><h4 className="mt-2 text-xl font-black">Hazlo tú mismo</h4><p className="mt-1 text-sm leading-6 text-slate-600">Avanza a tu ritmo con instrucciones claras, checklist, documentos y alertas.</p></div></div>
                  <ul className="my-5 space-y-3 border-y border-slate-100 py-5 text-sm font-semibold text-slate-700"><Benefit text="Guía paso a paso para no omitir requisitos"/><Benefit text="Guarda tu avance y continúa cuando quieras"/><Benefit text="Recibe recordatorios de fechas importantes"/></ul>
                  <div className="mt-auto"><p className="mb-3 text-xs font-bold text-emerald-700">Sin costo por acompañamiento</p><button onClick={() => handleFinalizeProcedureStart(pendingProcedureToStart, false)} className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700" id="modal-myself-flow-btn">Empezar con la guía <ChevronRight size={17}/></button></div>
                </article>

                <article className="group relative flex flex-col overflow-hidden rounded-3xl border-2 border-violet-200 bg-[linear-gradient(145deg,#fff,#f5f3ff)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-xl sm:p-6">
                  <span className="relative mb-3 ml-auto inline-flex rounded-full bg-violet-600 px-3 py-1 text-[10px] font-black uppercase tracking-[.1em] text-white sm:absolute sm:right-4 sm:top-4 sm:mb-0">Con asesor</span>
                  <div className="flex items-start gap-4 sm:pr-14"><span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Headphones size={26}/></span><div><span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.12em] text-violet-700">Gestión acompañada</span><h4 className="mt-2 text-xl font-black">Delegar a TramIA</h4><p className="mt-1 text-sm leading-6 text-slate-600">Completa primero tus acciones personales y luego elige un asesor para continuar.</p></div></div>
                  <ul className="my-5 space-y-3 border-y border-violet-100 py-5 text-sm font-semibold text-slate-700"><Benefit text="Validación previa de los pasos que debes hacer" tone="violet"/><Benefit text="Elección de asesor según experiencia" tone="violet"/><Benefit text="Seguimiento del caso desde tu cuenta" tone="violet"/></ul>
                  <div className="mt-auto"><p className="mb-3 text-xs font-bold text-violet-700">{advisorPricing?.fromAmountMinor ? `Servicio desde ${new Intl.NumberFormat('es-PE',{style:'currency',currency:advisorPricing.currency||'PEN',minimumFractionDigits:2}).format(advisorPricing.fromAmountMinor/100)}` : 'Tarifa según el asesor elegido'}</p><button onClick={() => handleFinalizeProcedureStart(pendingProcedureToStart, true)} className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 px-5 text-sm font-black text-white shadow-lg shadow-violet-700/20 transition hover:bg-violet-800" id="modal-delegate-flow-btn">Revisar opción delegada <ChevronRight size={17}/></button></div>
                </article>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Benefit({text,tone='blue'}:{text:string;tone?:'blue'|'violet'}){return <li className="flex items-start gap-2.5"><CheckCircle2 size={18} className={`mt-0.5 shrink-0 ${tone==='violet'?'text-violet-600':'text-blue-600'}`}/><span>{text}</span></li>}
