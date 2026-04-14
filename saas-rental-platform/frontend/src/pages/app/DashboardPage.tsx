import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { DashboardStats } from '@/types';
import { formatCurrency, formatDate, getStatusColor, capitalize } from '@/lib/utils';
import {
  FolderOpen, Package, DollarSign, AlertCircle, TrendingUp,
  ArrowUpRight, Clock, CheckCircle, Circle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const statusIcons: Record<string, React.ElementType> = {
  completed: CheckCircle,
  in_progress: Clock,
  confirmed: ArrowUpRight,
  draft: Circle,
};

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats().then(r => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}><CardContent className="p-6 h-24 animate-pulse bg-gray-50" /></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const revenueData = stats.revenueByMonth.map(m => ({
    ...m,
    revenue: parseFloat(String(m.revenue)),
  }));

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Projects"
          value={String(stats.totalProjects)}
          sub={`${stats.activeProjects} active`}
          icon={FolderOpen}
          color="bg-primary-500"
        />
        <StatCard
          title="Revenue (Paid)"
          value={formatCurrency(stats.totalRevenue)}
          sub="Lifetime"
          icon={DollarSign}
          color="bg-green-500"
        />
        <StatCard
          title="Equipment In Use"
          value={`${stats.equipmentUtilization.pct}%`}
          sub={`${stats.equipmentUtilization.inUse} of ${stats.equipmentUtilization.total} items`}
          icon={Package}
          color="bg-accent-500"
        />
        <StatCard
          title="Pending Invoices"
          value={formatCurrency(stats.pendingInvoices.amount)}
          sub={`${stats.pendingInvoices.count} invoices outstanding`}
          icon={AlertCircle}
          color="bg-amber-500"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary-500" />
                  Revenue Overview
                </CardTitle>
                <span className="text-xs text-gray-400">Last 12 months</span>
              </div>
            </CardHeader>
            <CardContent>
              {revenueData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                  No revenue data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1A3C6E" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#1A3C6E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(val: number) => formatCurrency(val)} />
                    <Area type="monotone" dataKey="revenue" stroke="#1A3C6E" strokeWidth={2} fill="url(#revGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Projects</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stats.upcomingProjects.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No upcoming projects</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {stats.upcomingProjects.map((p) => {
                  const StatusIcon = statusIcons[p.status] || Circle;
                  return (
                    <Link
                      key={p.id}
                      to={`/app/projects/${p.id}`}
                      className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors"
                    >
                      <StatusIcon className="w-4 h-4 mt-0.5 text-primary-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.client_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(p.start_date)}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ml-auto flex-shrink-0 ${getStatusColor(p.status)}`}>
                        {capitalize(p.status)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Projects</CardTitle>
            <Link to="/app/projects" className="text-sm text-primary-500 hover:underline">View all →</Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Project', 'Client', 'Start Date', 'End Date', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.recentProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <Link to={`/app/projects/${p.id}`} className="text-sm font-medium text-primary-500 hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{p.client_name || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{formatDate(p.start_date)}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{formatDate(p.end_date)}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(p.status)}`}>
                        {capitalize(p.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
