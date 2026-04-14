import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '@/lib/api';
import { Client } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Plus, Search, Users, Mail, Phone, Building2, ChevronRight, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';

function ClientForm({ client, onClose, onSave }: {
  client?: Client | null;
  onClose: () => void;
  onSave: (data: unknown) => void;
}) {
  const [form, setForm] = useState({
    name: client?.name || '',
    company: client?.company || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address: client?.address || '',
    city: client?.city || '',
    country: client?.country || 'US',
    notes: client?.notes || '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Full Name *</label>
          <input required value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Company</label>
          <input value={form.company} onChange={e => set('company', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Phone</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Address</label>
          <input value={form.address} onChange={e => set('address', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">City</label>
          <input value={form.city} onChange={e => set('city', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Country</label>
          <input value={form.country} onChange={e => set('country', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
          <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none" />
        </div>
      </div>
      <DialogFooter>
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600">
          {client ? 'Update Client' : 'Add Client'}
        </button>
      </DialogFooter>
    </form>
  );
}

export default function ClientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ['clients', search],
    queryFn: () => clientsApi.getAll(search ? { search } : {}).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: unknown) => clientsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => clientsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Clients (CRM)</h2>
          <p className="text-sm text-gray-500">{clients.length} clients</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => <Card key={i}><CardContent className="p-4 h-20 animate-pulse bg-gray-50" /></Card>)}
        </div>
      ) : clients.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No clients found</p>
          <button onClick={() => setShowForm(true)} className="mt-4 bg-primary-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-600">Add Client</button>
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-accent-400 to-accent-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {client.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{client.name}</h3>
                      {client.company && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                          <Building2 className="w-3 h-3 flex-shrink-0" />{client.company}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <button onClick={() => setEditing(client)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-500 transition-colors">
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { if (confirm('Delete this client?')) deleteMutation.mutate(client.id); }}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Link to={`/app/clients/${client.id}`} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-500 transition-colors">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  {client.email && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{client.email}</p>}
                  {client.phone && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{client.phone}</p>}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between text-xs text-gray-500">
                  <span>{client.total_projects || 0} projects</span>
                  <span className="font-semibold text-gray-700">{formatCurrency(parseFloat(String(client.total_revenue || 0)))} revenue</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm || !!editing} onOpenChange={o => { if (!o) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? 'Edit Client' : 'Add Client'}</DialogTitle></DialogHeader>
          <ClientForm
            client={editing}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSave={data => { if (editing) updateMutation.mutate({ id: editing.id, data }); else createMutation.mutate(data); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
