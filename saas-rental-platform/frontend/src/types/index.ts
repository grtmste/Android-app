export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'crew_member';
  avatar_url?: string;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
  total_projects?: number;
  total_revenue?: number;
  created_at: string;
}

export interface Equipment {
  id: string;
  name: string;
  category: string;
  quantity: number;
  available_quantity: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  location?: string;
  description?: string;
  daily_rate: number;
  serial_number?: string;
  barcode?: string;
  image_url?: string;
  utilization_pct?: number;
  created_at: string;
}

export interface EquipmentLog {
  id: string;
  equipment_id: string;
  project_id?: string;
  action: 'checkout' | 'checkin' | 'damaged' | 'maintenance';
  quantity: number;
  notes?: string;
  checked_by_name?: string;
  project_name?: string;
  created_at: string;
}

export interface CrewMember {
  id: string;
  user_id?: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  skills: string[];
  hourly_rate: number;
  is_available: boolean;
  notes?: string;
  total_projects?: number;
  total_hours?: number;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  client_id?: string;
  client_name?: string;
  client_company?: string;
  status: 'draft' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  description?: string;
  location?: string;
  budget?: number;
  total_revenue?: number;
  equipment_count?: number;
  crew_count?: number;
  task_count?: number;
  equipment?: ProjectEquipment[];
  crew?: ProjectCrew[];
  tasks?: Task[];
  created_at: string;
}

export interface ProjectEquipment {
  id: string;
  project_id: string;
  equipment_id: string;
  equipment_name: string;
  category: string;
  quantity: number;
  daily_rate: number;
}

export interface ProjectCrew {
  id: string;
  project_id: string;
  crew_id: string;
  crew_name: string;
  crew_role: string;
  role: string;
  hours: number;
  hourly_rate: number;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  assigned_to?: string;
  assigned_to_name?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

export interface Quote {
  id: string;
  project_id?: string;
  client_id?: string;
  quote_number: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  valid_until?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes?: string;
  terms?: string;
  client_name?: string;
  client_company?: string;
  project_name?: string;
  items?: QuoteItem[];
  created_at: string;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  description: string;
  type: 'equipment' | 'crew' | 'service' | 'other';
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  project_id?: string;
  client_id?: string;
  quote_id?: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  notes?: string;
  terms?: string;
  client_name?: string;
  client_company?: string;
  client_email?: string;
  project_name?: string;
  items?: InvoiceItem[];
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  type: 'equipment' | 'crew' | 'service' | 'other';
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message?: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalRevenue: number;
  pendingInvoices: { count: number; amount: number };
  equipmentUtilization: { inUse: number; total: number; pct: number };
  recentProjects: Project[];
  upcomingProjects: Project[];
  revenueByMonth: { month: string; revenue: number; invoice_count: number }[];
}
