import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Bomb,
  Database,
  Eye,
  LoaderCircle,
  RefreshCw,
  Save,
  Settings,
  ShieldAlert,
  X,
} from "lucide-react";
const contactDefaults = {
    email: "",
    phonePrefix: "+51",
    phoneNumber: "",
    phone: "",
    location: "Lima, Perú",
    schedule: "Lunes a viernes, 9:00 a. m. a 6:00 p. m.",
    responseTime: "Dentro de 2 días hábiles",
  },
  landingDefaults = {
    showTestimonials: true,
    showTrustBar: true,
    showLifeMoments: true,
    showContactBanner: true,
    heroAnnouncement: "Tu copiloto para trámites en Perú",
    contactBannerTitle: "¿Necesitas ayuda con un trámite?",
  };
export default function AdminSettingsView() {
  const [contact, setContact] = useState(contactDefaults),
    [landing, setLanding] = useState(landingDefaults),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/v1/admin/settings", {
          credentials: "include",
        }),
        type = r.headers.get("content-type") || "",
        p = type.includes("application/json") ? await r.json() : {};
      if (!r.ok)
        throw new Error(
          p.message || `No pudimos cargar la configuración (${r.status}).`,
        );
      const rows = p.settings || [],
        c = rows.find((x: any) => x.key === "contact"),
        l = rows.find((x: any) => x.key === "landing");
      const storedContact = c?.value || {};
      const legacyPhone = String(storedContact.phone || "").replace(/[()\s-]/g, "");
      const legacyMatch = legacyPhone.match(/^(\+\d{1,4})(\d{6,15})$/);
      setContact({ ...contactDefaults, ...storedContact, phonePrefix: storedContact.phonePrefix || legacyMatch?.[1] || "+51", phoneNumber: storedContact.phoneNumber || legacyMatch?.[2] || "" });
      setLanding({ ...landingDefaults, ...(l?.value || {}) });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos cargar la configuración.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) throw new Error("Ingresa un correo electrónico válido.");
      if (!/^\d{6,15}$/.test(contact.phoneNumber)) throw new Error("Ingresa un teléfono de 6 a 15 dígitos, sin espacios ni letras.");
      const normalizedContact = { ...contact, email: contact.email.trim().toLowerCase(), phone: `${contact.phonePrefix} ${contact.phoneNumber}` };
      const responses = await Promise.all([
        fetch("/api/v1/admin/settings/contact", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: normalizedContact, isPublic: true }),
        }),
        fetch("/api/v1/admin/settings/landing", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: landing, isPublic: true }),
        }),
      ]);
      if (!responses.every((r) => r.ok)) {
        const failed = responses.find((r) => !r.ok);
        const payload = await failed?.json().catch(() => ({}));
        throw new Error(payload?.message || "No pudimos guardar toda la configuración.");
      }
      setMessage("Configuración publicada correctamente.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos guardar los cambios.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (loading)
    return (
      <div className="grid min-h-80 place-items-center rounded-3xl bg-white">
        <div className="text-center">
          <LoaderCircle className="mx-auto animate-spin text-violet-600" />
          <p className="mt-3 text-sm font-bold text-slate-500">
            Cargando configuración…
          </p>
        </div>
      </div>
    );
  if (error && !message)
    return (
      <div className="grid min-h-80 place-items-center rounded-3xl border border-red-200 bg-red-50 p-6 text-center">
        <div>
          <AlertCircle className="mx-auto text-red-600" size={36} />
          <h2 className="mt-3 text-xl font-black">
            No pudimos cargar este módulo
          </h2>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button
            onClick={() => void load()}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-black text-white"
          >
            <RefreshCw size={16} />
            Reintentar
          </button>
        </div>
      </div>
    );
  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-black uppercase tracking-widest text-violet-600">
        Configuración global
      </p>
      <h2 className="mt-2 text-3xl font-black">Contenido y canales públicos</h2>
      <p className="mt-2 text-sm text-slate-500">
        Administra la información transversal sin salir del panel.
      </p>
      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <span className="grid size-12 place-items-center rounded-2xl bg-violet-50 text-violet-600">
            <Settings />
          </span>
          <h3 className="mt-4 text-lg font-black">Canales de atención</h3>
          <div className="mt-5 grid gap-4">
            <label>
              <span className="mb-1 block text-xs font-black">Correo</span>
              <input type="email" className="field-input" value={contact.email} onChange={(event)=>setContact({...contact,email:event.target.value})} placeholder="soporte@tramia.pe" />
            </label>
            <label>
              <span className="mb-1 block text-xs font-black">Teléfono</span>
              <div className="grid grid-cols-[125px_1fr] gap-2">
                <select className="field-input" value={contact.phonePrefix} onChange={(event)=>setContact({...contact,phonePrefix:event.target.value})} aria-label="Prefijo internacional">
                  <option value="+51">Perú +51</option><option value="+1">EE. UU. +1</option><option value="+52">México +52</option><option value="+57">Colombia +57</option><option value="+56">Chile +56</option><option value="+54">Argentina +54</option><option value="+593">Ecuador +593</option><option value="+591">Bolivia +591</option><option value="+55">Brasil +55</option>
                </select>
                <input inputMode="numeric" className="field-input" value={contact.phoneNumber} onChange={(event)=>setContact({...contact,phoneNumber:event.target.value.replace(/\D/g,"").slice(0,15)})} placeholder="999000000" />
              </div>
            </label>
            {Object.entries({
              location: "Ubicación",
              schedule: "Horario",
              responseTime: "Tiempo de respuesta",
            }).map(([key, label]) => (
              <label key={key}>
                <span className="mb-1 block text-xs font-black">{label}</span>
                <input
                  className="field-input"
                  value={(contact as any)[key]}
                  onChange={(e) =>
                    setContact({ ...contact, [key]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
        </section>
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <span className="grid size-12 place-items-center rounded-2xl bg-fuchsia-50 text-fuchsia-600">
            <Eye />
          </span>
          <h3 className="mt-4 text-lg font-black">Landing y visibilidad</h3>
          <div className="mt-5 space-y-3">
            <label className="block text-xs font-black">
              Anuncio del banner
              <input
                className="field-input mt-1"
                value={landing.heroAnnouncement}
                onChange={(e) =>
                  setLanding({ ...landing, heroAnnouncement: e.target.value })
                }
              />
            </label>
            <label className="block text-xs font-black">
              Título del llamado de contacto
              <input
                className="field-input mt-1"
                value={landing.contactBannerTitle}
                onChange={(e) =>
                  setLanding({ ...landing, contactBannerTitle: e.target.value })
                }
              />
            </label>
            {Object.entries({
              showTestimonials: "Mostrar testimonios",
              showTrustBar: "Mostrar franja de confianza",
              showLifeMoments: "Mostrar momentos importantes",
              showContactBanner: "Mostrar llamado de contacto",
            }).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs font-black"
              >
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean((landing as any)[key])}
                  onChange={(e) =>
                    setLanding({ ...landing, [key]: e.target.checked })
                  }
                />
              </label>
            ))}
          </div>
        </section>
        <div className="lg:col-span-2">
          {message && (
            <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
              {message}
            </p>
          )}
          {error && (
            <p className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">
              {error}
            </p>
          )}
          <button
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-black text-white disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Guardando…" : "Guardar y publicar"}
          </button>
        </div>
        <HardResetControl />
      </div>
    </div>
  );
}

type HardResetPhase = "confirm" | "countdown" | "running" | "success" | "error";
function HardResetControl() {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [phase, setPhase] = useState<HardResetPhase>("confirm");
  const [countdown, setCountdown] = useState(10);
  const [authorization, setAuthorization] = useState("");
  const [error, setError] = useState("");

  const close = () => {
    if (phase === "running" || phase === "success") return;
    setOpen(false); setPhrase(""); setPhase("confirm"); setCountdown(10); setAuthorization(""); setError("");
  };
  const authorize = async () => {
    setError("");
    try {
      const response = await fetch('/api/v1/admin/hard-reset/authorize', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: phrase }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'No pudimos autorizar el Hard reset.');
      setAuthorization(payload.authorization); setCountdown(10); setPhase('countdown');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos autorizar el Hard reset.'); }
  };
  const execute = useCallback(async (token: string) => {
    setPhase('running'); setError('');
    try {
      const response = await fetch('/api/v1/admin/hard-reset', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorization: token }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'No pudimos completar el Hard reset.');
      setPhase('success');
      window.setTimeout(() => window.location.reload(), 1800);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos completar el Hard reset.');
      setPhase('error');
    }
  }, []);
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) { void execute(authorization); return; }
    const timer = window.setTimeout(() => setCountdown(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [authorization, countdown, execute, phase]);

  return <>
    <section className="relative overflow-hidden rounded-3xl border border-red-200 bg-[linear-gradient(120deg,#fff7f7,#fff_55%,#fff1f2)] p-6 shadow-sm lg:col-span-2">
      <div className="absolute -right-12 -top-16 size-48 rounded-full bg-red-200/35 blur-3xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex max-w-3xl gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-red-100 text-red-700"><ShieldAlert /></span><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-red-600">Zona de peligro</p><h3 className="mt-1 text-xl font-black">Hard reset de interacciones</h3><p className="mt-2 text-sm leading-6 text-slate-600">Deja TramIA sin trámites iniciados, pagos, calificaciones, mensajes, documentos, notificaciones ni tarjetas guardadas. Conserva las cuentas, asesores, permisos, catálogo y configuración.</p></div></div>
        <button onClick={() => setOpen(true)} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-black text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700"><Bomb size={18}/> Iniciar Hard reset</button>
      </div>
    </section>
    {open && <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="hard-reset-title">
      <section className="relative my-auto w-full max-w-xl overflow-hidden rounded-[2rem] border border-red-200 bg-white shadow-[0_32px_100px_rgba(15,23,42,.5)]">
        <div className="h-2 bg-[linear-gradient(90deg,#7f1d1d,#ef4444,#f97316)]" />
        {phase !== 'running' && phase !== 'success' && <button onClick={close} className="absolute right-5 top-5 grid size-10 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200" aria-label="Cerrar"><X size={18}/></button>}
        <div className="p-6 sm:p-8">
          {phase === 'confirm' || phase === 'error' ? <>
            <span className="grid size-14 place-items-center rounded-2xl bg-red-100 text-red-700"><Bomb size={27}/></span>
            <p className="mt-5 text-[11px] font-black uppercase tracking-[.18em] text-red-600">Acción irreversible</p><h2 id="hard-reset-title" className="mt-1 text-2xl font-black">Confirmar Hard reset</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Esta acción elimina en forma permanente todas las interacciones de usuarios y asesores. Las tablas y los datos maestros no se eliminan.</p>
            <label className="mt-6 block"><span className="mb-2 block text-xs font-black text-slate-700">Palabra de seguridad</span><input type="password" autoFocus autoComplete="off" value={phrase} onChange={event => setPhrase(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && phrase) void authorize(); }} className="field-input" placeholder="Escribe la palabra de seguridad" /></label>
            {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}
            <div className="mt-6 grid gap-3 sm:grid-cols-2"><button onClick={close} className="min-h-12 rounded-xl bg-slate-100 text-sm font-black text-slate-700">Cancelar</button><button disabled={!phrase} onClick={() => void authorize()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"><ShieldAlert size={17}/> Validar y continuar</button></div>
          </> : phase === 'countdown' ? <div className="py-4 text-center">
            <div className="relative mx-auto grid size-40 place-items-center"><span className="absolute inset-0 animate-ping rounded-full bg-red-200/50"/><span className="absolute inset-3 rounded-full border-4 border-red-100"/><span className="relative grid size-28 place-items-center rounded-full bg-red-600 text-5xl font-black text-white shadow-2xl shadow-red-600/35">{countdown}</span></div>
            <p className="mt-7 text-[11px] font-black uppercase tracking-[.2em] text-red-600">Secuencia de autodestrucción</p><h2 id="hard-reset-title" className="mt-2 text-2xl font-black">El Hard reset comenzará en breve</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">Todavía puedes cancelar. Al llegar a cero, la limpieza transaccional empezará automáticamente.</p>
            <button onClick={close} className="mt-6 min-h-12 w-full rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700 hover:bg-slate-50">Detener Hard reset</button>
          </div> : phase === 'running' ? <div className="py-8 text-center">
            <div className="relative mx-auto grid size-36 place-items-center"><span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-r-red-500 border-t-orange-400"/><span className="absolute inset-4 animate-pulse rounded-full bg-red-50"/><Database className="relative text-red-600" size={45}/></div>
            <p className="mt-7 text-[11px] font-black uppercase tracking-[.2em] text-red-600">Limpieza en curso</p><h2 id="hard-reset-title" className="mt-2 text-2xl font-black">Reiniciando las interacciones</h2><p className="mt-3 text-sm text-slate-600">No cierres esta ventana. Si ocurre un error, toda la transacción se revierte.</p>
          </div> : <div className="py-8 text-center">
            <span className="mx-auto grid size-24 place-items-center rounded-full bg-emerald-100 text-4xl text-emerald-700">✓</span><p className="mt-7 text-[11px] font-black uppercase tracking-[.2em] text-emerald-600">Proceso completado</p><h2 id="hard-reset-title" className="mt-2 text-2xl font-black">TramIA quedó listo para empezar</h2><p className="mt-3 text-sm text-slate-600">Las interacciones fueron limpiadas. Actualizando el panel administrativo…</p>
          </div>}
        </div>
      </section>
    </div>}
  </>;
}
