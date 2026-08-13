import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CarFront,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileCheck2,
  Globe2,
  Headphones,
  HeartHandshake,
  Lightbulb,
  LockKeyhole,
  MapPinned,
  MessageCircle,
  Plane,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  UsersRound,
} from 'lucide-react';
import type { Procedure } from '../types';

interface HomeViewProps {
  onStartSearch: () => void;
  onViewAll?: () => void;
  onSelectCategory?: (category: string) => void;
  onSelectProcedure: (procedure: Procedure) => void;
  popularProcedures: Procedure[];
  procedures: Procedure[];
  onSearch?: (text: string) => void;
  activeCount?: number;
  onViewActive?: () => void;
  activeProcedures?: any[];
  reminders?: any[];
  userProfile?: any;
  onSelectProcedureById?: (id: string) => void;
  onTriggerReminder?: (reminder: any) => void;
  onTriggerLogin?: (mode?: 'login' | 'signup') => void;
  onOpenPrivacy?: () => void;
  onOpenInstitutional?: (page: 'about' | 'terms' | 'contact') => void;
}

const slides = [
  {
    eyebrow: 'Tu copiloto para trámites en Perú',
    title: 'Menos vueltas. Más claridad.',
    description: 'Encuentra el trámite correcto, conoce cada requisito y avanza con una ruta hecha para ti.',
    accent: 'linear-gradient(135deg, #123f9c 0%, #1769e0 56%, #16b8d4 100%)',
    mascot: '/assets/mascot/tramia-bot-idea.png',
    mascotAlt: 'TramIA tiene una idea para ayudarte a encontrar tu trámite',
    tip: 'Cuéntame qué necesitas lograr y encontraremos juntos el trámite correcto.',
    tipPosition: 'left-0 bottom-5 md:left-0 md:bottom-16',
  },
  {
    eyebrow: 'Un plan claro desde el primer paso',
    title: 'Todo tu trámite, en un solo lugar.',
    description: 'Organiza documentos, fechas, pagos y avances sin perder de vista lo que sigue.',
    accent: 'linear-gradient(135deg, #061735 0%, #0b2f72 52%, #1769e0 100%)',
    mascot: '/assets/mascot/tramia-bot-reading.png',
    mascotAlt: 'TramIA revisa el checklist de un trámite',
    tip: 'Revisa los requisitos antes de pagar una tasa. Así evitas duplicar costos.',
    tipPosition: 'right-0 top-1 md:right-0 md:top-10',
  },
  {
    eyebrow: 'Acompañamiento cuando lo necesites',
    title: 'Hazlo tú o pide ayuda experta.',
    description: 'TramIA te guía y, cuando sea posible, te conecta con un asesor especializado.',
    accent: 'linear-gradient(135deg, #2435a8 0%, #1457c7 54%, #1ba7e8 100%)',
    mascot: '/assets/mascot/tramia-bot-guiding.png',
    mascotAlt: 'TramIA señala el siguiente paso de tu ruta',
    tip: 'Avanza paso a paso y pide ayuda experta cuando realmente la necesites.',
    tipPosition: 'right-0 bottom-4 md:right-0 md:bottom-16',
  },
];

const moments = [
  { title: 'Abrir un negocio', subtitle: 'RUC, empresa y licencias', icon: Store, category: 'Negocios y tributación' },
  { title: 'Comprar un vehículo', subtitle: 'Transferencia y registros', icon: CarFront, category: 'Transporte' },
  { title: 'Viajar al extranjero', subtitle: 'Pasaporte y permisos', icon: Plane, category: 'Viajes y migraciones' },
  { title: 'Formalizar una unión', subtitle: 'Matrimonio y registros', icon: HeartHandshake, category: 'Familia y estado civil' },
  { title: 'Empezar una familia', subtitle: 'Actas e identidad', icon: UsersRound, category: 'Identidad y registro civil' },
];

