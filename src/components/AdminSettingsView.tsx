import React, { useEffect, useState } from "react";
import { Eye, LoaderCircle, Save, Settings } from "lucide-react";
const contactDefaults = {
  email: "",
  phone: "",
  location: "Lima, Perú",
  schedule: "Lunes a viernes, 9:00 a. m. a 6:00 p. m.",
  responseTime: "Dentro de 2 días hábiles",
};
const landingDefaults = {
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
    [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/v1/admin/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((p) => {
        const rows = p.settings || [],
          contactRow = rows.find((x: any) => x.key === "contact"),
          landingRow = rows.find((x: any) => x.key === "landing");
        if (contactRow?.value)
          setContact({ ...contactDefaults, ...contactRow.value });
        if (landingRow?.value)
          setLanding({ ...landingDefaults, ...landingRow.value });
        setLoading(false);
      });
  }, []);
  const save = async () => {
    setSaving(true);
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
    setMessage(
      responses.every((r) => r.ok)
        ? "Configuración publicada correctamente."
        : "No pudimos guardar toda la configuración.",
    );
    setSaving(false);
  };
  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-xs font-black uppercase tracking-widest text-violet-600">
        Configuración global
      </p>
      <h2 className="mt-2 text-3xl font-black">Contenido y canales públicos</h2>
      <p className="mt-2 text-sm text-slate-500">
        Los cambios se reflejan en las vistas públicas que consumen estas
        preferencias.
      </p>
      {loading ? (
        <LoaderCircle className="mx-auto mt-12 animate-spin text-violet-600" />
      ) : (
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
                    setLanding({
                      ...landing,
                      contactBannerTitle: e.target.value,
                    })
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
              <p className="mb-4 rounded-xl bg-violet-50 p-3 text-xs font-bold">
                {message}
              </p>
            )}
            <button
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-black text-white"
            >
              <Save size={16} />
              {saving ? "Guardando…" : "Guardar y publicar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
