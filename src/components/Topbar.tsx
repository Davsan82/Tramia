import React from 'react';
import { Search, Menu } from 'lucide-react';
import { ExpirationReminder, UserProfile } from '../types';
import TramIALogo from './TramIALogo';

interface TopbarProps {
  onSearchFocus: () => void;
  searchText: string;
  setSearchText: (text: string) => void;
  onOpenSidebar: () => void;
  reminders: ExpirationReminder[];
  onTriggerReminder: (reminder: ExpirationReminder) => void;
  profile: UserProfile | null;
  onTriggerLogin?: (mode?: 'login' | 'signup') => void;
  isHomeView?: boolean;
  currentTab?: string;
  setCurrentTab?: (tab: 'inicio' | 'panel' | 'proceso' | 'historial' | 'perfil') => void;
  setInicioSubView?: (view: 'home' | 'search' | 'detail' | 'workspace') => void;
  activeCount?: number;
}

export default function Topbar({
  onSearchFocus,
  searchText,
  setSearchText,
  onOpenSidebar,
  reminders,
  onTriggerReminder,
  profile,
  onTriggerLogin,
  isHomeView = false,
  currentTab,
  setCurrentTab,
  setInicioSubView,
  activeCount = 0
 }: TopbarProps) {
  // Extract initials
  const initials = profile && profile.fullName
    ? profile.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'INV';

  // Extract short name
  const shortName = profile && profile.fullName
    ? profile.fullName.split(' ').slice(0, 2).join(' ')
    : 'Ciudadano Invitado';

  return (
    <header className="h-16 border-b border-gray-200 bg-white sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between">
      {/* Left section: Hamburger for mobile + Interactive Search trigger, OR Branding in onboarding/unauthenticated */}
      {!profile ? (
        <div className="flex items-center gap-6 flex-1">
          <TramIALogo 
            iconSize={32}
            textSize="text-xl"
            variant="light"
            onClick={() => {
              if (setCurrentTab) setCurrentTab('inicio');
              if (setInicioSubView) setInicioSubView('home');
            }}
          />
        </div>
      ) : (
        <div className="flex items-center gap-4 flex-1">
          <button 
            onClick={onOpenSidebar}
            className="p-1 text-gray-500 hover:text-gray-900 md:hidden rounded-md focus:outline-none"
            id="open-sidebar-btn"
          >
            <Menu size={22} />
          </button>
        </div>
      )}

      {/* Right section: System Status + Notifications + Profile Info */}
      <div className="flex items-center gap-4">
        {/* User Account Capsule */}
        <div className="flex items-center gap-2.5 border-l border-gray-200 pl-4">
          {profile ? (
            <>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold text-slate-800">{shortName}</p>
                <p className="text-[10px] text-slate-400 font-mono">{profile.email || 'correo@ciudadano.pe'}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-medium text-xs flex items-center justify-center border border-gray-200 uppercase">
                {initials}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onTriggerLogin?.('login')}
                className="px-3 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => onTriggerLogin?.('signup')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-sm shadow-blue-500/10 active:scale-[0.98]"
              >
                Crear Cuenta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
