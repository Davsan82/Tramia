import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ExternalLink,
  FileCheck2,
  GitBranch,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
type Master = { id: string; name: string };
type Props = {
  procedureId: string | null;
  categories: Master[];
  organizations: Master[];
  onClose: () => void;
  onSaved: () => void;
};
const emptyProcedure = {
  title: "",
  slug: "",
  shortDescription: "",
  categoryId: "",
  organizationId: "",
  procedureType: "government",
  isFeatured: false,
  isActive: true,
};
const emptyVersion = {
  fullDescription: "",
  modality: "mixta",
  difficulty: "media",
  officialCostMin: "",
  officialCostMax: "",
  estimatedDurationMin: "",
  estimatedDurationMax: "",
  officialUrl: "",
  dataClassification: "official_reference_demo",
  verificationNotes: "",
  status: "draft",
};
export default function AdminProcedureEditor({
  procedureId,
  categories,
  organizations,
  onClose,
  onSaved,
}: Props) {
  const [detail, setDetail] = useState<any>(null),
    [general, setGeneral] = useState<any>(emptyProcedure),
    [version, setVersion] = useState<any>(emptyVersion),
    [loading, setLoading] = useState(Boolean(procedureId)),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [tab, setTab] = useState<
      "general" | "version" | "requirements" | "steps" | "sources"
    >("general");
  const load = useCallback(async () => {
    if (!procedureId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/v1/admin/procedures/${procedureId}`, {
          credentials: "include",
        }),
        p = await r.json();
      if (!r.ok) throw new Error(p.message || "No pudimos cargar el trámite.");
      setDetail(p);
      setGeneral(p.procedure);
      setVersion(p.version || emptyVersion);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, [procedureId]);
  useEffect(() => {
    void load();
  }, [load]);
  const request = async (url: string, method: string, body?: unknown) => {
    const r = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
      p = r.status === 204 ? {} : await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(p.message || "No se pudo guardar el cambio.");
    return p;
  };
  const saveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const p = await request(
        `/api/v1/admin/procedures${procedureId ? `/${procedureId}` : ""}`,
        procedureId ? "PATCH" : "POST",
        general,
      );
      if (!procedureId) {
        onSaved();
        return;
      }
      setGeneral(p.data);
    } catch (e) {
      setError(message(e));
    } finally {
      setSaving(false);
    }
  };
  const saveVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await request(
        detail?.version
          ? `/api/v1/admin/versions/${detail.version.id}`
          : `/api/v1/admin/procedures/${procedureId}/versions`,
        detail?.version ? "PATCH" : "POST",
        version,
      );
      await load();
    } catch (e) {
      setError(message(e));
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <PanelState />;
  const tabs = [
    ["general", "Datos generales"],
    ["version", "Versión"],
    ["requirements", "Requisitos"],
    ["steps", "Pasos"],
    ["sources", "Fuentes"],
  ] as const;
  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-[#082657] to-blue-600 p-5 text-white sm:flex-row sm:items-center">
        <button
          onClick={onClose}
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-200">
            Editor de contenido
          </p>
          <h2 className="truncate text-2xl font-black">
            {procedureId ? general.title || "Editar trámite" : "Nuevo trámite"}
          </h2>
          <p className="mt-1 text-xs text-blue-100">
            Los cambios quedan registrados en la auditoría administrativa.
          </p>
        </div>
        {detail?.version && (
          <span className="self-start rounded-full bg-white/10 px-3 py-1.5 text-xs font-black">
            v{detail.version.versionNumber} · {detail.version.status}
          </span>
        )}
      </header>
      <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
        {tabs.map(([id, label], i) => (
          <button
            key={id}
            disabled={!procedureId && i > 0}
            onClick={() => setTab(id)}
            className={`min-h-10 shrink-0 rounded-xl px-4 text-xs font-black ${tab === id ? "bg-blue-600 text-white" : "text-slate-600 disabled:opacity-35"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </p>
      )}
      {tab === "general" && (
        <GeneralForm
          form={general}
          setForm={setGeneral}
          categories={categories}
          organizations={organizations}
          save={saveGeneral}
          saving={saving}
        />
      )}{" "}
      {tab === "version" && (
        <VersionForm
          form={version}
          setForm={setVersion}
          save={saveVersion}
          saving={saving}
          exists={Boolean(detail?.version)}
        />
      )}
      {tab === "requirements" && (
        <Collection
          title="Requisitos"
          subtitle="Documentos, datos o condiciones que debe cumplir la persona."
          icon={FileCheck2}
          items={detail?.requirements || []}
          endpoint={`/api/v1/admin/versions/${detail?.version?.id}/requirements`}
          disabled={!detail?.version}
          fields={[
            ["name", "Nombre"],
            ["description", "Descripción"],
            ["requirementType", "Tipo"],
          ]}
          defaults={{ requirementType: "document", isRequired: true }}
          request={request}
          reload={load}
        />
      )}
      {tab === "steps" && (
        <Collection
          title="Ruta del procedimiento"
          subtitle="Ordena el checklist que verá la persona usuaria."
          icon={GitBranch}
          items={detail?.steps || []}
          endpoint={`/api/v1/admin/versions/${detail?.version?.id}/steps`}
          disabled={!detail?.version}
          fields={[
            ["position", "Posición", "number"],
            ["title", "Título"],
            ["description", "Descripción"],
            ["officialUrl", "URL oficial", "url"],
            ["helpText", "Ayuda TramIA"],
          ]}
          defaults={{
            position: (detail?.steps?.length || 0) + 1,
            completionMode: "manual",
            canBeDelegated: true,
          }}
          request={request}
          reload={load}
        />
      )}
      {tab === "sources" && (
        <Collection
          title="Fuentes oficiales"
          subtitle="Mantén trazabilidad de los enlaces usados para verificar el trámite."
          icon={BookOpen}
          items={detail?.sources || []}
          endpoint={`/api/v1/admin/versions/${detail?.version?.id}/sources`}
          disabled={!detail?.version}
          fields={[
            ["title", "Título"],
            ["url", "URL HTTPS", "url"],
          ]}
          defaults={{ isPrimary: false }}
          request={request}
          reload={load}
        />
      )}
    </div>
  );
}
function GeneralForm({
  form,
  setForm,
  categories,
  organizations,
  save,
  saving,
}: any) {
  return (
    <Card>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Título">
          <input
            required
            className="field-input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <Field label="Slug">
          <input
            className="field-input"
            value={form.slug || ""}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
        </Field>
        <Field label="Categoría">
          <select
            required
            className="field-input"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">Selecciona</option>
            {categories.map((x: Master) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Entidad responsable">
          <select
            className="field-input"
            value={form.organizationId || ""}
            onChange={(e) =>
              setForm({ ...form, organizationId: e.target.value })
            }
          >
            <option value="">Sin entidad</option>
            {organizations.map((x: Master) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Descripción breve">
            <textarea
              required
              className="field-input min-h-24"
              value={form.shortDescription}
              onChange={(e) =>
                setForm({ ...form, shortDescription: e.target.value })
              }
            />
          </Field>
        </div>
        <Checks
          form={form}
          setForm={setForm}
          names={[
            ["isActive", "Activo y visible"],
            ["isFeatured", "Mostrar como frecuente"],
          ]}
        />
        <Submit saving={saving} />
      </form>
    </Card>
  );
}
function VersionForm({ form, setForm, save, saving, exists }: any) {
  return (
    <Card>
      <div className="mb-5">
        <h3 className="text-lg font-black">
          {exists ? "Versión vigente" : "Crear primera versión"}
        </h3>
        <p className="text-sm text-slate-500">
          La información pública se toma de la versión editorial más reciente.
        </p>
      </div>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Descripción completa">
            <textarea
              required
              className="field-input min-h-32"
              value={form.fullDescription || ""}
              onChange={(e) =>
                setForm({ ...form, fullDescription: e.target.value })
              }
            />
          </Field>
        </div>
        <Field label="Modalidad">
          <select
            className="field-input"
            value={form.modality}
            onChange={(e) => setForm({ ...form, modality: e.target.value })}
          >
            <option value="presencial">Presencial</option>
            <option value="virtual">Virtual</option>
            <option value="mixta">Mixta</option>
          </select>
        </Field>
        <Field label="Dificultad">
          <select
            className="field-input"
            value={form.difficulty}
            onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
          >
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
        </Field>
        <Field label="Costo mínimo (S/)">
          <input
            type="number"
            min="0"
            step=".01"
            className="field-input"
            value={form.officialCostMin || ""}
            onChange={(e) =>
              setForm({ ...form, officialCostMin: e.target.value })
            }
          />
        </Field>
        <Field label="Costo máximo (S/)">
          <input
            type="number"
            min="0"
            step=".01"
            className="field-input"
            value={form.officialCostMax || ""}
            onChange={(e) =>
              setForm({ ...form, officialCostMax: e.target.value })
            }
          />
        </Field>
        <Field label="Duración mínima (días hábiles)">
          <input
            type="number"
            min="0"
            className="field-input"
            value={form.estimatedDurationMin || ""}
            onChange={(e) =>
              setForm({ ...form, estimatedDurationMin: e.target.value })
            }
          />
        </Field>
        <Field label="Duración máxima (días hábiles)">
          <input
            type="number"
            min="0"
            className="field-input"
            value={form.estimatedDurationMax || ""}
            onChange={(e) =>
              setForm({ ...form, estimatedDurationMax: e.target.value })
            }
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="URL oficial">
            <input
              type="url"
              className="field-input"
              value={form.officialUrl || ""}
              onChange={(e) =>
                setForm({ ...form, officialUrl: e.target.value })
              }
            />
          </Field>
        </div>
        {exists && (
          <Field label="Estado editorial">
            <select
              className="field-input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="draft">Borrador</option>
              <option value="reviewed">Revisado</option>
              <option value="published">Publicado</option>
              <option value="archived">Archivado</option>
            </select>
          </Field>
        )}
        <Field label="Clasificación del dato">
          <input
            className="field-input"
            value={form.dataClassification || ""}
            onChange={(e) =>
              setForm({ ...form, dataClassification: e.target.value })
            }
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notas de verificación">
            <textarea
              className="field-input min-h-24"
              value={form.verificationNotes || ""}
              onChange={(e) =>
                setForm({ ...form, verificationNotes: e.target.value })
              }
            />
          </Field>
        </div>
        <Submit saving={saving} />
      </form>
    </Card>
  );
}
function Collection({
  title,
  subtitle,
  icon: Icon,
  items,
  endpoint,
  disabled,
  fields,
  defaults,
  request,
  reload,
}: any) {
  const [form, setForm] = useState<any>(defaults),
    [editing, setEditing] = useState<any>(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const kind = endpoint.split("/").pop()!;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await request(
        editing ? `/api/v1/admin/${kind}/${editing.id}` : endpoint,
        editing ? "PATCH" : "POST",
        form,
      );
      setForm(defaults);
      setEditing(null);
      await reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setSaving(false);
    }
  };
  const remove = async (x: any) => {
    if (!confirm("¿Eliminar este elemento?")) return;
    await request(`/api/v1/admin/${kind}/${x.id}`, "DELETE");
    await reload();
  };
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
      <Card>
        <div className="flex items-start gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
            <Icon size={22} />
          </span>
          <div>
            <h3 className="text-lg font-black">{title}</h3>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        {disabled ? (
          <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800">
            Primero crea la versión del trámite.
          </p>
        ) : items.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Aún no hay elementos registrados.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {items.map((x: any) => (
              <article
                key={x.id}
                className="flex gap-3 rounded-2xl border border-slate-200 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-black">
                    {x.position ? `${x.position}. ` : ""}
                    {x.name || x.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {x.description || x.url || x.requirementType}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditing(x);
                    setForm(x);
                  }}
                  className="text-xs font-black text-blue-600"
                >
                  Editar
                </button>
                <button onClick={() => void remove(x)} className="text-red-600">
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <h3 className="font-black">
          {editing ? "Editar elemento" : "Agregar elemento"}
        </h3>
        <form onSubmit={submit} className="mt-4 space-y-3">
          {fields.map(([key, label, type = "text"]: string[]) => (
            <div key={key}>
              <Field label={label}>
                {key === "description" || key === "helpText" ? (
                  <textarea
                    required={key === "description"}
                    className="field-input min-h-20"
                    value={form[key] || ""}
                    onChange={(e) =>
                      setForm({ ...form, [key]: e.target.value })
                    }
                  />
                ) : (
                  <input
                    required={["name", "title", "position", "url"].includes(
                      key,
                    )}
                    type={type}
                    className="field-input"
                    value={form[key] || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [key]:
                          type === "number"
                            ? Number(e.target.value)
                            : e.target.value,
                      })
                    }
                  />
                )}
              </Field>
            </div>
          ))}
          {kind === "requirements" && (
            <Checks
              form={form}
              setForm={setForm}
              names={[
                ["isRequired", "Obligatorio"],
                ["isSensitive", "Dato sensible"],
              ]}
            />
          )}{" "}
          {kind === "steps" && <div className="space-y-3 rounded-2xl bg-blue-50 p-4"><Field label="Tipo de acción"><select className="field-input" value={form.completionMode||'manual'} onChange={e=>setForm({...form,completionMode:e.target.value})}><option value="manual">Confirmación manual</option><option value="form">Completar formulario</option><option value="evidence">Adjuntar archivo</option><option value="external_check">Acción en sitio externo</option><option value="payment">Pago ante la entidad</option></select></Field><Field label="Campos del formulario (JSON)"><textarea className="field-input min-h-24 font-mono text-xs" value={JSON.stringify(form.actionConfig||{},null,2)} onChange={e=>{try{setForm({...form,actionConfig:JSON.parse(e.target.value)})}catch{}}}/></Field><Field label="Seguimiento por fecha (opcional)"><select className="field-input" value={form.dateTrackingType||''} onChange={e=>setForm({...form,dateTrackingType:e.target.value,dateTrackingEnabled:Boolean(e.target.value)})}><option value="">Sin fecha</option><option value="APPOINTMENT">Cita</option><option value="DEADLINE">Vencimiento</option><option value="FOLLOW_UP">Seguimiento</option></select></Field><Checks form={form} setForm={setForm} names={[["requiresUserPresence","Requiere al usuario"],["canBeDelegated","Puede asumirlo el asesor"],["isPointOfNoReturn","Punto de no retorno"],["isOptional","Paso opcional"]]}/></div>}{" "}
          {kind === "sources" && (
            <Checks
              form={form}
              setForm={setForm}
              names={[["isPrimary", "Fuente principal"]]}
            />
          )}{" "}
          {error && <p className="text-xs font-bold text-red-600">{error}</p>}
          <button
            disabled={disabled || saving}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white disabled:opacity-40"
          >
            {saving ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Plus size={16} />
            )}
            Guardar
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(defaults);
              }}
              className="w-full text-xs font-black text-slate-500"
            >
              Cancelar edición
            </button>
          )}
        </form>
      </Card>
    </div>
  );
}
function Checks({ form, setForm, names }: any) {
  return (
    <div className="sm:col-span-2 flex flex-wrap gap-3">
      {names.map(([key, label]: string[]) => (
        <label
          key={key}
          className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-black"
        >
          <input
            type="checkbox"
            checked={Boolean(form[key])}
            onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
            className="accent-blue-600"
          />
          {label}
        </label>
      ))}
    </div>
  );
}
function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {children}
    </section>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
function Submit({ saving }: { saving: boolean }) {
  return (
    <button
      disabled={saving}
      className="sm:col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white"
    >
      {saving ? (
        <LoaderCircle className="animate-spin" size={17} />
      ) : (
        <Save size={17} />
      )}
      Guardar cambios
    </button>
  );
}
function PanelState() {
  return (
    <div className="grid min-h-80 place-items-center">
      <LoaderCircle className="animate-spin text-blue-600" size={34} />
    </div>
  );
}
function message(e: unknown) {
  return e instanceof Error ? e.message : "Ocurrió un error inesperado.";
}
