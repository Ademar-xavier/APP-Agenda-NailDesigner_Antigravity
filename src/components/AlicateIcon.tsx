import React from 'react';

interface AlicateIconProps {
  size?: number | string;
  className?: string;
  strokeWidth?: number;
}

export const AlicateIcon: React.FC<AlicateIconProps> = ({ 
  size = 20, 
  className = '', 
  strokeWidth = 2 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {/* Lâmina / Bico cortante pontiagudo do alicate de cutícula */}
      <path d="M12 2.5L9.5 6.5L12 7.8L14.5 6.5L12 2.5Z" />
      <line x1="12" y1="2.5" x2="12" y2="7.8" />
      {/* Rebite / Articulação central */}
      <circle cx="12" cy="10" r="1.2" fill="currentColor" />
      {/* Haste / Cabo Esquerdo curvado */}
      <path d="M11 10.8C9.6 12.8 6.5 15.5 5.2 21.5" />
      {/* Haste / Cabo Direito curvado */}
      <path d="M13 10.8C14.4 12.8 17.5 15.5 18.8 21.5" />
      {/* Mola de retorno metálica no meio dos cabos */}
      <path d="M8.8 16C10.5 17.2 13.5 17.2 15.2 16" />
    </svg>
  );
};
