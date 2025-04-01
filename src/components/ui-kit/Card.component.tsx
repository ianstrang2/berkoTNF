'use client';
import React, { ReactNode, HTMLAttributes } from 'react';

type CardVariant = 'default' | 'bordered' | 'flush';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  children: ReactNode;
  className?: string;
  variant?: CardVariant;
  hover?: boolean;
  title?: ReactNode;
  titleClass?: string;
  icon?: ReactNode;
  footer?: ReactNode;
}

interface CardChildProps {
  children: ReactNode;
}

const Card: React.FC<CardProps> = ({
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
    default: 'shadow-card',
    bordered: 'border border-neutral-200',
    flush: '',
  };
  
  const hoverClasses = hover ? 'transition-shadow duration-200 hover:shadow-elevated' : '';
  
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

export const CardHeader: React.FC<CardChildProps> = ({ children }) => (
  <div className="border-b pb-2 mb-4">{children}</div>
);

export const CardTitle: React.FC<CardChildProps> = ({ children }) => (
  <h2 className="text-xl font-semibold">{children}</h2>
);

export const CardContent: React.FC<CardChildProps> = ({ children }) => (
  <div className="mt-4">{children}</div>
); 