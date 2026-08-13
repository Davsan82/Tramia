import React from 'react';

export default function AppVersion({ className = '' }: { className?: string }) {
  return <span className={className} title="Versión de TramIA">Versión {__APP_VERSION__}</span>;
}
