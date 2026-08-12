import React from 'react';

interface TramIAIconProps {
  className?: string;
  size?: number;
}

export function TramIAIcon({ className = "w-8 h-8", size }: TramIAIconProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <defs>
        {/* Bright Electric Blue Gradient for Top Bar & Arrow Wing */}
        <linearGradient id="tramia-top-gradient" x1="10%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#004AD6" />
        </linearGradient>

        {/* Deep Navy/Dark Blue Gradient for Vertical Stem */}
        <linearGradient id="tramia-stem-gradient" x1="20%" y1="10%" x2="80%" y2="90%">
          <stop offset="0%" stopColor="#0D3B98" />
          <stop offset="100%" stopColor="#021236" />
        </linearGradient>
      </defs>

      {/* Top Horizontal Bar + Chevron Arrow Wing (Electric Blue) */}
      <path
        d="M 28 18
           L 58 18
           C 67 18, 74 21, 78 26
           C 80.5 29.5, 79 34, 75 38
           L 59.5 53.5
           C 57.5 55.5, 54 54, 54 51
           L 54 35
           C 54 33, 52.5 31.5, 50.5 31.5
           L 28 31.5
           C 24.3 31.5, 21.3 28.5, 21.3 24.75
           C 21.3 21, 24.3 18, 28 18 Z"
        fill="url(#tramia-top-gradient)"
      />

      {/* Vertical Stem (Dark Navy Blue) */}
      <path
        d="M 40.5 37.5
           C 40.5 36, 41.7 34.8, 43.2 34.8
           L 51 34.8
           C 52.5 34.8, 53.7 36, 53.7 37.5
           L 53.7 72
           C 53.7 75.2, 51.2 77.8, 48 77.8
           L 46.2 77.8
           C 43.1 77.8, 40.5 75.2, 40.5 72
           Z"
        fill="url(#tramia-stem-gradient)"
      />
    </svg>
  );
}

interface TramIALogoProps {
  iconSize?: number;
  textSize?: string; // e.g. "text-xl", "text-2xl"
  variant?: 'dark' | 'light'; // 'dark' = white text for dark backgrounds, 'light' = slate-900 text for light backgrounds
  onClick?: () => void;
  className?: string;
}

export default function TramIALogo({
  iconSize = 32,
  textSize = "text-xl",
  variant = 'dark',
  onClick,
  className = ""
}: TramIALogoProps) {
  const textColorClass = variant === 'dark' ? 'text-white' : 'text-slate-900';
  const iaColorClass = variant === 'dark' ? 'text-blue-500' : 'text-blue-600';

  return (
    <div 
      className={`flex items-center gap-2.5 ${onClick ? 'cursor-pointer select-none' : ''} ${className}`}
      onClick={onClick}
    >
      <TramIAIcon size={iconSize} className="shrink-0 drop-shadow-sm" />
      <div className={`font-sans ${textSize} font-extrabold tracking-tight leading-none`}>
        <span className={textColorClass}>Tram</span>
        <span className={iaColorClass}>IA</span>
      </div>
    </div>
  );
}
