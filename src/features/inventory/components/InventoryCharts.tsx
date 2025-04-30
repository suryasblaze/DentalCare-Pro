import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts'; // Added LineChart
import { InventoryItem, InventoryItemCategory, StockStatus } from '../types';
import { InventoryLogEntry } from '../services/inventoryService'; // Import the log entry type
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select component

interface InventoryChartsProps {
  inventoryData: InventoryItem[];
  logData: InventoryLogEntry[]; // Add the log data prop
}

// Define colors (can be customized or sourced from a theme)
const CATEGORY_COLORS = ['#4F46E5', '#60A5FA', '#34D399']; // Indigo, Blue, Emerald
const STATUS_COLORS = {
    'In Stock': '#22C55E', // Green
    'Low Stock': '#FBBF24', // Amber
    'Expired': '#F87171', // Red
};

const InventoryCharts: React.FC<InventoryChartsProps> = ({ inventoryData = [], logData = [] }) => {
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(inventoryData[0]?.id); // State for selected item

  // Memoize processed data to avoid recalculation on every render
  const categoryData = useMemo(() => {
    const counts: Record<InventoryItemCategory, number> = {
      'Medicines': 0,
      'Tools': 0,
      'Consumables': 0,
    };
    inventoryData.forEach(item => {
      // Assert item.category as InventoryItemCategory before indexing
      const category = item.category as InventoryItemCategory;
      if (counts[category] !== undefined) {
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

    // Function to process log data for line chart
    const processLogData = (itemId: string | undefined) => {
        if (!itemId) return []; // Return empty array if no item is selected

        // Filter log data for the specific item
        const itemLogs = logData.filter(log => log.inventory_item_id === itemId);

        // Group log entries by date
        const groupedLogs = itemLogs.reduce((acc: Record<string, any[]>, log) => {
            const date = new Date(log.created_at).toLocaleDateString(); // Format date
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(log);
            return acc;
        }, {});

        // Calculate cumulative quantity for each date
        let cumulativeQuantity = 0;
        const chartData = Object.entries(groupedLogs).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()).map(([date, logs]) => { // Sort by date
            const dailyChange = logs.reduce((sum, log: any) => sum + log.quantity_change, 0);
            cumulativeQuantity += dailyChange;
            return {
                name: date,
                value: cumulativeQuantity,
            };
        });

        return chartData;
    };

    // Legend for Category Chart
    const renderCategoryLegend = (props: any) => {
        const { payload } = props;
        return (
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 w-full mt-4 text-xs text-muted-foreground">
                {payload.map((entry: any, index: number) => {
                    // Use totalCategories for percentage calculation
                    const percentage = totalCategories > 0 ? ((entry.payload.value / totalCategories) * 100).toFixed(1) : 0;
                    return (
                        <div key={`legend-cat-${index}`} className="flex items-center">
                            <span
                                className="w-2 h-2 rounded-full mr-1.5"
                                style={{ backgroundColor: entry.color }}
                            ></span>
                            {/* Display Name (entry.payload.name) and Percentage */}
                            {entry.payload.name} ({percentage}%)
                        </div>
                    );
                })}
            </div>
        );
    };

    // Legend for Status Chart
    const renderStatusLegend = (props: any) => {
        const { payload } = props;
        return (
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 w-full mt-4 text-xs text-muted-foreground">
                {payload.map((entry: any, index: number) => {
                     // Use totalStatuses for percentage calculation
                    const percentage = totalStatuses > 0 ? ((entry.payload.value / totalStatuses) * 100).toFixed(1) : 0;
                    return (
                        <div key={`legend-stat-${index}`} className="flex items-center">
                            <span
                                className="w-2 h-2 rounded-full mr-1.5"
                                style={{ backgroundColor: entry.color }}
                            ></span>
                             {/* Display Name (entry.payload.name) and Percentage */}
                            {entry.payload.name} ({percentage}%)
                        </div>
                    );
                })}
            </div>
        );
    };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"> {/* Adjust grid as needed */}
      {/* Item Count by Category */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Items by Category</CardTitle>
          {/* Optional: Add filters or actions */}
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={50} // Add innerRadius for donut chart
                outerRadius={75} // Adjust outer radius slightly
                paddingAngle={2} // Slightly increase padding angle
                dataKey="value"
                startAngle={90}
                endAngle={450}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-cat-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} stroke={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}/>
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [`${value} (${totalCategories > 0 ? ((value / totalCategories) * 100).toFixed(1) : 0}%)`, name]} />
               {/* Use the specific legend renderer for categories */}
               <Legend content={renderCategoryLegend} />
            </PieChart>
          </ResponsiveContainer>
          {/* Manual Legend - Replaced by Recharts Legend with custom content */}
        </CardContent>
      </Card>

      {/* Item Count by Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Items by Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={50} // Add innerRadius for donut chart
                outerRadius={75} // Adjust outer radius slightly
                paddingAngle={2} // Slightly increase padding angle
                dataKey="value"
                startAngle={90}
                endAngle={450}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-stat-${index}`} fill={STATUS_COLORS[entry.name]} stroke={STATUS_COLORS[entry.name]}/>
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [`${value} (${totalStatuses > 0 ? ((value / totalStatuses) * 100).toFixed(1) : 0}%)`, name]} />
               {/* Use the specific legend renderer for statuses */}
               <Legend content={renderStatusLegend} />
            </PieChart>
          </ResponsiveContainer>
           {/* Manual Legend - Replaced by Recharts Legend with custom content */}
        </CardContent>
      </Card>

      {/* Item Quantity Bar Chart */}
      <Card className="md:col-span-2 lg:col-span-3"> {/* Span across more columns */}
        <CardHeader>
          <CardTitle className="text-sm font-medium">Item Quantities</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={inventoryData} // Use the raw filtered data
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="item_name" angle={-45} textAnchor="end" height={70} interval={0} tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="quantity" fill="#8884d8" name="Quantity" />
              <Bar dataKey="low_stock_threshold" fill="#FBBF24" name="Low Stock Threshold" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Inventory Trend Line Chart */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Inventory Trend</CardTitle>
           <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Select Item" />
              </SelectTrigger>
              <SelectContent>
                {inventoryData.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.item_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={processLogData(selectedItemId)} // Use selected item's data
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#82ca9d" name="Quantity" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryCharts;
