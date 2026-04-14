import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '@/lib/api';
import { formatDate, formatCurrency, getStatusColor, capitalize } from '@/lib/utils';
import { ArrowLeft, Mail, Phone, MapPin, Building2, Plus, MessageSquare, PhoneCall, Video, StickyNote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const logTypes = [
  { value: 'note', label: 'Note', icon: StickyNote },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'call', label: 'Call', icon: PhoneCall },
  { value: 'meeting', label: 'Meeting', icon: Video },
];

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({ type: 'note', subject: '', content: '' });

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsApi.getOne(id!).then(r => r.data),
    enabled: !!id,
  });

  const addLogMutation = useMutation({
    mutationFn: (data: unknown) => clientsApi.addLog(id!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client', id] }); setShowLogForm(false); setLogForm({ type: 'note', subject: '', content: '' }); },
  });

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-gray-100 rounded-2xl" /><div className="h-64 bg-gray-100 rounded-2xl" /></div>;
  if (!client) return <div className="text-center py-12 text-gray-400">Client not found</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <Link to="/app/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-500 mb-3 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Clients
      </Link>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-accent-400 to-accent-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {client.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              {client.company && <p className="text-gray-500 flex items-center gap-1.5 mt-1"><Building2 className="w-4 h-4" />{client.company}</p>}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                {client.email && <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-primary-500 transition-colors"><Mail className="w-4 h-4" />{client.email}</a>}
                {client.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" />{client.phone}</span>}
                {(client.city || client.country) && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{[client.city, client.country].filter(Boolean).join(', ')}</span>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:text-right">
              <div className="bg-primary-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Projects</p>
                <p className="text-xl font-bold text-primary-500">{client.projects?.length || 0}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">Revenue</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(client.invoices?.filter((i: { status: string }) => i.status === 'paid').reduce((sum: number, i: { total: number }) => sum + parseFloat(String(i.total)), 0) || 0)}</p>
              </div>
            </div>
          </div>
          {client.notes && <p className="mt-4 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">{client.notes}</p>}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Projects */}
        <Card>
          <CardHeader><CardTitle>Projects</CardTitle></CardHeader>
          <CardContent className="p-0">
            {(!client.projects || client.projects.length === 0) ? (
              <div className="p-6 text-center text-sm text-gray-400">No projects yet</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {client.projects.map((p: { id: string; name: string; status: string; start_date: string; end_date: string }) => (
                  <Link key={p.id} to={`/app/projects/${p.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">{formatDate(p.start_date)} – {formatDate(p.end_date)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(p.status)}`}>{capitalize(p.status)}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card>
          <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
          <CardContent className="p-0">
            {(!client.invoices || client.invoices.length === 0) ? (
              <div className="p-6 text-center text-sm text-gray-400">No invoices yet</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {client.invoices.map((inv: { id: string; invoice_number: string; total: number; status: string; due_date: string }) => (
                  <Link key={inv.id} to={`/app/invoices/${inv.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-400">Due {formatDate(inv.due_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(parseFloat(String(inv.total)))}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(inv.status)}`}>{capitalize(inv.status)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Communication Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Communication Log</CardTitle>
            <button onClick={() => setShowLogForm(true)}
              className="inline-flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-600 font-medium">
              <Plus className="w-4 h-4" /> Add Log
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {(!client.logs || client.logs.length === 0) ? (
            <div className="p-6 text-center text-sm text-gray-400">No communication logs yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {client.logs.map((log: { id: string; type: string; subject: string; content: string; created_by_name: string; created_at: string }) => {
                const logType = logTypes.find(t => t.value === log.type) || logTypes[0];
                const Icon = logType.icon;
                return (
                  <div key={log.id} className="px-6 py-3 flex gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{log.subject || logType.label}</span>
                        <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                      </div>
                      {log.content && <p className="text-sm text-gray-500 mt-0.5">{log.content}</p>}
                      {log.created_by_name && <p className="text-xs text-gray-400 mt-1">by {log.created_by_name}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Log Dialog */}
      <Dialog open={showLogForm} onOpenChange={o => !o && setShowLogForm(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Communication Log</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addLogMutation.mutate(logForm); }} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
              <div className="flex gap-2">
                {logTypes.map(({ value, label, icon: Icon }) => (
                  <button key={value} type="button"
                    onClick={() => setLogForm(f => ({ ...f, type: value }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${logForm.type === value ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Subject</label>
              <input value={logForm.subject} onChange={e => setLogForm(f => ({ ...f, subject: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Content</label>
              <textarea rows={3} value={logForm.content} onChange={e => setLogForm(f => ({ ...f, content: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none" />
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowLogForm(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600">Add Log</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
