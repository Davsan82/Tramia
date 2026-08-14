import { Check, LoaderCircle, ShieldCheck } from 'lucide-react';
import PaymentBrandLogo, { paymentBrandName, paymentBrandTheme } from './PaymentBrandLogo';

export default function PaymentProcessingOverlay({ brand, status }: { brand: string; status: 'processing' | 'approved' }) {
  const approved = status === 'approved';
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-slate-950/75 p-5 backdrop-blur-md" role="status" aria-live="polite">
      <div className="w-full max-w-sm overflow-hidden rounded-[2rem] bg-white text-center shadow-2xl">
        <div className={`relative grid h-40 place-items-center bg-gradient-to-br ${paymentBrandTheme(brand)}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-size-[18px_18px] opacity-10" />
          <div className={`relative grid h-24 w-40 place-items-center rounded-2xl border border-white/25 bg-white/10 shadow-2xl ${approved ? 'animate-[payment-card-approved_.65s_ease-out_both]' : 'animate-[payment-card-processing_1.25s_ease-in-out_infinite]'}`}>
            <PaymentBrandLogo brand={brand} />
          </div>
        </div>
        <div className="p-7">
          <div className={`mx-auto grid size-14 place-items-center rounded-full ${approved ? 'bg-emerald-500 text-white' : 'bg-blue-50 text-blue-600'}`}>
            {approved ? <Check size={30} strokeWidth={3} /> : <LoaderCircle className="animate-spin" size={28} />}
          </div>
          <h3 className="mt-4 text-xl font-black text-slate-950">{approved ? 'Tu pago ha sido realizado' : 'Procesando tu pago'}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{approved ? `Pago aprobado con ${paymentBrandName(brand)}. Te llevaremos a tu trámite.` : 'Estamos validando la operación de forma segura. No cierres esta ventana.'}</p>
          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-bold text-slate-400"><ShieldCheck size={15} /> Conexión protegida</div>
        </div>
      </div>
    </div>
  );
}
