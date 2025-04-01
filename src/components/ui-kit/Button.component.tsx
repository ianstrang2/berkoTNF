'use client';
import React, { ReactNode, ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
type IconPosition = 'left' | 'right';
type ButtonType = 'button' | 'submit' | 'reset';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  icon?: ReactNode;
  iconPosition?: IconPosition;
  disabled?: boolean;
  type?: ButtonType;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  icon = null,
  iconPosition = 'left',
  disabled = false,
  type = 'button',
  onClick,
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'text-white bg-primary-500 hover:bg-primary-600 focus:ring-primary-500 border border-transparent',
    secondary: 'text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 focus:ring-primary-500',
    outline: 'text-primary-600 bg-transparent border border-primary-500 hover:bg-primary-50 focus:ring-primary-500',
    danger: 'text-white bg-error-500 hover:bg-error-600 focus:ring-error-500 border border-transparent',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded',
    md: 'px-4 py-2 text-sm rounded-md',
    lg: 'px-5 py-2.5 text-base rounded-lg',
  };
  
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  
  const iconClasses = icon ? (
    iconPosition === 'left' ? 'flex-row' : 'flex-row-reverse'
  ) : '';
  
  const iconSpacing = icon ? (
    iconPosition === 'left' ? 'space-x-2' : 'space-x-reverse space-x-2'
  ) : '';
  
  const finalClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${iconClasses} ${iconSpacing} ${className}`;
  
  return (
    <button
      type={type}
      className={finalClasses}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {icon && <span className="w-5 h-5">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
};

export default Button; 