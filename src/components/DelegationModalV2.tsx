import { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import PaymentBrandLogo, { paymentBrandName, paymentBrandTheme } from './PaymentBrandLogo';
import PaymentProcessingOverlay from './PaymentProcessingOverlay';

type Advisor = {
  userId: string;
  publicName: string;
  avatarUrl?: string;
  idVerified?: boolean;
  averageRating: string | number;
  completedCasesCount: number;
  baseFeeMinor: number;
};

type PaymentMethod = {
  id: string;
  brand: string;
  lastFour: string;
  isDefault?: boolean;
};

export default function DelegationModalV2({
  item,
  onClose,
  onSaved,
}: {
  item: { id: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [data, setData] = useState<any>();
  const [prerequisites, setPrerequisites] = useState<any>();
  const [cards, setCards] = useState<PaymentMethod[]>([]);
  const [advisorId, setAdvisorId] = useState('');
  const [cardId, setCardId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'processing' | 'approved' | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [delegationResponse, prerequisiteResponse, cardResponse] = await Promise.all([
        fetch(`/api/v1/my-procedures/${item.id}/delegation`, { credentials: 'include' }),
        fetch(`/api/v1/my-procedures/${item.id}/delegation-prerequisites`, { credentials: 'include' }),
        fetch('/api/v1/payment-methods', { credentials: 'include' }),
      ]);
      const [delegation, required, cardPayload] = await Promise.all([
        delegationResponse.json(),
        prerequisiteResponse.json(),
        cardResponse.json(),
      ]);
      if (!delegationResponse.ok || !prerequisiteResponse.ok || !cardResponse.ok) {
        throw new Error(delegation.message || required.message || cardPayload.message || 'No pudimos preparar la delegación.');
      }
      setData(delegation);
      setPrerequisites(required);
      const methods = cardPayload.methods || [];
      setCards(methods);
      setCardId(methods.find((card: PaymentMethod) => card.isDefault)?.id || methods[0]?.id || '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos preparar la delegación.');
      setData({ delegation: null, advisors: [] });
      setPrerequisites({ ready: false, steps: [] });
    }
  }, [item.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const post = async (url: string, body: unknown) => {
    setSaving(true);
    setError('');
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) setError(payload.message || 'No pudimos continuar.');
    return response;
  };

  const ready = Boolean(prerequisites?.ready);
  const selectedCard = cards.find((card) => card.id === cardId);
  const currentStage = !ready ? 1 : !data?.delegation ? 2 : data.delegation.status === 'awaiting_payment' ? 3 : 4;

  const confirmPayment = async () => {
    if (!cardId || !selectedCard) return;
    setSaving(true);
    setError('');
    setPaymentStatus('processing');
    try {
      const [response] = await Promise.all([
        fetch(`/api/v1/my-procedures/${item.id}/delegation/payment`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMethodId: cardId }),
        }),
        new Promise((resolve) => window.setTimeout(resolve, 900)),
      ]);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'No pudimos procesar el pago.');
      setPaymentStatus('approved');
      window.setTimeout(onSaved, 1600);
    } catch (cause) {
      setPaymentStatus(null);
      setSaving(false);
      setError(cause instanceof Error ? cause.message : 'No pudimos procesar el pago.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-3 backdrop-blur-sm">
      <div className="relative max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
        {paymentStatus && selectedCard && <PaymentProcessingOverlay brand={selectedCard.brand} status={paymentStatus} />}
        <header className="relative overflow-hidden bg-gradient-to-r from-[#071a3d] via-blue-700 to-cyan-500 p-6 text-white sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-size-[20px_20px] opacity-15" />
          <button onClick={onClose} aria-label="Cerrar" className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-white/15 transition hover:bg-white/25"><X /></button>
          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[.18em] text-cyan-200">Gestión acompañada</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">Delegar a TramIA</h2>
            <p className="mt-2 max-w-xl text-sm text-blue-100">Completa tus acciones personales, elige un especialista y confirma un pago de prueba.</p>
          </div>
        </header>

        {!data || !prerequisites ? (
          <LoaderCircle className="mx-auto my-16 animate-spin text-blue-600" />
        ) : (
          <div className="space-y-5 p-5 sm:p-7">
            <nav aria-label="Etapas de la delegación" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[['Preparación', 1], ['Asesor', 2], ['Pago', 3], ['Seguimiento', 4]].map(([label, value]) => {
                const stage = Number(value);
                const completed = stage < currentStage;
                const active = stage === currentStage;
                return <div key={String(label)} className={`rounded-2xl border px-3 py-3 ${active ? 'border-violet-300 bg-violet-50 text-violet-800' : completed ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                  <span className={`grid size-7 place-items-center rounded-full text-[11px] font-black ${active ? 'bg-violet-700 text-white' : completed ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{completed ? <CheckCircle2 size={15}/> : stage}</span>
                  <strong className="mt-2 block text-xs">{label}</strong>
                </div>;
              })}
            </nav>
            <section className={`rounded-3xl border p-5 ${ready ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className="flex items-start gap-3">
                {ready ? <CheckCircle2 className="shrink-0 text-emerald-600" /> : <LockKeyhole className="shrink-0 text-amber-700" />}
                <div><h3 className="font-black">1. Completa tus pasos personales</h3><p className="mt-1 text-xs leading-5 text-slate-600">Tu asesor no puede realizar estas acciones por ti.</p></div>
              </div>
              <div className="mt-4 space-y-2">
                {prerequisites.steps?.length ? prerequisites.steps.map((step: any) => (
                  <div key={step.id} className="flex items-center gap-3 rounded-xl bg-white/80 p-3">
                    <span className={`grid size-7 shrink-0 place-items-center rounded-full ${step.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {step.status === 'completed' ? <CheckCircle2 size={15} /> : step.position}
                    </span>
                    <div className="min-w-0"><p className="text-xs font-black">{step.title}</p><p className="truncate text-[11px] text-slate-500">{step.description}</p></div>
                  </div>
                )) : <p className="text-xs font-bold text-emerald-700">Este trámite puede delegarse desde el inicio.</p>}
              </div>
              {!ready && <button onClick={onClose} className="mt-4 min-h-10 rounded-xl bg-amber-700 px-4 text-xs font-black text-white">Volver y completar pasos</button>}
            </section>

            {ready && !data.delegation && (
              <section>
                <h3 className="font-black">2. Elige tu asesor</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {data.advisors?.map((advisor: Advisor) => (
                    <button key={advisor.userId} onClick={() => setAdvisorId(advisor.userId)} className={`rounded-2xl border p-4 text-left transition ${advisorId === advisor.userId ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'}`}>
                      <div className="flex items-center gap-3">
                        <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-blue-100 text-blue-700">
                          {advisor.avatarUrl ? <img src={advisor.avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserRound />}
                        </div>
                        <div className="min-w-0"><strong className="block truncate">{advisor.publicName}</strong>{advisor.idVerified && <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-emerald-700"><BadgeCheck size={14} /> ID verificado</span>}</div>
                      </div>
                      <p className="mt-3 flex items-center gap-1 text-xs"><Star size={14} className="fill-amber-400 text-amber-400" />{advisor.averageRating} · {advisor.completedCasesCount} trámites</p>
                      <p className="mt-2 text-xs font-black text-blue-700">S/ {(advisor.baseFeeMinor / 100).toFixed(2)}</p>
                    </button>
                  ))}
                </div>
                {!data.advisors?.length && <p className="mt-3 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Por ahora no hay asesores disponibles para asumir este trámite.</p>}
                <button disabled={!advisorId || saving} onClick={async () => { if ((await post(`/api/v1/my-procedures/${item.id}/delegation`, { advisorId })).ok) await load(); }} className="mt-4 min-h-12 w-full rounded-xl bg-blue-600 font-black text-white disabled:opacity-40">Reservar asesor y continuar</button>
              </section>
            )}

            {ready && data.delegation?.status === 'awaiting_payment' && (
              <section>
                <h3 className="font-black">3. Elige cómo pagar</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {cards.map((card) => (
                    <button key={card.id} onClick={() => setCardId(card.id)} className={`overflow-hidden rounded-2xl border text-left transition ${cardId === card.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-300'}`}>
                      <div className={`bg-gradient-to-br ${paymentBrandTheme(card.brand)} p-4 text-white`}>
                        <div className="flex items-start justify-between"><PaymentBrandLogo brand={card.brand} compact />{card.isDefault && <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-black">Predeterminada</span>}</div>
                        <strong className="mt-5 block tracking-[.16em]">•••• {card.lastFour}</strong>
                      </div>
                      <div className="flex items-center justify-between bg-white px-4 py-2 text-xs font-bold text-slate-600"><span>{paymentBrandName(card.brand)}</span><span>{cardId === card.id ? 'Seleccionada' : 'Seleccionar'}</span></div>
                    </button>
                  ))}
                </div>
                {!cards.length && <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm">Primero agrega una tarjeta en Mi perfil.</p>}
                <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800"><strong>Operación protegida.</strong> Este módulo se encuentra en entorno de prueba y no procesa dinero real.</p>
                <button disabled={!cardId || saving} onClick={() => void confirmPayment()} className="mt-4 min-h-12 w-full rounded-xl bg-blue-600 font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-40">Pagar y continuar</button>
              </section>
            )}

            {ready && data.delegation && data.delegation.status !== 'awaiting_payment' && (
              <section className="rounded-3xl bg-emerald-50 p-6 text-center"><CheckCircle2 className="mx-auto text-emerald-600" size={34} /><h3 className="mt-3 font-black">Delegación en proceso</h3><p className="mt-2 text-sm text-slate-600">Revisa la asignación, conversa con tu asesor y sigue el avance desde Mis trámites.</p></section>
            )}

            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
