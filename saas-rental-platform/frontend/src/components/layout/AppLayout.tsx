import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const titleMap: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/equipment': 'Equipment & Inventory',
  '/app/projects': 'Projects & Bookings',
  '/app/crew': 'Crew Scheduling',
  '/app/clients': 'Clients (CRM)',
  '/app/quotes': 'Quotes',
  '/app/invoices': 'Invoices',
  '/app/analytics': 'Analytics & Reports',
  '/app/calendar': 'Calendar',
};

export default function AppLayout() {
  const location = useLocation();
  const pathKey = Object.keys(titleMap).find(k => location.pathname.startsWith(k)) || '';
  const title = titleMap[pathKey] || 'RentPro';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <TopBar title={title} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
