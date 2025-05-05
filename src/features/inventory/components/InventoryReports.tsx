import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from "@/components/ui/date-range-picker"; // Import the date range picker
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components
import { AlertCircle } from 'lucide-react'; // Import AlertCircle icon
import jsPDF from 'jspdf'; // Import jsPDF
import autoTable from 'jspdf-autotable'; // Import jsPDF-AutoTable
import * as XLSX from 'xlsx'; // Import xlsx
import { getInventoryItems, getInventoryLogEntries, InventoryLogEntry } from '../services/inventoryService';
import { InventoryItemRow, InventoryItemCategory, InventoryItem } from '../types';
import InventoryCharts from './InventoryCharts';
import { generateStockReport } from '../utils/report-generator';

// Define categories for filter
const inventoryCategories: InventoryItemCategory[] = ['Medicines', 'Tools', 'Consumables'];

const InventoryReports: React.FC = () => {
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [filteredInventoryData, setFilteredInventoryData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState<InventoryItemCategory | 'all'>('all');
  const [supplierFilter, setSupplierFilter] = useState(''); // Simple text filter for supplier for now
  // Correct initial state type for realTimeWidgets
  const [realTimeWidgets, setRealTimeWidgets] = useState<{
    inventoryLevelStatus: Record<string, number>;
    upcomingExpiryItems: InventoryItem[];
    // Removed assetHealthMonitor and dailyConsumption as they don't belong here
  }>({
    inventoryLevelStatus: {},
    upcomingExpiryItems: [],
  });

  const [inventoryLogData, setInventoryLogData] = useState<InventoryLogEntry[]>([]); // New state for log data

  // Fetch initial data (could be optimized to fetch only on demand)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getInventoryItems(); // Fetch all items initially
        const inventoryItems: InventoryItem[] = data.map(item => ({
          ...item,
          stock_status: item.quantity > item.low_stock_threshold ? 'In Stock' : 'Low Stock',
        }));
        setInventoryData(inventoryItems);
        setFilteredInventoryData(inventoryItems);

        // Fetch inventory log data initially (fetch all logs with a wide range)
        const startDate = new Date(0).toISOString(); // Start from Epoch (1970)
        const endDate = new Date().toISOString(); // End now
        const logData = await getInventoryLogEntries(startDate, endDate);
        setInventoryLogData(logData);

        // Fetch real-time widget data
        const realTimeData = await fetchRealTimeWidgets(inventoryItems);
        setRealTimeWidgets(realTimeData);
      } catch (err) {
         // Combine error handling
         const message = err instanceof Error ? err.message : 'Failed to load initial inventory or log data';
         setError(message);
         console.error("Error fetching initial data:", err); // Log the actual error
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Apply filters when dependencies change
  useEffect(() => {
    let filtered = [...inventoryData];

    // Filter by Date Range (using created_at for simplicity, adjust if needed)
    // Cast item to any to bypass TS errors
    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter((item: any) => {
        const createdAt = new Date(item.created_at);
        return createdAt >= dateRange.from! && createdAt <= dateRange.to!;
      });
    } else if (dateRange?.from) {
       filtered = filtered.filter((item: any) => new Date(item.created_at) >= dateRange.from!);
    } else if (dateRange?.to) {
       filtered = filtered.filter((item: any) => new Date(item.created_at) <= dateRange.to!);
    }


    // Filter by Category
    // Cast item to any to bypass TS errors
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((item: any) => item.category === categoryFilter);
    }

    // Filter by Supplier (simple contains check)
    // Cast item to any to bypass TS errors
    if (supplierFilter) {
      filtered = filtered.filter((item: any) =>
        item.supplier_info?.toLowerCase().includes(supplierFilter.toLowerCase())
      );
    }

    setFilteredInventoryData(filtered);
  }, [dateRange, categoryFilter, supplierFilter, inventoryData]);

  // Fetch inventory log data when date range changes
  useEffect(() => {
    const fetchLogData = async () => {
      if (dateRange?.from && dateRange?.to) {
        setLoading(true);
        setError(null);
        try {
          const startDate = dateRange.from.toISOString();
          const endDate = dateRange.to.toISOString();
          const logData = await getInventoryLogEntries(startDate, endDate);
          setInventoryLogData(logData);
        } catch (error) {
          setError(`Error fetching inventory log data: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          setLoading(false);
        }
      } else {
        setInventoryLogData([]); // Clear log data if no date range is selected
      }
    };

    fetchLogData();
  }, [dateRange]);

  // Fetch real-time widget data
  const fetchRealTimeWidgets = async (inventoryItems: InventoryItem[]) => {
    // Simulate fetching real-time data
    // Cast item to any to bypass TS errors
    const inventoryLevelStatus = inventoryItems.reduce((acc, item: any) => {
      if (item.stock_status === 'Low Stock') {
        acc[item.item_name] = item.quantity;
      }
      return acc;
    }, {} as Record<string, number>);

    // Cast item to any to bypass TS errors
    const upcomingExpiryItems = inventoryItems.filter((item: any) => {
      if (!item.expiry_date) return false;
      const expiry = new Date(item.expiry_date);
      const threshold = new Date();
      threshold.setDate(threshold.getDate() + 90);
      return expiry <= threshold;
    }).sort((a: any, b: any) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime());

    // Removed assetHealthMonitor and dailyConsumption logic

    return {
      inventoryLevelStatus,
      upcomingExpiryItems,
      // Removed assetHealthMonitor and dailyConsumption
    };
  };

// Helper function to format date or return 'N/A'
const formatDate = (dateString: string | null | undefined) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
};

// Updated exportToPDF function using jsPDF-AutoTable
const exportToPDF = (data: InventoryItem[], title: string = "Inventory Report") => {
    const pdf = new jsPDF();
    pdf.text(title, 14, 15);

    const tableColumn = ["ID", "Name", "Category", "Quantity", "Unit Price", "Supplier", "Expiry Date", "Status"];
    const tableRows: (string | number | null)[][] = [];

    // Cast item to any to bypass TS errors
    data.forEach((item: any) => {
        const itemData = [
            item.id,
            item.item_name,
            item.category,
            item.quantity,
            item.purchase_price ?? 'N/A',
            item.supplier_info ?? 'N/A',
            formatDate(item.expiry_date),
            item.stock_status, // Assuming stock_status is correctly added earlier
        ];
        tableRows.push(itemData);
    });

    autoTable(pdf, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
    });

    pdf.save(`${title.replace(/\s+/g, '_')}.pdf`);
};

// Updated exportToExcel function
const exportToExcel = (data: InventoryItem[], title: string = "Inventory Report") => {
    // Cast item to any to bypass TS errors
    const worksheetData = data.map((item: any) => ({
        "ID": item.id,
        "Name": item.item_name,
        "Category": item.category,
        "Quantity": item.quantity,
        "Unit Price": item.purchase_price ?? 'N/A',
        "Supplier": item.supplier_info ?? 'N/A',
        "Expiry Date": formatDate(item.expiry_date),
        "Status": item.stock_status, // Assuming stock_status is correctly added earlier
        "Low Stock Threshold": item.low_stock_threshold,
        "Created At": formatDate(item.created_at),
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
    XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_')}.xlsx`);
};


const handleGenerateStockReport = () => {
    console.log("Generating Stock Report with data:", filteredInventoryData);
    if (filteredInventoryData.length === 0) {
        setError("No data available to generate report.");
        return;
    }
    setError(null); // Clear previous errors
    try {
        exportToPDF(filteredInventoryData, "Stock Report");
        exportToExcel(filteredInventoryData, "Stock Report");
    } catch (error) {
        console.error("Error generating stock report:", error);
        setError(`Error generating stock report: ${error instanceof Error ? error.message : String(error)}`);
    }
};

  const handleGenerateExpiryReport = () => {
    const today = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(today.getDate() + 90);

    // Cast item to any to bypass TS errors
    const expiringSoon = filteredInventoryData.filter((item: any) => {
        if (!item.expiry_date) return false;
        const expiryDate = new Date(item.expiry_date);
        // Include items expiring within the next 90 days or already expired
        return expiryDate <= ninetyDaysFromNow;
    }).sort((a: any, b: any) => {
        // Sort by expiry date, handling nulls if necessary (though filter should prevent them)
        const dateA = a.expiry_date ? new Date(a.expiry_date).getTime() : 0;
        const dateB = b.expiry_date ? new Date(b.expiry_date).getTime() : 0;
        return dateA - dateB;
    });

    console.log("Generating Expiry Report with data:", expiringSoon);

    if (expiringSoon.length === 0) {
        setError("No items expiring soon to generate report.");
        return;
    }
    setError(null); // Clear previous errors

    try {
        exportToPDF(expiringSoon, "Expiry Report (Next 90 Days)");
        exportToExcel(expiringSoon, "Expiry Report (Next 90 Days)");
    } catch (error) {
        console.error("Error generating expiry report:", error);
        setError(`Error generating expiry report: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <Card>
        <CardHeader>
            <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 items-end"> {/* Use items-end for alignment */}
           {/* Date Range Picker */}
           <div className="flex-1">
             <label className="block text-sm font-medium text-muted-foreground mb-1">Date Range (Created At)</label>
             <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
           </div>
           {/* Category Filter */}
           <div className="flex-1">
             <label htmlFor="inv-category-filter" className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
             <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as InventoryItemCategory | 'all')}>
                <SelectTrigger id="inv-category-filter">
                    <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {inventoryCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
             </Select>
           </div>
           {/* Supplier Filter */}
           <div className="flex-1">
             <label htmlFor="inv-supplier-filter" className="block text-sm font-medium text-muted-foreground mb-1">Supplier</label>
             <Input
                id="inv-supplier-filter"
                placeholder="Filter by supplier..."
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
             />
           </div>
        </CardContent>
      </Card>

      {/* Actions Section */}
      <div className="flex gap-2">
        <Button onClick={handleGenerateStockReport} disabled={loading}>Generate Stock Report</Button>
        <Button onClick={handleGenerateExpiryReport} variant="outline" disabled={loading}>Generate Expiry Report</Button>
        {/* Add Export Buttons later */}
        {/* <Button variant="outline" disabled={loading}>Export PDF</Button> */}
        {/* <Button variant="outline" disabled={loading}>Export Excel</Button> */}
      </div>

      {/* Loading/Error State */}
      {loading && <p>Loading report data...</p>}
      {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      {/* Real-Time Widgets Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(realTimeWidgets.inventoryLevelStatus).length}</div>
            <ul className="text-xs text-muted-foreground list-disc pl-4">
              {Object.entries(realTimeWidgets.inventoryLevelStatus).slice(0, 5).map(([name, qty]) => (
                 <li key={name}>{name} ({qty})</li>
              ))}
              {Object.keys(realTimeWidgets.inventoryLevelStatus).length > 5 && <li>...and more</li>}
            </ul>
             {Object.keys(realTimeWidgets.inventoryLevelStatus).length === 0 && <p className="text-xs text-muted-foreground">No items currently low on stock.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Expiry (90 days)</CardTitle>
             <AlertCircle className="h-4 w-4 text-muted-foreground text-orange-500" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{realTimeWidgets.upcomingExpiryItems.length}</div>
             <ul className="text-xs text-muted-foreground list-disc pl-4">
               {/* Cast item to any to bypass TS errors */}
               {realTimeWidgets.upcomingExpiryItems.slice(0, 5).map((item: any) => (
                  <li key={item.id}>{item.item_name} ({formatDate(item.expiry_date)})</li>
               ))}
               {realTimeWidgets.upcomingExpiryItems.length > 5 && <li>...and more</li>}
             </ul>
              {realTimeWidgets.upcomingExpiryItems.length === 0 && <p className="text-xs text-muted-foreground">No items expiring soon.</p>}
          </CardContent>
        </Card>
         {/* Placeholder for Asset Health Monitor - Removed as out of scope for inventory */}
         {/* Placeholder for Daily Consumption - Removed as requires different data source */}
      </div>

      {/* Report Data Display / Charts */}
      <Card>
         <CardHeader>
            <CardTitle>Report Data Preview & Charts</CardTitle>
         </CardHeader>
         <CardContent>
            <p className="text-muted-foreground mb-4">Filtered Items: {filteredInventoryData.length}</p>
            {/* Render charts */}
            <InventoryCharts inventoryData={filteredInventoryData} logData={inventoryLogData} />
         </CardContent>
      </Card>
    </div>
  );
};

export default InventoryReports;
