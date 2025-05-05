import React, { useMemo, useState, useEffect } from 'react'; // Import useEffect
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Import AreaChart, Area, CartesianGrid
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, AreaChart, Area, CartesianGrid } from 'recharts';
import { InventoryItem, InventoryItemCategory, StockStatus } from '../types';
import { InventoryLogEntry } from '../services/inventoryService'; // Import the log entry type
// Select component removed
import { cn } from '@/lib/utils'; // Import cn for conditional classes
// Combobox import removed


interface InventoryChartsProps {
  inventoryData: InventoryItem[];
  logData: InventoryLogEntry[]; // Add the log data prop
}

// Define colors (can be customized or sourced from a theme)
// Use colors consistent with DashboardCharts
const CATEGORY_COLORS = ['#4F46E5', '#60A5FA', '#34D399', '#FBBF24', '#F87171']; // Indigo, Blue, Emerald, Amber, Red (more options if needed)
const STATUS_COLORS: Record<StockStatus, string> = { // Explicitly type the keys
    'In Stock': '#22C55E', // Green
    'Low Stock': '#FBBF24', // Amber
    'Expired': '#F87171', // Red
};
const BAR_CHART_COLORS = ['#4F46E5', '#A5B4FC']; // Indigo for quantity, Lighter Indigo for threshold

