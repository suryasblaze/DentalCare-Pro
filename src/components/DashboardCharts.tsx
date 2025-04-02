import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { MoreHorizontal, TrendingUp, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';


export interface ChartDataPoint { // <-- EXPORT
  name: string; // Typically date or category
  value?: number; // For single value charts (Bar, Area)
  uv?: number; // Example data key 1 (Line)
  pv?: number; // Example data key 2 (Line)
}

export interface PieChartDataPoint { // <-- EXPORT
    name: string;
    value: number;
}

export interface DashboardChartsProps { // <-- EXPORT
  revenueData: ChartDataPoint[];
  appointmentTypeData: PieChartDataPoint[];
  dailyAppointmentData: ChartDataPoint[];
  treatmentStatusData: ChartDataPoint[];
  profitEstimationData: { // Specific structure for this chart
    conversionRate: number;
    estimatedSales: number;
    estimatedProfit: number;
  };
  // Add more props as needed for specific chart labels/titles if they become dynamic
  totalRevenue?: number; // Example: Pass calculated total revenue
  dailyVisitors?: number; // Example: Pass calculated daily visitors
  revenueChangePercentage?: number; // Percentage change for revenue/appointments
  dailyAppointmentsChangePercentage?: number; // Percentage change for daily appointments
  overallTreatmentProgress?: number; // Overall treatment progress percentage
  // New props for additional charts
  patientAgeData?: ChartDataPoint[];
  appointmentStatusData?: PieChartDataPoint[];
  treatmentPlanStatusData?: PieChartDataPoint[];
}


// Placeholder data - replace with real data later
// const revenueData = [
//   { name: 'SEP', uv: 4000, pv: 2400 },
//   { name: 'OCT', uv: 3000, pv: 1398 },
//   { name: 'NOV', uv: 2000, pv: 9800 },
//   { name: 'DEC', uv: 2780, pv: 3908 },
//   { name: 'JAN', uv: 1890, pv: 4800 },
//   { name: 'FEB', uv: 2390, pv: 3800 },
// ];

// const pieData = [
//   { name: 'Your Files', value: 63 },
//   { name: 'System', value: 25 },
//   { name: 'Empty', value: 12 }, // To represent the empty slice
// ];
// const PIE_COLORS = ['#4F46E5', '#60A5FA', '#E5E7EB']; // Indigo, Blue, Gray for empty

// const trafficData = [
//     { name: '00', value: 400 },
//     { name: '04', value: 300 },
//     { name: '08', value: 600 },
//     { name: '12', value: 800 },
//     { name: '14', value: 700 },
//     { name: '16', value: 900 },
//     { name: '18', value: 200 },
// ];

// const projectStatusData = [
//   { name: 'Sat', value: 20 },
//   { name: 'Sun', value: 40 },
//   { name: 'Mon', value: 35 },
//   { name: 'Tue', value: 60 },
//   { name: 'Wed', value: 50 },
//   { name: 'Thr', value: 80 },
//   { name: 'Fri', value: 70 },
// ];

// Define colors (can be customized)
const APPOINTMENT_TYPE_COLORS = ['#4F46E5', '#60A5FA', '#34D399', '#FBBF24', '#F87171']; // Indigo, Blue, Emerald, Amber, Red

const DashboardCharts: React.FC<DashboardChartsProps> = ({
  revenueData = [], // Default to empty array
  appointmentTypeData = [],
  dailyAppointmentData = [],
  treatmentStatusData = [],
  profitEstimationData = { conversionRate: 0, estimatedSales: 0, estimatedProfit: 0 }, // Default values
  totalRevenue = 0, // Default value
  dailyVisitors = 0, // Default value
  revenueChangePercentage = 0, // Default value
  dailyAppointmentsChangePercentage = 0, // Default value
  overallTreatmentProgress = 0, // Default value
  // Default values for new props
  patientAgeData = [],
  appointmentStatusData = [],
  treatmentPlanStatusData = []
}) => {
  // Calculate totals for pie chart percentage calculations
  const totalAppointmentTypes = appointmentTypeData.reduce((sum, entry) => sum + entry.value, 0);
  const totalAppointmentStatuses = appointmentStatusData.reduce((sum, entry) => sum + entry.value, 0);
  const totalTreatmentPlanStatuses = treatmentPlanStatusData.reduce((sum, entry) => sum + entry.value, 0);

  // Define colors for new pie charts
  const APPOINTMENT_STATUS_COLORS = ['#FBBF24', '#34D399', '#F87171', '#9CA3AF']; // Amber, Emerald, Red, Gray
  const TREATMENT_PLAN_STATUS_COLORS = ['#60A5FA', '#34D399', '#FBBF24', '#F87171']; // Blue, Emerald, Amber, Red


  return (
    // Adjust grid columns to accommodate more charts (e.g., xl:grid-cols-3)
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"> 
      {/* Revenue Chart - Now spans 2 columns in the 3-col layout */}
      <Card className="col-span-1 md:col-span-2 xl:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            {/* Make title dynamic if needed, e.g., using totalRevenue prop */}
            <CardTitle className="text-3xl font-bold">${totalRevenue ? totalRevenue.toLocaleString() : '0'}</CardTitle>
            <p className="text-xs text-muted-foreground">Overall Revenue / Appointments</p>
          </div>
           <div className="flex items-center space-x-2">
              {/* Display calculated percentage change */}
              <span className={`text-xs flex items-center ${revenueChangePercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                 <TrendingUp className="h-3 w-3 mr-1" /> {revenueChangePercentage >= 0 ? '+' : ''}{revenueChangePercentage.toFixed(2)}%
              </span>
             <Select defaultValue="monthly">
               <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                {/* Add more options like weekly if needed */}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pl-2 pr-6">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} style={{ fontSize: '12px' }} />
              <YAxis hide={true} />
              <Tooltip
                contentStyle={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }}
                formatter={(value: number, name: string) => [`${value} ${name === 'uv' ? 'Appointments' : 'Revenue'}`, null]} // Customize tooltip label
              />
              {/* Assuming 'uv' represents appointment count */}
              <Line type="monotone" dataKey="uv" name="Appointments" stroke="#60A5FA" strokeWidth={2} dot={{ r: 4, fill: '#60A5FA', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              {/* Assuming 'pv' represents revenue or remove if not applicable */}
              <Line type="monotone" dataKey="pv" name="Revenue" stroke="#4F46E5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie Chart - Appointment Types */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Appointment Types</CardTitle>
           <Select defaultValue="monthly">
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={appointmentTypeData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={1} // Add slight padding
                dataKey="value"
                startAngle={90}
                endAngle={450} // 360 + 90
              >
                {appointmentTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={APPOINTMENT_TYPE_COLORS[index % APPOINTMENT_TYPE_COLORS.length]} stroke={APPOINTMENT_TYPE_COLORS[index % APPOINTMENT_TYPE_COLORS.length]}/>
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [`${value} (${((value / totalAppointmentTypes) * 100).toFixed(1)}%)`, name]} />
            </PieChart>
          </ResponsiveContainer>
           <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 w-full mt-4 text-xs">
             {appointmentTypeData.map((entry, index) => (
                <div key={`legend-${index}`} className="flex items-center">
                    <span
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: APPOINTMENT_TYPE_COLORS[index % APPOINTMENT_TYPE_COLORS.length] }}
                    ></span>
                    {entry.name} {((entry.value / totalAppointmentTypes) * 100).toFixed(1)}%
                </div>
             ))}
           </div>
        </CardContent>
      </Card>

      {/* Daily Traffic Chart - Daily Appointments */}
      <Card>
            <CardHeader className="pb-2">
               <div className="flex flex-row items-center justify-between space-y-0">
                 <p className="text-xs text-muted-foreground">Daily Appointments</p>
                  {/* Display calculated percentage change */}
                 <span className={`text-xs flex items-center ${dailyAppointmentsChangePercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    <TrendingUp className="h-3 w-3 mr-1" /> {dailyAppointmentsChangePercentage >= 0 ? '+' : ''}{dailyAppointmentsChangePercentage.toFixed(2)}%
                 </span>
               </div>
               {/* Make title dynamic if needed, e.g., using dailyVisitors prop */}
          <CardTitle className="text-3xl font-bold">{dailyVisitors ? dailyVisitors.toLocaleString() : '0'} <span className="text-lg font-normal text-muted-foreground">Appointments Today</span></CardTitle>
        </CardHeader>
        <CardContent className="pb-4 pl-2 pr-4">
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={dailyAppointmentData} barGap={8}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} style={{ fontSize: '12px' }} />
              <YAxis hide={true} />
              <Tooltip cursor={{fill: 'rgba(79, 70, 229, 0.1)'}} contentStyle={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }} />
              <Bar dataKey="value" name="Appointments" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Project Status Chart - Treatment Plan Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Treatment Plan Status</CardTitle>
          <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {/* TODO: Make this section dynamic based on selected/overall plan */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                    {/* Use a relevant icon */}
                    <Activity className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                    <p className="text-sm font-medium">Overall Progress</p>
                    <p className="text-xs text-muted-foreground">Across Active Plans</p>
                 </div>
             </div>
             {/* Display overall percentage */}
             <div className="text-lg font-semibold">{overallTreatmentProgress.toFixed(0)}%</div>
           </div>
           <ResponsiveContainer width="100%" height={100}>
            {/* Using Area chart for status trend over time (e.g., completion rate) */}
            <AreaChart data={treatmentStatusData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
               <defs>
                 <linearGradient id="colorStatus" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                   <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                 </linearGradient>
               </defs>
              <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} style={{ fontSize: '12px' }} />
              <YAxis hide={true} domain={[0, 100]}/> {/* Assuming 'value' is percentage */}
              <Tooltip formatter={(value: number) => [`${value}% Complete`, null]} />
              <Area type="monotone" dataKey="value" name="Completion Rate" stroke="#4F46E5" fillOpacity={1} fill="url(#colorStatus)" strokeWidth={2} dot={{ r: 4, fill: '#4F46E5', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

       {/* Profit Estimation Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium">Profit Estimation</CardTitle>
           <p className="text-xs text-muted-foreground">Based on completed treatments</p>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
           <ResponsiveContainer width="100%" height={120}>
             <PieChart>
               <Pie
                 data={[{ name: 'Conversion', value: profitEstimationData.conversionRate }, { name: 'Remaining', value: 100 - profitEstimationData.conversionRate }]}
                 cx="50%"
                 cy="50%"
                 innerRadius={45}
                 outerRadius={60}
                 startAngle={90}
                 endAngle={90 + (360 * (profitEstimationData.conversionRate / 100))} // Calculate end angle based on rate
                 dataKey="value"
                 stroke="none"
               >
                  <Cell fill="#4F46E5" />
                  <Cell fill="#E5E7EB" />
               </Pie>
                {/* Overlay text */}
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#6B7280">Conversion</text>
                <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" fontSize="18" fontWeight="bold" fill="#111827">{profitEstimationData.conversionRate.toFixed(0)}%</text>
             </PieChart>
           </ResponsiveContainer>
           <div className="flex justify-around w-full mt-4 text-xs border-t pt-4">
             <div className="text-center">
               <p className="text-muted-foreground">Est. Sales</p>
               <p className="font-semibold">{profitEstimationData.estimatedSales.toLocaleString()}</p>
             </div>
             <div className="text-center">
               <p className="text-muted-foreground">Est. Profit</p>
               <p className="font-semibold">${profitEstimationData.estimatedProfit.toLocaleString()}</p>
             </div>
           </div>
        </CardContent>
      </Card>

      {/* Patient Age Distribution Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Patient Age Distribution</CardTitle>
        </CardHeader>
        <CardContent className="pb-4 pl-2 pr-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={patientAgeData} layout="vertical" barCategoryGap="20%">
              <XAxis type="number" hide={true} />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                style={{ fontSize: '12px' }} 
                width={60} // Adjust width for labels
              />
              <Tooltip cursor={{fill: 'rgba(79, 70, 229, 0.1)'}} contentStyle={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }} />
              <Bar dataKey="value" name="Patients" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Appointment Status Distribution Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Appointment Status</CardTitle>
           {/* Optional: Add filter dropdown (e.g., Today, This Week) */}
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={appointmentStatusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={1}
                dataKey="value"
                startAngle={90}
                endAngle={450}
              >
                {appointmentStatusData.map((entry, index) => (
                  <Cell key={`cell-apt-status-${index}`} fill={APPOINTMENT_STATUS_COLORS[index % APPOINTMENT_STATUS_COLORS.length]} stroke={APPOINTMENT_STATUS_COLORS[index % APPOINTMENT_STATUS_COLORS.length]}/>
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [`${value} (${totalAppointmentStatuses > 0 ? ((value / totalAppointmentStatuses) * 100).toFixed(1) : 0}%)`, name]} />
            </PieChart>
          </ResponsiveContainer>
           <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 w-full mt-4 text-xs">
             {appointmentStatusData.map((entry, index) => (
                <div key={`legend-apt-status-${index}`} className="flex items-center">
                    <span
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: APPOINTMENT_STATUS_COLORS[index % APPOINTMENT_STATUS_COLORS.length] }}
                    ></span>
                    {entry.name} ({totalAppointmentStatuses > 0 ? ((entry.value / totalAppointmentStatuses) * 100).toFixed(1) : 0}%)
                </div>
             ))}
           </div>
        </CardContent>
      </Card>
      
      {/* Treatment Plan Status Distribution Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Treatment Plan Status</CardTitle>
           {/* Optional: Add filter dropdown */}
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={treatmentPlanStatusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={1}
                dataKey="value"
                startAngle={90}
                endAngle={450}
              >
                {treatmentPlanStatusData.map((entry, index) => (
                  <Cell key={`cell-tp-status-${index}`} fill={TREATMENT_PLAN_STATUS_COLORS[index % TREATMENT_PLAN_STATUS_COLORS.length]} stroke={TREATMENT_PLAN_STATUS_COLORS[index % TREATMENT_PLAN_STATUS_COLORS.length]}/>
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [`${value} (${totalTreatmentPlanStatuses > 0 ? ((value / totalTreatmentPlanStatuses) * 100).toFixed(1) : 0}%)`, name]} />
            </PieChart>
          </ResponsiveContainer>
           <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 w-full mt-4 text-xs">
             {treatmentPlanStatusData.map((entry, index) => (
                <div key={`legend-tp-status-${index}`} className="flex items-center">
                    <span
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: TREATMENT_PLAN_STATUS_COLORS[index % TREATMENT_PLAN_STATUS_COLORS.length] }}
                    ></span>
                    {entry.name} ({totalTreatmentPlanStatuses > 0 ? ((entry.value / totalTreatmentPlanStatuses) * 100).toFixed(1) : 0}%)
                </div>
             ))}
           </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default DashboardCharts;
