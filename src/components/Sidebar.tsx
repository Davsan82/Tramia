import React from 'react';
import { Home, Clock, History, User, Sparkles, Menu, X, LayoutDashboard } from 'lucide-react';
import { UserProfile } from '../types';
import TramIALogo from './TramIALogo';

interface SidebarProps {
  currentTab: 'inicio' | 'panel' | 'proceso' | 'validador' | 'historial' | 'perfil';
  setCurrentTab: (tab: 'inicio' | 'panel' | 'proceso' | 'validador' | 'historial' | 'perfil') => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  activeCount: number;
  completedCount?: number;
  profile: UserProfile | null;
  onTriggerLogin?: (mode?: 'login' | 'signup') => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  isOpen,
  setIsOpen,
  activeCount,
  completedCount,
  profile,
  onTriggerLogin
}: SidebarProps) {
  const menuItems = [
    { id: 'inicio' as const, label: 'Inicio', icon: Home },
    { id: 'panel' as const, label: 'Mi Panel', icon: LayoutDashboard, hidden: true },
    { id: 'proceso' as const, label: 'En proceso', icon: Clock, badge: activeCount > 0 ? activeCount : undefined },
    { id: 'historial' as const, label: 'Historial', icon: History, badge: (completedCount && completedCount > 0) ? completedCount : undefined },
    { id: 'perfil' as const, label: 'Perfil', icon: User },
  ].filter(item => !item.hidden);

  // Extract initials
  const initials = profile && profile.fullName
    ? profile.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'INV';

  // Extract short name
  const shortName = profile && profile.fullName
    ? profile.fullName.split(' ').slice(0, 2).join(' ')
    : 'Ciudadano Invitado';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Vertical Sidebar */}
      <aside 
        id="sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-200 ease-in-out md:translate-x-0`}
      >
        {/* Brand Logo header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <TramIALogo 
            iconSize={32}
            textSize="text-xl"
            variant="dark"
            onClick={() => setCurrentTab('inicio')}
          />
          
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded-md md:hidden"
            id="close-sidebar-btn"
          >
            <X size={20} />
          </button>
        </div>

        {/* User preview inside sidebar - Hidden when there is an active session */}
        {!profile && (
          <div className="p-4 mx-3 my-4 bg-slate-800/40 rounded-xl border border-slate-800/60 font-sans">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-semibold text-white/95">
                {initials}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-semibold truncate text-slate-100">{shortName}</p>
                <button
                  onClick={() => {
                    if (onTriggerLogin) onTriggerLogin('login');
                    setIsOpen(false);
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold underline text-left block cursor-pointer transition-colors"
                >
                  Iniciar Sesión →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const IsActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  IsActive
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={IsActive ? 'text-white' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full font-mono ${
                    IsActive ? 'bg-white text-blue-600' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Copilot assistance card inside sidebar - Hidden when there is an active session */}
        {!profile && (
          <div className="p-4 m-3 bg-gradient-to-br from-slate-800/50 to-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 mt-0.5">
                <Sparkles size={16} />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">¿Tienes dudas?</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Nuestros asesores expertos en trámites peruanos validan tu documentación.
                </p>
                <button 
                  onClick={() => setCurrentTab('proceso')}
                  className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 mt-2 block"
                >
                  Ver delegaciones →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-center">
          <p className="text-[10px] text-slate-500 font-mono">TramIA © 2026</p>
          <p className="text-[9px] text-slate-600 font-mono mt-0.5">Lima, Perú</p>
        </div>
      </aside>
    </>
  );
}
