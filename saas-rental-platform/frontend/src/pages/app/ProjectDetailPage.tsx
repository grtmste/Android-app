import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi, equipmentApi, crewApi } from '@/lib/api';
import { Project, Task, Equipment, CrewMember } from '@/types';
import { formatDate, getStatusColor, capitalize, formatCurrency } from '@/lib/utils';
import {
  ArrowLeft, Calendar, MapPin, Users, Package, DollarSign,
  Plus, CheckCircle, Circle, Clock, ChevronDown, Trash2,
  AlertTriangle, XCircle, Edit2, Check, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// ─── Priority colours ────────────────────────────────────────────────────────
const priorityColor: Record<string, string> = {
  low: 'text-gray-500',
  medium: 'text-amber-500',
  high: 'text-red-500',
};

// ─── Stock warning helper ────────────────────────────────────────────────────
function StockWarning({ item, qty }: { item: Equipment; qty: number }) {
  const remaining = item.available_quantity - qty;
  const pct = item.quantity > 0 ? (remaining / item.quantity) * 100 : 0;

  if (remaining < 0) {
    return (
      <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
        <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
        🚫 {item.name} is out of stock — cannot add more
      </p>
    );
  }
  if (pct <= 20 && remaining >= 0) {
    return (
      <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        ⚠️ Almost out of stock for {item.name} ({remaining} left)
      </p>
    );
  }
  return null;
}

// ─── Task card ───────────────────────────────────────────────────────────────
function TaskCard({ task, onUpdate }: { task: Task; onUpdate: (id: string, data: Partial<Task>) => void }) {
  const icons = { done: CheckCircle, in_progress: Clock, todo: Circle };
  const Icon = icons[task.status] || Circle;
  const cycle = () => {
    const next: Record<string, string> = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
    onUpdate(task.id, { status: next[task.status] as Task['status'] });
  };
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${task.status === 'done' ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'}`}>
      <button onClick={cycle} className={`mt-0.5 flex-shrink-0 ${task.status === 'done' ? 'text-green-500' : task.status === 'in_progress' ? 'text-amber-500' : 'text-gray-300'}`}>
        <Icon className="w-5 h-5" />
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
        {task.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{task.description}</p>}
        <div className="flex gap-3 mt-1">
          {task.due_date && <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(task.due_date)}</span>}
          <span className={`text-xs font-medium ${priorityColor[task.priority]}`}>{capitalize(task.priority)} priority</span>
        </div>
      </div>
    </div>
  );
}