// Bloque independiente: luego podrá reemplazarse por contenido publicado desde el panel administrativo.
const testimonialSection = {
  enabled: true,
  items: [
    { quote: 'Pude entender qué documentos necesitaba antes de empezar y organicé todo sin perderme entre distintas páginas.', name: 'María P.', context: 'Ruta de identidad', initials: 'MP' },
    { quote: 'La ruta paso a paso me ayudó a saber qué venía después y qué debía revisar antes de hacer un pago.', name: 'Carlos R.', context: 'Gestión de transporte', initials: 'CR' },
    { quote: 'Tener requisitos, fechas y enlaces oficiales en un solo lugar hizo que el proceso se sintiera mucho más claro.', name: 'Andrea L.', context: 'Trámite familiar', initials: 'AL' },
  ],
};

function quickLabel(procedure: Procedure) {
  const title = procedure.title.toLowerCase();
  if (title.includes('dni')) return 'DNI electrónico';
  if (title.includes('pasaporte')) return 'Pasaporte';
  if (title.includes('ruc')) return 'Obtener RUC';
  if (title.includes('empresa')) return 'Crear empresa';
  if (title.includes('licencia de conducir')) return 'Brevete A-I';
  if (title.includes('antecedentes')) return 'Antecedentes';
  if (title.includes('legaliz')) return 'Legalizar documento';
  if (title.includes('matrimonio')) return 'Matrimonio civil';
  return procedure.title.split(' ').slice(0, 4).join(' ');
}

