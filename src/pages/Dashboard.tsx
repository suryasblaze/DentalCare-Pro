import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, Activity, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { format, startOfDay, endOfDay, addDays, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';

export function Dashboard() {
  const [stats, setStats] = useState({
    totalAppointments: 0,
    totalPatients: 0,
    avgWaitTime: 0,
    treatmentSuccessRate: 0,
    appointmentsChange: 0,
    patientsChange: 0,
    waitTimeChange: 0,
    successRateChange: 0
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get today's date range
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);
      
      // Get tomorrow's date range
      const tomorrow = addDays(today, 1);
      const tomorrowStart = startOfDay(tomorrow);
      const tomorrowEnd = endOfDay(tomorrow);
      
      // Fetch all data needed for dashboard
      const [
        patients,
        todaysAppointments,
        tomorrowsAppointments,
        treatmentPlans,
        medicalRecords,
        allAppointments,
        clinicSettings
      ] = await Promise.all([
        api.patients.getAll(),
        api.appointments.getByDateRange(todayStart.toISOString(), todayEnd.toISOString()),
        api.appointments.getByDateRange(tomorrowStart.toISOString(), tomorrowEnd.toISOString()),
        api.patients.getTreatmentPlans(null), // Get all treatment plans
        api.patients.getMedicalRecords(null), // Get all medical records
        api.appointments.getAll(),
        api.settings.get()
      ]);
      
      // Calculate statistics
      const totalPatients = patients.length;
      const totalAppointments = todaysAppointments.length + tomorrowsAppointments.length;
      
      // Calculate treatment success rate
      let completedTreatments = 0;
      let totalTreatments = 0;
      
      treatmentPlans.forEach(plan => {
        if (plan.treatments && plan.treatments.length > 0) {
          totalTreatments += plan.treatments.length;
          completedTreatments += plan.treatments.filter(t => t.status === 'completed').length;
        }
      });
      
      const treatmentSuccessRate = totalTreatments > 0 
        ? Math.round((completedTreatments / totalTreatments) * 100) 
        : 0;
      
      // Calculate average wait time (mockup for now - could be calculated from appointments)
      // In a real system, this would be calculated from actual check-in/treatment start times
      const avgWaitTime = 15; // minutes
      
      // Calculate change percentages (these would normally be calculated by comparing current period to previous)
      // For this demo, we'll use fixed percentages for demonstration
      const appointmentsChange = 12;
      const patientsChange = 8;
      const waitTimeChange = -4; // negative means improved/reduced wait time
      const successRateChange = 2;
      
      setStats({
        totalAppointments,
        totalPatients,
        avgWaitTime,
        treatmentSuccessRate,
        appointmentsChange,
        patientsChange,
        waitTimeChange,
        successRateChange
      });
      
      // Format upcoming appointments (only today and tomorrow)
      const combinedAppointments = [...todaysAppointments, ...tomorrowsAppointments]
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 5) // Limit to 5 appointments
        .map(apt => ({
          id: apt.id,
          patient: apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : 'Unknown Patient',
          time: format(new Date(apt.start_time), 'h:mm a'),
          date: format(new Date(apt.start_time), 'MMM d'),
          type: apt.type,
          status: apt.status
        }));
      
      setUpcomingAppointments(combinedAppointments);
      
      // Get recent activity (completed appointments and treatments)
      const recentCompletedAppointments = allAppointments
        .filter(apt => apt.status === 'completed')
        .map(apt => ({
          type: 'appointment',
          title: `Completed ${apt.type} for ${apt.patients ? `${apt.patients.first_name} ${apt.patients.last_name}` : 'Unknown Patient'}`,
          time: new Date(apt.end_time || apt.updated_at),
          icon: Activity
        }));
      
      const recentCompletedTreatments = treatmentPlans
        .flatMap(plan => plan.treatments || [])
        .filter(treatment => treatment && treatment.status === 'completed')
        .map(treatment => ({
          type: 'treatment',
          title: `Completed ${treatment.type} treatment`,
          time: new Date(treatment.updated_at || treatment.created_at),
          icon: Calendar
        }));
      
      const recentRecords = medicalRecords
        .map(record => ({
          type: 'record',
          title: `Added ${record.record_type} record`,
          time: new Date(record.created_at),
          icon: Clock
        }));
      
      const allActivity = [...recentCompletedAppointments, ...recentCompletedTreatments, ...recentRecords]
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .slice(0, 5);
      
      setRecentActivity(allActivity);
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
            <div className="text-2xl font-bold">{stats.totalAppointments}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUp className="mr-1 h-4 w-4 text-emerald-500" />
              <span className="text-emerald-500">
                {stats.appointmentsChange}%
              </span>
              <span className="ml-1">from last week</span>
            </div>
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
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUp className="mr-1 h-4 w-4 text-emerald-500" />
              <span className="text-emerald-500">
                {stats.patientsChange}%
              </span>
              <span className="ml-1">from last month</span>
            </div>
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
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowDown className="mr-1 h-4 w-4 text-emerald-500" />
              <span className="text-emerald-500">
                {Math.abs(stats.waitTimeChange)}%
              </span>
              <span className="ml-1">improved</span>
            </div>
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
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUp className="mr-1 h-4 w-4 text-emerald-500" />
              <span className="text-emerald-500">
                {stats.successRateChange}%
              </span>
              <span className="ml-1">from last quarter</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Appointments</CardTitle>
              <Button variant="ghost" size="sm" className="text-sm">
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
                {upcomingAppointments.map((appointment: any) => (
                  <div
                    key={appointment.id}
                    className="flex items-center rounded-lg border p-4"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium">{appointment.patient}</p>
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
              <Button variant="ghost" size="sm" className="text-sm">
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
                {recentActivity.map((activity: any, index) => {
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
    </div>
  );
}