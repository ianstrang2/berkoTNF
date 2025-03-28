'use client';
import React, { ReactNode, TableHTMLAttributes, HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode;
  className?: string;
  responsive?: boolean;
  compact?: boolean;
  striped?: boolean;
  bordered?: boolean;
}

interface TableHeadProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
  className?: string;
}

interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
  className?: string;
}

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode;
  className?: string;
  isHeader?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement>, ThHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
  className?: string;
  isHeader?: boolean;
  align?: 'left' | 'center' | 'right';
  compact?: boolean;
}

const Table: React.FC<TableProps> = ({
  children,
  className = '',
  responsive = true,
  compact = false,
  striped = false,
  bordered = false,
  ...props
}) => {
  const baseClasses = 'min-w-full divide-y divide-neutral-200';
  
  const stripedClasses = striped ? 'table-striped' : '';
  const borderedClasses = bordered ? 'border border-neutral-200' : '';
  const compactClasses = compact ? 'table-compact' : '';
  
  const wrapperClasses = responsive ? 'overflow-x-auto rounded-lg' : '';
  
  const finalClasses = `${baseClasses} ${stripedClasses} ${borderedClasses} ${compactClasses} ${className}`;
  
  return (
    <div className={wrapperClasses}>
      <table className={finalClasses} {...props}>
        {children}
      </table>
    </div>
  );
};

const TableHead: React.FC<TableHeadProps> = ({ children, className = '', ...props }) => {
  return (
    <thead className={`bg-neutral-50 ${className}`} {...props}>
      {children}
    </thead>
  );
};

const TableBody: React.FC<TableBodyProps> = ({ children, className = '', ...props }) => {
  return (
    <tbody className={`bg-white divide-y divide-neutral-200 ${className}`} {...props}>
      {children}
    </tbody>
  );
};

const TableRow: React.FC<TableRowProps> = ({ 
  children, 
  className = '', 
  isHeader = false, 
  clickable = false, 
  onClick, 
  ...props 
}) => {
  const clickableClasses = clickable ? 'cursor-pointer hover:bg-neutral-50' : '';
  
  return (
    <tr 
      className={`${clickableClasses} ${className}`} 
      onClick={clickable ? onClick : undefined}
      {...props}
    >
      {children}
    </tr>
  );
};

const TableCell: React.FC<TableCellProps> = ({ 
  children, 
  className = '', 
  isHeader = false, 
  align = 'left',
  compact = false,
  ...props 
}) => {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };
  
  const sizeClasses = compact ? 'px-2 py-1.5' : 'px-3 py-2';
  
  const baseClasses = `${sizeClasses} ${alignClasses[align]}`;
  
  if (isHeader) {
    return (
      <th 
        className={`${baseClasses} text-xs font-medium text-neutral-500 uppercase tracking-wider ${className}`}
        {...props}
      >
        {children}
      </th>
    );
  }
  
  return (
    <td 
      className={`${baseClasses} whitespace-nowrap text-sm text-neutral-800 ${className}`}
      {...props}
    >
      {children}
    </td>
  );
};

// Add a style for striped tables
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    .table-striped tbody tr:nth-of-type(odd) {
      background-color: rgba(0, 0, 0, 0.02);
    }
    .table-compact th, .table-compact td {
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;
    }
  `;
  document.head.appendChild(style);
}

export { Table, TableHead, TableBody, TableRow, TableCell };
export default Table; 