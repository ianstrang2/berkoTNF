import * as React from "react";

const Table = ({ children, className = '' }) => {
  return (
    <div className="w-full overflow-auto">
      <table className={`w-full caption-bottom text-sm border border-gray-300 ${className}`}>
        {children}
      </table>
    </div>
  );
};

const TableHeader = ({ children, className = '' }) => (
  <thead className={`bg-gray-200 text-gray-700 sticky top-0 ${className}`}>
    {children}
  </thead>
);

const TableBody = ({ children, className = '' }) => (
  <tbody className={`divide-y divide-gray-300 odd:bg-gray-100 even:bg-white ${className}`}>
    {children}
  </tbody>
);

const TableRow = ({ children, className = '' }) => (
  <tr className={`border-b transition-colors hover:bg-gray-50 ${className}`}>
    {children}
  </tr>
);

const TableHead = ({ children, className = '', onClick }) => (
  <th
    onClick={onClick}
    className={`h-12 px-4 text-left align-middle font-medium text-gray-600 bg-gray-200 ${onClick ? 'cursor-pointer hover:bg-gray-300' : ''} ${className}`}
  >
    {children}
  </th>
);

const TableCell = ({ children, className = '' }) => (
  <td className={`p-4 align-middle text-gray-700 ${className}`}>
    {children}
  </td>
);

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
