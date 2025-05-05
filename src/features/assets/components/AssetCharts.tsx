import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, LineChart, Line } from 'recharts';
import { AssetRow, AssetCategory, AssetStatus } from '../types';
import { differenceInDays, parseISO } from 'date-fns'; // For maintenance calculation

interface AssetChartsProps {
  assetData: AssetRow[];
}

// Define colors consistent with other charts
const CATEGORY_COLORS = ['#4F46E5', '#60A5FA', '#34D399', '#FBBF24', '#F87171']; // Indigo, Blue, Emerald, Amber, Red
const STATUS_COLORS: Record<AssetStatus, string> = {
    'Active': '#22C55E', // Green
    'Under Maintenance': '#FBBF24', // Amber
    'Retired': '#9CA3AF', // Gray
    'Disposed': '#F87171', // Red
};
const VALUE_BAR_COLOR = '#8B5CF6'; // Purple
const MAINTENANCE_BAR_COLOR = '#F59E0B'; // Amber

const AssetCharts: React.FC<AssetChartsProps> = ({ assetData = [] }) => {

  // Memoize processed data
  const categoryData = useMemo(() => {
    const counts: Record<AssetCategory, number> = {
      'Equipment & Tools': 0,
      'Furniture': 0,
      'IT': 0,
      'Other': 0,
    };
    assetData.forEach(item => {
      const category = item.category as AssetCategory;
      if (category && counts[category] !== undefined) {
        counts[category]++;
      }
    });
    return Object.entries(counts)
        .map(([name, value]) => ({ name: name as AssetCategory, value }))
        .filter(entry => entry.value > 0); // Only show categories with assets
  }, [assetData]);

  const statusData = useMemo(() => {
    const counts: Record<AssetStatus, number> = {
      'Active': 0,
      'Under Maintenance': 0,
      'Retired': 0,
      'Disposed': 0,
    };
    assetData.forEach(item => {
       const status = item.status as AssetStatus;
       if (status && counts[status] !== undefined) {
           counts[status]++;
       }
    });
     return Object.entries(counts)
        .map(([name, value]) => ({ name: name as AssetStatus, value }))
        .filter(entry => entry.value > 0); // Only show statuses with assets
  }, [assetData]);

  const valueData = useMemo(() => {
      // Group assets by purchase price ranges for better visualization
      const priceRanges = {
          '0-500': 0,
          '501-2000': 0,
          '2001-10000': 0,
          '10001+': 0,
      };
      assetData.forEach(item => {
          const price = item.purchase_price ?? 0;
          if (price <= 500) priceRanges['0-500']++;
          else if (price <= 2000) priceRanges['501-2000']++;
          else if (price <= 10000) priceRanges['2001-10000']++;
          else priceRanges['10001+']++;
      });
      return Object.entries(priceRanges).map(([name, value]) => ({ name, value }));
  }, [assetData]);

  const maintenanceData = useMemo(() => {
      const today = new Date();
      const upcomingMaintenance = assetData
          .filter(item => item.next_maintenance_due_date)
          .map(item => ({
              ...item,
              daysUntilDue: differenceInDays(parseISO(item.next_maintenance_due_date!), today)
          }))
          .filter(item => item.daysUntilDue >= 0 && item.daysUntilDue <= 90) // Show maintenance due in the next 90 days
          .sort((a, b) => a.daysUntilDue - b.daysUntilDue) // Sort by soonest due
          .slice(0, 10); // Limit to top 10 upcoming

      return upcomingMaintenance.map(item => ({
          name: item.asset_name, // Use asset name for X-axis
          value: item.daysUntilDue, // Days until due for Y-axis/tooltip
      }));
  }, [assetData]);


  const totalCategories = categoryData.reduce((sum, entry) => sum + entry.value, 0);
  const totalStatuses = statusData.reduce((sum, entry) => sum + entry.value, 0);

    // Generic Legend Renderer matching Dashboard style
    const renderCustomLegend = (props: any, totalValue: number) => {
        const { payload } = props;
        return (
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 w-full mt-4 text-xs">
                {payload.map((entry: any, index: number) => {
                    const percentage = totalValue > 0 ? ((entry.payload.value / totalValue) * 100).toFixed(1) : 0;
                    return (
                        <div key={`legend-${entry.payload.name}-${index}`} className="flex items-center">
                            <span
                                className="w-2 h-2 rounded-full mr-1.5"
                                style={{ backgroundColor: entry.color }}
                            ></span>
                            {entry.payload.name} ({percentage}%)
                        </div>
                    );
                })}
            </div>
        );
    };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2"> {/* Adjust grid layout */}
      {/* Assets by Category */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Assets by Category</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center pt-4">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={1}
                dataKey="value"
                startAngle={90}
                endAngle={450}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-asset-cat-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} stroke={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}/>
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} (${totalCategories > 0 ? ((value / totalCategories) * 100).toFixed(1) : 0}%)`, name]}
                contentStyle={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }}
              />
               <Legend content={(props) => renderCustomLegend(props, totalCategories)} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Assets by Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Assets by Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center pt-4">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={1}
                dataKey="value"
                startAngle={90}
                endAngle={450}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-asset-stat-${index}`} fill={STATUS_COLORS[entry.name]} stroke={STATUS_COLORS[entry.name]}/>
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} (${totalStatuses > 0 ? ((value / totalStatuses) * 100).toFixed(1) : 0}%)`, name]}
                contentStyle={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }}
              />
               <Legend content={(props) => renderCustomLegend(props, totalStatuses)} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Asset Value Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Asset Value Distribution</CardTitle>
           <p className="text-xs text-muted-foreground">Count of assets by purchase price range</p>
        </CardHeader>
        <CardContent className="pb-4 pl-2 pr-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={valueData}
              margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
              barCategoryGap="20%"
            >
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                dy={10}
                style={{ fontSize: '12px' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={30}
                style={{ fontSize: '12px' }}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{fill: 'rgba(139, 92, 246, 0.1)'}} // Purple tint
                contentStyle={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }}
                formatter={(value: number) => [`${value} Assets`, null]}
              />
              <Bar dataKey="value" fill={VALUE_BAR_COLOR} name="Assets" radius={[4, 4, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Upcoming Maintenance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Upcoming Maintenance (Next 90 Days)</CardTitle>
           <p className="text-xs text-muted-foreground">Assets needing maintenance soon (max 10 shown)</p>
        </CardHeader>
        <CardContent className="pb-4 pl-2 pr-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={maintenanceData}
              layout="vertical" // Vertical layout suits this better
              margin={{ top: 5, right: 20, left: 30, bottom: 5 }} // Adjust margins for labels
              barCategoryGap="20%"
            >
              <XAxis type="number" hide={true} />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                style={{ fontSize: '10px' }} // Smaller font for asset names
                width={100} // Wider margin for asset names
                interval={0}
              />
              <Tooltip
                cursor={{fill: 'rgba(245, 158, 11, 0.1)'}} // Amber tint
                contentStyle={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }}
                formatter={(value: number) => [`Due in ${value} days`, null]}
              />
              <Bar dataKey="value" fill={MAINTENANCE_BAR_COLOR} name="Days Until Due" radius={[0, 4, 4, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

    </div>
  );
};

export default AssetCharts;
