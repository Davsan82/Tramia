import React, { useEffect, useState } from 'react';
import { AlertCircle, BadgeCheck, Building2, CalendarDays, CheckCircle2, Fingerprint, LoaderCircle, MailCheck, MapPin, Phone, Save, Send, ShieldCheck, UserRound } from 'lucide-react';
import { UserProfile } from '../types';
import TramIALogo from './TramIALogo';
import { Department, District, loadUbigeo, Province } from '../services/ubigeo';

interface ProfileViewProps { profile: UserProfile; onUpdateProfile: (profile: UserProfile) => void; }
type Notice = { type: 'success' | 'error'; text: string } | null;

export default function ProfileView({ profile, onUpdateProfile }: ProfileViewProps) {
  const [contact, setContact] = useState({ phone: profile.phone || '', address: profile.address || '', department: profile.department || '', province: profile.province || '', district: profile.district || '' });
  const [departments, setDepartments] = useState<Department[]>([]), [provinces, setProvinces] = useState<Province[]>([]), [districts, setDistricts] = useState<District[]>([]);
  const [identity, setIdentity] = useState({ document: '', birthDate: '' });
  const [saving, setSaving] = useState(false), [validating, setValidating] = useState(false), [sendingEmail, setSendingEmail] = useState(false);
  const [contactNotice, setContactNotice] = useState<Notice>(null), [identityNotice, setIdentityNotice] = useState<Notice>(null), [emailNotice, setEmailNotice] = useState<Notice>(null);
  const isIdentityVerified = profile.identityVerificationStatus === 'verified';

  useEffect(() => setContact({ phone: profile.phone || '', address: profile.address || '', department: profile.department || '', province: profile.province || '', district: profile.district || '' }), [profile]);
  useEffect(() => { loadUbigeo().then((data) => { setDepartments(data.departments); setProvinces(data.provinces); setDistricts(data.districts); }).catch(() => setContactNotice({ type: 'error', text: 'No pudimos cargar el catálogo de ubicaciones.' })); }, []);
  const updateContact = (key: keyof typeof contact) => (event: React.ChangeEvent<HTMLInputElement>) => setContact((value) => ({ ...value, [key]: event.target.value }));
  const selectedDepartment = departments.find((item) => item.departamento === contact.department);
  const availableProvinces = provinces.filter((item) => item.departamento_id === selectedDepartment?.id);
  const selectedProvince = availableProvinces.find((item) => item.provincia === contact.province);
  const availableDistricts = districts.filter((item) => item.departamento_id === selectedDepartment?.id && item.provincia_id === selectedProvince?.id);

  async function saveContact(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setContactNotice(null);
    try {
      const response = await fetch('/api/v1/profile', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contact) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'No pudimos guardar tus datos.');
      onUpdateProfile(result.user); setContactNotice({ type: 'success', text: 'Tus datos de contacto se guardaron correctamente.' });
    } catch (error) { setContactNotice({ type: 'error', text: error instanceof Error ? error.message : 'Ocurrió un error.' }); }
    finally { setSaving(false); }
  }

  async function resendVerification() {
    setSendingEmail(true); setEmailNotice(null);
    try {
      const response = await fetch('/api/v1/auth/resend-verification', { method: 'POST', credentials: 'include' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'No pudimos enviar el enlace.');
      setEmailNotice({ type: 'success', text: result.message });
    } catch (error) { setEmailNotice({ type: 'error', text: error instanceof Error ? error.message : 'Ocurrió un error.' }); }
    finally { setSendingEmail(false); }
  }

  async function validateIdentity(event: React.FormEvent) {
    event.preventDefault(); setValidating(true); setIdentityNotice(null);
    try {
      const response = await fetch('/api/v1/profile/validate-dni', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(identity) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'No pudimos validar tu identidad.');
      onUpdateProfile(result.user); setIdentityNotice({ type: 'success', text: result.message }); setIdentity({ document: '', birthDate: '' });
    } catch (error) { setIdentityNotice({ type: 'error', text: error instanceof Error ? error.message : 'Ocurrió un error.' }); }
    finally { setValidating(false); }
  }

  return <div className="mx-auto max-w-5xl space-y-5 animate-fadeIn">
    <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(120deg,#071a3d_0%,#0d47a1_58%,#13afd1_100%)] px-6 py-7 text-white shadow-xl shadow-blue-950/15 sm:px-9">
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-size-[23px_23px]" />
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div><TramIALogo iconSize={34} textSize="text-xl" variant="dark" /><p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-cyan-200">Mi perfil TramIA</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">Hola, {profile.fullName || profile.username}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">Completa tu cuenta y valida tu identidad para gestionar trámites con mayor seguridad.</p></div>
        <img src="/assets/mascot/tramia-bot-guiding.png" alt="TramIA te ayuda a completar tu perfil" className="hidden h-40 w-40 object-contain drop-shadow-xl sm:block" />
      </div>
    </section>

    <div className="grid gap-5 lg:grid-cols-[1.08fr_.92fr]">
      <form onSubmit={saveContact} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
        <SectionTitle icon={UserRound} title="Datos de contacto" description="Puedes actualizar estos datos cuando lo necesites." />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Celular" icon={Phone}><input className="field-input" required type="tel" value={contact.phone} onChange={updateContact('phone')} placeholder="+51 999 999 999" /></Field>
          <Field label="Departamento" icon={MapPin}><select className="field-input field-select" required value={contact.department} onChange={(event) => setContact((value) => ({ ...value, department: event.target.value, province: '', district: '' }))}><option value="">Selecciona</option>{departments.map((item) => <option key={item.ubigeo} value={item.departamento}>{formatPlace(item.departamento)}</option>)}</select></Field>
          <Field label="Provincia" icon={Building2}><select className="field-input field-select" required disabled={!selectedDepartment} value={contact.province} onChange={(event) => setContact((value) => ({ ...value, province: event.target.value, district: '' }))}><option value="">Selecciona</option>{availableProvinces.map((item) => <option key={item.ubigeo} value={item.provincia}>{formatPlace(item.provincia)}</option>)}</select></Field>
          <Field label="Distrito" icon={MapPin}><select className="field-input field-select" required disabled={!selectedProvince} value={contact.district} onChange={(event) => setContact((value) => ({ ...value, district: event.target.value }))}><option value="">Selecciona</option>{availableDistricts.map((item) => <option key={item.ubigeo} value={item.distrito}>{formatPlace(item.distrito)}</option>)}</select></Field>
          <div className="sm:col-span-2"><Field label="Dirección" icon={MapPin}><input className="field-input" required value={contact.address} onChange={updateContact('address')} placeholder="Av., calle, número y referencia" /></Field></div>
        </div>
        <NoticeBox notice={contactNotice} />
        <button disabled={saving} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/15 hover:bg-blue-700 disabled:opacity-60 sm:w-auto"><Save size={17} />{saving ? 'Guardando…' : 'Guardar cambios'}</button>
      </form>

      <div className="space-y-5">
        <section className="flex min-h-[150px] flex-col items-center justify-center rounded-3xl border border-blue-100 bg-white p-5 text-center shadow-sm sm:p-7">
          <SectionTitle icon={MailCheck} title="Verificación de correo" description={profile.email} centered />
          <StatusBadge verified={Boolean(profile.emailVerified)} verifiedText="Correo verificado" pendingText="Verificación pendiente" />
          {!profile.emailVerified && <><p className="mt-4 text-xs leading-5 text-slate-600">Te enviaremos un enlace de uso único. Podrás continuar usando TramIA mientras completas la verificación.</p><button type="button" onClick={resendVerification} disabled={sendingEmail} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-extrabold text-blue-700 hover:bg-blue-100 disabled:opacity-60"><Send size={15} />{sendingEmail ? 'Enviando…' : 'Enviar enlace de verificación'}</button></>}
          <NoticeBox notice={emailNotice} />
        </section>
        <section className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5 sm:p-6"><div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" size={21} /><div><h3 className="text-sm font-black text-slate-950">Tus datos están protegidos</h3><p className="mt-1 text-xs leading-5 text-slate-600">El número completo de DNI se guarda cifrado y nunca se muestra nuevamente. TramIA no solicita tu Clave SOL.</p></div></div></section>
      </div>
    </div>

    <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
      <SectionTitle icon={Fingerprint} title="Identidad ciudadana" description="Valida que el DNI te pertenece usando tu fecha de nacimiento." />
      {isIdentityVerified ? <div className="mt-6 grid gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:grid-cols-2 lg:grid-cols-4"><ReadOnly label="Nombres y apellidos" value={profile.fullName} /><ReadOnly label="DNI" value={profile.dni} /><ReadOnly label="Fecha de nacimiento" value={profile.birthDate || 'Validada'} /><ReadOnly label="Sexo registrado" value={profile.gender || '—'} /></div> : <form onSubmit={validateIdentity} className="mt-6 grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
        <Field label="DNI" icon={Fingerprint}><input className="field-input" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} required value={identity.document} onChange={(e) => setIdentity((v) => ({ ...v, document: e.target.value.replace(/\D/g, '') }))} placeholder="8 dígitos" /></Field>
        <Field label="Fecha de nacimiento" icon={CalendarDays}><input className="field-input" type="date" required max={new Date().toISOString().slice(0, 10)} value={identity.birthDate} onChange={(e) => setIdentity((v) => ({ ...v, birthDate: e.target.value }))} /></Field>
        <button disabled={validating} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-extrabold text-white hover:bg-blue-800 disabled:opacity-60">{validating ? <LoaderCircle className="animate-spin" size={17} /> : <BadgeCheck size={17} />}{validating ? 'Validando…' : 'Validar identidad'}</button>
      </form>}
      {!isIdentityVerified && <p className="mt-4 text-xs leading-5 text-slate-500">Los nombres, apellidos, sexo y fecha de nacimiento se completarán desde la fuente de identidad y ya no podrán editarse manualmente.</p>}
      <NoticeBox notice={identityNotice} />
    </section>
  </div>;
}

function SectionTitle({ icon: Icon, title, description, centered = false }: { icon: React.ElementType; title: string; description: string; centered?: boolean }) { return <div className={`flex gap-3 ${centered ? 'flex-col items-center text-center' : ''}`}><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Icon size={21} /></span><div><h2 className="text-lg font-black text-slate-950">{title}</h2><p className="mt-0.5 max-w-full break-all text-xs leading-5 text-slate-500">{description}</p></div></div>; }
function Field({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 flex items-center gap-2 text-xs font-extrabold text-slate-700"><Icon size={14} className="text-blue-600" />{label}</span>{children}</label>; }
function StatusBadge({ verified, verifiedText, pendingText }: { verified: boolean; verifiedText: string; pendingText: string }) { return <span className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold ${verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{verified ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}{verified ? verifiedText : pendingText}</span>; }
function NoticeBox({ notice }: { notice: Notice }) { return notice ? <div role="status" className={`mt-4 flex gap-2 rounded-xl border p-3 text-xs font-semibold ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{notice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}<span>{notice.text}</span></div> : null; }
function ReadOnly({ label, value }: { label: string; value?: string }) { return <div><p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">{label}</p><p className="mt-1 text-sm font-bold text-slate-900">{value || '—'}</p></div>; }
function formatPlace(value: string) { return value.toLocaleLowerCase('es-PE').replace(/(^|\s)(\p{L})/gu, (_, space, letter) => `${space}${letter.toLocaleUpperCase('es-PE')}`); }
