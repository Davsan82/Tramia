import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Eye,
  LoaderCircle,
  RefreshCw,
  Save,
  Settings,
} from "lucide-react";
const contactDefaults = {
    email: "",
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
      setContact({ ...contactDefaults, ...(c?.value || {}) });
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
      const responses = await Promise.all([
        fetch("/api/v1/admin/settings/contact", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: contact, isPublic: true }),
        }),
        fetch("/api/v1/admin/settings/landing", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: landing, isPublic: true }),
        }),
      ]);
      if (!responses.every((r) => r.ok))
        throw new Error("No pudimos guardar toda la configuración.");
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
            {Object.entries({
              email: "Correo",
              phone: "Teléfono",
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
      </div>
    </div>
  );
}
