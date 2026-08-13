import React from 'react';
import { Baby, BriefcaseBusiness, Building2, CarFront, FileBadge2, FileCheck2, Fingerprint, Globe2, HeartHandshake, Home, Landmark, Plane, Scale, ShieldCheck, UserRoundCheck, WalletCards } from 'lucide-react';

const icons = { identity: Fingerprint, transport: CarFront, business: BriefcaseBusiness, family: HeartHandshake, travel: Plane, home: Home, finance: WalletCards, legal: Scale, government: Landmark, records: FileBadge2, people: UserRoundCheck, baby: Baby, building: Building2, default: FileCheck2 };

function themeFor(text: string) {
  const value = text.toLowerCase();
  if (/dni|identidad|reniec|pasaporte/.test(value)) return 'identity';
  if (/vehículo|vehiculo|auto|carro|licencia|soat|transporte/.test(value)) return 'transport';
  if (/empresa|negocio|ruc|sunat|licencia de funcionamiento/.test(value)) return 'business';
  if (/familia|matrimonio|unión|union/.test(value)) return 'family';
  if (/viaje|viajar|extranjero|migraciones/.test(value)) return 'travel';
  if (/casa|inmueble|propiedad|terreno/.test(value)) return 'home';
  if (/nacimiento|bebé|bebe|menor/.test(value)) return 'baby';
  if (/pago|tribut|finanza|alcabala/.test(value)) return 'finance';
  if (/legal|notari|antecedente|judicial/.test(value)) return 'legal';
  if (/registro|partida|certificado|acta/.test(value)) return 'records';
  return 'default';
}

export default function ProcedureIcon({ category, title, size = 30 }: { category: string; title?: string; size?: number }) {
  const Icon = icons[themeFor(`${category} ${title || ''}`) as keyof typeof icons] || ShieldCheck;
  return <span className="grid size-16 shrink-0 place-items-center rounded-2xl border border-blue-100 bg-[linear-gradient(145deg,#f4f8ff,#e8f2ff)] text-blue-600 shadow-sm"><Icon size={size} strokeWidth={1.8}/></span>;
}
