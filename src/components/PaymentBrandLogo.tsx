type PaymentBrandLogoProps = {
  brand: string;
  compact?: boolean;
  className?: string;
};

export const paymentBrandName = (brand: string) => {
  const names: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    diners: 'Diners Club',
  };
  return names[brand.toLowerCase()] || brand;
};

export const paymentBrandTheme = (brand: string) => {
  const themes: Record<string, string> = {
    visa: 'from-[#172b85] via-[#153bb7] to-[#0b63ce]',
    mastercard: 'from-[#111827] via-[#202938] to-[#374151]',
    amex: 'from-[#0866b2] via-[#1684cf] to-[#30a9df]',
    diners: 'from-[#083b71] via-[#07599b] to-[#168fc5]',
  };
  return themes[brand.toLowerCase()] || 'from-slate-900 to-blue-800';
};

export default function PaymentBrandLogo({ brand, compact = false, className = '' }: PaymentBrandLogoProps) {
  const normalized = brand.toLowerCase();
  const size = compact ? 'text-sm' : 'text-xl sm:text-2xl';

  if (normalized === 'mastercard') {
    return <span className={`inline-flex items-center gap-2 ${className}`} aria-label="Mastercard">
      <span className="relative inline-block h-7 w-11 shrink-0">
        <span className="absolute left-0 top-0 size-7 rounded-full bg-[#eb001b]" />
        <span className="absolute right-0 top-0 size-7 rounded-full bg-[#f79e1b] opacity-95" />
      </span>
      {!compact && <strong className="text-sm tracking-tight text-white">mastercard</strong>}
    </span>;
  }

  if (normalized === 'diners') {
    return <span className={`inline-flex items-center gap-2 ${className}`} aria-label="Diners Club">
      <span className="grid size-8 place-items-center rounded-full border-2 border-white text-sm font-black italic text-white">D</span>
      <strong className={`${compact ? 'text-xs' : 'text-sm'} leading-none text-white`}>DINERS<br />CLUB</strong>
    </span>;
  }

  if (normalized === 'amex') {
    return <strong className={`${size} inline-block border-2 border-white px-1.5 py-0.5 leading-none tracking-tighter text-white ${className}`} aria-label="American Express">AMERICAN<br />EXPRESS</strong>;
  }

  return <strong className={`${size} italic tracking-[-.08em] text-white ${className}`} aria-label="Visa">VISA</strong>;
}
