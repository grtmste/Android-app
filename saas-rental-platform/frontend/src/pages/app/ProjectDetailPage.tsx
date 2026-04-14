import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';
import { Project, Task } from '@/types';
import { formatDate, getStatusColor, capitalize, formatCurrency } from '@/lib/utils';
import {
  ArrowLeft, Calendar, MapPin, Users, Package, DollarSign,
  Plus, CheckCircle, Circle, Clock, Edit2, Trash2, ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const priorityColor: Record<string, string> = {
  low: 'text-gray-500',
  medium: 'text-amber-500',
  high: 'text-red-500',
};

function TaskCard({ task, onUpdate }: { task: Task; onUpdate: (id: string, data: Partial<Task>) => void }) {
  const [expanded, setExpanded] = useState(false);
  const statusIcons = { done: CheckCircle, in_progress: Clock, todo: Circle };
  const Icon = statusIcons[task.status] || Circle;

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

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', due_date: '' });
  const [activeStatus, setActiveStatus] = useState<string | null>(null);

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', id] }); setShowTaskForm(false); setTaskForm({ title: '', description: '', priority: 'medium', due_date: '' }); },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: unknown }) => projectsApi.updateTask(id!, taskId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id] }),
  });

  if (isLoading) return <div className="animate-pulse"><div className="h-40 bg-gray-100 rounded-2xl mb-4" /><div className="h-80 bg-gray-100 rounded-2xl" /></div>;
  if (!project) return <div className="text-center py-12 text-gray-400">Project not found</div>;

  const tasksByStatus = {
    todo: project.tasks?.filter(t => t.status === 'todo') || [],
    in_progress: project.tasks?.filter(t => t.status === 'in_progress') || [],
    done: project.tasks?.filter(t => t.status === 'done') || [],
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back + Header */}
      <div>
        <Link to="/app/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-500 mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
              {project.client_name && <span className="flex items-center gap-1"><Users className="w-4 h-4" />{project.client_name}</span>}
              {project.start_date && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{formatDate(project.start_date)} – {formatDate(project.end_date)}</span>}
              {project.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{project.location}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Equipment', value: project.equipment?.length || 0, icon: Package, color: 'text-blue-500 bg-blue-50' },
          { label: 'Crew', value: project.crew?.length || 0, icon: Users, color: 'text-purple-500 bg-purple-50' },
          { label: 'Tasks', value: project.tasks?.length || 0, icon: CheckCircle, color: 'text-green-500 bg-green-50' },
          { label: 'Budget', value: project.budget ? formatCurrency(project.budget) : '—', icon: DollarSign, color: 'text-amber-500 bg-amber-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}><CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
            <div><p className="text-xs text-gray-500">{label}</p><p className="font-bold text-gray-900">{value}</p></div>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Tasks (Kanban-style) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tasks</CardTitle>
                <button onClick={() => setShowTaskForm(true)}
                  className="inline-flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-600 font-medium">
                  <Plus className="w-4 h-4" /> Add Task
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                {(['todo', 'in_progress', 'done'] as const).map((status) => (
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
                        <div className="text-xs text-gray-300 text-center py-4 border border-dashed border-gray-100 rounded-lg">
                          No tasks
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Equipment */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Package className="w-4 h-4" /> Equipment</CardTitle></CardHeader>
          <CardContent className="p-0">
            {!project.equipment || project.equipment.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">No equipment assigned</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {project.equipment.map(e => (
                  <div key={e.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{e.equipment_name}</p>
                      <p className="text-xs text-gray-500">{e.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">×{e.quantity}</p>
                      <p className="text-xs text-gray-400">{formatCurrency(e.daily_rate)}/day</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Crew */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-4 h-4" /> Crew</CardTitle></CardHeader>
          <CardContent className="p-0">
            {!project.crew || project.crew.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">No crew assigned</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {project.crew.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-6 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.crew_name}</p>
                      <p className="text-xs text-gray-500">{c.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{c.hours}h</p>
                      <p className="text-xs text-gray-400">{formatCurrency(c.hourly_rate)}/hr</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Form Dialog */}
      <Dialog open={showTaskForm} onOpenChange={o => !o && setShowTaskForm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createTaskMutation.mutate(taskForm); }} className="space-y-3">
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
    </div>
  );
}
