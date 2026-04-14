import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, clientsApi } from '@/lib/api';
import { Project, Client } from '@/types';
import { formatDate, getStatusColor, capitalize, formatCurrency } from '@/lib/utils';
import { Plus, Search, FolderOpen, ChevronRight, Trash2, Calendar, Users, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';

const STATUSES = ['draft', 'confirmed', 'in_progress', 'completed', 'cancelled'];

function ProjectForm({ onClose, onSave }: { onClose: () => void; onSave: (data: unknown) => void }) {
  const [form, setForm] = useState({
    name: '', client_id: '', status: 'draft',
    start_date: '', end_date: '', description: '', location: '', budget: '',
  });
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients-list'],
    queryFn: () => clientsApi.getAll().then(r => r.data),
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...form, budget: form.budget ? parseFloat(form.budget) : undefined }); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Project Name *</label>
          <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Summer Music Festival"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Client</label>
          <select value={form.client_id} onChange={e => set('client_id', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
            <option value="">Select client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
            {STATUSES.map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Start Date</label>
          <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">End Date</label>
          <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Location</label>
          <input value={form.location} onChange={e => set('location', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Budget ($)</label>
          <input type="number" min="0" step="100" value={form.budget} onChange={e => set('budget', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
          <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none" />
        </div>
      </div>
      <DialogFooter>
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600">Create Project</button>
      </DialogFooter>
    </form>
  );
}

export default function ProjectsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects', search, filterStatus],
    queryFn: () => projectsApi.getAll({
      ...(search && { search }),
      ...(filterStatus && { status: filterStatus }),
    }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: unknown) => projectsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Projects & Bookings</h2>
          <p className="text-sm text-gray-500">{projects.length} projects</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{capitalize(s)}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => <Card key={i}><CardContent className="p-4 h-24 animate-pulse bg-gray-50" /></Card>)}
        </div>
      ) : projects.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No projects found</p>
          <button onClick={() => setShowForm(true)} className="mt-4 bg-primary-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-600">New Project</button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <Link to={`/app/projects/${p.id}`} className="font-semibold text-gray-900 hover:text-primary-500 transition-colors">
                        {p.name}
                      </Link>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(p.status)}`}>
                        {capitalize(p.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{p.client_name || 'No client'} {p.client_company ? `· ${p.client_company}` : ''}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(p.start_date)} – {formatDate(p.end_date)}</span>
                      <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {p.equipment_count || 0} equipment</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {p.crew_count || 0} crew</span>
                      {p.budget && <span className="font-medium text-gray-600">{formatCurrency(p.budget)} budget</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => { if (confirm('Delete this project?')) deleteMutation.mutate(p.id); }}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <Link to={`/app/projects/${p.id}`} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-500 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={o => !o && setShowForm(false)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
          <ProjectForm onClose={() => setShowForm(false)} onSave={data => createMutation.mutate(data)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
