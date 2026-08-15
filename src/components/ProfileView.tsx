import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  Camera,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  Fingerprint,
  LoaderCircle,
  MailCheck,
  MapPin,
  Phone,
  Save,
  Send,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { UserProfile } from "../types";
import TramIALogo from "./TramIALogo";
import PaymentBrandLogo, { paymentBrandName, paymentBrandTheme } from "./PaymentBrandLogo";
import { Department, District, loadUbigeo, Province } from "../services/ubigeo";
import { isValidPhone, PHONE_COUNTRIES, phoneLengthMessage, splitStoredPhone } from "../../shared/phone";

interface ProfileViewProps {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}
type Notice = { type: "success" | "error"; text: string } | null;

const AVATAR_ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_MAX_SOURCE_SIZE = 12 * 1024 * 1024;
const AVATAR_MAX_UPLOAD_SIZE = 3 * 1024 * 1024;

async function prepareAvatar(file: File) {
  if (!AVATAR_ACCEPTED_TYPES.includes(file.type))
    throw new Error("Selecciona una foto JPG, PNG o WebP.");
  if (!file.size || file.size > AVATAR_MAX_SOURCE_SIZE)
    throw new Error("La foto original debe pesar como máximo 12 MB.");
  if (file.size <= AVATAR_MAX_UPLOAD_SIZE) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No pudimos preparar la foto en este dispositivo.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.88, 0.78, 0.68]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (blob && blob.size <= AVATAR_MAX_UPLOAD_SIZE)
      return new File([blob], "foto-perfil.webp", { type: "image/webp" });
  }
  throw new Error("No pudimos reducir la foto. Prueba con una imagen más liviana.");
}

