import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';
import { Project } from '@/types';
import { formatDate, getStatusColor, capitalize } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar, ExternalLink, X } from 'lucide-react';
import { Link } from 'react-router-dom';

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function dateInRange(day: Date, start: Date, end: Date) {
  const d = day.getTime();
  return d >= start.setHours(0, 0, 0, 0) && d <= end.setHours(23, 59, 59, 999);
}

function getProjectsForDay(projects: Project[], day: Date): Project[] {
  return projects.filter(p => {
    if (!p.start_date) return false;
    const start = new Date(p.start_date);
    const end = p.end_date ? new Date(p.end_date) : start;
    return dateInRange(new Date(day), start, end);
  });
}

const STATUS_DOT: Record<string, string> = {
  draft: 'bg-gray-400',
  confirmed: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-400',
};

interface DayModalProps {
  day: Date;
  projects: Project[];
  onClose: () => void;
}

function DayModal({ day, projects, onClose }: DayModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
            <p className="text-sm text-gray-500">{projects.length} event{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto">
          {projects.map(p => (
            <div key={p.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                  {p.client_name && (
                    <p className="text-xs text-gray-500 mt-0.5">{p.client_name}{p.client_company ? ` · ${p.client_company}` : ''}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${getStatusColor(p.status)}`}>
                  {capitalize(p.status)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {formatDate(p.start_date)} {p.end_date && p.end_date !== p.start_date ? `→ ${formatDate(p.end_date)}` : ''}
                </p>
                <Link
                  to={`/app/projects/${p.id}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 text-xs text-primary-500 font-medium hover:text-primary-600 transition-colors"
                >
                  View Event <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects-all'],
    queryFn: () => projectsApi.getAll().then(r => r.data),
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // week starts Monday: convert Sunday(0) → 6, Mon(1)→0, etc.
  const startOffset = (firstDay.getDay() + 6) % 7;

  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  // pad to complete last week row
  while (days.length % 7 !== 0) days.push(null);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const goToday = () => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));

  const selectedProjects = selectedDay ? getProjectsForDay(projects, selectedDay) : [];

  const monthName = viewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Calendar</h2>
          <p className="text-sm text-gray-500">Project & booking schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="font-semibold text-gray-900 min-w-36 text-center">{monthName}</span>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {Object.entries(STATUS_DOT).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1.5 text-gray-500">
            <span className={`w-2 h-2 rounded-full ${color}`} />
            {capitalize(status)}
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDays.map(d => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="h-28 border-b border-r border-gray-100 bg-gray-50/30" />;
            }
            const dayProjects = getProjectsForDay(projects, day);
            const isToday = isSameDay(day, today);
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            return (
              <div
                key={day.toISOString()}
                onClick={() => dayProjects.length > 0 ? setSelectedDay(day) : undefined}
                className={`h-28 border-b border-r border-gray-100 p-2 flex flex-col transition-colors
                  ${dayProjects.length > 0 ? 'cursor-pointer hover:bg-primary-50/50' : ''}
                  ${isWeekend ? 'bg-gray-50/40' : ''}
                  ${isSelected ? 'ring-2 ring-inset ring-primary-400 bg-primary-50/30' : ''}
                `}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-primary-500 text-white' : 'text-gray-700'}
                  `}>
                    {day.getDate()}
                  </span>
                  {dayProjects.length > 0 && (
                    <span className="text-xs text-gray-400">{dayProjects.length}</span>
                  )}
                </div>

                {/* Event dots / pills */}
                <div className="flex-1 space-y-1 overflow-hidden">
                  {dayProjects.slice(0, 3).map(p => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded truncate
                        ${p.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                          p.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                          p.status === 'completed' ? 'bg-green-100 text-green-700' :
                          p.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'}
                      `}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[p.status]}`} />
                      <span className="truncate font-medium">{p.name}</span>
                    </div>
                  ))}
                  {dayProjects.length > 3 && (
                    <p className="text-xs text-gray-400 pl-1">+{dayProjects.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming events list below calendar */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary-500" />
          <h3 className="font-semibold text-gray-900">Upcoming Events This Month</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {projects
            .filter(p => {
              if (!p.start_date) return false;
              const d = new Date(p.start_date);
              return d.getFullYear() === year && d.getMonth() === month;
            })
            .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime())
            .slice(0, 10)
            .map(p => (
              <div key={p.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
                <div className={`w-1 h-10 rounded-full flex-shrink-0 ${STATUS_DOT[p.status]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.client_name || 'No client'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-medium text-gray-700">{formatDate(p.start_date)}</p>
                  {p.end_date && <p className="text-xs text-gray-400">→ {formatDate(p.end_date)}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(p.status)}`}>
                  {capitalize(p.status)}
                </span>
                <Link
                  to={`/app/projects/${p.id}`}
                  className="p-1.5 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-500 transition-colors flex-shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            ))}
          {projects.filter(p => {
            if (!p.start_date) return false;
            const d = new Date(p.start_date);
            return d.getFullYear() === year && d.getMonth() === month;
          }).length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              No events scheduled for {monthName}
            </div>
          )}
        </div>
      </div>

      {/* Day detail modal */}
      {selectedDay && selectedProjects.length > 0 && (
        <DayModal
          day={selectedDay}
          projects={selectedProjects}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}
