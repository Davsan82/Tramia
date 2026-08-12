import React, { useState, useEffect } from 'react';
import { User, ShieldCheck, CreditCard, Bell, ShieldAlert, Sparkles, Key, CheckCircle2, QrCode } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileViewProps {
  profile: UserProfile;
  onUpdateProfile: (p: UserProfile) => void;
}

export default function ProfileView({ profile, onUpdateProfile }: ProfileViewProps) {
  const [profileTab, setProfileTab] = useState<'info' | 'pago' | 'seguridad' | 'notif'>('info');

  // Input states synchronized from props
  const [fullName, setFullName] = useState(profile.fullName);
  const [dniNumber, setDniNumber] = useState(profile.dni);
  const [phone, setPhone] = useState(profile.phone);
  const [address, setAddress] = useState(profile.address);

  // Sync with prop updates
  useEffect(() => {
    setFullName(profile.fullName);
    setDniNumber(profile.dni);
    setPhone(profile.phone);
    setAddress(profile.address);
  }, [profile]);

  // Interactive Save state message
  const [isSaved, setIsSaved] = useState(false);
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      fullName,
      dni: dniNumber,
      phone,
      address,
      email: profile.email
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs max-w-3xl mx-auto divide-y divide-gray-150 animate-fadeIn">
      
      {/* Visual profile header */}
      <div className="p-6 md:p-8 bg-slate-900 text-white flex flex-col sm:flex-row items-center gap-6 relative">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none p-4">
          <Sparkles size={120} />
        </div>
        
        <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-black text-xl flex items-center justify-center border-4 border-slate-800 shadow-md">
          MC
        </div>
        
        <div className="text-center sm:text-left space-y-1 z-10">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h3 className="font-extrabold text-lg md:text-xl">{fullName}</h3>
            <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 text-[9px] font-bold px-2 py-0.5 rounded-md font-mono">
              CIUDADANO VERIFICADO
            </span>
          </div>
          <p className="text-xs text-slate-300">DNI: {dniNumber} • Lima, Perú • Copiloto TramIA Activo</p>
        </div>
      </div>

      {/* Internal Tabs navigation */}
      <div className="flex bg-slate-50/70 p-1 px-4 overflow-x-auto whitespace-nowrap scrollbar-none">
        {[
          { id: 'info', label: 'Datos Personales', icon: User },
          { id: 'pago', label: 'Métodos de Pago', icon: CreditCard },
          { id: 'seguridad', label: 'Seguridad', icon: Key },
          { id: 'notif', label: 'Notificaciones', icon: Bell }
        ].map((tab) => {
          const Icon = tab.icon;
          const IsActive = profileTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setProfileTab(tab.id as any)}
              className={`px-4 py-3 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
                IsActive
                  ? 'border-blue-600 text-blue-600 font-extrabold'
                  : 'border-transparent text-gray-500 hover:text-slate-800'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content panes based on selected tab */}
      <div className="p-6 md:p-8">
        
        {/* TAB 1: DATA PROFILE STATEMENT */}
        {profileTab === 'info' && (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="space-y-2 sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Nombres y Apellidos Completos</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-xs font-semibold px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 outline-hidden bg-slate-50 focus:bg-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Número de DNI (RENIEC verig.)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={dniNumber}
                    disabled
                    className="w-full text-xs font-semibold px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-500 select-all"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    Sincronizado
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Celular de contacto</label>
                <input 
                  type="text" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs font-semibold px-4 py-3 border border-gray-300 rounded-xl focus:border-blue-500 outline-hidden bg-slate-50 focus:bg-white"
                  required
                />
              </div>

            </div>

            {/* Simulated verification disclaimer */}
            <div className="p-4 rounded-xl bg-slate-50 border border-gray-200 flex gap-3 text-xs leading-relaxed text-slate-600">
              <ShieldCheck className="text-blue-600 shrink-0 mt-0.5" size={16} />
              <p>
                Tus datos provienen de la validación biométrica oficial. Cualquier contradicción con tu ficha ciudadana de RENIEC anulará tus derechos de tramitación automática en la mesa de partes digital de los ministerios.
              </p>
            </div>

            {/* Feedback notification status */}
            {isSaved && (
              <div className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 p-3 rounded-lg flex items-center gap-2">
                <CheckCircle2 size={14} />
                Cambios de perfil actualizados con éxito.
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
              >
                Guardar cambios de perfil
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: CREDIT / DEBIT / YAPE PAYMENTS SUPPORT */}
        {profileTab === 'pago' && (
          <div className="space-y-6">
            <h4 className="font-extrabold text-sm text-slate-900">Tus tarjetas y aplicativos de pago</h4>
            <p className="text-xs text-gray-400">TramIA soporta pasarelas de pago peruanas cifradas por PCI-DSS.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Credit card preview */}
              <div className="p-5 rounded-2xl border border-gray-200 bg-radial from-slate-900 to-slate-950 text-white flex flex-col justify-between h-40">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <p className="font-mono text-[9px] tracking-widest text-slate-400 uppercase">Tarjetas registradas</p>
                    <p className="text-xs font-bold text-white uppercase italic">Interbank Gold</p>
                  </div>
                  <CreditCard size={24} className="text-indigo-400" />
                </div>
                
                <div>
                  <p className="font-mono text-xs tracking-widest text-slate-100 font-semibold">•••• •••• •••• 1049</p>
                  <div className="flex justify-between mt-2 text-[10px] text-gray-450 font-mono">
                    <span>MAYRA CAMPOS SOLANO</span>
                    <span>EXP: 09/2029</span>
                  </div>
                </div>
              </div>

              {/* Peruvian payment apps integrations */}
              <div className="p-5 rounded-2xl border border-dashed border-gray-200 bg-slate-50 flex flex-col justify-between h-40">
                <div className="flex justify-between items-center">
                  <span className="text-slate-800 font-extrabold text-xs">Yape / Plin Directo</span>
                  <QrCode size={20} className="text-purple-650" />
                </div>
                
                <p className="text-xs text-slate-600 leading-normal">
                  Sincronizado con el número celular asociado <span className="font-bold">+51 *** *** 104</span>. Paga tus tasas y honorarios con código QR instantáneo.
                </p>

                <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 w-fit rounded font-bold uppercase tracking-wider font-mono">
                  Sincronizado
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PASSWORD AND CODIGO DE SEGURIDAD KEY SOL */}
        {profileTab === 'seguridad' && (
          <div className="space-y-6">
            <h4 className="font-extrabold text-sm text-slate-900">Seguridad legal y Clave SOL</h4>
            <p className="text-xs text-gray-400">Configura tus firmas digitales de mutuo acuerdo ante Indecopi.</p>

            <div className="space-y-4">
              <div className="p-4 bg-amber-50 text-amber-900 rounded-xl border border-amber-100 flex gap-3 text-xs">
                <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="font-bold">Tu firma digital biométrica está activa</p>
                  <p className="text-gray-500 mt-0.5">Esto permite que tu asesor Rodrigo presente expedientes oficiales ante SUNARP sin tener que acudir a un poder notarial formal de alto costo.</p>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 border border-gray-200 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Acceso Biométrico Móvil</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Ingresa al portal con FaceID / TouchID en tu navegador compatible.</p>
                </div>
                <div className="h-6 w-11 bg-blue-600 rounded-full flex items-center px-1 cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full translate-x-5 transition-transform" />
                </div>
              </div>

              <div className="flex justify-between items-center p-4 border border-gray-200 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Clave SOL de SUNAT Encriptada</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Utilizada exclusivamente por el validador automático de la empresa para declarar libros.</p>
                </div>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg font-bold font-mono">
                  ACTIVO CRIPTOGRÁFICO
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ALERTS PREFERENCES TOGGLES */}
        {profileTab === 'notif' && (
          <div className="space-y-6">
            <h4 className="font-extrabold text-sm text-slate-900">Canales de recordatorio y notificaciones</h4>
            <p className="text-xs text-gray-400">Decide cómo deseas enterarte sobre tu fecha de DNI o caducidad del SOAT.</p>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 border border-gray-200 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Alertas por Mensajería de Texto (SMS)</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Enviaremos alertas críticas 3 meses antes de que expire tu brevete o DNI.</p>
                </div>
                <div className="h-6 w-11 bg-blue-600 rounded-full flex items-center px-1 cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full translate-x-5 transition-transform" />
                </div>
              </div>

              <div className="flex justify-between items-center p-4 border border-gray-200 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Alertas por Correo Electrónico Semanales</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Novedades legislativas del diario oficial El Peruano y estados de trámite.</p>
                </div>
                <div className="h-6 w-11 bg-blue-600 rounded-full flex items-center px-1 cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full translate-x-5 transition-transform" />
                </div>
              </div>

              <div className="flex justify-between items-center p-4 border border-gray-200 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Consultas proactivas de Multas de Tránsito SUTRAN</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Monitoreamos el historial de tus placas de forma automática cada fin de mes.</p>
                </div>
                <div className="h-6 w-11 bg-slate-200 rounded-full flex items-center px-1 cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full transition-transform" />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
