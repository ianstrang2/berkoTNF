import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  noPadding?: boolean;
}

/**
 * Card component styled to match Soft UI Dashboard design
 */
export const Card: React.FC<CardProps> = ({ 
  children, 
  title, 
  subtitle, 
  className = '',
  noPadding = false
}) => {
  return (
    <div className={`relative flex flex-col min-w-0 break-words bg-white rounded-2xl shadow-soft-xl ${className}`}>
      {(title || subtitle) && (
        <div className="p-6 pb-0 mb-0 border-b-0 rounded-t-2xl">
          {title && <h6 className="mb-0 font-semibold text-slate-700">{title}</h6>}
          {subtitle && <p className="mb-0 text-sm leading-normal text-slate-500">{subtitle}</p>}
        </div>
      )}
      <div className={noPadding ? '' : 'flex-auto p-6'}>
        {children}
      </div>
    </div>
  );
};

export default Card; 