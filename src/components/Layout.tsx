import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider } from './ui/sidebar';
import AppSidebar from './AppSidebar';
import TopBar from './TopBar';

const Layout = () => {
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/staff')) return 'Staff';
    if (path.startsWith('/payroll/general')) return 'General Payroll';
    if (path.startsWith('/payroll/weekend')) return 'Weekend Payroll';
    if (path.startsWith('/clients')) return 'Clients';
    if (path.startsWith('/orders')) return 'Orders';
    if (path.startsWith('/operations')) return 'Operations';
    if (path.startsWith('/finance')) return 'Finance';
    if (path.startsWith('/reports')) return 'Reporting';
    if (path.startsWith('/settings')) return 'Settings';
    return 'Hitec Packaging';
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <div className="print:hidden print-hidden">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="print:hidden print-hidden">
            <TopBar currentPage={getPageTitle()} />
          </div>
          <main className="flex-1 bg-white overflow-auto">
            <div className="p-4">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
