import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  Save,
  Star,
  Upload,
} from "lucide-react";
import TramIALogo from "./TramIALogo";
import CaseDocuments from "./CaseDocuments";
import CaseMessages from "./CaseMessages";

type CaseItem = {
  id: string;
  trackingCode: string;
  status: string;
  progressPercentage: number;
  currentStepId?: string | null;
  title: string;
  category: string;
  clientName?: string;
  clientUsername: string;
  updatedAt: string;
};
type Detail = {
  case: CaseItem;
  steps: Array<{
    id: string;
    procedureStepId: string;
    status: string;
    position: number;
    title: string;
    description: string;
    isPointOfNoReturn: boolean;
    notes?: string | null;
    completedAt?: string | null;
  }>;
  requirements: Array<{
    id: string;
    status: string;
    name: string;
    isRequired: boolean;
  }>;
};
const labels: Record<string, string> = {
  delegated: "Asignado",
  in_progress: "En proceso",
  waiting_user: "Esperando al usuario",
  paused: "Pausado",
  completed: "Completado",
};

export default function AdvisorPortalView({ onExit }: { onExit: () => void }) {
  const [profile, setProfile] = useState<any>(null),
    [editing, setEditing] = useState(false),
    [profileForm, setProfileForm] = useState<any>({}),
    [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cases, setCases] = useState<CaseItem[]>([]),
    [detail, setDetail] = useState<Detail | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/v1/advisor/cases", { credentials: "include" }),
      p = await r.json().catch(() => ({}));
    if (r.ok) {
      setCases(p.cases || []);
      setError("");
    } else
      setError(
        p.message || "Inicia sesión con una cuenta de asesor para continuar.",
      );
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
    fetch("/api/v1/advisor/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((p) => {
        setProfile(p.profile);
        setProfileForm(p.profile || {});
      })
      .catch(() => {});
  }, [load]);
  const open = async (id: string) => {
    const r = await fetch(`/api/v1/advisor/cases/${id}`, {
        credentials: "include",
      }),
      p = await r.json().catch(() => ({}));
    if (r.ok) setDetail(p);
    else setError(p.message || "No pudimos abrir el caso.");
  };
  const saveProfile = async () => {
    const r = await fetch("/api/v1/advisor/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      }),
      p = await r.json().catch(() => ({}));
    if (r.ok) {
      setProfile({ ...profile, ...p.data });
      setEditing(false);
    } else setError(p.message || "No pudimos guardar el perfil.");
  };
  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/v1/profile/avatar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimeType: file.type, contentBase64 }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No pudimos subir la foto.");
      const avatarUrl = `${payload.avatarUrl}?v=${Date.now()}`;
      setProfile((current: any) => ({ ...current, avatarUrl }));
      setProfileForm((current: any) => ({ ...current, avatarUrl }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos subir la foto.");
    } finally {
      setUploadingAvatar(false);
    }
  };
  const advisorProfile = profile ? (
    <section className="mb-5 rounded-3xl border border-violet-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <img
            src={profile.avatarUrl || "/assets/mascot/tramia-bot-reading.png"}
            alt="Foto del asesor"
            className="size-20 rounded-2xl bg-violet-50 object-cover"
          />
          <label className="cursor-pointer rounded-lg bg-violet-100 px-2 py-1.5 text-[10px] font-black text-violet-800">
            <Upload className="mr-1 inline" size={12} />
            {uploadingAvatar ? "Subiendo…" : "Cambiar foto"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void uploadAvatar(event.target.files?.[0])} />
          </label>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black">{profile.publicName}</h2>
            {profile.idVerified && (
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">
                <BadgeCheck className="mr-1 inline" size={13} />
                ID verificado
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {profile.bio || "Especialista TramIA"}
          </p>
          <p className="mt-2 flex items-center gap-1 text-xs font-bold text-amber-600">
            <Star size={14} fill="currentColor" />
            {profile.averageRating || "0"} · {profile.completedCasesCount || 0}{" "}
            trámites completados
          </p>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="rounded-xl bg-violet-100 px-4 py-2 text-xs font-black text-violet-800"
        >
          {editing ? "Cancelar" : "Editar perfil profesional"}
        </button>
      </div>
      {editing && (
        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <input
            className="field-input"
            value={profileForm.publicName || ""}
            onChange={(e) =>
              setProfileForm({ ...profileForm, publicName: e.target.value })
            }
            placeholder="Nombre público"
          />
          <select
            className="field-input"
            value={profileForm.availabilityStatus || "offline"}
            onChange={(e) =>
              setProfileForm({
                ...profileForm,
                availabilityStatus: e.target.value,
              })
            }
          >
            <option value="available">Disponible</option>
            <option value="busy">Ocupado</option>
            <option value="offline">Fuera de línea</option>
          </select>
          <textarea
            className="field-input min-h-24 sm:col-span-2"
            value={profileForm.bio || ""}
            onChange={(e) =>
              setProfileForm({ ...profileForm, bio: e.target.value })
            }
            placeholder="Presentación profesional"
          />
          <input
            className="field-input"
            type="number"
            min="1"
            max="50"
            value={profileForm.maxActiveCases || 10}
            onChange={(e) =>
              setProfileForm({
                ...profileForm,
                maxActiveCases: Number(e.target.value),
              })
            }
            placeholder="Capacidad máxima"
          />
          <input
            className="field-input"
            type="number"
            min="0"
            value={(profileForm.baseFeeMinor || 0) / 100}
            onChange={(e) =>
              setProfileForm({
                ...profileForm,
                baseFeeMinor: Math.round(Number(e.target.value) * 100),
              })
            }
            placeholder="Tarifa en soles"
          />
          <button
            onClick={() => void saveProfile()}
            className="min-h-11 rounded-xl bg-violet-700 font-black text-white sm:col-span-2"
          >
            <Save className="mr-2 inline" size={16} />
            Guardar perfil
          </button>
        </div>
      )}
    </section>
  ) : null;
  return (
    <div className="min-h-screen bg-[#f7f4ff] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-17 max-w-7xl items-center px-5">
          <TramIALogo
            iconSize={31}
            textSize="text-xl"
            variant="light"
            onClick={onExit}
          />
          <span className="ml-4 rounded-full bg-violet-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-violet-700">
            Portal del asesor
          </span>
          <button
            onClick={onExit}
            className="ml-auto rounded-xl border border-slate-200 px-4 py-2 text-xs font-black"
          >
            Volver a TramIA
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl p-5 sm:p-8">
        <section className="rounded-[2rem] bg-gradient-to-r from-[#071c4d] via-blue-700 to-cyan-500 p-7 text-white shadow-xl">
          <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-200">
            Gestión acompañada
          </p>
          <h1 className="mt-2 text-3xl font-black">Casos asignados</h1>
          <p className="mt-2 text-sm text-blue-100">
            Revisa documentos, conversa con el usuario y registra cada avance.
          </p>
        </section>
        <div className="mt-5">{advisorProfile}</div>
        {detail ? (
          <AdvisorCaseDetail
            data={detail}
            onBack={() => setDetail(null)}
            onSaved={async () => {
              await load();
              await open(detail.case.id);
            }}
          />
        ) : (
          <section className="mt-6">
            {loading ? (
              <LoaderCircle className="mx-auto animate-spin text-blue-600" />
            ) : error ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
                <AlertCircle className="mx-auto" />
                <p className="mt-3 font-black">{error}</p>
                <button
                  onClick={() => void load()}
                  className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white"
                >
                  <RefreshCw className="mr-2 inline" size={14} />
                  Reintentar
                </button>
              </div>
            ) : cases.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {cases.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => void open(item.id)}
                    className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <BriefcaseBusiness className="text-blue-600" />
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
                        {labels[item.status] || item.status}
                      </span>
                    </div>
                    <h2 className="mt-4 font-black">{item.title}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.trackingCode} ·{" "}
                      {item.clientName || item.clientUsername}
                    </p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-blue-600"
                        style={{ width: `${item.progressPercentage}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <CheckCircle2 className="mx-auto text-blue-500" />
                <h2 className="mt-3 font-black">No tienes casos asignados</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Cuando recibas una asignación aparecerá aquí.
                </p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function CaseDetail({
  data,
  onBack,
  onSaved,
}: {
  data: Detail;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [progress, setProgress] = useState(data.case.progressPercentage),
    [status, setStatus] = useState(
      data.case.status === "delegated" ? "in_progress" : data.case.status,
    ),
    [stepId, setStepId] = useState(
      data.case.currentStepId || data.steps[0]?.procedureStepId || "",
    ),
    [notes, setNotes] = useState(""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const save = async () => {
    setSaving(true);
    const r = await fetch(`/api/v1/advisor/cases/${data.case.id}/progress`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressPercentage: progress,
          status,
          currentStepId: stepId,
          notes,
        }),
      }),
      p = await r.json().catch(() => ({}));
    if (r.ok) onSaved();
    else setError(p.message || "No pudimos guardar el avance.");
    setSaving(false);
  };
  return (
    <section className="mt-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-black text-blue-700"
      >
        <ArrowLeft size={16} />
        Volver a mis casos
      </button>
      <div className="mt-4 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <span className="text-xs font-black uppercase tracking-widest text-blue-600">
            {data.case.trackingCode}
          </span>
          <h2 className="mt-2 text-2xl font-black">{data.case.title}</h2>
          <p className="mt-2 text-sm text-slate-500">
            Usuario:{" "}
            <strong>{data.case.clientName || data.case.clientUsername}</strong>
          </p>
          <div className="mt-6 space-y-3">
            {data.steps.map((step) => (
              <label
                key={step.id}
                className={`block rounded-2xl border p-4 ${stepId === step.procedureStepId ? "border-blue-400 bg-blue-50" : "border-slate-200"}`}
              >
                <div className="flex gap-3">
                  <input
                    type="radio"
                    name="step"
                    checked={stepId === step.procedureStepId}
                    onChange={() => setStepId(step.procedureStepId)}
                  />
                  <div>
                    <p className="font-black">
                      {step.position}. {step.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {step.description}
                    </p>
                    {step.isPointOfNoReturn && (
                      <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-800">
                        Punto de no retorno
                      </span>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
        <aside className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-black">Actualizar gestión</h3>
            <label className="mt-5 block text-xs font-black text-slate-600">
              Avance: {progress}%
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="mt-3 w-full accent-blue-600"
              />
            </label>
            <label className="mt-4 block text-xs font-black text-slate-600">
              Estado
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3"
              >
                <option value="in_progress">En proceso</option>
                <option value="waiting_user">Esperando al usuario</option>
                <option value="paused">Pausado</option>
                <option value="completed">Completado</option>
              </select>
            </label>
            <label className="mt-4 block text-xs font-black text-slate-600">
              Nota de seguimiento
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3"
                placeholder="Indica qué avanzó o qué necesita el usuario."
              />
            </label>
            {error && (
              <p className="mt-3 text-xs font-bold text-red-600">{error}</p>
            )}
            <button
              onClick={() => void save()}
              disabled={saving}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white disabled:opacity-50"
            >
              <Save size={17} />
              {saving ? "Guardando…" : "Guardar avance"}
            </button>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <h3 className="font-black">Requisitos</h3>
            <div className="mt-3 space-y-2">
              {data.requirements.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-xs"
                >
                  <span className="font-bold">{item.name}</span>
                  <span className="rounded-full bg-white px-2 py-1 font-black text-blue-700">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <CaseDocuments caseId={data.case.id} role="advisor" />
          <CaseMessages caseId={data.case.id} />
        </aside>
      </div>
    </section>
  );
}

function AdvisorCaseDetail({ data, onBack, onSaved }: { data: Detail; onBack: () => void; onSaved: () => void }) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const nextStep = data.steps.find((step) => !["completed", "skipped"].includes(step.status));
  const completedCount = data.steps.filter((step) => ["completed", "skipped"].includes(step.status)).length;
  const progress = data.steps.length ? Math.round(completedCount / data.steps.length * 100) : data.case.progressPercentage;
  const save = async () => {
    if (!nextStep) return;
    setSaving(true); setError("");
    const response = await fetch(`/api/v1/advisor/cases/${data.case.id}/steps/${nextStep.id}/complete`, { method:"POST", credentials:"include", headers:{"Content-Type":"application/json"}, body:JSON.stringify({notes}) });
    const payload = await response.json().catch(()=>({}));
    if(response.ok){setNotes("");onSaved();}else setError(payload.message||"No pudimos confirmar este paso.");
    setSaving(false);
  };
  return <section className="mt-6">
    <button onClick={onBack} className="inline-flex items-center gap-2 text-sm font-black text-blue-700"><ArrowLeft size={16}/>Volver a mis casos</button>
    <div className="mt-4 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <span className="text-xs font-black uppercase tracking-widest text-blue-600">{data.case.trackingCode}</span>
        <h2 className="mt-2 text-2xl font-black">{data.case.title}</h2>
        <p className="mt-2 text-sm text-slate-500">Ciudadano: <strong>{data.case.clientName||data.case.clientUsername}</strong></p>
        <div className="mt-6 rounded-2xl bg-gradient-to-r from-blue-700 to-cyan-500 p-5 text-white"><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-widest text-cyan-100">Avance confirmado</p><p className="mt-1 text-sm font-bold">{nextStep?`Siguiente: ${nextStep.title}`:"Todos los pasos fueron completados"}</p></div><strong className="text-3xl font-black">{progress}%</strong></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-950/25"><div className="h-full rounded-full bg-white" style={{width:`${progress}%`}}/></div></div>
        <div className="mt-6 space-y-3">{data.steps.map(step=>{const completed=["completed","skipped"].includes(step.status),current=step.id===nextStep?.id;return <article key={step.id} className={`rounded-2xl border p-4 ${completed?"border-emerald-200 bg-emerald-50":current?"border-blue-400 bg-blue-50 shadow-sm":"border-slate-200 bg-slate-50 opacity-70"}`}><div className="flex gap-3"><span className={`grid size-8 shrink-0 place-items-center rounded-xl text-xs font-black ${completed?"bg-emerald-500 text-white":current?"bg-blue-600 text-white":"bg-slate-200 text-slate-500"}`}>{completed?<CheckCircle2 size={17}/>:step.position}</span><div><p className="font-black">{step.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{step.description}</p>{step.isPointOfNoReturn&&<span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-800">Punto de no retorno</span>}{completed&&<p className="mt-2 text-xs font-bold text-emerald-700">Completado{step.completedAt?` · ${new Intl.DateTimeFormat("es-PE",{dateStyle:"medium",timeStyle:"short"}).format(new Date(step.completedAt))}`:""}</p>}{completed&&step.notes&&<p className="mt-1 text-xs text-slate-600">{step.notes}</p>}</div></div></article>})}</div>
      </div>
      <aside className="space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Acción del asesor</p><h3 className="mt-2 text-lg font-black">{nextStep?`Completar paso ${nextStep.position}`:"Gestión completada"}</h3>{nextStep&&<><p className="mt-2 text-sm leading-6 text-slate-600">{nextStep.title}. Al confirmar, el ciudadano verá el avance y recibirá un aviso por correo.</p><label className="mt-4 block text-xs font-black text-slate-600">Nota para el ciudadano (opcional)<textarea value={notes} onChange={event=>setNotes(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3" placeholder="Indica qué se realizó o cuál es la siguiente instrucción."/></label>{error&&<p className="mt-3 text-xs font-bold text-red-600">{error}</p>}<button onClick={()=>void save()} disabled={saving} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white disabled:opacity-50"><CheckCircle2 size={17}/>{saving?"Confirmando…":"Marcar paso como completado"}</button></>}{!nextStep&&<div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-center text-sm font-bold text-emerald-800"><CheckCircle2 className="mx-auto mb-2"/>El ciudadano ya fue informado de que su trámite está listo.</div>}</div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5"><h3 className="font-black">Requisitos del trámite</h3><div className="mt-3 space-y-2">{data.requirements.map(item=><div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-xs"><span className="font-bold">{item.name}</span><span className="rounded-full bg-white px-2 py-1 font-black text-blue-700">{item.status}</span></div>)}</div></div>
        <CaseDocuments caseId={data.case.id} role="advisor"/><CaseMessages caseId={data.case.id}/>
      </aside>
    </div>
  </section>;
}