export default function HomeView({
  onViewAll,
  onSelectCategory,
  onSelectProcedure,
  popularProcedures,
  procedures,
  onSearch,
  activeProcedures = [],
  userProfile,
  onViewActive,
  onTriggerLogin,
  onOpenPrivacy,
  onOpenInstitutional,
}: HomeViewProps) {
  const [query, setQuery] = useState('');
  const [slide, setSlide] = useState(() => Math.floor(Math.random() * slides.length));
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % slides.length), 7000);
    return () => window.clearInterval(timer);
  }, [paused]);

  const quickProcedures = useMemo(() => {
    const prioritized = popularProcedures.length ? popularProcedures : procedures;
    return prioritized.slice(0, 6);
  }, [popularProcedures, procedures]);
  const currentProcedure = activeProcedures[0];


  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (query.trim()) onSearch?.(query.trim());
  };

  const searchFor = (value: string) => {
    setQuery(value);
    onSearch?.(value);
  };

  const changeSlide = (direction: number) => {
    setSlide((current) => (current + direction + slides.length) % slides.length);
    setPaused(true);
  };

  return (
    <div className="min-h-screen bg-[#f8fbff] text-slate-950 font-sans" id="home-view-container">
      <section
        className="relative isolate overflow-hidden"
        style={{ backgroundImage: slides[slide].accent }}
        aria-roledescription="carousel"
        aria-label="Presentación principal de TramIA"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="absolute inset-0 -z-10 opacity-30" aria-hidden="true">
          <div className="absolute -left-20 top-8 h-72 w-72 rounded-full bg-cyan-300 blur-3xl" />
          <div className="absolute right-8 top-0 h-80 w-80 rounded-full bg-blue-300 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,.18)_1px,transparent_0)] bg-size-[24px_24px]" />
        </div>

        <div className="mx-auto grid min-h-[660px] max-w-7xl items-center gap-4 px-4 pb-28 pt-14 sm:px-6 md:grid-cols-[1.12fr_.88fr] lg:px-8 lg:pb-24 lg:pt-16">
          <div className="relative z-10 max-w-3xl text-white">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/12 px-3 py-1.5 text-xs font-bold backdrop-blur-md sm:text-sm">
              <Sparkles size={15} className="text-cyan-200" />
              {slides[slide].eyebrow}
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.03] tracking-[-0.045em] sm:text-5xl lg:text-6xl xl:text-7xl">
              {slides[slide].title}
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-blue-50 sm:text-lg lg:text-xl">
              {slides[slide].description}
            </p>

            <form onSubmit={submitSearch} className="mt-8 max-w-2xl" role="search">
              <label htmlFor="hero-search" className="sr-only">Buscar un trámite</label>
              <div className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-[0_24px_70px_rgba(4,22,61,.32)] sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
                  <Search className="shrink-0 text-blue-600" size={22} />
                  <input
                    id="hero-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="¿Qué trámite necesitas realizar?"
                    className="h-12 w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 sm:text-base"
                  />
                </div>
                <button type="submit" className="min-h-12 rounded-xl bg-blue-600 px-6 text-sm font-extrabold text-white transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  Encontrar mi ruta
                </button>
              </div>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-blue-100">
              <span className="font-bold">Trámites rápidos:</span>
              {quickProcedures.slice(0, 4).map((procedure) => (
                <button key={procedure.id} onClick={() => onSelectProcedure(procedure)} className="min-h-9 rounded-full border border-white/25 bg-white/10 px-3 font-semibold transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white">
                  {quickLabel(procedure)}
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex h-[270px] items-end justify-center md:h-full md:min-h-[500px]">
            <div className="absolute bottom-6 h-16 w-56 rounded-[50%] bg-slate-950/25 blur-2xl md:bottom-12 md:h-24 md:w-80" />
            <img
              key={slides[slide].mascot}
              src={slides[slide].mascot}
              alt={slides[slide].mascotAlt}
              className="relative z-10 max-h-[270px] w-auto animate-[fadeIn_.45s_ease-out] object-contain drop-shadow-[0_24px_24px_rgba(2,18,54,.32)] md:max-h-[520px] md:drop-shadow-[0_32px_30px_rgba(2,18,54,.4)]"
            />
            <div key={`tip-${slide}`} className={`absolute z-20 flex w-44 animate-[fadeIn_.35s_ease-out] items-start gap-2 rounded-2xl border border-white/30 bg-slate-950/35 p-3 text-white shadow-xl backdrop-blur-xl sm:w-52 sm:p-4 ${slides[slide].tipPosition}`}>
              <Lightbulb size={17} className="mt-0.5 shrink-0 text-cyan-200" aria-hidden="true" />
              <div><p className="text-xs font-extrabold">Consejo TramIA</p><p className="mt-1 text-[11px] leading-4 text-blue-50 sm:text-xs sm:leading-5">{slides[slide].tip}</p></div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
          <button onClick={() => changeSlide(-1)} className="grid size-10 place-items-center rounded-full border border-white/25 bg-slate-950/20 text-white backdrop-blur transition hover:bg-white/20" aria-label="Banner anterior"><ChevronLeft size={20} /></button>
          <div className="flex gap-2" role="tablist" aria-label="Seleccionar banner">
            {slides.map((_, index) => (
              <button key={index} onClick={() => { setSlide(index); setPaused(true); }} className={`h-2.5 rounded-full transition-all ${index === slide ? 'w-8 bg-white' : 'w-2.5 bg-white/45'}`} aria-label={`Mostrar banner ${index + 1}`} aria-current={index === slide} />
            ))}
          </div>
          <button onClick={() => changeSlide(1)} className="grid size-10 place-items-center rounded-full border border-white/25 bg-slate-950/20 text-white backdrop-blur transition hover:bg-white/20" aria-label="Banner siguiente"><ChevronRight size={20} /></button>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[.16em] text-blue-600">Rutas pensadas para tu vida</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Empieza por un momento importante</h2>
            </div>
            <button onClick={onViewAll} className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl px-3 text-sm font-bold text-blue-700 hover:bg-blue-50">Ver todos los trámites <ArrowRight size={17} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {moments.map(({ title, subtitle, icon: Icon, category }) => (
              <button key={title} onClick={() => onSelectCategory?.(category)} className="group flex min-h-48 flex-col items-center rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1.5 hover:border-blue-300 hover:shadow-[0_16px_36px_rgba(37,99,235,.14)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                <div className="grid size-20 place-items-center rounded-2xl bg-linear-to-br from-blue-50 to-cyan-50 text-blue-700 ring-1 ring-blue-100 transition duration-300 group-hover:scale-105 group-hover:from-blue-600 group-hover:to-cyan-500 group-hover:text-white group-hover:ring-blue-400"><Icon size={40} strokeWidth={1.8} /></div>
                <h3 className="mt-4 text-sm font-extrabold text-slate-950">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-extrabold text-blue-600">Explorar <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[linear-gradient(145deg,#fafdff_0%,#eef7ff_62%,#e8f4ff_100%)] py-14 sm:py-20">
        <div className="pointer-events-none absolute inset-0 opacity-50" aria-hidden="true"><div className="absolute -right-20 -top-24 size-96 rounded-full bg-cyan-100 blur-3xl" /><div className="absolute -bottom-32 left-1/3 size-96 rounded-full bg-blue-100 blur-3xl" /></div>
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:px-8">
          <div>
          <div className="max-w-xl">
            <p className="text-sm font-extrabold uppercase tracking-[.16em] text-blue-600">Acompañamiento claro</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">Así te acompaña <span className="text-blue-600">TramIA</span></h2>
            <p className="mt-4 text-base leading-7 text-slate-600">Un acompañamiento simple y claro en cada paso de tu trámite.</p>
          </div>

          <div className="relative mt-8 min-h-[350px]">
            <svg className="pointer-events-none absolute left-[10%] top-8 hidden h-28 w-[70%] sm:block" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden="true">
              <path d="M12 92 C115 92 90 58 205 58 S305 28 395 28 S500 28 588 18" fill="none" stroke="#bfdbfe" strokeWidth="16" strokeLinecap="round" opacity=".5" />
              <path d="M12 92 C115 92 90 58 205 58 S305 28 395 28 S500 28 588 18" fill="none" stroke="url(#routeGradient)" strokeWidth="5" strokeLinecap="round" />
              <defs><linearGradient id="routeGradient"><stop stopColor="#2563eb" /><stop offset="1" stopColor="#06b6d4" /></linearGradient></defs>
            </svg>

            <div className="relative grid gap-8 border-l-2 border-blue-200 pl-7 sm:grid-cols-[1fr_1fr_1fr_.72fr] sm:gap-3 sm:border-0 sm:pl-0">
              {[
                { number: '01', title: 'Descubre tu ruta', text: 'Cuéntanos tu objetivo y organizamos tu camino.', icon: Compass, offset: 'sm:mt-28' },
                { number: '02', title: 'Prepara documentos', text: 'Te indicamos qué necesitas y cómo obtenerlo.', icon: FileCheck2, offset: 'sm:mt-16' },
                { number: '03', title: 'Avanza con confianza', text: 'Sigue el checklist y conoce el siguiente paso.', icon: ShieldCheck, offset: 'sm:mt-0' },
              ].map(({ number, title, text, icon: Icon, offset }) => (
                <article key={number} className={`relative text-left sm:text-center ${offset}`}>
                  <span className="absolute -left-[2.65rem] top-6 grid size-8 place-items-center rounded-full bg-blue-600 text-[11px] font-black text-white shadow-lg shadow-blue-600/25 sm:left-1/2 sm:top-0 sm:z-20 sm:-translate-x-[3.7rem]">{number}</span>
                  <div className="grid size-20 place-items-center rounded-full border-[6px] border-white bg-linear-to-br from-blue-50 to-white text-blue-700 shadow-[0_12px_32px_rgba(37,99,235,.18)] ring-1 ring-blue-100 sm:mx-auto"><Icon size={34} strokeWidth={1.7} /></div>
                  <h3 className="mt-4 text-sm font-black text-slate-950">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{text}</p>
                </article>
              ))}
              <div className="hidden items-end justify-center self-start sm:flex">
                <img src="/assets/mascot/tramia-bot-superhero.png" alt="TramIA celebra que completaste tu ruta" className="mt-1 max-h-48 w-auto object-contain drop-shadow-[0_15px_20px_rgba(27,72,140,.2)]" />
              </div>
            </div>
            <div className="mt-7 flex justify-center sm:hidden"><img src="/assets/mascot/tramia-bot-superhero.png" alt="TramIA celebra que completaste tu ruta" className="max-h-52 object-contain" /></div>
          </div>
          </div>

          <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_18px_60px_rgba(27,72,140,.12)] sm:p-7">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.14em] text-blue-600">Tu ruta en un solo lugar</p><h3 className="mt-2 text-xl font-black">{currentProcedure?.title || 'Tu próximo trámite'}</h3></div><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-700"><MapPinned size={23} /></div></div>
            <div className="mt-7"><div className="mb-2 flex justify-between text-xs font-bold"><span>Progreso de tu plan</span><span>{currentProcedure?.completionPercentage || 60}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-linear-to-r from-blue-600 to-cyan-400" style={{ width: `${currentProcedure?.completionPercentage || 60}%` }} /></div></div>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-blue-700 shadow-sm"><FileCheck2 size={21} /></div><div className="min-w-0 flex-1"><p className="text-xs font-bold text-blue-600">Siguiente acción</p><p className="mt-1 text-sm font-extrabold">{currentProcedure?.timeline?.find((item: any) => item.status === 'actual')?.title || 'Revisar los requisitos del trámite'}</p><p className="mt-1 text-xs text-slate-500">Te avisaremos antes de cada fecha importante.</p></div></div></div>
            {userProfile && currentProcedure ? <button onClick={onViewActive} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white hover:bg-blue-700">Continuar mi trámite <ArrowRight size={17} /></button> : <><button onClick={() => onTriggerLogin?.('signup')} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-extrabold text-white hover:bg-blue-700">Crear mi ruta gratuita <ArrowRight size={17} /></button><p className="mt-2 text-center text-[11px] text-slate-500">¿Ya tienes cuenta? <button onClick={() => onTriggerLogin?.('login')} className="font-black text-blue-700 hover:underline">Inicia sesión</button></p></>}
          </div>
        </div>
      </section>

      {testimonialSection.enabled && <TestimonialsSection />}

      <section className="border-y border-slate-200 bg-white py-7 sm:py-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-y-6 px-4 min-[420px]:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:gap-y-0 lg:px-8">
          {[
            { title: 'Información confiable', text: 'Fuentes oficiales identificadas y fechadas.', icon: ShieldCheck },
            { title: 'Tus datos protegidos', text: 'Privacidad incorporada desde el diseño.', icon: LockKeyhole },
            { title: 'Accesible para todos', text: 'Experiencia clara en cualquier dispositivo.', icon: Check },
            { title: 'Estamos para ayudarte', text: 'Orientación digital y humana cuando corresponda.', icon: Headphones },
          ].map(({ title, text, icon: Icon }, index) => (
            <div key={title} className={`flex items-center gap-3 px-1 min-[420px]:px-4 lg:px-6 ${index % 2 === 1 ? 'min-[420px]:border-l min-[420px]:border-slate-200' : ''} ${index > 0 ? 'lg:border-l lg:border-slate-200' : 'lg:border-l-0'}`}>
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-blue-50 to-cyan-50 text-blue-700 ring-1 ring-blue-100"><Icon size={29} strokeWidth={1.8} /></div>
              <div className="min-w-0"><h3 className="text-[13px] font-extrabold leading-5 text-slate-950">{title}</h3><p className="mt-0.5 text-[11px] leading-[1.15rem] text-slate-500">{text}</p></div>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-[#061735] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div><p className="text-2xl font-black tracking-tight">Tram<span className="text-cyan-400">IA</span></p><p className="mt-2 text-sm text-slate-300">Trámites claros, simples y acompañados.</p></div>
          <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-300" aria-label="Información institucional">
            <a href="/sobre-tramia" onClick={(event) => { event.preventDefault(); onOpenInstitutional?.('about'); }} className="hover:text-white">Sobre TramIA</a><a href="/privacidad" onClick={(event) => { event.preventDefault(); onOpenPrivacy?.(); }} className="hover:text-white">Privacidad</a><a href="/terminos" onClick={(event) => { event.preventDefault(); onOpenInstitutional?.('terms'); }} className="hover:text-white">Términos de uso</a><a href="/api/docs" target="_blank" rel="noopener noreferrer" className="hover:text-white">API y Swagger</a><a href="/contacto" onClick={(event) => { event.preventDefault(); onOpenInstitutional?.('contact'); }} className="hover:text-white">Contacto</a>
          </nav>
          <CountrySelector />
        </div>
      </footer>
    </div>
  );
}

function TestimonialsSection() {
  return <section className="relative overflow-hidden bg-white py-12 sm:py-16" aria-labelledby="testimonials-title">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_10%,rgba(37,99,235,.07),transparent_28%),radial-gradient(circle_at_92%_80%,rgba(6,182,212,.08),transparent_25%)]" />
    <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Experiencias que inspiran</p><h2 id="testimonials-title" className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Trámites que se sienten más claros</h2><p className="mt-3 text-sm leading-6 text-slate-500">Así queremos que se sienta avanzar con TramIA: con orden, orientación y confianza en cada paso.</p></div>
        <span className="w-fit rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-blue-700">Experiencias referenciales</span>
      </div>
      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {testimonialSection.items.map((item, index) => <article key={item.name} className={`group relative flex min-h-64 flex-col overflow-hidden rounded-[1.75rem] border p-5 shadow-[0_12px_35px_rgba(15,60,120,.07)] transition hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(15,80,170,.13)] sm:p-6 ${index===1?'border-blue-200 bg-[linear-gradient(145deg,#f7faff,#eef9ff)]':'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-600"><MessageCircle size={22}/></span><div className="flex gap-0.5 text-amber-400" aria-label="5 estrellas">{[0,1,2,3,4].map(star=><Star key={star} size={14} fill="currentColor"/>)}</div></div>
          <blockquote className="mt-5 flex-1 text-sm font-semibold leading-6 text-slate-700">“{item.quote}”</blockquote>
          <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4"><span className="grid size-10 place-items-center rounded-full bg-[linear-gradient(135deg,#0e55c7,#13afd1)] text-xs font-black text-white">{item.initials}</span><div><p className="text-sm font-black text-slate-950">{item.name}</p><p className="text-[11px] font-semibold text-slate-500">{item.context}</p></div></div>
        </article>)}
      </div>
    </div>
  </section>;
}

function CountrySelector() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!containerRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return <div ref={containerRef} className="relative w-fit">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="listbox" className="inline-flex min-h-11 items-center gap-2.5 rounded-xl border border-white/15 bg-white/5 px-3.5 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300">
      <span className="grid size-7 place-items-center rounded-lg bg-white/10 text-base" aria-hidden="true">🇵🇪</span>
      <span>Perú</span>
      <ChevronDown size={15} className={`ml-1 text-cyan-200 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div role="listbox" aria-label="Seleccionar país" className="absolute bottom-[calc(100%+.6rem)] right-0 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-[0_20px_55px_rgba(0,0,0,.28)] animate-fadeIn">
      <button type="button" role="option" aria-selected="true" onClick={() => setOpen(false)} className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-blue-50 px-3 text-left">
        <span className="grid size-8 place-items-center rounded-lg bg-white text-lg shadow-sm" aria-hidden="true">🇵🇪</span>
        <span className="min-w-0 flex-1"><strong className="block text-sm text-slate-950">Perú</strong><span className="block text-[10px] text-slate-500">País seleccionado</span></span>
        <Check size={17} className="text-blue-600" />
      </button>
      <div className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-slate-400"><span className="grid size-8 place-items-center rounded-lg bg-slate-100"><Globe2 size={16}/></span><span><strong className="block text-xs text-slate-500">Más países</strong><span className="text-[10px]">Próximamente en TramIA</span></span></div>
    </div>}
  </div>;
}
