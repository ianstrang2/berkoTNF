import React from 'react';
import AdminNavbar from '@/components/admin/AdminNavbar';

const AdminLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminNavbar />
      
      <div className="lg:ml-64 flex-1 min-h-screen">
        <main className="py-4 px-4 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout; 