const InventoryCharts: React.FC<InventoryChartsProps> = ({ inventoryData = [], logData = [] }) => {

  // selectedItemId state and effect removed

  // Memoize processed data to avoid recalculation on every render
  const categoryData = useMemo(() => {
    const counts: Record<InventoryItemCategory, number> = {
      'Medicines': 0,
      'Tools': 0,
      'Consumables': 0,
    };
    inventoryData.forEach(item => {
      // Cast to any to bypass TS error, assuming 'category' exists
      const category = (item as any).category as InventoryItemCategory;
      if (category && counts[category] !== undefined) {
        counts[category]++;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [inventoryData]);

  const statusData = useMemo(() => {
    const counts: Record<StockStatus, number> = {
      'In Stock': 0,
      'Low Stock': 0,
      'Expired': 0,
    };
    inventoryData.forEach(item => {
       // Use the pre-calculated stock_status from the InventoryItem type
       if (counts[item.stock_status] !== undefined) {
           counts[item.stock_status]++;
       }
    });
     return Object.entries(counts)
        .map(([name, value]) => ({ name: name as StockStatus, value }))
        .filter(entry => entry.value > 0); // Only show statuses with items
  }, [inventoryData]);

  const totalItems = inventoryData.length;
  const totalCategories = categoryData.reduce((sum, entry) => sum + entry.value, 0);
  const totalStatuses = statusData.reduce((sum, entry) => sum + entry.value, 0);

    // Function to process ALL log data for the overall inventory trend
    const processOverallTrendData = (): { timestamp: number; name: string; value: number }[] => {
        // Calculate current total quantity from inventoryData
        const currentTotalQuantity = inventoryData.reduce((sum, item: any) => sum + (item.quantity || 0), 0);

        // Sort all logs chronologically
        const allLogsSorted = [...logData].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        // Use a Map to store points keyed by timestamp to ensure uniqueness and chronological order
        const points = new Map<number, { timestamp: number; name: string; value: number }>();

        if (allLogsSorted.length === 0) {
            // No logs at all: Show only current total state
            const now = Date.now();
            points.set(now, { timestamp: now, name: new Date(now).toLocaleDateString(), value: currentTotalQuantity });
        } else {
            // Logs exist: Calculate initial total state and process logs
            const overallTotalChange = allLogsSorted.reduce((sum, log) => sum + log.quantity_change, 0);
            const initialTotalQuantity = currentTotalQuantity - overallTotalChange;
            const firstLogTimestamp = new Date(allLogsSorted[0].created_at).getTime();

            // Add initial point (total state *before* first log)
            const initialTimestamp = firstLogTimestamp - 1;
            points.set(initialTimestamp, {
                timestamp: initialTimestamp,
                name: new Date(initialTimestamp).toLocaleDateString(),
                value: initialTotalQuantity
            });

            // Add points for each log entry (total state *after* the change)
            let cumulativeTotalQuantity = initialTotalQuantity;
            allLogsSorted.forEach(log => {
                cumulativeTotalQuantity += log.quantity_change;
                const logTimestamp = new Date(log.created_at).getTime();
                points.set(logTimestamp, { // Map automatically handles overwrites for the same timestamp
                    timestamp: logTimestamp,
                    name: new Date(logTimestamp).toLocaleDateString(),
                    value: cumulativeTotalQuantity
                });
            });

            // Ensure the current total state is represented
            const lastPointTimestamp = Array.from(points.keys()).pop() ?? initialTimestamp;
            const nowTimestamp = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;
            const lastPointValue = points.get(lastPointTimestamp)?.value;

            if (lastPointValue !== currentTotalQuantity || (nowTimestamp - lastPointTimestamp > oneDay)) {
                 points.set(nowTimestamp, { timestamp: nowTimestamp, name: new Date(nowTimestamp).toLocaleDateString(), value: currentTotalQuantity });
            }
        }

        // Convert map values to an array. Map preserves insertion order (chronological).
        const chartData = Array.from(points.values());
        return chartData;
    };

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

    // comboboxOptions removed


  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"> {/* Adjust grid as needed */}
      {/* Item Count by Category */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Items by Category</CardTitle>
          {/* Optional: Add filters or actions */}
        </CardHeader>
        <CardContent className="flex flex-col items-center pt-4"> {/* Added pt-4 */}
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80} // Match Dashboard Pie
                paddingAngle={1} // Match Dashboard Pie
                dataKey="value"
                startAngle={90}
                endAngle={450} // 360 + 90
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-cat-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} stroke={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}/>
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} (${totalCategories > 0 ? ((value / totalCategories) * 100).toFixed(1) : 0}%)`, name]}
                contentStyle={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }} // Match Dashboard Tooltip
              />
              <Legend content={(props) => renderCustomLegend(props, totalCategories)} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Item Count by Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Items by Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center pt-4"> {/* Added pt-4 */}
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80} // Match Dashboard Pie
                paddingAngle={1} // Match Dashboard Pie
                dataKey="value"
                startAngle={90}
                endAngle={450} // 360 + 90
              >
                {statusData.map((entry, index) => (
                  // Use STATUS_COLORS[entry.name as StockStatus] for type safety if needed, but entry.name should be correct here
                  <Cell key={`cell-stat-${index}`} fill={STATUS_COLORS[entry.name]} stroke={STATUS_COLORS[entry.name]}/>
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value} (${totalStatuses > 0 ? ((value / totalStatuses) * 100).toFixed(1) : 0}%)`, name]}
                contentStyle={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }} // Match Dashboard Tooltip
              />
              <Legend content={(props) => renderCustomLegend(props, totalStatuses)} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Item Quantity Bar Chart - Styled like Dashboard */}
      <Card className="md:col-span-2 lg:col-span-3"> {/* Span across more columns */}
        <CardHeader className="pb-2"> {/* Reduced padding */}
          <CardTitle className="text-sm font-medium">Item Quantities</CardTitle>
           <p className="text-xs text-muted-foreground">Current stock vs. low stock threshold</p> {/* Added description */}
        </CardHeader>
        <CardContent className="pb-4 pl-2 pr-4"> {/* Adjusted padding */}
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={inventoryData}
              margin={{ top: 5, right: 5, left: -10, bottom: 5 }} // Adjusted margins
              barGap={4} // Add gap between bars of the same category
              barCategoryGap="20%" // Add gap between categories
            >
              {/* Removed CartesianGrid */}
              <XAxis
                dataKey="item_name"
                axisLine={false}
                tickLine={false}
                dy={10} // Offset like dashboard
                style={{ fontSize: '10px' }} // Smaller font for potentially many items
                interval={0} // Show all labels
                angle={-45} // Keep angle if needed for long names
                textAnchor="end"
                height={60} // Adjust height for angled labels
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={30} // Match dashboard
                style={{ fontSize: '12px' }}
                allowDecimals={false} // Whole numbers for quantity
              />
              <Tooltip
                cursor={{fill: 'rgba(79, 70, 229, 0.1)'}} // Indigo tint on hover
                contentStyle={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }}
                formatter={(value: number, name: string) => [`${value}`, name === 'quantity' ? 'Quantity' : 'Low Stock Threshold']} // Simple value display
              />
              {/* Removed Legend - Tooltip provides info */}
              <Bar dataKey="quantity" fill={BAR_CHART_COLORS[0]} name="Quantity" radius={[4, 4, 0, 0]} barSize={10} />
              <Bar dataKey="low_stock_threshold" fill={BAR_CHART_COLORS[1]} name="Low Stock Threshold" radius={[4, 4, 0, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Overall Inventory Trend Chart */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between pb-2"> {/* Reduced padding */}
          <div>
            <CardTitle className="text-sm font-medium">Overall Inventory Trend</CardTitle>
            <p className="text-xs text-muted-foreground">Total quantity changes over time</p> {/* Updated description */}
          </div>
           {/* Item selector removed */}
        </CardHeader>
        <CardContent className="pb-4 pl-2 pr-4"> {/* Adjusted padding */}
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={processOverallTrendData()} // Use the new function
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }} // Adjusted margins
              // allowDataOverflow={true} // Invalid prop removed
            >
              {/* Define gradient for area fill */}
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              {/* Add CartesianGrid */}
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
              {/* Use timestamp for dataKey and format ticks */}
              <XAxis
                dataKey="timestamp"
                type="number" // Treat dataKey as numeric timestamp
                domain={['dataMin', 'dataMax']} // Ensure axis covers all data
                axisLine={false}
                tickLine={false}
                // Format timestamp tick value into a readable date string
                tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                dy={10}
                style={{ fontSize: '12px' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={30}
                style={{ fontSize: '12px' }}
                allowDecimals={false}
                domain={[0, 'dataMax + 10']} // Start at 0, add buffer to max
              />
              <Tooltip
                contentStyle={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }}
                // Ensure tooltip shows correct date (name) and quantity (value)
                formatter={(value: number, name: string, props) => [`Total Quantity: ${value}`, props.payload.name]}
              />
              {/* Change Line to Area */}
              <Area
                type="monotone"
                dataKey="value"
                connectNulls={true} // Draw line across null/missing points
                stroke="#4F46E5" // Line color
                fillOpacity={1}
                fill="url(#colorValue)" // Use gradient fill
                strokeWidth={2}
                dot={{ r: 4, fill: '#4F46E5', stroke: '#fff', strokeWidth: 2 }} // Keep dots
                activeDot={{ r: 6 }} // Keep active dot
                name="Total Quantity" // Update name for tooltip
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryCharts;
