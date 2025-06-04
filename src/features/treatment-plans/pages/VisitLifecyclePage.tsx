import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, FileText, CheckCircle2, XCircle, Repeat, PlayCircle, CalendarCheck2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

// Types
export type Visit = Database['public']['Tables']['treatments']['Row'];
export type VisitLog = {
  id: string;
  visit_id: string;
  action: string;
  previous_status: string;
  new_status: string;
  user_id: string | null;
  created_at: string;
};
export type TreatmentPlan = Database['public']['Tables']['treatment_plans']['Row'];
export type VisitLogWithUser = {
  id: string;
  visit_id: string;
  action: string;
  previous_status?: string | null;
  new_status?: string | null;
  performed_by: string | null;
  timestamp: string;
  notes?: string | null;
  user_name?: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-cyan-100 text-cyan-700',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-700',
  no_show: 'bg-red-100 text-red-700',
  rebooked: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-gray-200 text-gray-600',
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  no_show: 'No Show',
  rebooked: 'Rebooked',
  cancelled: 'Cancelled',
};

export default function VisitLifecyclePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [visitLogs, setVisitLogs] = useState<VisitLogWithUser[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [planVisits, setPlanVisits] = useState<Record<string, Visit[]>>({});
  const [plansLoading, setPlansLoading] = useState(true);

  // Fetch visits from Supabase
  const fetchVisits = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('treatments')
      .select('*')
      .order('scheduled_date_time', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setVisits([]);
    } else {
      setVisits(data || []);
    }
    setLoading(false);
  };

  // Fetch all plans and their visits
  const fetchPlansAndVisits = async () => {
    setPlansLoading(true);
    const { data: plansData, error: plansError } = await supabase
      .from('treatment_plans')
      .select('*')
      .order('created_at', { ascending: false });
    if (plansError) {
      toast({ title: 'Error', description: plansError.message, variant: 'destructive' });
      setPlans([]);
      setPlanVisits({});
      setPlansLoading(false);
      return;
    }
    setPlans(plansData || []);
    // Fetch visits for each plan
    const visitsByPlan: Record<string, Visit[]> = {};
    for (const plan of plansData || []) {
      const { data: visitsData } = await supabase
        .from('treatments')
        .select('*')
        .eq('plan_id', plan.id)
        .order('created_at', { ascending: true });
      visitsByPlan[plan.id] = visitsData || [];
    }
    setPlanVisits(visitsByPlan);
    setPlansLoading(false);
  };

  useEffect(() => {
    fetchPlansAndVisits();
    // eslint-disable-next-line
  }, [toast]);

  // Fetch visit logs
  const fetchVisitLogs = async (visitId: string) => {
    setLogsLoading(true);
    setVisitLogs([]);
    // Fetch logs and join with profiles for user name
    const { data, error } = await supabase
      .from('visit_logs')
      .select('*, profiles:performed_by(first_name, last_name)')
      .eq('visit_id', visitId)
      .order('timestamp', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setVisitLogs([]);
    } else {
      setVisitLogs(
        (data || []).map((log: any) => ({
          ...log,
          user_name: log.profiles ? `${log.profiles.first_name || ''} ${log.profiles.last_name || ''}`.trim() : 'Unknown',
        }))
      );
    }
    setLogsLoading(false);
  };

  // Filtered visits
  const filteredVisits = visits.filter((v) => {
    if (statusFilter !== 'all' && v.status !== statusFilter) return false;
    if (search && !(v.completion_notes ? JSON.stringify(v.completion_notes).toLowerCase().includes(search.toLowerCase()) : v.description?.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const handleShowDetails = async (visit: Visit) => {
    setSelectedVisit(visit);
    setShowDetails(true);
    await fetchVisitLogs(visit.id);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Visit Lifecycle Management</h1>
        <Button onClick={() => window.location.reload()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>
      <div className="flex gap-4 mb-4">
        <Input
          placeholder="Search by procedure..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
            <SelectItem value="rebooked">Rebooked</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {plansLoading ? (
        <div className="flex justify-center my-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No treatment plans found.</div>
      ) : (
        <div className="space-y-10">
          {plans.map((plan) => {
            const visits = planVisits[plan.id] || [];
            const completedCount = visits.filter(v => v.status === 'completed').length;
            return (
              <div key={plan.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold mb-1">{plan.title || 'Untitled Plan'}</h2>
                    <div className="text-sm text-muted-foreground">{plan.description}</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-primary">{completedCount} of {visits.length} visits completed</span>
                    <div className="w-40 h-2 bg-slate-200 rounded mt-1">
                      <div className="h-2 bg-primary rounded" style={{ width: `${visits.length ? (completedCount / visits.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
                <div className="border-l-4 border-primary/30 pl-6 space-y-8">
                  {visits.length === 0 ? (
                    <div className="text-muted-foreground text-sm">No visits for this plan.</div>
                  ) : (
                    <div className="overflow-x-auto py-4">
                      <div className="flex items-center gap-8 min-w-max">
                        {visits.map((visit, idx) => (
                          <React.Fragment key={visit.id}>
                            <div className={`rounded-xl shadow-lg px-6 py-4 bg-white border-2 ${visit.status === 'completed' ? 'border-green-400' : visit.status === 'pending' ? 'border-yellow-400' : 'border-gray-200'}`}
                                 style={{ minWidth: 260, maxWidth: 320 }}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[visit.status] || 'bg-slate-100 text-gray-700'}`}>{STATUS_LABELS[visit.status] || visit.status}</span>
                                <span className="font-bold text-lg">Visit {idx + 1}</span>
                              </div>
                              <div className="text-sm font-medium mb-1 truncate">{visit.type || visit.description}</div>
                              <div className="text-xs mb-1"><b>Scheduled:</b> {visit.completion_date ? format(new Date(visit.completion_date), 'yyyy-MM-dd HH:mm') : '-'}</div>
                              <div className="text-xs mb-1"><b>Actual:</b> {visit.actual_start_time ? format(new Date(visit.actual_start_time), 'yyyy-MM-dd HH:mm') : '-'}</div>
                              <div className="text-xs mb-1"><b>Procedures:</b> {visit.description || '-'}</div>
                              <div className="text-xs mb-1"><b>Doctor:</b> Dr. John Doe</div>
                              <div className="text-xs mb-1"><b>Notes:</b> {visit.completion_notes || '-'}</div>
                              <div className="flex gap-2 mt-2">
                                <Button size="sm" variant="outline" onClick={() => handleShowDetails(visit)}>
                                  <FileText className="w-4 h-4 mr-1" /> Details
                                </Button>
                              </div>
                            </div>
                            {idx < visits.length - 1 && (
                              <div className="flex-shrink-0 h-1 w-12 border-t-2 border-dashed border-primary/40 mx-2" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Visit Details Modal/Drawer */}
      {showDetails && selectedVisit && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative animate-fade-in">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl" onClick={() => setShowDetails(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Visit Details
            </h2>
            <div className="mb-2 flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[selectedVisit.status] || 'bg-slate-100 text-gray-700'}`}>{STATUS_LABELS[selectedVisit.status] || selectedVisit.status}</span>
            </div>
            <div className="mb-2"><b>Scheduled:</b> {selectedVisit.completion_date ? format(new Date(selectedVisit.completion_date), 'yyyy-MM-dd HH:mm') : '-'}</div>
            <div className="mb-2"><b>Actual:</b> {selectedVisit.actual_start_time ? format(new Date(selectedVisit.actual_start_time), 'yyyy-MM-dd HH:mm') : '-'}</div>
            <div className="mb-2"><b>Procedures:</b> {selectedVisit.description || '-'}</div>
            <div className="mb-2"><b>Doctor Notes:</b> {selectedVisit.completion_notes || '-'}</div>
            {/* Audit Log Timeline */}
            <div className="mt-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-primary"><CalendarCheck2 className="w-4 h-4" /> Visit Audit Log</h3>
              {logsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading log...</div>
              ) : visitLogs.length === 0 ? (
                <div className="text-muted-foreground text-sm">No audit log entries for this visit.</div>
              ) : (
                <ol className="relative border-l border-primary/30 ml-2">
                  {visitLogs.map((log) => (
                    <li key={log.id} className="mb-6 ml-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[log.new_status] || 'bg-slate-100 text-gray-700'}`}>{STATUS_LABELS[log.new_status] || log.new_status}</span>
                        <span className="text-xs text-gray-500">{format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm')}</span>
                      </div>
                      <div className="text-sm font-medium">{log.action}</div>
                      <div className="text-xs text-gray-600">By: {log.user_name || 'Unknown'}</div>
                      {log.notes && <div className="text-xs text-gray-500 italic">Notes: {log.notes}</div>}
                      {log.previous_status && log.new_status && (
                        <div className="text-xs text-gray-400">Status: {STATUS_LABELS[log.previous_status] || log.previous_status} → {STATUS_LABELS[log.new_status] || log.new_status}</div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <Button size="sm" variant="destructive" onClick={() => setShowDetails(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 