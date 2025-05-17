import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { Activity, User, ClockIcon as Clock } from 'lucide-react';
import type { Database } from '../../supabase_types';

// Define specific types based on generated types (similar to Dashboard.tsx)
// It would be best to move these to a shared types file eventually
type PatientRow = Database['public']['Tables']['patients']['Row'];
type AppointmentWithDetails = Database['public']['Tables']['appointments']['Row'] & {
  patients: Pick<PatientRow, 'id' | 'first_name' | 'last_name'> | null;
  staff: Pick<Database['public']['Tables']['staff']['Row'], 'id' | 'first_name' | 'last_name' | 'role'> | null;
};
type TreatmentPlanWithTreatments = Database['public']['Tables']['treatment_plans']['Row'] & {
  treatments: Database['public']['Tables']['treatments']['Row'][] | null;
};
type MedicalRecordRow = Database['public']['Tables']['medical_records']['Row'];

// This interface should align with the one in Dashboard.tsx or be imported
interface RecentActivityItem {
  id: string;
  type: 'appointment' | 'treatment' | 'record';
  title: string;
  patientName?: string;
  itemName?: string;
  staffName?: string;
  timestamp: Date;
  icon: React.ElementType;
  details?: string;
}

export function ActivityLogPage() {
  const [allActivities, setAllActivities] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllActivityData = useCallback(async () => {
    try {
      setLoading(true);
      const [patients, treatmentPlans, medicalRecords, allAppointments] = await Promise.all([
        api.patients.getAll(),
        api.patients.getTreatmentPlans(null),
        api.patients.getMedicalRecords(null),
        api.appointments.getAll(),
      ]);

      const getPatientName = (patientId: string | null | undefined): string => {
        if (!patientId) return 'Unknown Patient';
        const patientDetails = (patients as PatientRow[]).find(p => p.id === patientId);
        return patientDetails ? `${patientDetails.first_name} ${patientDetails.last_name}` : 'Unknown Patient';
      };

      const recentCompletedAppointments: RecentActivityItem[] = (allAppointments as AppointmentWithDetails[])
        .filter((apt: AppointmentWithDetails) => apt.status === 'completed' && apt.start_time)
        .map((apt: AppointmentWithDetails) => ({
          id: apt.id,
          type: 'appointment' as const,
          title: `Appointment ${apt.type || ''} Completed`,
          patientName: apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : 'Unknown Patient',
          itemName: apt.type || 'Appointment',
          staffName: apt.staff ? `${apt.staff.first_name} ${apt.staff.last_name}` : undefined,
          timestamp: parseISO(apt.start_time!),
          icon: User,
          details: `Notes: ${apt.notes || 'N/A'}`,
        }));

      const recentCompletedTreatments: RecentActivityItem[] = (treatmentPlans as TreatmentPlanWithTreatments[])
        .flatMap((plan: TreatmentPlanWithTreatments) => {
          const patientNameForPlan = getPatientName(plan.patient_id);
          return (plan.treatments || [])
            .filter(treatment => treatment.status === 'completed' && treatment.updated_at)
            .map((treatment: Database['public']['Tables']['treatments']['Row']) => ({
              id: treatment.id,
              type: 'treatment' as const,
              title: `Treatment Completed`,
              patientName: patientNameForPlan,
              itemName: treatment.type || 'Treatment',
              timestamp: parseISO(treatment.updated_at!),
              icon: Activity,
              details: `Notes: ${treatment.notes || 'N/A'}`,
            }));
        });

      const recentRecords: RecentActivityItem[] = (medicalRecords as MedicalRecordRow[])
        .filter(record => record.created_at)
        .map((record: MedicalRecordRow) => ({
          id: record.id,
          type: 'record' as const,
          title: `Medical Record Added`,
          patientName: getPatientName(record.patient_id),
          itemName: record.record_type || 'Medical Record',
          timestamp: parseISO(record.created_at!),
          icon: Clock,
          details: `Summary: ${record.summary || 'N/A'}`,
        }));

      const combinedActivity = [
        ...recentCompletedAppointments,
        ...recentCompletedTreatments,
        ...recentRecords,
      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setAllActivities(combinedActivity);
    } catch (error) {
      console.error('Error fetching activity log data:', error);
      // TODO: Add user-friendly error toast or message
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllActivityData();
  }, [fetchAllActivityData]);

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        heading="Full Activity Log"
        text="Browse all recent activities in the system."
      />
      <ScrollArea className="h-[calc(100vh-200px)] mt-6"> {/* Adjust height as needed */}
        <div className="space-y-4 pr-4"> {/* Added pr-4 for scrollbar spacing */}
          {loading ? (
            <p className="text-center text-muted-foreground py-10">Loading activities...</p>
          ) : allActivities.length > 0 ? (
            allActivities.map(activity => {
              const IconComponent = activity.icon || Activity;
              return (
                <Card key={activity.id} className="shadow-sm bg-card">
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-base flex items-center font-medium">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full mr-3 flex-shrink-0 ${
                        activity.type === 'appointment' ? 'bg-emerald-100' :
                        activity.type === 'treatment' ? 'bg-blue-100' : 'bg-purple-100'
                      }`}>
                        <IconComponent className={`h-5 w-5 ${
                          activity.type === 'appointment' ? 'text-emerald-600' :
                          activity.type === 'treatment' ? 'text-blue-600' : 'text-purple-600'
                        }`} />
                      </div>
                      {activity.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm pl-14 pr-6 pb-4">
                    {activity.patientName && (
                      <p><span className="font-medium text-muted-foreground">Patient:</span> {activity.patientName}</p>
                    )}
                    {activity.itemName && (
                      <p><span className="font-medium text-muted-foreground">Item:</span> {activity.itemName}</p>
                    )}
                    {activity.staffName && (
                      <p><span className="font-medium text-muted-foreground">Staff:</span> {activity.staffName}</p>
                    )}
                     {activity.details && (
                      <p className="text-xs italic text-muted-foreground"><span className="font-medium not-italic">Details:</span> {activity.details}</p>
                    )}
                    <p className="text-xs text-muted-foreground pt-1">
                      {format(activity.timestamp, 'EEEE, MMM d, yyyy \'at\' h:mm a')}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <p className="text-center text-muted-foreground py-10">No activities found.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
} 