import React, { useState, useEffect, useMemo, useRef } from 'react';
import Topbar from './components/Topbar';
import HomeView from './components/HomeView';
import PrivacyView from './components/PrivacyView';
import AboutView from './components/AboutView';
import TermsView from './components/TermsView';
import ContactView from './components/ContactView';
import EmailVerificationView from './components/EmailVerificationView';
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

import { INITIAL_ACTIVE_PROCEDURES, EXPIRATION_REMINDERS } from './data';
import { loadProcedureCatalog } from './services/catalog';
import { Procedure, ActiveProcedure, ExpirationReminder, Requirement, UserProfile } from './types';
import { Sparkles, Calendar, Bell, ShieldX, X, Home, Clock, History, User, LayoutDashboard, Lock, UserCheck, ShieldCheck, ChevronRight } from 'lucide-react';

export default function App() {
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
  type InicioView = 'home' | 'catalog' | 'search' | 'detail' | 'workspace' | 'privacy' | 'about' | 'terms' | 'contact' | 'verifyEmail';
  const initialInstitutionalView = (): InicioView => ({ '/tramites': 'catalog', '/privacidad': 'privacy', '/sobre-tramia': 'about', '/terminos': 'terms', '/contacto': 'contact', '/verificar-correo': 'verifyEmail' }[window.location.pathname] as InicioView || 'home');
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

  // Completion mode selection modal (Hazlo tú mismo vs Delegar)
  const [isMethodSelectionModalOpen, setIsMethodSelectionModalOpen] = useState(false);
  const [pendingProcedureToStart, setPendingProcedureToStart] = useState<Procedure | null>(null);

  // Mobile sidebar visibility state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Reminders and active procedures with localStorage persistence
  const [activeProcedures, setActiveProcedures] = useState<ActiveProcedure[]>(() => {
    try {
      const saved = localStorage.getItem('tramia_active_procedures');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_ACTIVE_PROCEDURES;
  });

  useEffect(() => {
    try {
      localStorage.setItem('tramia_active_procedures', JSON.stringify(activeProcedures));
    } catch (e) {
      console.error(e);
    }
  }, [activeProcedures]);

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
  const [sessionRemainingSeconds, setSessionRemainingSeconds] = useState(15 * 60);

  const logout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
    setUserProfile(null); setCurrentTab('inicio'); setInicioSubView('home'); setSessionRemainingSeconds(15 * 60);
    window.history.replaceState({}, '', '/');
  };

  // Restore the server-backed HttpOnly session without exposing its token to JavaScript.
  useEffect(() => {
    let active = true;
    fetch('/api/v1/auth/session', { credentials: 'include' })
      .then(async (response) => response.ok ? response.json() : { user: null })
      .then((result) => { if (active) setUserProfile(result.user || null); })
      .catch(() => undefined);
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
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'signup'>('login');
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
  const handleFinalizeProcedureStart = (proc: Procedure, isDelegated: boolean) => {
    setIsDelegatedSelected(isDelegated);
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

    const activeCopy = activeProcedures.find(ap => ap.procedureId === proc.id);

    if (activeCopy) {
      // Continuing existing active procedure: restore saved requirements, completedStepIds, and current step
      setSelectedProcedure({
        ...proc,
        requirements: activeCopy.requirements,
        completedStepIds: activeCopy.completedStepIds || [],
        currentStepId: activeCopy.currentStepId
      } as any);
    } else {
      // Starting a brand new procedure: start 100% clean with 0% progress and pending requirements
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

      const cleanSteps = proc.steps.map(s => ({
        ...s,
        status: 'PENDIENTE' as const
      }));

      setSelectedProcedure({
        ...proc,
        steps: cleanSteps,
        requirements: cleanRequirements,
        completedStepIds: [],
        currentStepId: cleanSteps[0]?.id || 'step-1'
      } as any);

      // Remove any stale copy
      setActiveProcedures(prev => prev.filter(ap => ap.procedureId !== proc.id));
    }

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
      // Check if copy already exists in current list
      const existsIdx = activeProcedures.findIndex(ap => ap.procedureId === proc.id);
      
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
            time = isDelegated ? "Validado por Rodrigo" : "Validado por usuario";
          } else if (idx === completedStepsCount) {
            status = 'actual';
            time = (idx === totalSteps - 1) 
              ? "Pendiente de recoger documento" 
              : (isDelegated ? "En gestión por Rodrigo" : "En curso");
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
          { title: "Pago de Tasa Especial", status: "completado" as const, time: "Hoy, validado" },
          { title: "Asignación Premium de Asesor Rodrigo", status: "completado" as const, time: "Hace unos minutos" },
          { title: "Rodrigo consolidando expedientes notariales", status: "actual" as const, time: "En revisión final" },
          { title: "Recoger el documento en la oficina", status: "pendiente" as const, time: "Pendiente de recojo" }
        ] : [
          { title: "Arranque inicial de trámite", status: "completado" as const, time: "Hoy" },
          { title: "Carga de documentos revisados por TramIA", status: "actual" as const, time: "En curso" },
          { title: "Recoger el documento en la oficina", status: "pendiente" as const, time: "Pendiente de recojo" }
        ];
      }

      // Generate new active template
      const newActive: ActiveProcedure = {
        id: `active-${Date.now()}`,
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
        setActiveProcedures([newActive, ...activeProcedures]);
      }

      if (!isQuiet) {
        setToastMessage({
          title: isDelegated ? "¡Trámite Delegado!" : "Trámite registrado",
          desc: isDelegated 
            ? "El asesor Rodrigo ha tomado tu caso e inició los aranceles del 80%." 
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
  const handleSelectProcedureById = (procedureId: string) => {
    const found = procedures.find(p => p.id === procedureId);
    if (found) {
      // Find custom requirements from active states if any
      const activeCopy = activeProcedures.find(ap => ap.procedureId === procedureId);
      if (activeCopy) {
        setIsDelegatedSelected(activeCopy.isDelegated);
        setSelectedProcedure({
          ...found,
          currentStepId: activeCopy.currentStepId,
          requirements: activeCopy.requirements,
          completedStepIds: activeCopy.completedStepIds || []
        } as any);
      } else {
        const cleanRequirements: Requirement[] = found.requirements.map(r => ({
          ...r,
          status: 'Pendiente',
          uploadedFileName: undefined,
          feedbackMessage: undefined,
          imageQuality: undefined,
          detectedErrors: undefined,
          recommendations: undefined,
          isValidated: false
        }));

        const cleanSteps = found.steps.map(s => ({
          ...s,
          status: 'PENDIENTE' as const
        }));

        setSelectedProcedure({
          ...found,
          steps: cleanSteps,
          requirements: cleanRequirements,
          completedStepIds: [],
          currentStepId: cleanSteps[0]?.id || 'step-1'
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

  const handleDeleteActiveProcedure = (procedureId: string) => {
    const target = activeProcedures.find(ap => ap.procedureId === procedureId);
    if (target) {
      if (target.isDelegated) {
        trackEvent('tramite_delegado_eliminado', {
          procedure_id: procedureId,
          procedure_title: target.title
        });
      } else {
        trackEvent('tramite_auto_eliminado', {
          procedure_id: procedureId,
          procedure_title: target.title
        });
      }
    }

    setActiveProcedures(prev => prev.filter(ap => ap.procedureId !== procedureId));
    setSelectedProcedure(null);
    setInicioSubView('home');
    setCurrentTab('proceso');
    setToastMessage({
      title: 'Trámite eliminado',
      desc: 'El trámite ha sido eliminado de tus procesos en curso.',
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
                procedure={selectedProcedure}
                onBack={() => {
                  setSelectedProcedure(null);
                  setInicioSubView('home');
                  setCurrentTab('proceso');
                }}
                onAddActiveProcedure={handleAddActiveProcedure}
                isNewUser={userProfile?.isNew}
                initialIsDelegated={isDelegatedSelected}
                initialIsPaid={activeProcedures.find(ap => ap.procedureId === selectedProcedure.id)?.isPaid}
                onDeleteProcedure={handleDeleteActiveProcedure}
              />
            ) : (
              <MyProceduresView
                onOpenProcedure={handleSelectProcedureById}
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
          onTriggerLogin={handleTriggerLogin}
          isHomeView={isHomeView}
          currentTab={currentTab}
          setCurrentTab={(tab) => {
            setCurrentTab(tab);
            if (tab === 'inicio') window.history.replaceState({}, '', '/');
          }}
          setInicioSubView={(view) => {
            setInicioSubView(view);
            if (view === 'home') window.history.replaceState({}, '', '/');
          }}
          activeCount={inProgressProcedures.length}
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
        <main className={`flex-1 w-full mx-auto ${currentTab === 'inicio' && ['home','catalog','privacy','about','terms','contact','verifyEmail'].includes(inicioSubView) ? 'max-w-none p-0' : 'max-w-6xl p-4 pb-8 sm:p-6 lg:p-8 space-y-8'}`}>
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
                setCurrentTab('panel');
                setInicioSubView('home');
              }
              setToastMessage({
                title: "¡Perfil Sincronizado!",
                desc: `Bienvenido a TramIA, ${profile.fullName.split(' ')[0]}. Tu Copiloto inteligente se encuentra activo.`,
                type: 'success'
              });
              if (authSuccessCallback) {
                authSuccessCallback();
                setAuthSuccessCallback(null);
              }
            }}
          />
        </div>
      )}

      {/* Method Selection Modal Overlay */}
      {isMethodSelectionModalOpen && pendingProcedureToStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-slate-950 border border-slate-800 text-white rounded-3xl p-6 md:p-8 shadow-2xl animate-scaleIn space-y-6">
            
            {/* Close Button */}
            <button
              onClick={() => {
                setIsMethodSelectionModalOpen(false);
                setPendingProcedureToStart(null);
              }}
              className="absolute right-6 top-6 z-50 p-2 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded-full cursor-pointer transition-colors shadow-xs"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>

            <div className="text-center space-y-2 max-w-lg mx-auto">
              <h3 className="text-lg md:text-xl font-black tracking-tight text-white">¿Cómo te gustaría completar este trámite?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Elige la modalidad de trabajo para que TramIA prepare tu asistencia en tiempo real.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 text-left">
              
              {/* Option 1: Do it myself */}
              <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 flex flex-col justify-between space-y-5 transition-all">
                <div className="space-y-3">
                  <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl w-fit">
                    <UserCheck size={20} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-white">Opción 1: Hazlo tú mismo</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      TramIA te guiará paso a paso en todo el proceso de manera interactiva.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleFinalizeProcedureStart(pendingProcedureToStart, false)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  id="modal-myself-flow-btn"
                >
                  Iniciar procedimiento
                  <ChevronRight size={13} />
                </button>
              </div>

              {/* Option 2: Delegate to TramIA */}
              <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 flex flex-col justify-between space-y-5 transition-all">
                <div className="space-y-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl w-fit">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-white">Opción 2: Delegar a TramIA</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Un asesor experto de TramIA se encargará de realizar el trámite administrativo por ti.
                    </p>
                    <div className="pt-2">
                      <span className="text-xs font-extrabold text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 inline-block">
                        Costo estimado: {pendingProcedureToStart.feeAmount || 'S/ 65.00'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleFinalizeProcedureStart(pendingProcedureToStart, true)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  id="modal-delegate-flow-btn"
                >
                  Delegar procedimiento
                  <ChevronRight size={13} />
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
