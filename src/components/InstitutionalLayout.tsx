import React from 'react';
import { ArrowLeft, ArrowUp, ChevronRight } from 'lucide-react';
import TramIALogo from './TramIALogo';

export interface PageSection { id: string; label: string; }
interface Props { eyebrow: string; title: string; intro: string; mascot: string; mascotAlt: string; sections?: PageSection[]; onBack: () => void; children: React.ReactNode; badge?: string; showBackToTop?: boolean; }

export default function InstitutionalLayout({ eyebrow, title, intro, mascot, mascotAlt, sections = [], onBack, children, badge, showBackToTop = true }: Props) {
  return <div className="min-h-screen bg-[var(--tramia-canvas-soft)] text-[var(--tramia-text)]" id="page-top">
    <header className="relative overflow-hidden bg-[linear-gradient(135deg,#071a3d_0%,#0e48aa_62%,#12a7cd_100%)] text-white">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-size-[24px_24px]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-7 px-4 py-9 sm:px-6 sm:py-12 md:grid-cols-[1fr_250px] lg:px-8">
        <div><button onClick={onBack} className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-bold backdrop-blur transition hover:bg-white/20"><ArrowLeft size={16} /> Regresar al inicio</button><div className="mb-5"><TramIALogo iconSize={34} textSize="text-2xl" variant="dark" onClick={onBack} className="w-fit" /></div><p className="text-sm font-black uppercase tracking-[.16em] text-cyan-200">{eyebrow}</p><h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">{title}</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-blue-50 sm:text-base">{intro}</p>{badge && <span className="mt-5 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold">{badge}</span>}</div>
        <img src={mascot} alt={mascotAlt} className="mx-auto hidden max-h-60 object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,.25)] md:block" />
      </div>
    </header>
    <main className={`mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:px-6 lg:px-8 lg:py-10 ${sections.length ? 'lg:grid-cols-[240px_minmax(0,1fr)]' : ''}`}>
      {sections.length > 0 && <aside className="lg:sticky lg:top-24 lg:self-start"><nav className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm" aria-label="Contenido de la página"><p className="px-2 text-xs font-black uppercase tracking-[.14em] text-blue-600">En esta página</p><ul className="mt-3 space-y-1">{sections.map((s) => <li key={s.id}><a href={`#${s.id}`} className="flex min-h-10 items-center justify-between rounded-lg px-2 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700">{s.label}<ChevronRight size={15} /></a></li>)}</ul></nav></aside>}
      <article className="min-w-0 space-y-5">{children}{showBackToTop && <div className="flex justify-center pt-2"><a href="#page-top" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-extrabold text-blue-700 shadow-sm hover:bg-blue-50"><ArrowUp size={17} /> Volver arriba</a></div>}</article>
    </main>
    {showBackToTop && <a href="#page-top" aria-label="Volver arriba" className="fixed bottom-5 right-5 z-30 grid size-11 place-items-center rounded-full bg-blue-600 text-white shadow-[0_10px_30px_rgba(37,99,235,.35)] transition hover:-translate-y-1 hover:bg-blue-700"><ArrowUp size={19} /></a>}
  </div>;
}

export function ContentCard({ id, icon: Icon, title, children }: { id?: string; icon: React.ElementType; title: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex items-center gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon size={20} /></div><h2 className="text-lg font-black sm:text-xl">{title}</h2></div><div className="space-y-3 text-[13px] leading-6 text-slate-600 [&_a]:font-bold [&_a]:text-blue-700 [&_a]:underline [&_li]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-5">{children}</div></section>;
}
