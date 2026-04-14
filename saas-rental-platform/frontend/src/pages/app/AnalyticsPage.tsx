import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Package, DollarSign } from 'lucide-react';

const COLORS = ['#1A3C6E', '#F97316', '#22c55e', '#a855f7', '#ef4444', '#eab308'];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('12');

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', period],
    queryFn: () => analyticsApi.getRevenue({ period }).then(r => r.data),
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

  const { revenueByMonth = [], topClients = [], projectsByStatus = [], equipmentUtilization = [], crewHours = [] } = data || {};

  const totalRevenue = revenueByMonth.reduce((s: number, m: { paid: number }) => s + parseFloat(String(m.paid)), 0);
  const totalPending = revenueByMonth.reduce((s: number, m: { pending: number }) => s + parseFloat(String(m.pending)), 0);

  const pieData = projectsByStatus.map((item: { status: string; count: number }) => ({
    name: item.status.replace('_', ' '),
    value: parseInt(String(item.count)),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Analytics & Reports</h2>
          <p className="text-sm text-gray-500">Business performance overview</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
          <option value="3">Last 3 months</option>
          <option value="6">Last 6 months</option>
          <option value="12">Last 12 months</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'bg-green-500', sub: 'Paid invoices' },
          { label: 'Pending', value: formatCurrency(totalPending), icon: TrendingUp, color: 'bg-amber-500', sub: 'Awaiting payment' },
          { label: 'Top Client Revenue', value: topClients[0] ? formatCurrency(parseFloat(String(topClients[0].revenue))) : '—', icon: Users, color: 'bg-primary-500', sub: topClients[0]?.name || '' },
          { label: 'Avg Utilization', value: equipmentUtilization.length > 0 ? `${Math.round(equipmentUtilization.reduce((s: number, e: { utilization_pct: number }) => s + parseFloat(String(e.utilization_pct)), 0) / equipmentUtilization.length)}%` : '—', icon: Package, color: 'bg-accent-500', sub: 'Equipment usage' },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <Card key={label}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary-500" /> Revenue by Month</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueByMonth.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No revenue data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueByMonth}>
                <defs>
                  <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A3C6E" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1A3C6E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                <Legend />
                <Area type="monotone" dataKey="paid" name="Paid" stroke="#1A3C6E" strokeWidth={2} fill="url(#paidGrad)" />
                <Area type="monotone" dataKey="pending" name="Pending" stroke="#F97316" strokeWidth={2} fill="url(#pendingGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Projects by Status Pie */}
        <Card>
          <CardHeader><CardTitle>Projects by Status</CardTitle></CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No project data</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_: unknown, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Equipment Utilization */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Package className="w-4 h-4" /> Equipment Utilization by Category</CardTitle></CardHeader>
          <CardContent>
            {equipmentUtilization.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No equipment data</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={equipmentUtilization} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} tickLine={false} width={80} />
                  <Tooltip formatter={(val: number) => `${val}%`} />
                  <Bar dataKey="utilization_pct" name="Utilization %" fill="#1A3C6E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-4 h-4" /> Top Clients by Revenue</CardTitle></CardHeader>
          <CardContent className="p-0">
            {topClients.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No client data</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {topClients.slice(0, 8).map((c: { id: string; name: string; company: string; revenue: number; project_count: number }, i: number) => (
                  <div key={c.id} className="flex items-center gap-4 px-6 py-3">
                    <span className="text-sm font-bold text-gray-300 w-5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.company || ''} · {c.project_count} projects</p>
                    </div>
                    <span className="text-sm font-semibold text-primary-500">{formatCurrency(parseFloat(String(c.revenue)))}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Crew Hours */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-4 h-4" /> Crew Hours Logged</CardTitle></CardHeader>
          <CardContent className="p-0">
            {crewHours.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No crew data</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {crewHours.map((c: { id: string; name: string; role: string; total_hours: number; total_earnings: number; project_count: number }) => (
                  <div key={c.id} className="flex items-center gap-4 px-6 py-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold text-sm flex-shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.role} · {c.project_count} projects</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{parseFloat(String(c.total_hours)).toFixed(0)}h</p>
                      <p className="text-xs text-gray-400">{formatCurrency(parseFloat(String(c.total_earnings)))}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
