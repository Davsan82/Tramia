import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { Sparkles, ShieldCheck, Mail, Lock, User, CreditCard, Landmark, ArrowRight, UserCheck, Eye, EyeOff, Apple, X } from 'lucide-react';
import TramIALogo, { TramIAIcon } from './TramIALogo';
import { trackEvent } from '../utils/analytics';

interface LoginViewProps {
  onAuthSuccess: (profile: UserProfile) => void;
  onClose?: () => void;
  initialMode?: 'login' | 'signup';
}

export default function LoginView({ onAuthSuccess, onClose, initialMode = 'login' }: LoginViewProps) {
  const [isLoginMode, setIsLoginMode] = useState<boolean>(initialMode === 'login');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  useEffect(() => {
    setIsLoginMode(initialMode === 'login');
  }, [initialMode]);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  // Validation indicator
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const deriveNameFromEmail = (emailStr: string): string => {
    const part = emailStr.split('@')[0];
    const words = part.split(/[\._\-]+/);
    return words
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  const getRegisteredUsers = (): any[] => {
    try {
      const data = localStorage.getItem('tramia_users_db');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  };

  const saveRegisteredUser = (user: any) => {
    try {
      const users = getRegisteredUsers();
      const filtered = users.filter((u: any) => u.email.toLowerCase() !== user.email.toLowerCase());
      filtered.push(user);
      localStorage.setItem('tramia_users_db', JSON.stringify(filtered));
    } catch (e) {
      console.error(e);
    }
  };

  const handleGoogleLogin = () => {
    setIsSubmitting(true);
    setErrorMsg('');
    setTimeout(() => {
      setIsSubmitting(false);
      const emailToUse = email.trim() || "mayra.campos@gmail.com";
      const users = getRegisteredUsers();
      const found = users.find((u: any) => u.email.toLowerCase() === emailToUse.toLowerCase());
      
      let googleUser: UserProfile;
      if (found) {
        googleUser = {
          fullName: found.fullName,
          dni: found.dni,
          phone: found.phone,
          address: found.address,
          email: found.email,
          isNew: false
        };
      } else {
        googleUser = {
          fullName: emailToUse !== "mayra.campos@gmail.com" ? deriveNameFromEmail(emailToUse) : "Mayra Campos Solano",
          dni: "47102948",
          phone: "+51 984 729 104",
          address: "Av. Del Ejército 420, Miraflores, Lima",
          email: emailToUse,
          isNew: !isLoginMode
        };
        saveRegisteredUser({
          ...googleUser
        });
      }
      onAuthSuccess(googleUser);
    }, 1200);
  };

  const handleOutlookLogin = () => {
    setIsSubmitting(true);
    setErrorMsg('');
    setTimeout(() => {
      setIsSubmitting(false);
      const emailToUse = email.trim() || "mayra.campos@outlook.com";
      const users = getRegisteredUsers();
      const found = users.find((u: any) => u.email.toLowerCase() === emailToUse.toLowerCase());
      
      let outlookUser: UserProfile;
      if (found) {
        outlookUser = {
          fullName: found.fullName,
          dni: found.dni,
          phone: found.phone,
          address: found.address,
          email: found.email,
          isNew: false
        };
      } else {
        outlookUser = {
          fullName: emailToUse !== "mayra.campos@outlook.com" ? deriveNameFromEmail(emailToUse) : "Mayra Campos Solano",
          dni: "47102948",
          phone: "+51 984 729 104",
          address: "Av. Del Ejército 420, Miraflores, Lima",
          email: emailToUse,
          isNew: !isLoginMode
        };
        saveRegisteredUser({
          ...outlookUser
        });
      }
      onAuthSuccess(outlookUser);
    }, 1200);
  };

  const handleAppleLogin = () => {
    setIsSubmitting(true);
    setErrorMsg('');
    setTimeout(() => {
      setIsSubmitting(false);
      const emailToUse = email.trim() || "mayra.campos@icloud.com";
      const users = getRegisteredUsers();
      const found = users.find((u: any) => u.email.toLowerCase() === emailToUse.toLowerCase());
      
      let appleUser: UserProfile;
      if (found) {
        appleUser = {
          fullName: found.fullName,
          dni: found.dni,
          phone: found.phone,
          address: found.address,
          email: found.email,
          isNew: false
        };
      } else {
        appleUser = {
          fullName: emailToUse !== "mayra.campos@icloud.com" ? deriveNameFromEmail(emailToUse) : "Mayra Campos Solano",
          dni: "47102948",
          phone: "+51 984 729 104",
          address: "Av. Del Ejército 420, Miraflores, Lima",
          email: emailToUse,
          isNew: !isLoginMode
        };
        saveRegisteredUser({
          ...appleUser
        });
      }
      onAuthSuccess(appleUser);
    }, 1200);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Quick validations
    if (!email.includes('@')) {
      setErrorMsg('Por favor ingrese un correo electrónico válido.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (!isLoginMode) {
      // Sign-up specific validations
      if (!fullName.trim()) {
        setErrorMsg('El nombre completo es requerido.');
        return;
      }
      if (dni.length !== 8 || isNaN(Number(dni))) {
        setErrorMsg('El DNI debe tener exactamente 8 dígitos numéricos.');
        return;
      }
      if (!phone.trim()) {
        setErrorMsg('El celular de contacto es necesario.');
        return;
      }
    }

    setIsSubmitting(true);

    // Simulate database write / authentication latency
    setTimeout(() => {
      setIsSubmitting(false);
      let finalProfile: UserProfile;

      if (!isLoginMode) {
        // Sign-up: create new user
        finalProfile = {
          fullName: fullName.trim(),
          dni: dni.trim(),
          phone: phone.trim(),
          address: address.trim() || "Lima, Perú",
          email: email.trim(),
          isNew: true
        };
        saveRegisteredUser({
          ...finalProfile,
          password
        });
        trackEvent('cuenta_creada', { is_new: true });
      } else {
        // Login: retrieve from users database
        const users = getRegisteredUsers();
        const found = users.find((u: any) => u.email.toLowerCase() === email.trim().toLowerCase());
        
        if (found) {
          finalProfile = {
            fullName: found.fullName,
            dni: found.dni,
            phone: found.phone,
            address: found.address,
            email: found.email,
            isNew: false
          };
        } else {
          // Fallback dynamic generation so that it shows THEIR info, not Mayra Campos!
          const derivedName = deriveNameFromEmail(email.trim());
          finalProfile = {
            fullName: derivedName,
            dni: dni || "47102948",
            phone: phone || "+51 984 729 104",
            address: address || "Lima, Perú",
            email: email.trim(),
            isNew: false
          };
          // Also save this derived profile so it's registered for subsequent logins
          saveRegisteredUser({
            ...finalProfile,
            password
          });
        }
      }

      onAuthSuccess(finalProfile);
    }, 1200);
  };

  return (
    <div className={`w-full ${isLoginMode ? 'max-w-md' : 'max-w-2xl'} bg-slate-900 border border-slate-800 text-white rounded-3xl overflow-hidden shadow-2xl flex flex-col p-6 md:p-8 animate-fadeIn relative transition-all duration-300`}>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-50 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full cursor-pointer transition-colors shadow-xs"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      )}
        
      <div className="w-full space-y-4">
        
        {/* Upgrade Branding Logo Part - Official TramIA logo */}
        <div className="mb-4 flex flex-col items-center sm:items-start" id="auth-logo-section">
          <TramIALogo 
            iconSize={36}
            textSize="text-2xl"
            variant="dark"
          />
          <p className="text-[10px] text-cyan-400 font-black tracking-widest uppercase font-mono leading-none mt-2">
            COPILOTO DE TRÁMITES INTELIGENTE
          </p>
        </div>

        {/* Toggle Title Headers */}
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold tracking-tight text-white">
            {isLoginMode ? 'Inicia Sesión' : 'Crea tu Cuenta Gratis'}
          </h3>
          <p className="text-xs text-slate-400">
            {isLoginMode 
              ? 'Ingresa tus credenciales para acceder a tus trámites activos.' 
              : 'Registra tus datos personales oficiales para habilitar la validación inteligente de expedientes.'}
          </p>
        </div>

        {/* Error alerts carrier banner */}
        {errorMsg && (
          <div className="bg-red-950/50 border border-red-800 text-red-200 p-3 rounded-xl text-xs font-semibold leading-normal animate-shake">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Main Interactive form layout */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          
          {isLoginMode ? (
            // Login mode: Standard stacked layout
            <div className="space-y-4">
              {/* Email ID Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-300">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail size={14} />
                  </span>
                  <input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 rounded-xl outline-hidden transition-all placeholder:font-normal font-mono bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-500 focus:bg-slate-800"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider font-mono flex justify-between text-slate-300">
                  <span>Contraseña Ciudadana</span>
                  <button type="button" className="text-[9px] text-cyan-400 hover:text-cyan-300 hover:underline">
                    ¿La olvidaste?
                  </button>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock size={14} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs font-semibold pl-10 pr-10 py-2.5 rounded-xl outline-hidden transition-all placeholder:font-normal bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-500 focus:bg-slate-800"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer transition-colors text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Signup Mode: 2-Column Grid Layout for compact height and wider width
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 text-left">
              
              {/* Left Column: Personal info */}
              <div className="space-y-4">
                {/* Full name input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Nombres y Apellidos Completos
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <User size={14} />
                    </span>
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez Quispe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-500 focus:bg-slate-800 outline-hidden transition-all placeholder:font-normal rounded-xl"
                      required
                    />
                  </div>
                </div>

                {/* DNI and Phone Grid layout */}
                <div className="grid grid-cols-2 gap-3">
                  {/* DNI Number */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">
                      DNI (RENIEC)
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      placeholder="8 dígitos"
                      value={dni}
                      onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-500 focus:bg-slate-800 outline-hidden transition-all placeholder:font-normal font-mono rounded-xl"
                      required
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">
                      Celular
                    </label>
                    <input
                      type="text"
                      placeholder="987654321"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-500 focus:bg-slate-800 outline-hidden transition-all placeholder:font-normal font-mono rounded-xl"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Credentials info */}
              <div className="space-y-4">
                {/* Email ID Field */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-300">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Mail size={14} />
                    </span>
                    <input
                      type="email"
                      placeholder="ejemplo@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 rounded-xl outline-hidden transition-all placeholder:font-normal font-mono bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-500 focus:bg-slate-800"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-300">
                    Contraseña Ciudadana
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Lock size={14} />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-xs font-semibold pl-10 pr-10 py-2.5 rounded-xl outline-hidden transition-all placeholder:font-normal bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-500 focus:bg-slate-800"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer transition-colors text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Action button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 mt-2 rounded-xl text-xs font-extrabold active:scale-98 transition-all flex items-center justify-center gap-2 group cursor-pointer shadow-xl disabled:opacity-75 disabled:pointer-events-none bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-blue-500/10"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Validando biométricos...
              </span>
            ) : (
              <>
                <span>{isLoginMode ? 'Ingresar a mi Cuenta' : 'Completar Registro'}</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-4 text-[10px] uppercase font-mono font-bold tracking-widest text-slate-500">O</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* SSO PROVIDERS STACK - SIDE BY SIDE FOR COMPACTNESS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="py-2.5 px-3 border rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-2xs border-slate-850 bg-slate-800/20 hover:bg-slate-800 text-slate-200 hover:text-white"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="truncate">Google</span>
          </button>

          {/* Microsoft Button */}
          <button
            type="button"
            onClick={handleOutlookLogin}
            className="py-2.5 px-3 border rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-2xs border-slate-850 bg-slate-800/20 hover:bg-slate-800 text-slate-200 hover:text-white"
          >
            <div className="grid grid-cols-2 gap-[2px] w-3 h-3 shrink-0">
              <div className="bg-[#f25022] w-[5px] h-[5px]"></div>
              <div className="bg-[#7fba00] w-[5px] h-[5px]"></div>
              <div className="bg-[#00a4ef] w-[5px] h-[5px]"></div>
              <div className="bg-[#ffb900] w-[5px] h-[5px]"></div>
            </div>
            <span className="truncate">Microsoft</span>
          </button>

          {/* Apple Button */}
          <button
            type="button"
            onClick={handleAppleLogin}
            className="py-2.5 px-3 border rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-2xs border-slate-850 bg-slate-800/20 hover:bg-slate-800 text-slate-200 hover:text-white"
          >
            <Apple size={13} className="text-white fill-white shrink-0" />
            <span className="truncate">Apple</span>
          </button>
        </div>

        {/* Toggle state switch button */}
        <p className="text-center text-xs pt-1.5 text-slate-400">
          {isLoginMode ? '¿Nuevo en TramIA?' : '¿Ya tienes una cuenta o clave ciudadana?'}
          <button
            type="button"
            onClick={() => {
              setErrorMsg('');
              setIsLoginMode(!isLoginMode);
            }}
            className="ml-1 text-xs font-extrabold hover:underline focus:outline-hidden cursor-pointer text-cyan-400 hover:text-cyan-300"
          >
            {isLoginMode ? 'Crear tu cuenta gratis' : 'Iniciar Sesión'}
          </button>
        </p>

      </div>
    </div>
  );
}
