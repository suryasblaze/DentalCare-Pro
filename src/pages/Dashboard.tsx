import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { Calendar, Users, Clock, Activity, ArrowUp, ArrowDown, ChevronRight, User } from 'lucide-react';
import { api, subscribeToChanges } from '@/lib/api';
import { format, startOfDay, endOfDay, addDays, parseISO, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, eachHourOfInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import DashboardCharts, { ChartDataPoint, PieChartDataPoint, DashboardChartsProps } from '@/components/DashboardCharts'; // Import the new charts component and its types
// Import types from generated file (adjust path if needed)
import type { Database } from '../../supabase_types'; // Corrected import path

// Define specific types based on generated types
type PatientRow = Database['public']['Tables']['patients']['Row'];
// Define a type for Appointment with nested Patient and Staff data (as returned by API)
type AppointmentWithDetails = Database['public']['Tables']['appointments']['Row'] & {
  patients: Pick<PatientRow, 'id' | 'first_name' | 'last_name' | 'email' | 'phone'> | null; // Allow null if patient not found
  staff: Pick<Database['public']['Tables']['staff']['Row'], 'id' | 'first_name' | 'last_name' | 'role'> | null; // Removed 'specialization'
};
// Define a type for TreatmentPlan with nested Treatments
type TreatmentPlanWithTreatments = Database['public']['Tables']['treatment_plans']['Row'] & {
  treatments: Database['public']['Tables']['treatments']['Row'][] | null; // Allow null
};
type MedicalRecordRow = Database['public']['Tables']['medical_records']['Row'];


// Define interfaces for state types using imported/derived types
interface UpcomingAppointment {
  id: string;
  patient: string; // Keep as string for display
  time: string;
  date: string;
  type: string;
  status: string;
}

interface RecentActivityItem {
  type: 'appointment' | 'treatment' | 'record'; // More specific type
  title: string;
  time: Date;
  icon: React.ElementType;
}

export function Dashboard() {
  const navigate = useNavigate(); // Initialize useNavigate
  const [stats, setStats] = useState({
    todaysAppointmentsCount: 0, // Renamed for clarity: Count for today's card
    totalPatients: 0,
    avgWaitTime: 0, // Keep avgWaitTime calculation as mock for now
    treatmentSuccessRate: 0,
    appointmentsChange: 0, // Will be set to 0, removing mock calc
    patientsChange: 0, // Will be set to 0, removing mock calc
    waitTimeChange: 0, // Will be set to 0, removing mock calc
    successRateChange: 0 // Will be set to 0, removing mock calc
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]); // Use interface type
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]); // Use interface type
  const [loading, setLoading] = useState(true);
  // State for chart data
  const [chartData, setChartData] = useState<Partial<DashboardChartsProps>>({
    revenueData: [],
    appointmentTypeData: [],
    dailyAppointmentData: [],
    treatmentStatusData: [],
    profitEstimationData: { conversionRate: 0, estimatedSales: 0, estimatedProfit: 0 },
    totalRevenue: 0,
    dailyVisitors: 0,
    // Add state for new chart data
    patientAgeData: [],
    appointmentStatusData: [],
    treatmentPlanStatusData: [],
  });

  useEffect(() => {
    fetchDashboardData();

    // Tables to subscribe to for real-time updates
    const tablesToSubscribe = ['appointments', 'patients', 'treatment_plans', 'treatments', 'medical_records'];
    
    const subscriptions = tablesToSubscribe.map(table => 
      subscribeToChanges(table, (payload) => {
        console.log(`Dashboard detected change in ${table}:`, payload);
        // Re-fetch all dashboard data on any change
        fetchDashboardData(); 
      })
    );

    // Unsubscribe from all subscriptions on component unmount
    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, []); // Empty dependency array ensures this runs only once on mount/unmount

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // --- Define Date Ranges ---
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);
      const sixMonthsAgo = startOfMonth(subMonths(today, 5)); // Start of 6 months ago (inclusive)
      const endOfThisMonth = endOfMonth(today);
      // const startOfLastMonth = startOfMonth(subMonths(today, 1)); // Not used currently
      // const endOfLastMonth = endOfMonth(subMonths(today, 1)); // Not used currently
      const sevenDaysAgo = startOfDay(addDays(today, -6)); // Start of 7 days ago (inclusive)
      
      // --- Fetch all data needed for dashboard ---
      const [
        patients,
        treatmentPlans,
        medicalRecords,
        allAppointments // Fetch all appointments once
      ] = await Promise.all([
        api.patients.getAll(), 
        api.patients.getTreatmentPlans(null), // Get all treatment plans
        api.patients.getMedicalRecords(null), // Get all medical records
        api.appointments.getAll() // Fetch all appointments
      ]);

      // --- Calculate Counts ---
      const totalPatients = patients.length;
      // Filter appointments for today
      const todaysAppointments = (allAppointments as AppointmentWithDetails[]).filter(apt => {
        if (!apt.start_time) return false;
        const aptDate = parseISO(apt.start_time);
        return isWithinInterval(aptDate, { start: todayStart, end: todayEnd });
      });
      const todaysAppointmentsCount = todaysAppointments.length;

      // Calculate treatment success rate
      let completedTreatments = 0;
      let totalTreatments = 0;

      // Use the specific type for treatmentPlans and calculate actual completed treatments
      (treatmentPlans as TreatmentPlanWithTreatments[]).forEach((plan: TreatmentPlanWithTreatments) => {
        if (plan.treatments && plan.treatments.length > 0) {
          totalTreatments += plan.treatments.length;
          // Use actual treatment status
          completedTreatments += plan.treatments.filter((t: Database['public']['Tables']['treatments']['Row']) => t.status === 'completed').length; 
        }
      });

      const treatmentSuccessRate = totalTreatments > 0 
        ? Math.round((completedTreatments / totalTreatments) * 100) 
        : 0;
      
      // Calculate average wait time (mockup for now - could be calculated from appointments)
      // In a real system, this would be calculated from actual check-in/treatment start times
      const avgWaitTime = 15; // minutes
      
      // Remove mock change calculations - set to 0
      const appointmentsChange = 0;
      const patientsChange = 0;
      const waitTimeChange = 0; // Keep avgWaitTime mock for now, but remove change calc
      const successRateChange = 0;

      setStats({
        todaysAppointmentsCount, // Use the calculated count for today
        totalPatients,
        avgWaitTime,
        treatmentSuccessRate,
        appointmentsChange,
        patientsChange,
        waitTimeChange,
        successRateChange
      });
      
      // Filter, sort, and format upcoming appointments from allAppointments using start_time
      const upcomingFiltered = (allAppointments as AppointmentWithDetails[])
        .filter(apt => apt.status === 'scheduled' && apt.start_time && parseISO(apt.start_time) >= todayStart) // Use start_time
        .sort((a, b) => (a.start_time ? parseISO(a.start_time).getTime() : 0) - (b.start_time ? parseISO(b.start_time).getTime() : 0)) // Sort by start_time
        .slice(0, 5) // Limit to 5 appointments
        .map((apt: AppointmentWithDetails) => ({ 
          id: apt.id,
          patient: apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : 'Unknown Patient',
          // Use start_time for time and date
          time: apt.start_time ? format(parseISO(apt.start_time), 'h:mm a') : 'No time',
          date: apt.start_time ? format(parseISO(apt.start_time), 'MMM d') : 'No date',
          type: apt.type || 'Appointment', // Use the appointment's type field
          status: apt.status
        }));

      setUpcomingAppointments(upcomingFiltered); // Use the correct filtered variable
      
      // --- Get recent activity (completed appointments and treatments) ---
      // Define activity arrays *before* combining them
      const recentCompletedAppointments: RecentActivityItem[] = (allAppointments as AppointmentWithDetails[]) 
        .filter((apt: AppointmentWithDetails) => apt.status === 'completed')
        .map((apt: AppointmentWithDetails) => ({
          type: 'appointment' as const, 
          // Use optional chaining and staff role for type
          title: `Completed ${apt.staff?.role || 'Appointment'} for ${apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : 'Unknown Patient'}`,
          // Use start_time or updated_at for time
          time: apt.start_time ? parseISO(apt.start_time) : (apt.updated_at ? parseISO(apt.updated_at) : new Date()),
          icon: Activity
        }));

      const recentCompletedTreatments: RecentActivityItem[] = (treatmentPlans as TreatmentPlanWithTreatments[])
        .flatMap((plan: TreatmentPlanWithTreatments) => plan.treatments || [])
        .filter((treatment): treatment is Database['public']['Tables']['treatments']['Row'] => !!treatment && !!treatment.updated_at) // Filter by existence and updated_at
        .map((treatment: Database['public']['Tables']['treatments']['Row']) => ({
          type: 'treatment' as const,
          title: `Updated ${treatment.type} treatment`, // Use type instead of name
          time: treatment.updated_at ? parseISO(treatment.updated_at) : (treatment.created_at ? parseISO(treatment.created_at) : new Date()),
          icon: Calendar
        }));

      const recentRecords: RecentActivityItem[] = (medicalRecords as MedicalRecordRow[])
        .map((record: MedicalRecordRow) => ({
          type: 'record' as const,
          title: `Added Medical Record`, // Generic title
          time: record.created_at ? parseISO(record.created_at) : new Date(),
          icon: Clock
        }));

      // Combine and sort activity *after* defining individual arrays
      const allActivity = [...recentCompletedAppointments, ...recentCompletedTreatments, ...recentRecords] 
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .slice(0, 5);

      setRecentActivity(allActivity);

      // --- Process data for charts ---

      // 1. Revenue/Appointment Data (Last 6 Months) - Date ranges defined above
      const monthlyAppointments: { [key: string]: { count: number, revenue: number } } = {};
      const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });

      for (let i = 0; i < 6; i++) {
          const monthDate = subMonths(today, i);
          const monthKey = format(monthDate, 'yyyy-MM');
          monthlyAppointments[monthKey] = { count: 0, revenue: 0 }; // Initialize revenue to 0
      }

      (allAppointments as AppointmentWithDetails[]).forEach(apt => {
          if (apt.start_time) { // Use start_time
              const aptDate = parseISO(apt.start_time);
              if (isWithinInterval(aptDate, { start: sixMonthsAgo, end: endOfThisMonth })) {
                  const monthKey = format(aptDate, 'yyyy-MM');
                  if (monthlyAppointments[monthKey]) {
                      monthlyAppointments[monthKey].count += 1;
                      // Remove mock revenue calculation
                      // monthlyAppointments[monthKey].revenue += 100; 
                      // TODO: Add actual revenue calculation if appointment cost/price is available
                  }
              }
          }
      });

      const processedRevenueData = Object.keys(monthlyAppointments)
          .map(monthKey => ({
              name: monthFormatter.format(parseISO(monthKey + '-01')), // Format to 'SEP', 'OCT', etc.
              uv: monthlyAppointments[monthKey].count, // Appointments count
              pv: monthlyAppointments[monthKey].revenue, // Actual Revenue (currently 0)
              monthKey: monthKey // Keep for sorting
          }))
          .sort((a, b) => a.monthKey.localeCompare(b.monthKey)); // Sort chronologically first

      const totalRevenueCalc = processedRevenueData.reduce((sum, data) => sum + (data.pv || 0), 0); // pv will be 0 if mock revenue removed
      // Remove mock percentage change calculation
      const revenueChangePercentage = 0;

      const finalRevenueData = processedRevenueData.map(({ name, uv, pv }) => ({ name, uv, pv })); // Remove monthKey after sorting


      // 2. Appointment Type Data (Current Month)
      const currentMonthStart = startOfMonth(today);
      const currentMonthEnd = endOfMonth(today);
      const appointmentTypesCount: { [key: string]: number } = {};

      (allAppointments as AppointmentWithDetails[]).forEach(apt => {
          const aptType = apt.staff?.role || 'General'; // Use staff role or default
          if (apt.start_time) { // Use start_time
              const aptDate = parseISO(apt.start_time);
              if (isWithinInterval(aptDate, { start: currentMonthStart, end: currentMonthEnd })) {
                  appointmentTypesCount[aptType] = (appointmentTypesCount[aptType] || 0) + 1;
              }
          }
      });
      const processedAppointmentTypeData: PieChartDataPoint[] = Object.entries(appointmentTypesCount)
          .map(([name, value]) => ({ name, value }));


      // 3. Daily Appointment Data (Today, by Hour)
      const hoursToday = eachHourOfInterval({ start: todayStart, end: todayEnd });
      const hourlyAppointments: { [key: string]: number } = {};
      hoursToday.forEach(hour => {
          hourlyAppointments[format(hour, 'HH')] = 0; // Initialize all hours from 00 to 23
      });

      (allAppointments as AppointmentWithDetails[]).forEach(apt => {
          if (apt.start_time) { // Use start_time
              const aptDate = parseISO(apt.start_time);
              if (isWithinInterval(aptDate, { start: todayStart, end: todayEnd })) {
                  const hourKey = format(aptDate, 'HH');
                  hourlyAppointments[hourKey] = (hourlyAppointments[hourKey] || 0) + 1;
              }
          }
      });
       // Filter for relevant hours (e.g., 00, 04, 08, 12, 14, 16, 18 as in example) and format
      const relevantHours = ['00', '04', '08', '12', '14', '16', '18'];
      const processedDailyAppointmentData: ChartDataPoint[] = relevantHours.map(hourKey => ({
          name: hourKey,
          value: hourlyAppointments[hourKey] || 0
      }));
      const appointmentsTodayCount = Object.values(hourlyAppointments).reduce((sum, count) => sum + count, 0);
      // Remove mock daily appointment change percentage
      const dailyAppointmentsChangePercentage = 0;


      // 4. Treatment Status Data (Last 7 Days Completion Rate %) - Date ranges defined above
      const daysInterval = eachDayOfInterval({ start: sevenDaysAgo, end: today });
      const dailyTreatmentStatus: { [key: string]: { completed: number, total: number } } = {};
      const dayFormatter = new Intl.DateTimeFormat('en', { weekday: 'short' });

      daysInterval.forEach(day => {
          dailyTreatmentStatus[format(day, 'yyyy-MM-dd')] = { completed: 0, total: 0 };
      });

      // Use actual treatment status
      (treatmentPlans as TreatmentPlanWithTreatments[]).forEach(plan => {
          // Add explicit type for treatment parameter
          (plan.treatments || []).forEach((treatment: Database['public']['Tables']['treatments']['Row']) => {
              // Check if treatment was updated within the last 7 days
              if (treatment.updated_at) {
                  const treatmentDate = parseISO(treatment.updated_at);
                  if (isWithinInterval(treatmentDate, { start: sevenDaysAgo, end: todayEnd })) {
                      const dayKey = format(treatmentDate, 'yyyy-MM-dd');
                      if (dailyTreatmentStatus[dayKey]) {
                          dailyTreatmentStatus[dayKey].total += 1;
                          // Use actual status for completion
                          if (treatment.status === 'completed') {
                              dailyTreatmentStatus[dayKey].completed += 1; 
                          }
                      }
                  }
              }
          });
      });

      const processedTreatmentStatusData: ChartDataPoint[] = Object.keys(dailyTreatmentStatus)
          .map(dayKey => {
              const status = dailyTreatmentStatus[dayKey];
              const rate = status.total > 0 ? Math.round((status.completed / status.total) * 100) : 0;
              return {
                  name: dayFormatter.format(parseISO(dayKey)), // Format to 'Mon', 'Tue', etc.
                  value: rate, // Completion rate %
                  dayKey: dayKey // Keep for sorting
              };
          })
          .sort((a, b) => a.dayKey.localeCompare(b.dayKey)); // Sort chronologically first

      const overallTreatmentProgress = processedTreatmentStatusData.length > 0
          ? Math.round(processedTreatmentStatusData.reduce((sum, day) => sum + (day.value || 0), 0) / processedTreatmentStatusData.length)
          : 0; // Average completion rate over the period

      const finalTreatmentStatusData = processedTreatmentStatusData.map(({ name, value }) => ({ name, value })); // Remove dayKey after sorting


      // 5. Profit Estimation Data - Ensure completedTreatments and treatmentSuccessRate are calculated first
      const estimatedSales = completedTreatments; 
      const estimatedProfit = 0; // Remove mock profit calculation
      // TODO: Add actual profit calculation if cost/revenue data is available
      const processedProfitEstimationData = {
          conversionRate: treatmentSuccessRate, 
          estimatedSales: estimatedSales,
          estimatedProfit: estimatedProfit,
      };

      // --- Process data for NEW charts ---

      // 6. Patient Age Distribution
      const ageGroups: { [key: string]: number } = {
        '0-18': 0,
        '19-35': 0,
        '36-50': 0,
        '51-65': 0,
        '65+': 0,
        'Unknown': 0,
      };
      (patients as PatientRow[]).forEach(p => {
        const age = p.age;
        if (age === null || age === undefined) {
          ageGroups['Unknown']++;
        } else if (age <= 18) {
          ageGroups['0-18']++;
        } else if (age <= 35) {
          ageGroups['19-35']++;
        } else if (age <= 50) {
          ageGroups['36-50']++;
        } else if (age <= 65) {
          ageGroups['51-65']++;
        } else {
          ageGroups['65+']++;
        }
      });
      const processedPatientAgeData: ChartDataPoint[] = Object.entries(ageGroups)
        .map(([name, value]) => ({ name, value }));

      // 7. Appointment Status Distribution
      const appointmentStatusCount: { [key: string]: number } = {};
      (allAppointments as AppointmentWithDetails[]).forEach(apt => {
        const status = apt.status || 'Unknown';
        appointmentStatusCount[status] = (appointmentStatusCount[status] || 0) + 1;
      });
      const processedAppointmentStatusData: PieChartDataPoint[] = Object.entries(appointmentStatusCount)
        .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })); // Capitalize status

      // 8. Treatment Plan Status Distribution
      const treatmentPlanStatusCount: { [key: string]: number } = {};
      (treatmentPlans as TreatmentPlanWithTreatments[]).forEach(plan => {
        const status = plan.status || 'Unknown';
        treatmentPlanStatusCount[status] = (treatmentPlanStatusCount[status] || 0) + 1;
      });
      const processedTreatmentPlanStatusData: PieChartDataPoint[] = Object.entries(treatmentPlanStatusCount)
        .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })); // Capitalize status


      // --- Update chart data state ---
      setChartData({
          revenueData: finalRevenueData, // Use final sorted data
          appointmentTypeData: processedAppointmentTypeData,
          dailyAppointmentData: processedDailyAppointmentData,
          treatmentStatusData: finalTreatmentStatusData, // Use final sorted data
          profitEstimationData: processedProfitEstimationData,
          totalRevenue: totalRevenueCalc,
          dailyVisitors: appointmentsTodayCount,
          // Pass calculated percentages (now 0)
          revenueChangePercentage: revenueChangePercentage,
          dailyAppointmentsChangePercentage: dailyAppointmentsChangePercentage,
          overallTreatmentProgress: overallTreatmentProgress,
          // Add new chart data
          patientAgeData: processedPatientAgeData,
          appointmentStatusData: processedAppointmentStatusData,
          treatmentPlanStatusData: processedTreatmentPlanStatusData,
      });


      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        heading="Dashboard"
        text="Overview of your dental practice"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Appointments
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {/* Use the correct state variable for today's count */}
            <div className="text-2xl font-bold">{stats.todaysAppointmentsCount}</div>
            {/* Display change only if not 0, or remove entirely */}
            {stats.appointmentsChange !== 0 && (
              <div className="flex items-center text-xs text-muted-foreground">
                {stats.appointmentsChange > 0 ? (
                  <ArrowUp className="mr-1 h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowDown className="mr-1 h-4 w-4 text-red-500" />
                )}
                <span className={stats.appointmentsChange > 0 ? "text-emerald-500" : "text-red-500"}>
                  {Math.abs(stats.appointmentsChange)}%
                </span>
                <span className="ml-1">from last week</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Patients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
             {/* Display change only if not 0, or remove entirely */}
            {stats.patientsChange !== 0 && (
              <div className="flex items-center text-xs text-muted-foreground">
                {stats.patientsChange > 0 ? (
                  <ArrowUp className="mr-1 h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowDown className="mr-1 h-4 w-4 text-red-500" />
                )}
                <span className={stats.patientsChange > 0 ? "text-emerald-500" : "text-red-500"}>
                  {Math.abs(stats.patientsChange)}%
                </span>
                <span className="ml-1">from last month</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Wait Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgWaitTime}m</div>
             {/* Display change only if not 0, or remove entirely */}
            {stats.waitTimeChange !== 0 && (
              <div className="flex items-center text-xs text-muted-foreground">
                 {/* Assuming negative change is improvement */}
                {stats.waitTimeChange < 0 ? ( 
                  <ArrowDown className="mr-1 h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowUp className="mr-1 h-4 w-4 text-red-500" />
                )}
                <span className={stats.waitTimeChange < 0 ? "text-emerald-500" : "text-red-500"}>
                  {Math.abs(stats.waitTimeChange)}%
                </span>
                <span className="ml-1">{stats.waitTimeChange < 0 ? 'improved' : 'worse'}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Treatment Success
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.treatmentSuccessRate}%</div>
             {/* Display change only if not 0, or remove entirely */}
            {stats.successRateChange !== 0 && (
              <div className="flex items-center text-xs text-muted-foreground">
                {stats.successRateChange > 0 ? (
                  <ArrowUp className="mr-1 h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowDown className="mr-1 h-4 w-4 text-red-500" />
                )}
                <span className={stats.successRateChange > 0 ? "text-emerald-500" : "text-red-500"}>
                  {Math.abs(stats.successRateChange)}%
                </span>
                <span className="ml-1">from last quarter</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Appointments</CardTitle>
              {/* Add onClick handler */}
              <Button variant="ghost" size="sm" className="text-sm" onClick={() => navigate('/appointments')}>
                View all
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">
                Loading appointments...
              </div>
            ) : upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {/* Use UpcomingAppointment type */}
                {upcomingAppointments.map((appointment: UpcomingAppointment) => ( 
                  <div
                    key={appointment.id}
                    className="flex items-center rounded-lg border p-4"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      {/* Use User icon for patient */}
                      <User className="h-5 w-5 text-primary" /> 
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium">{appointment.patient}</p>
                      {/* Re-added line to display appointment type */}
                      <p className="text-sm text-muted-foreground">{appointment.type}</p> 
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{appointment.date}</p>
                      <p className="text-sm text-muted-foreground">{appointment.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No upcoming appointments
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              {/* Add onClick handler */}
              <Button variant="ghost" size="sm" className="text-sm" onClick={() => navigate('/appointments')}>
                View all
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">
                Loading activity...
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-8">
                 {/* Use RecentActivityItem type */}
                {recentActivity.map((activity: RecentActivityItem, index: number) => { 
                  const IconComponent = activity.icon || Activity;

                  return (
                    <div key={index} className="flex items-start">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                        activity.type === 'appointment' ? 'bg-emerald-100' : 
                        activity.type === 'treatment' ? 'bg-blue-100' : 'bg-purple-100'
                      }`}>
                        <IconComponent className={`h-5 w-5 ${
                          activity.type === 'appointment' ? 'text-emerald-600' : 
                          activity.type === 'treatment' ? 'text-blue-600' : 'text-purple-600'
                        }`} />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(activity.time, 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No recent activity
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Charts Section */}
      <div className="mt-6"> {/* Add some margin top */}
        {/* Pass processed data (including percentages) to the charts component */}
        <DashboardCharts
            revenueData={chartData.revenueData || []}
            appointmentTypeData={chartData.appointmentTypeData || []}
            dailyAppointmentData={chartData.dailyAppointmentData || []}
            treatmentStatusData={chartData.treatmentStatusData || []}
            profitEstimationData={chartData.profitEstimationData || { conversionRate: 0, estimatedSales: 0, estimatedProfit: 0 }}
            totalRevenue={chartData.totalRevenue}
            dailyVisitors={chartData.dailyVisitors}
            // Pass 0 for percentages as mocks are removed
            revenueChangePercentage={0} 
            dailyAppointmentsChangePercentage={0}
            overallTreatmentProgress={chartData.overallTreatmentProgress}
            // Pass new chart data props
            patientAgeData={chartData.patientAgeData || []}
            appointmentStatusData={chartData.appointmentStatusData || []}
            treatmentPlanStatusData={chartData.treatmentPlanStatusData || []}
        />
      </div>
      {/* End Dashboard Charts Section */}

    </div>
  );
}
