import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { equipmentApi } from '@/lib/api';
import { Equipment } from '@/types';
import { formatCurrency, getStatusColor, capitalize } from '@/lib/utils';
import { Plus, Search, Package, Filter, Edit2, Trash2, LogIn, LogOut, QrCode } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const CATEGORIES = ['Lighting', 'Audio', 'Video', 'Rigging', 'Power', 'Staging', 'Other'];
const CONDITIONS = ['excellent', 'good', 'fair', 'poor', 'damaged'];

function EquipmentForm({ item, onClose, onSave }: {
  item?: Equipment | null;
  onClose: () => void;
  onSave: (data: Partial<Equipment>) => void;
}) {
  const [form, setForm] = useState({
    name: item?.name || '',
    category: item?.category || 'Lighting',
    quantity: item?.quantity || 1,
    condition: item?.condition || 'good',
    location: item?.location || '',
    description: item?.description || '',
    daily_rate: item?.daily_rate || 0,
    serial_number: item?.serial_number || '',
  });

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Name *</label>
          <input required value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Condition</label>
          <select value={form.condition} onChange={e => set('condition', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20">
            {CONDITIONS.map(c => <option key={c} value={c}>{capitalize(c)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Total Quantity</label>
          <input type="number" min="1" value={form.quantity} onChange={e => set('quantity', parseInt(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Daily Rate ($)</label>
          <input type="number" min="0" step="0.01" value={form.daily_rate} onChange={e => set('daily_rate', parseFloat(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Location</label>
          <input value={form.location} onChange={e => set('location', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Serial Number</label>
          <input value={form.serial_number} onChange={e => set('serial_number', e.target.value)}
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
        <button type="submit" className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600">
          {item ? 'Update' : 'Add Equipment'}
        </button>
      </DialogFooter>
    </form>
  );
}

export default function EquipmentPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [checkoutItem, setCheckoutItem] = useState<Equipment | null>(null);
  const [checkinItem, setCheckinItem] = useState<Equipment | null>(null);
  const [checkoutQty, setCheckoutQty] = useState(1);
  const [checkinQty, setCheckinQty] = useState(1);

  const { data: equipment = [], isLoading } = useQuery<Equipment[]>({
    queryKey: ['equipment', search, filterCategory],
    queryFn: () => equipmentApi.getAll({
      ...(search && { search }),
      ...(filterCategory && { category: filterCategory }),
    }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: unknown) => equipmentApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => equipmentApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment'] }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => equipmentApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment'] }),
  });

  const checkoutMutation = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) => equipmentApi.checkout(id, { quantity: qty }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment'] }); setCheckoutItem(null); },
  });

  const checkinMutation = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) => equipmentApi.checkin(id, { quantity: qty }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment'] }); setCheckinItem(null); },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Equipment Inventory</h2>
          <p className="text-sm text-gray-500">{equipment.length} items tracked</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Equipment
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search equipment..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Equipment Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i}><CardContent className="p-4 h-36 animate-pulse bg-gray-50" /></Card>
          ))}
        </div>
      ) : equipment.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No equipment found</p>
            <p className="text-gray-400 text-sm mt-1">Add your first equipment item to get started</p>
            <button onClick={() => setShowForm(true)} className="mt-4 bg-primary-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-600">
              Add Equipment
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                    <span className="text-xs text-gray-500">{item.category}</span>
                  </div>
                  <div className="flex gap-1 ml-2 flex-shrink-0">
                    <button onClick={() => setEditing(item)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-500 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { if (confirm('Delete this item?')) deleteMutation.mutate(item.id); }}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Availability bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Available: {item.available_quantity}/{item.quantity}</span>
                    <span>{item.utilization_pct ?? 0}% in use</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-500 rounded-full transition-all"
                      style={{ width: `${item.utilization_pct ?? 0}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(item.condition)}`}>
                      {capitalize(item.condition)}
                    </span>
                    {item.location && (
                      <span className="text-xs text-gray-400 truncate max-w-20">{item.location}</span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.daily_rate)}/day</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                  <button
                    onClick={() => { setCheckoutItem(item); setCheckoutQty(1); }}
                    disabled={item.available_quantity === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Check Out
                  </button>
                  <button
                    onClick={() => { setCheckinItem(item); setCheckinQty(1); }}
                    disabled={item.available_quantity === item.quantity}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" /> Check In
                  </button>
                  <button className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors" title="QR Code">
                    <QrCode className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm || !!editing} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
          </DialogHeader>
          <EquipmentForm
            item={editing}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSave={(data) => {
              if (editing) { updateMutation.mutate({ id: editing.id, data }); }
              else { createMutation.mutate(data); }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={!!checkoutItem} onOpenChange={(o) => !o && setCheckoutItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Check Out Equipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{checkoutItem?.name}</p>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Quantity (max: {checkoutItem?.available_quantity})</label>
              <input type="number" min="1" max={checkoutItem?.available_quantity} value={checkoutQty}
                onChange={e => setCheckoutQty(parseInt(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setCheckoutItem(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={() => checkoutItem && checkoutMutation.mutate({ id: checkoutItem.id, qty: checkoutQty })}
              className="px-4 py-2 text-sm bg-accent-500 text-white rounded-lg hover:bg-accent-600">Confirm Check Out</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkin Dialog */}
      <Dialog open={!!checkinItem} onOpenChange={(o) => !o && setCheckinItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Check In Equipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{checkinItem?.name}</p>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Quantity</label>
              <input type="number" min="1" max={checkinItem ? checkinItem.quantity - checkinItem.available_quantity : 1} value={checkinQty}
                onChange={e => setCheckinQty(parseInt(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setCheckinItem(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={() => checkinItem && checkinMutation.mutate({ id: checkinItem.id, qty: checkinQty })}
              className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600">Confirm Check In</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
