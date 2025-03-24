// src/components/ui/card.js
'use client';
import React from 'react';

const Card = ({
  children,
  className = '',
  variant = 'default',
  hover = false,
  title,
  titleClass = '',
  icon,
  footer,
  ...props
}) => {
  const baseClasses = 'bg-white rounded-xl overflow-hidden';
  
  const variantClasses = {
    default: 'shadow-sm',
    bordered: 'border border-neutral-200',
    flush: '',
  };
  
  const hoverClasses = hover ? 'transition-shadow duration-200 hover:shadow-md' : '';
  
  const finalClasses = `${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${className}`;
  
  return (
    <div className={finalClasses} {...props}>
      {(title || icon) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          {icon && (
            <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
              {icon}
            </div>
          )}
          {title && (
            <h2 className={`text-lg font-semibold text-neutral-900 ${titleClass}`}>
              {title}
            </h2>
          )}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;

export const CardHeader = ({ children }) => (
  <div className="border-b pb-2 mb-4">{children}</div>
);

export const CardTitle = ({ children }) => (
  <h2 className="text-xl font-semibold">{children}</h2>
);

export const CardContent = ({ children }) => (
  <div className="mt-4">{children}</div>
);