// ─── Add Equipment Dialog ────────────────────────────────────────────────────
function AddEquipmentDialog({
  open, onClose, onAdd, projectId,
}: { open: boolean; onClose: () => void; onAdd: (equipmentId: string, quantity: number, dailyRate: number) => void; projectId: string }) {
  const [selected, setSelected] = useState<string>('');
  const [qty, setQty] = useState<number>(1);

  const { data: allEquipment = [] } = useQuery<Equipment[]>({
    queryKey: ['equipment-all'],
    queryFn: () => equipmentApi.getAll().then(r => r.data),
    enabled: open,
  });

  const chosenItem = allEquipment.find(e => e.id === selected);

  const handleAdd = () => {
    if (!chosenItem) return;
    onAdd(chosenItem.id, qty, chosenItem.daily_rate);
    setSelected('');
    setQty(1);
    onClose();
  };

  const isOverStock = chosenItem ? qty > chosenItem.available_quantity : false;

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Equipment to Project</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Equipment selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Select Equipment</label>
            <select
              value={selected}
              onChange={e => { setSelected(e.target.value); setQty(1); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">— Choose item —</option>
              {allEquipment.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.available_quantity}/{e.quantity} available) — €{e.daily_rate}/day
                </option>
              ))}
            </select>
          </div>

          {/* Item detail + stock bar */}
          {chosenItem && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Category: <strong>{chosenItem.category}</strong></span>
                <span className="text-gray-600">Condition: <strong>{capitalize(chosenItem.condition)}</strong></span>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Stock: {chosenItem.available_quantity} of {chosenItem.quantity} available</span>
                  <span>{Math.round(((chosenItem.quantity - chosenItem.available_quantity) / (chosenItem.quantity || 1)) * 100)}% in use</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      chosenItem.available_quantity === 0 ? 'bg-red-500' :
                      (chosenItem.available_quantity / (chosenItem.quantity || 1)) <= 0.2 ? 'bg-amber-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${(chosenItem.available_quantity / (chosenItem.quantity || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Quantity */}
          {chosenItem && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Quantity to assign (max: {chosenItem.available_quantity})
              </label>
              <input
                type="number"
                min={1}
                max={chosenItem.available_quantity}
                value={qty}
                onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  isOverStock ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-primary-500/20'
                }`}
              />
              <StockWarning item={chosenItem} qty={qty} />
            </div>
          )}
        </div>
        <DialogFooter>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!chosenItem || isOverStock || chosenItem.available_quantity === 0}
            className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add to Project
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Crew Dialog ─────────────────────────────────────────────────────────
function AddCrewDialog({
  open, onClose, onAdd,
}: { open: boolean; onClose: () => void; onAdd: (crewId: string, role: string, hours: number, hourlyRate: number) => void }) {
  const [selected, setSelected] = useState<string>('');
  const [role, setRole] = useState('');
  const [hours, setHours] = useState<number>(8);

  const { data: allCrew = [] } = useQuery<CrewMember[]>({
    queryKey: ['crew-all'],
    queryFn: () => crewApi.getAll().then(r => r.data),
    enabled: open,
  });

  const chosenMember = allCrew.find(c => c.id === selected);

  const handleAdd = () => {
    if (!chosenMember) return;
    onAdd(chosenMember.id, role || chosenMember.role, hours, chosenMember.hourly_rate);
    setSelected('');
    setRole('');
    setHours(8);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Crew Member to Project</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Select Crew Member</label>
            <select
              value={selected}
              onChange={e => { setSelected(e.target.value); setRole(''); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">— Choose crew member —</option>
              {allCrew.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.role} {c.is_available ? '✓ Available' : '✗ Unavailable'} — €{c.hourly_rate}/hr
                </option>
              ))}
            </select>
          </div>

          {chosenMember && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Default Role:</span>
                <span className="font-medium text-gray-900">{chosenMember.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hourly Rate:</span>
                <span className="font-medium text-gray-900">€{chosenMember.hourly_rate}/hr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Availability:</span>
                <span className={`font-medium ${chosenMember.is_available ? 'text-green-600' : 'text-red-500'}`}>
                  {chosenMember.is_available ? '● Available' : '● Unavailable'}
                </span>
              </div>
              {chosenMember.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {chosenMember.skills.map(s => (
                    <span key={s} className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Role on this project</label>
              <input
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder={chosenMember?.role || 'e.g. Lead Tech'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Scheduled hours</label>
              <input
                type="number"
                min={1}
                value={hours}
                onChange={e => setHours(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!chosenMember}
            className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add to Project
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', due_date: '' });
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [showAddCrew, setShowAddCrew] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getOne(id!).then(r => r.data),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Project>) => projectsApi.update(id!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id] }),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: unknown) => projectsApi.createTask(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] });
      setShowTaskForm(false);
      setTaskForm({ title: '', description: '', priority: 'medium', due_date: '' });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: unknown }) =>
      projectsApi.updateTask(id!, taskId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id] }),
  });

  const addEquipmentMutation = useMutation({
    mutationFn: (data: unknown) => projectsApi.addEquipment(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] });
      qc.invalidateQueries({ queryKey: ['equipment-all'] });
    },
  });

  const addCrewMutation = useMutation({
    mutationFn: (data: unknown) => projectsApi.addCrew(id!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id] }),
  });

  const saveBudget = () => {
    const val = parseFloat(budgetInput);
    if (!isNaN(val)) updateMutation.mutate({ budget: val });
    setEditingBudget(false);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-40 bg-gray-100 rounded-2xl" />
        <div className="h-80 bg-gray-100 rounded-2xl" />
      </div>
    );
  }
  if (!project) return <div className="text-center py-12 text-gray-400">Project not found</div>;

  const tasksByStatus = {
    todo: project.tasks?.filter(t => t.status === 'todo') || [],
    in_progress: project.tasks?.filter(t => t.status === 'in_progress') || [],
    done: project.tasks?.filter(t => t.status === 'done') || [],
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ── Back + Header ── */}
      <div>
        <Link to="/app/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-500 mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
              {project.client_name && <span className="flex items-center gap-1"><Users className="w-4 h-4" />{project.client_name}</span>}
              {project.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(project.start_date)} – {formatDate(project.end_date)}
                </span>
              )}
              {project.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{project.location}</span>}
            </div>
          </div>
          <div className="relative">
            <select
              value={project.status}
              onChange={e => updateMutation.mutate({ status: e.target.value as Project['status'] })}
              className={`appearance-none text-sm px-3 py-1.5 pr-7 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/30 ${getStatusColor(project.status)}`}
            >
              {['draft', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => (
                <option key={s} value={s}>{capitalize(s)}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ── Stat cards (budget is editable) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Equipment count */}
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-blue-500 bg-blue-50"><Package className="w-5 h-5" /></div>
          <div><p className="text-xs text-gray-500">Equipment</p><p className="font-bold text-gray-900">{project.equipment?.length || 0}</p></div>
        </CardContent></Card>

        {/* Crew count */}
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-purple-500 bg-purple-50"><Users className="w-5 h-5" /></div>
          <div><p className="text-xs text-gray-500">Crew</p><p className="font-bold text-gray-900">{project.crew?.length || 0}</p></div>
        </CardContent></Card>

        {/* Tasks count */}
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-green-500 bg-green-50"><CheckCircle className="w-5 h-5" /></div>
          <div><p className="text-xs text-gray-500">Tasks</p><p className="font-bold text-gray-900">{project.tasks?.length || 0}</p></div>
        </CardContent></Card>

        {/* Budget — editable */}
        <Card className="cursor-pointer" onClick={() => { if (!editingBudget) { setBudgetInput(String(project.budget || '')); setEditingBudget(true); } }}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-amber-500 bg-amber-50 flex-shrink-0"><DollarSign className="w-5 h-5" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Budget {!editingBudget && <span className="text-primary-400">(click to edit)</span>}</p>
              {editingBudget ? (
                <div className="flex items-center gap-1 mt-0.5" onClick={e => e.stopPropagation()}>
                  <span className="text-gray-500 text-sm">€</span>
                  <input
                    autoFocus
                    type="number"
                    value={budgetInput}
                    onChange={e => setBudgetInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveBudget(); if (e.key === 'Escape') setEditingBudget(false); }}
                    className="w-24 border border-primary-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 font-bold"
                  />
                  <button onClick={saveBudget} className="text-green-500 hover:text-green-600"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setEditingBudget(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <p className="font-bold text-gray-900 flex items-center gap-1">
                  {project.budget ? formatCurrency(project.budget) : '—'}
                  <Edit2 className="w-3 h-3 text-gray-300" />
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tasks Kanban ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tasks</CardTitle>
            <button
              onClick={() => setShowTaskForm(true)}
              className="inline-flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-600 font-medium"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            {(['todo', 'in_progress', 'done'] as const).map(status => (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${status === 'done' ? 'bg-green-500' : status === 'in_progress' ? 'bg-amber-500' : 'bg-gray-300'}`} />
                  <span className="text-sm font-medium text-gray-700">{capitalize(status)}</span>
                  <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                    {tasksByStatus[status].length}
                  </span>
                </div>
                <div className="space-y-2">
                  {tasksByStatus[status].map(t => (
                    <TaskCard key={t.id} task={t} onUpdate={(taskId, data) => updateTaskMutation.mutate({ taskId, data })} />
                  ))}
                  {tasksByStatus[status].length === 0 && (
                    <div className="text-xs text-gray-300 text-center py-4 border border-dashed border-gray-100 rounded-lg">No tasks</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Equipment & Crew side by side ── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Equipment */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Package className="w-4 h-4" /> Equipment</CardTitle>
              <button
                onClick={() => setShowAddEquipment(true)}
                className="inline-flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-600 font-medium"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!project.equipment || project.equipment.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                No equipment assigned.{' '}
                <button onClick={() => setShowAddEquipment(true)} className="text-primary-500 hover:underline">Add equipment</button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {project.equipment.map(e => {
                  const utilPct = e.quantity > 0
                    ? Math.round(((e.quantity - (e.available_quantity ?? e.quantity)) / e.quantity) * 100)
                    : 0;
                  return (
                    <div key={e.id} className="flex items-center justify-between px-6 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{e.equipment_name}</p>
                        <p className="text-xs text-gray-500">{e.category}</p>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className="text-sm font-medium text-gray-900">×{e.quantity}</p>
                        <p className="text-xs text-gray-400">€{e.daily_rate}/day</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Crew */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Users className="w-4 h-4" /> Crew</CardTitle>
              <button
                onClick={() => setShowAddCrew(true)}
                className="inline-flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-600 font-medium"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!project.crew || project.crew.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                No crew assigned.{' '}
                <button onClick={() => setShowAddCrew(true)} className="text-primary-500 hover:underline">Add crew</button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {project.crew.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold text-sm flex-shrink-0">
                        {c.crew_name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{c.crew_name}</p>
                        <p className="text-xs text-gray-500">{c.role}</p>
                      </div>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <p className="text-sm font-medium text-gray-900">{c.hours}h</p>
                      <p className="text-xs text-gray-400">€{c.hourly_rate}/hr</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Dialogs ── */}

      {/* Add Task */}
      <Dialog open={showTaskForm} onOpenChange={o => !o && setShowTaskForm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <form
            onSubmit={e => { e.preventDefault(); createTaskMutation.mutate(taskForm); }}
            className="space-y-3"
          >
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Title *</label>
              <input required value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
              <textarea rows={2} value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Priority</label>
                <select value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Due Date</label>
                <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
              </div>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setShowTaskForm(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600">Add Task</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Equipment */}
      <AddEquipmentDialog
        open={showAddEquipment}
        onClose={() => setShowAddEquipment(false)}
        projectId={id!}
        onAdd={(equipment_id, quantity, daily_rate) =>
          addEquipmentMutation.mutate({ equipment_id, quantity, daily_rate })
        }
      />

      {/* Add Crew */}
      <AddCrewDialog
        open={showAddCrew}
        onClose={() => setShowAddCrew(false)}
        onAdd={(crew_id, role, hours, hourly_rate) =>
          addCrewMutation.mutate({ crew_id, role, hours, hourly_rate })
        }
      />
    </div>
  );
}
