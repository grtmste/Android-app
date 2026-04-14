import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, FolderOpen, Users, FileText, Receipt,
  UserCheck, BarChart3, CalendarDays, Zap, LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/equipment', icon: Package, label: 'Equipment' },
  { to: '/app/projects', icon: FolderOpen, label: 'Projects' },
  { to: '/app/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/app/crew', icon: UserCheck, label: 'Crew' },
  { to: '/app/clients', icon: Users, label: 'Clients' },
  { to: '/app/quotes', icon: FileText, label: 'Quotes' },
  { to: '/app/invoices', icon: Receipt, label: 'Invoices' },
  { to: '/app/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-primary-500 flex flex-col min-h-screen fixed left-0 top-0 z-40 no-print">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl">RentPro</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 bg-accent-500 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-slate-300 text-xs capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="sidebar-link w-full text-left"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