export default function ProfileView({
  profile,
  onUpdateProfile,
}: ProfileViewProps) {
  const initialPhone = splitStoredPhone(profile.phone || "");
  const [contact, setContact] = useState({
    ...initialPhone,
    address: profile.address || "",
    department: profile.department || "",
    province: profile.province || "",
    district: profile.district || "",
  });
  const [departments, setDepartments] = useState<Department[]>([]),
    [provinces, setProvinces] = useState<Province[]>([]),
    [districts, setDistricts] = useState<District[]>([]);
  const [identity, setIdentity] = useState({ document: "", birthDate: "" });
  const [saving, setSaving] = useState(false),
    [validating, setValidating] = useState(false),
    [sendingEmail, setSendingEmail] = useState(false);
  const [contactNotice, setContactNotice] = useState<Notice>(null),
    [identityNotice, setIdentityNotice] = useState<Notice>(null),
    [emailNotice, setEmailNotice] = useState<Notice>(null),
    [paymentNotice, setPaymentNotice] = useState<Notice>(null),
    [methods, setMethods] = useState<any[]>([]),
    [payments, setPayments] = useState<any[]>([]),
    [updatingMethodId, setUpdatingMethodId] = useState<string | null>(null),
    [uploading, setUploading] = useState(false),
    [avatarModalOpen, setAvatarModalOpen] = useState(false),
    [avatarFile, setAvatarFile] = useState<File | null>(null),
    [avatarPreview, setAvatarPreview] = useState(""),
    [avatarNotice, setAvatarNotice] = useState<Notice>(null),
    [reputation, setReputation] = useState({ average: "0", count: 0 });
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const isIdentityVerified = profile.identityVerificationStatus === "verified";

  useEffect(
    () => {
      const storedPhone = splitStoredPhone(profile.phone || "");
      setContact({
        ...storedPhone,
        address: profile.address || "",
        department: profile.department || "",
        province: profile.province || "",
        district: profile.district || "",
      });
    },
    [profile],
  );
  useEffect(() => {
    loadUbigeo()
      .then((data) => {
        setDepartments(data.departments);
        setProvinces(data.provinces);
        setDistricts(data.districts);
      })
      .catch(() =>
        setContactNotice({
          type: "error",
          text: "No pudimos cargar el catálogo de ubicaciones.",
        }),
      );
  }, []);
  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);
  const updateContact =
    (key: keyof typeof contact) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setContact((value) => ({ ...value, [key]: event.target.value }));
  const loadPayments = () =>
    Promise.all([
      fetch("/api/v1/payment-methods", { credentials: "include" }).then((r) =>
        r.json(),
      ),
      fetch("/api/v1/payments/history", { credentials: "include" }).then((r) =>
        r.json(),
      ),
    ])
      .then(([a, b]) => {
        setMethods(a.methods || []);
        setPayments(b.payments || []);
      })
      .catch(() => {});
  useEffect(() => {
    void loadPayments();
  }, []);
  useEffect(() => {
    if (!profile.id) return;
    fetch(`/api/v1/users/${profile.id}/reputation`, { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => setReputation(payload.reputation || { average: "0", count: 0 }))
      .catch(() => {});
  }, [profile.id]);
  function chooseAvatar(file?: File) {
    setAvatarNotice(null);
    if (!file) return;
    if (!AVATAR_ACCEPTED_TYPES.includes(file.type)) {
      setAvatarNotice({ type: "error", text: "Selecciona una foto JPG, PNG o WebP." });
      return;
    }
    if (!file.size || file.size > AVATAR_MAX_SOURCE_SIZE) {
      setAvatarNotice({ type: "error", text: "La foto original debe pesar como máximo 12 MB." });
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }
  function closeAvatarModal(force = false) {
    if (uploading && !force) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview("");
    setAvatarFile(null);
    setAvatarNotice(null);
    setAvatarModalOpen(false);
  }
  async function uploadAvatar() {
    if (!avatarFile || uploading) return;
    setUploading(true);
    setAvatarNotice(null);
    try {
      const preparedFile = await prepareAvatar(avatarFile);
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(new Error("No pudimos leer la foto seleccionada."));
        reader.readAsDataURL(preparedFile);
      });
      const response = await fetch("/api/v1/profile/avatar", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimeType: preparedFile.type, contentBase64 }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "No pudimos subir la foto.");
      onUpdateProfile({
        ...profile,
        avatarUrl: `${result.avatarUrl}?v=${Date.now()}`,
      });
      closeAvatarModal(true);
    } catch (error) {
      setAvatarNotice({
        type: "error",
        text: error instanceof Error ? error.message : "No pudimos subir la foto.",
      });
    } finally {
      setUploading(false);
    }
  }
  async function addMethod(brand: string) {
    const r = await fetch("/api/v1/payment-methods/simulated", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand }),
    });
    if (r.ok) await loadPayments();
  }
  async function methodAction(id: string, action: "default" | "delete") {
    setUpdatingMethodId(id);
    setPaymentNotice(null);
    const previousMethods = methods;
    if (action === "default") setMethods(current => current.map(method => ({ ...method, isDefault: method.id === id })));
    try {
      const response = await fetch(
        `/api/v1/payment-methods/${id}${action === "default" ? "/default" : ""}`,
        { method: action === "default" ? "PATCH" : "DELETE", credentials: "include" },
      );
      const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No pudimos actualizar la tarjeta.");
      await loadPayments();
      setPaymentNotice({ type: "success", text: action === "default" ? "Esta es ahora tu única tarjeta predeterminada." : "La tarjeta fue eliminada correctamente." });
    } catch (error) {
      setMethods(previousMethods);
      setPaymentNotice({ type: "error", text: error instanceof Error ? error.message : "No pudimos actualizar la tarjeta." });
    } finally {
      setUpdatingMethodId(null);
    }
  }
  const selectedDepartment = departments.find(
    (item) => item.departamento === contact.department,
  );
  const availableProvinces = provinces.filter(
    (item) => item.departamento_id === selectedDepartment?.id,
  );
  const selectedProvince = availableProvinces.find(
    (item) => item.provincia === contact.province,
  );
  const availableDistricts = districts.filter(
    (item) =>
      item.departamento_id === selectedDepartment?.id &&
      item.provincia_id === selectedProvince?.id,
  );

  async function saveContact(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setContactNotice(null);
    try {
      if (!isValidPhone(contact.phonePrefix, contact.phoneNumber))
        throw new Error(phoneLengthMessage(contact.phonePrefix));
      const response = await fetch("/api/v1/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contact),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.message || "No pudimos guardar tus datos.");
      onUpdateProfile({ ...profile, ...result.contact });
      setContactNotice({
        type: "success",
        text: "Tus datos de contacto se guardaron correctamente.",
      });
    } catch (error) {
      setContactNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Ocurrió un error.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function resendVerification() {
    setSendingEmail(true);
    setEmailNotice(null);
    try {
      const response = await fetch("/api/v1/auth/resend-verification", {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.message || "No pudimos enviar el enlace.");
      setEmailNotice({ type: "success", text: result.message });
    } catch (error) {
      setEmailNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Ocurrió un error.",
      });
    } finally {
      setSendingEmail(false);
    }
  }

  async function validateIdentity(event: React.FormEvent) {
    event.preventDefault();
    setValidating(true);
    setIdentityNotice(null);
    try {
      const response = await fetch("/api/v1/profile/validate-dni", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(identity),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.message || "No pudimos validar tu identidad.");
      onUpdateProfile(result.user);
      setIdentityNotice({ type: "success", text: result.message });
      setIdentity({ document: "", birthDate: "" });
    } catch (error) {
      setIdentityNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Ocurrió un error.",
      });
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-fadeIn">
      <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(120deg,#071a3d_0%,#0d47a1_58%,#13afd1_100%)] px-6 py-7 text-white shadow-xl shadow-blue-950/15 sm:px-9">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-size-[23px_23px]" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <TramIALogo iconSize={34} textSize="text-xl" variant="dark" />
            <p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-cyan-200">
              Mi perfil TramIA
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Hola, {profile.fullName || profile.username}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
              Completa tu cuenta y valida tu identidad para gestionar trámites
              con mayor seguridad.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <img
                src={
                  profile.avatarUrl || "/assets/mascot/tramia-bot-guiding.png"
                }
                alt="Foto de perfil"
                onError={(event) => {
                  const fallback = "/assets/mascot/tramia-bot-guiding.png";
                  if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback;
                }}
                className="h-32 w-32 rounded-full border-4 border-white/30 object-cover drop-shadow-xl sm:h-40 sm:w-40"
              />
              {isIdentityVerified && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-black text-white shadow">
                  <BadgeCheck className="mr-1 inline" size={13} />
                  ID verificado
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setAvatarModalOpen(true)}
              className="rounded-xl bg-white/15 px-3 py-2 text-xs font-black backdrop-blur transition hover:bg-white/25"
            >
              <Upload className="mr-1 inline" size={14} />
              Cambiar foto
            </button>
          </div>
        </div>
      </section>

      {avatarModalOpen && (
        <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-sm">
          <section className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl">
            <div className="h-1.5 bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400" />
            <button
              type="button"
              onClick={closeAvatarModal}
              disabled={uploading}
              aria-label="Cerrar"
              className="absolute right-5 top-5 grid size-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-40"
            >
              <X size={18} />
            </button>
            <div className="p-6 sm:p-8">
              <span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-600">
                <Camera size={23} />
              </span>
              <p className="mt-5 text-[11px] font-black uppercase tracking-[.18em] text-blue-600">Foto de perfil</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Actualiza tu foto</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Usa una imagen clara de tu rostro. TramIA la optimizará antes de guardarla.</p>

              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  chooseAvatar(event.dataTransfer.files?.[0]);
                }}
                className={`mt-6 grid min-h-60 place-items-center rounded-3xl border-2 border-dashed p-5 text-center transition ${avatarPreview ? "border-blue-200 bg-blue-50/50" : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40"}`}
              >
                {avatarPreview ? (
                  <div>
                    <img src={avatarPreview} alt="Vista previa de la foto" className="mx-auto size-36 rounded-full border-4 border-white object-cover shadow-lg" />
                    <p className="mt-3 max-w-xs truncate text-sm font-black text-slate-900">{avatarFile?.name}</p>
                    <button type="button" onClick={() => avatarInputRef.current?.click()} className="mt-2 text-xs font-black text-blue-600">Elegir otra foto</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => avatarInputRef.current?.click()} className="group">
                    <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-blue-600 shadow-sm transition group-hover:-translate-y-0.5">
                      <Upload size={24} />
                    </span>
                    <strong className="mt-4 block text-sm text-slate-900">Arrastra tu foto aquí o selecciónala</strong>
                    <span className="mt-1 block text-xs text-slate-500">JPG, PNG o WebP · hasta 12 MB</span>
                  </button>
                )}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    chooseAvatar(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </div>

              {avatarNotice && <NoticeBox notice={avatarNotice} />}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={closeAvatarModal} disabled={uploading} className="min-h-12 rounded-xl bg-slate-100 px-5 text-sm font-black text-slate-700 disabled:opacity-40">Cancelar</button>
                <button type="button" onClick={() => void uploadAvatar()} disabled={!avatarFile || uploading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:opacity-40">
                  {uploading ? <><LoaderCircle className="animate-spin" size={17}/>Guardando foto…</> : <><Upload size={17}/>Guardar foto</>}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <section className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-amber-700">Reputación TramIA</p>
            <h2 className="mt-1 text-lg font-black">Tu experiencia como cliente</h2>
            <p className="mt-1 text-sm text-slate-600">Los asesores pueden calificar tu colaboración cuando finaliza una gestión delegada.</p>
          </div>
          <div className="flex min-w-44 items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm">
            <Star className="fill-amber-400 text-amber-400" size={30} />
            <div><p className="text-2xl font-black">{Number(reputation.average).toFixed(1)}</p><p className="text-[11px] font-bold text-slate-500">{reputation.count} {reputation.count === 1 ? "calificación" : "calificaciones"}</p></div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.28fr_.72fr]">
        <form
          onSubmit={saveContact}
          className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7"
        >
          <SectionTitle
            icon={UserRound}
            title="Datos de contacto"
            description="Puedes actualizar estos datos cuando lo necesites."
          />
          <div className="mt-6 space-y-5">
            <Field label="Celular" icon={Phone}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[10.5rem_minmax(0,1fr)] sm:gap-3">
                <select
                  className="field-input field-select min-w-0 text-left font-bold text-blue-800"
                  required
                  value={contact.phonePrefix}
                  onChange={(event) =>
                    setContact((value) => ({
                      ...value,
                      phonePrefix: event.target.value,
                      phoneNumber: "",
                    }))
                  }
                  aria-label="País y prefijo telefónico"
                >
                  {PHONE_COUNTRIES.map((country) => (
                    <option key={country.prefix} value={country.prefix} title={country.country}>
                      {country.flag} {country.country} {country.prefix}
                    </option>
                  ))}
                </select>
                <input
                  className="field-input min-w-0 font-semibold tracking-wide tabular-nums"
                  required
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="tel-national"
                  maxLength={15}
                  value={contact.phoneNumber}
                  onChange={(event) =>
                    setContact((value) => ({
                      ...value,
                      phoneNumber: event.target.value.replace(/\D/g, "").slice(0, 15),
                    }))
                  }
                  placeholder="973110496"
                  aria-label="Número de celular"
                />
              </div>
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Departamento" icon={MapPin}>
                <select
                  className="field-input field-select"
                  required
                  value={contact.department}
                  onChange={(event) =>
                    setContact((value) => ({
                      ...value,
                      department: event.target.value,
                      province: "",
                      district: "",
                    }))
                  }
                >
                  <option value="">Selecciona</option>
                  {departments.map((item) => (
                    <option key={item.ubigeo} value={item.departamento}>
                      {formatPlace(item.departamento)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Provincia" icon={Building2}>
                <select
                  className="field-input field-select"
                  required
                  disabled={!selectedDepartment}
                  value={contact.province}
                  onChange={(event) =>
                    setContact((value) => ({
                      ...value,
                      province: event.target.value,
                      district: "",
                    }))
                  }
                >
                  <option value="">Selecciona</option>
                  {availableProvinces.map((item) => (
                    <option key={item.ubigeo} value={item.provincia}>
                      {formatPlace(item.provincia)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Distrito" icon={MapPin}>
                <select
                  className="field-input field-select"
                  required
                  disabled={!selectedProvince}
                  value={contact.district}
                  onChange={(event) =>
                    setContact((value) => ({
                      ...value,
                      district: event.target.value,
                    }))
                  }
                >
                  <option value="">Selecciona</option>
                  {availableDistricts.map((item) => (
                    <option key={item.ubigeo} value={item.distrito}>
                      {formatPlace(item.distrito)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Dirección" icon={MapPin}>
              <input
                className="field-input"
                required
                value={contact.address}
                onChange={updateContact("address")}
                placeholder="Av., calle, número y referencia"
              />
            </Field>
          </div>
          <NoticeBox notice={contactNotice} />
          <button
            disabled={saving}
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/15 hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
          >
            <Save size={17} />
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>

        <div className="space-y-5">
          <section className="flex min-h-[150px] flex-col items-center justify-center rounded-3xl border border-blue-100 bg-white p-5 text-center shadow-sm sm:p-7">
            <SectionTitle
              icon={MailCheck}
              title="Verificación de correo"
              description={profile.email}
              centered
            />
            <StatusBadge
              verified={Boolean(profile.emailVerified)}
              verifiedText="Correo verificado"
              pendingText="Verificación pendiente"
            />
            {!profile.emailVerified && (
              <>
                <p className="mt-4 text-xs leading-5 text-slate-600">
                  Te enviaremos un enlace de uso único. Podrás continuar usando
                  TramIA mientras completas la verificación.
                </p>
                <button
                  type="button"
                  onClick={resendVerification}
                  disabled={sendingEmail}
                  className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-extrabold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                >
                  <Send size={15} />
                  {sendingEmail ? "Enviando…" : "Enviar enlace de verificación"}
                </button>
              </>
            )}
            <NoticeBox notice={emailNotice} />
          </section>
          <section className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5 sm:p-6">
            <div className="flex gap-3">
              <ShieldCheck
                className="mt-0.5 shrink-0 text-emerald-600"
                size={21}
              />
              <div>
                <h3 className="text-sm font-black text-slate-950">
                  Tus datos están protegidos
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  El número completo de DNI se guarda cifrado y nunca se muestra
                  nuevamente. TramIA no solicita tu Clave SOL.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
        <SectionTitle
          icon={Fingerprint}
          title="Identidad ciudadana"
          description="Valida que el DNI te pertenece usando tu fecha de nacimiento."
        />
        {isIdentityVerified ? (
          <div className="mt-6 grid gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <ReadOnly label="Nombres y apellidos" value={profile.fullName} />
            <ReadOnly label="DNI" value={profile.dni} />
            <ReadOnly
              label="Fecha de nacimiento"
              value={formatLatinDate(profile.birthDate)}
            />
            <ReadOnly
              label="Sexo registrado"
              value={formatGender(profile.gender)}
            />
          </div>
        ) : (
          <form
            onSubmit={validateIdentity}
            className="mt-6 grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]"
          >
            <Field label="DNI" icon={Fingerprint}>
              <input
                className="field-input"
                inputMode="numeric"
                pattern="[0-9]{8}"
                maxLength={8}
                required
                value={identity.document}
                onChange={(e) =>
                  setIdentity((v) => ({
                    ...v,
                    document: e.target.value.replace(/\D/g, ""),
                  }))
                }
                placeholder="8 dígitos"
              />
            </Field>
            <Field label="Fecha de nacimiento" icon={CalendarDays}>
              <input
                className="field-input"
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
                value={identity.birthDate}
                onChange={(e) =>
                  setIdentity((v) => ({ ...v, birthDate: e.target.value }))
                }
              />
            </Field>
            <button
              disabled={validating}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-extrabold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {validating ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <BadgeCheck size={17} />
              )}
              {validating ? "Validando…" : "Validar identidad"}
            </button>
          </form>
        )}
        {!isIdentityVerified && (
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Los nombres, apellidos, sexo y fecha de nacimiento se completarán
            desde la fuente de identidad y ya no podrán editarse manualmente.
          </p>
        )}
        <NoticeBox notice={identityNotice} />
      </section>
      <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
        <SectionTitle
          icon={CreditCard}
          title="Mis medios de pago"
          description="Administra las tarjetas disponibles para tus pagos dentro de TramIA."
        />
        <p className="mt-3 text-xs leading-5 text-slate-500">Puedes guardar varias tarjetas, pero solo una será la predeterminada. Tú eliges cuál usar por defecto.</p>
        <NoticeBox notice={paymentNotice} />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {methods.map((method) => (
            <article
              key={method.id}
              className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${paymentBrandTheme(method.brand)} p-5 text-white shadow-lg`}
            >
              <div className="absolute -right-10 -top-12 size-36 rounded-full bg-white/10" />
              <div className="relative flex items-start justify-between"><PaymentBrandLogo brand={method.brand} />{method.isDefault&&<span className="rounded-full border border-white/20 bg-white/15 px-2 py-1 text-[10px] font-black backdrop-blur">Predeterminada</span>}</div>
              <p className="mt-8 text-lg font-black tracking-[.2em]">
                •••• •••• •••• {method.lastFour}
              </p>
              <div className="mt-4 flex justify-between text-xs">
                <span>{method.holderName}</span>
                <span>
                  {String(method.expiryMonth).padStart(2, "0")}/
                  {method.expiryYear}
                </span>
              </div><div className="mt-4 flex flex-wrap gap-2">{method.isDefault?<span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-white/20 bg-white/20 px-3 text-[10px] font-black"><CheckCircle2 size={13}/> Tarjeta predeterminada</span>:<button disabled={updatingMethodId!==null} onClick={()=>void methodAction(method.id,'default')} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-white/25 bg-white/15 px-3 text-[10px] font-black transition hover:bg-white/25 disabled:opacity-50"><Star size={13}/> Elegir como predeterminada</button>}<button disabled={updatingMethodId!==null} onClick={()=>void methodAction(method.id,'delete')} className="min-h-8 rounded-lg bg-red-500/30 px-3 text-[10px] font-black disabled:opacity-50"><Trash2 className="mr-1 inline" size={12}/>Eliminar</button></div>
            </article>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {["visa", "mastercard", "amex", "diners"].map((brand) => (
            <button
              key={brand}
              onClick={() => void addMethod(brand)}
              className="min-h-10 rounded-xl border border-blue-200 px-4 text-xs font-black uppercase text-blue-700"
            >
              Agregar {paymentBrandName(brand)}
            </button>
          ))}
        </div>
      </section>
      {payments.length > 0 && (
        <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
          <SectionTitle
            icon={CreditCard}
            title="Historial de pagos"
            description="Consulta y descarga los comprobantes asociados a tus trámites."
          />
          <div className="mt-5 space-y-2">
            {payments.map((payment) => (
              <article
                key={payment.id}
                className="flex flex-col gap-2 rounded-xl bg-slate-50 p-4 text-xs sm:flex-row sm:items-center"
              >
                <div className="flex-1">
                  <p className="font-black">{payment.procedureTitle}</p>
                  <p className="mt-1 text-slate-500">
                    {payment.reference || "Sin referencia"} · {payment.status}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <strong>S/ {(payment.amountMinor / 100).toFixed(2)}</strong>
                  {["paid", "authorized", "partially_refunded"].includes(payment.status) && (
                    <a href={`/api/v1/payments/${payment.id}/receipt.pdf`} download className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 font-black text-blue-700 transition hover:bg-blue-50">
                      <Download size={14} /> Boleta PDF
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
  centered = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  centered?: boolean;
}) {
  return (
    <div
      className={`flex gap-3 ${centered ? "flex-col items-center text-center" : ""}`}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">
        <Icon size={21} />
      </span>
      <div>
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <p className="mt-0.5 max-w-full break-all text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}
function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-xs font-extrabold text-slate-700">
        <Icon size={14} className="text-blue-600" />
        {label}
      </span>
      {children}
    </label>
  );
}
function StatusBadge({
  verified,
  verifiedText,
  pendingText,
}: {
  verified: boolean;
  verifiedText: string;
  pendingText: string;
}) {
  return (
    <span
      className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold ${verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}
    >
      {verified ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {verified ? verifiedText : pendingText}
    </span>
  );
}
function NoticeBox({ notice }: { notice: Notice }) {
  return notice ? (
    <div
      role="status"
      className={`mt-4 flex gap-2 rounded-xl border p-3 text-xs font-semibold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}
    >
      {notice.type === "success" ? (
        <CheckCircle2 size={16} />
      ) : (
        <AlertCircle size={16} />
      )}
      <span>{notice.text}</span>
    </div>
  ) : null;
}
function ReadOnly({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value || "—"}</p>
    </div>
  );
}
function formatPlace(value: string) {
  return value
    .toLocaleLowerCase("es-PE")
    .replace(
      /(^|\s)(\p{L})/gu,
      (_, space, letter) => `${space}${letter.toLocaleUpperCase("es-PE")}`,
    );
}
function formatGender(value?: string) {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "M" || normalized === "MASCULINO") return "Masculino";
  if (normalized === "F" || normalized === "FEMENINO") return "Femenino";
  return value || "—";
}
function formatLatinDate(value?: string) {
  if (!value) return "Validada";
  const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}
