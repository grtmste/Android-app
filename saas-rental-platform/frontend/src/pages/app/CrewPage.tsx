import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crewApi } from '@/lib/api';
import { CrewMember } from '@/types';
import { formatCurrency, capitalize } from '@/lib/utils';
import { Plus, Search, UserCheck, Edit2, Trash2, Mail, Phone, Star, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const ROLES = ['Lighting Tech', 'Audio Engineer', 'Video Tech', 'Stage Manager', 'Rigger', 'Camera Operator', 'Production Manager', 'General Crew'];

function CrewForm({ member, onClose, onSave }: {
  member?: CrewMember | null;
  onClose: () => void;
  onSave: (data: unknown) => void;
}) {
  const [form, setForm] = useState({
    name: member?.name || '',
    email: member?.email || '',
    phone: member?.phone || '',
    role: member?.role || ROLES[0],
    skills: member?.skills?.join(', ') || '',
    hourly_rate: member?.hourly_rate || 0,
    is_available: member?.is_available ?? true,
    notes: member?.notes || '',
  });
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={e => {
      e.preventDefault();
      onSave({ ...form, skills: form.skills.split(',').map(s => s.trim()).filter(Boolean) });
    }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Full Name *</label>
          <input required value={form.name} onChange={e => set('name', e.target.value)}
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
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Role *</label>
          <select value={form.role} onChange={e => set('role', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Hourly Rate ($)</label>
          <input type="number" min="0" step="0.5" value={form.hourly_rate} onChange={e => set('hourly_rate', parseFloat(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Skills (comma-separated)</label>
          <input value={form.skills} onChange={e => set('skills', e.target.value)}
            placeholder="DMX Programming, Rigging, LED Fixtures"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
          <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none" />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input type="checkbox" id="available" checked={form.is_available} onChange={e => set('is_available', e.target.checked)}
            className="w-4 h-4 text-primary-500 rounded" />
          <label htmlFor="available" className="text-sm text-gray-700">Currently available</label>
        </div>
      </div>
      <DialogFooter>
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600">
          {member ? 'Update' : 'Add Crew Member'}
        </button>
      </DialogFooter>
    </form>
  );
}

// Simple timeline schedule view
function ScheduleView({ crew }: { crew: CrewMember[] }) {
  const { data: schedule = [] } = useQuery({
    queryKey: ['crew-schedule'],
    queryFn: () => crewApi.getSchedule().then(r => r.data),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Schedule Overview</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-50">
          {(schedule as unknown as Array<{
            id: string; name: string; role: string; is_available: boolean;
            assignments: Array<{ project_name: string; start_date: string; end_date: string; hours: number }> | null;
          }>).map((member) => (
            <div key={member.id} className="px-6 py-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${member.is_available ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-sm font-medium text-gray-900">{member.name}</span>
                  <span className="text-xs text-gray-400">{member.role}</span>
                </div>
              </div>
              {member.assignments && member.assignments.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-1">
                  {member.assignments.map((a, i) => (
                    <span key={i} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded">
                      {a.project_name} ({a.hours}h)
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-gray-400">No active assignments</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CrewPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterAvailable, setFilterAvailable] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CrewMember | null>(null);
  const [view, setView] = useState<'cards' | 'schedule'>('cards');

  const { data: crew = [], isLoading } = useQuery<CrewMember[]>({
    queryKey: ['crew', search, filterAvailable],
    queryFn: () => crewApi.getAll({
      ...(search && { search }),
      ...(filterAvailable && { available: filterAvailable }),
    }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: unknown) => crewApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crew'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => crewApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crew'] }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crewApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crew'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Crew Scheduling</h2>
          <p className="text-sm text-gray-500">{crew.length} crew members · {crew.filter(c => c.is_available).length} available</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button onClick={() => setView('cards')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${view === 'cards' ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
              Cards
            </button>
            <button onClick={() => setView('schedule')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${view === 'schedule' ? 'bg-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
              Schedule
            </button>
          </div>
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors">
            <Plus className="w-4 h-4" /> Add Crew
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search crew..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <select value={filterAvailable} onChange={e => setFilterAvailable(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
          <option value="">All Availability</option>
          <option value="true">Available</option>
          <option value="false">Unavailable</option>
        </select>
      </div>

      {view === 'schedule' ? (
        <ScheduleView crew={crew} />
      ) : isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(4).fill(0).map((_, i) => <Card key={i}><CardContent className="p-4 h-36 animate-pulse bg-gray-50" /></Card>)}
        </div>
      ) : crew.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No crew members found</p>
          <button onClick={() => setShowForm(true)} className="mt-4 bg-primary-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-600">Add Crew Member</button>
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {crew.map((member) => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {member.name.charAt(0)}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${member.is_available ? 'bg-green-400' : 'bg-red-400'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{member.name}</h3>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(member)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-500 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { if (confirm('Remove crew member?')) deleteMutation.mutate(member.id); }}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {member.email && <div className="flex items-center gap-2 text-xs text-gray-500"><Mail className="w-3.5 h-3.5" />{member.email}</div>}
                  {member.phone && <div className="flex items-center gap-2 text-xs text-gray-500"><Phone className="w-3.5 h-3.5" />{member.phone}</div>}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-medium text-gray-700">{formatCurrency(member.hourly_rate)}/hr</span>
                    <span className="text-gray-400">· {member.total_projects || 0} projects · {member.total_hours || 0}h logged</span>
                  </div>
                </div>

                {member.skills && member.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {member.skills.slice(0, 3).map(s => (
                      <span key={s} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                    {member.skills.length > 3 && (
                      <span className="text-xs text-gray-400">+{member.skills.length - 3}</span>
                    )}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-gray-50">
                  <span className={`text-xs font-medium ${member.is_available ? 'text-green-600' : 'text-red-500'}`}>
                    {member.is_available ? '● Available' : '● Unavailable'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm || !!editing} onOpenChange={o => { if (!o) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? 'Edit Crew Member' : 'Add Crew Member'}</DialogTitle></DialogHeader>
          <CrewForm
            member={editing}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSave={data => { if (editing) updateMutation.mutate({ id: editing.id, data }); else createMutation.mutate(data); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
