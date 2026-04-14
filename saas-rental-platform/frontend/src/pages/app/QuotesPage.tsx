import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotesApi, clientsApi, projectsApi } from '@/lib/api';
import { Quote, Client, Project } from '@/types';
import { formatCurrency, formatDate, getStatusColor, capitalize } from '@/lib/utils';
import { Plus, Search, FileText, Trash2, ChevronRight, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';

interface LineItem { description: string; type: string; quantity: number; unit_price: number; }

function QuoteForm({ onClose, onSave }: { onClose: () => void; onSave: (data: unknown) => void }) {
  const [form, setForm] = useState({ client_id: '', project_id: '', valid_until: '', tax_rate: 0, notes: '', terms: '' });
  const [items, setItems] = useState<LineItem[]>([{ description: '', type: 'equipment', quantity: 1, unit_price: 0 }]);

  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ['clients-list'], queryFn: () => clientsApi.getAll().then(r => r.data) });
  const { data: projects = [] } = useQuery<Project[]>({ queryKey: ['projects-list'], queryFn: () => projectsApi.getAll().then(r => r.data) });

  const addItem = () => setItems(prev => [...prev, { description: '', type: 'equipment', quantity: 1, unit_price: 0 }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, k: keyof LineItem, v: string | number) => setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [k]: v } : item));

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const tax = subtotal * (form.tax_rate / 100);
  const total = subtotal + tax;

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...form, items }); }} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Client</label>
          <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
            <option value="">Select client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Project</label>
          <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
            <option value="">Select project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Valid Until</label>
          <input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Tax Rate (%)</label>
          <input type="number" min="0" max="100" step="0.1" value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
      </div>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Line Items</label>
          <button type="button" onClick={addItem} className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1"><Plus className="w-3 h-3" />Add Line</button>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <input placeholder="Description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
              </div>
              <div className="col-span-2">
                <select value={item.type} onChange={e => updateItem(i, 'type', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                  {['equipment', 'crew', 'service', 'other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <input type="number" min="0.01" step="0.01" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
              </div>
              <div className="col-span-2">
                <input type="number" min="0" step="0.01" placeholder="Rate" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
              </div>
              <div className="col-span-1">
                <button type="button" onClick={() => removeItem(i)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between text-gray-600"><span>Tax ({form.tax_rate}%)</span><span>{formatCurrency(tax)}</span></div>
          <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span>{formatCurrency(total)}</span></div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
        <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none" />
      </div>

      <DialogFooter>
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600">Create Quote</button>
      </DialogFooter>
    </form>
  );
}

export default function QuotesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: quotes = [], isLoading } = useQuery<Quote[]>({
    queryKey: ['quotes', filterStatus],
    queryFn: () => quotesApi.getAll(filterStatus ? { status: filterStatus } : {}).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: unknown) => quotesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotes'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => quotesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quotesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  });

  const filtered = quotes.filter(q =>
    search ? q.quote_number.toLowerCase().includes(search.toLowerCase()) || (q.client_name || '').toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Quotes</h2>
          <p className="text-sm text-gray-500">{quotes.length} quotes</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors">
          <Plus className="w-4 h-4" /> New Quote
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quotes..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
          <option value="">All Statuses</option>
          {['draft', 'sent', 'accepted', 'rejected', 'expired'].map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array(3).fill(0).map((_, i) => <div key={i} className="h-14 bg-gray-50 animate-pulse rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No quotes found</p>
              <button onClick={() => setShowForm(true)} className="mt-4 bg-primary-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-600">Create Quote</button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Quote #', 'Client', 'Project', 'Total', 'Valid Until', 'Status', ''].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(q => (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{q.quote_number}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{q.client_name || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{q.project_name || '—'}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900">{formatCurrency(parseFloat(String(q.total)))}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{formatDate(q.valid_until)}</td>
                    <td className="px-6 py-3">
                      <select value={q.status} onChange={e => updateMutation.mutate({ id: q.id, data: { status: e.target.value } })}
                        className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none ${getStatusColor(q.status)}`}>
                        {['draft', 'sent', 'accepted', 'rejected', 'expired'].map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-1">
                        <Link to={`/app/quotes/${q.id}`} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-500 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                        <button onClick={() => { if (confirm('Delete this quote?')) deleteMutation.mutate(q.id); }}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={o => !o && setShowForm(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Quote</DialogTitle></DialogHeader>
          <QuoteForm onClose={() => setShowForm(false)} onSave={data => createMutation.mutate(data)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
