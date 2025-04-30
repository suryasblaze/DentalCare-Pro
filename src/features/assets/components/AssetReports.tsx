import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getAssets } from '../services/assetService'; // Use asset service
import { AssetRow, AssetCategory, AssetStatus } from '../types'; // Use asset types
// Placeholder for chart component
// import AssetCharts from './AssetCharts'; // If you create a dedicated chart component

// Define categories and statuses for filters
const assetCategories: AssetCategory[] = ['Equipment', 'Furniture', 'IT', 'Other'];
const assetStatuses: AssetStatus[] = ['Active', 'Under Maintenance', 'Retired', 'Disposed'];

const AssetReports: React.FC = () => {
  const [assetData, setAssetData] = useState<AssetRow[]>([]);
  const [filteredAssetData, setFilteredAssetData] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined); // For purchase date range
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all');

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAssets(); // Fetch all assets
        setAssetData(data);
        setFilteredAssetData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load asset data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...assetData];

    // Filter by Purchase Date Range
    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter(item => {
        if (!item.purchase_date) return false;
        const purchaseDate = new Date(item.purchase_date);
        return purchaseDate >= dateRange.from! && purchaseDate <= dateRange.to!;
      });
    } else if (dateRange?.from) {
       filtered = filtered.filter(item => item.purchase_date && new Date(item.purchase_date) >= dateRange.from!);
    } else if (dateRange?.to) {
       filtered = filtered.filter(item => item.purchase_date && new Date(item.purchase_date) <= dateRange.to!);
    }

    // Filter by Category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

     // Filter by Status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    setFilteredAssetData(filtered);
  }, [dateRange, categoryFilter, statusFilter, assetData]);

  const formatDate = (dateString: string | null | undefined) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
  };

  const exportToPDF = (data: AssetRow[], title: string = "Asset Report") => {
    const pdf = new jsPDF();
    pdf.text(title, 14, 15);

    const tableColumn = ["ID", "Name", "Category", "Status", "Purchase Date", "Purchase Price", "Supplier"];
    const tableRows: (string | number | null)[][] = [];

    data.forEach(item => {
        const itemData = [
            item.id,
            item.asset_name,
            item.category,
            item.status,
            formatDate(item.purchase_date),
            item.purchase_price ?? 'N/A',
            item.supplier_info ?? 'N/A',
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

  const exportToExcel = (data: AssetRow[], title: string = "Asset Report") => {
    const worksheetData = data.map(item => ({
        "ID": item.id,
        "Name": item.asset_name,
        "Category": item.category,
        "Status": item.status,
        "Purchase Date": formatDate(item.purchase_date),
        "Purchase Price": item.purchase_price ?? 'N/A',
        "Supplier": item.supplier_info ?? 'N/A',
        "Location": item.location,
        "Next Maintenance": formatDate(item.next_maintenance_due_date),
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');
    XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleGenerateAssetListReport = () => {
    console.log("Generating Asset List Report with data:", filteredAssetData);
    if (filteredAssetData.length === 0) {
        setError("No data available to generate report.");
        return;
    }
    setError(null); // Clear previous errors
    try {
        exportToPDF(filteredAssetData, "Asset List Report");
        exportToExcel(filteredAssetData, "Asset List Report");
    } catch (error) {
        console.error("Error generating asset list report:", error);
        setError(`Error generating asset list report: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleGenerateMaintenanceReport = () => {
     // Note: This requires a more detailed maintenance history table ideally.
     // For now, we can filter based on last_serviced or next_maintenance dates.
     const maintenanceData = filteredAssetData.filter(item => item.last_serviced_date || item.next_maintenance_due_date);
     console.log("Generating Maintenance History Report with data:", maintenanceData);

      if (maintenanceData.length === 0) {
        setError("No assets with maintenance data available to generate report.");
        return;
      }
      setError(null); // Clear previous errors

      try {
          exportToPDF(maintenanceData, "Asset Maintenance Report");
          exportToExcel(maintenanceData, "Asset Maintenance Report");
      } catch (error) {
          console.error("Error generating asset maintenance report:", error);
          setError(`Error generating asset maintenance report: ${error instanceof Error ? error.message : String(error)}`);
      }
  };

  return (
    <div className="space-y-4">
      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 items-end">
           {/* Date Range Picker (for Purchase Date) */}
           <div className="flex-1">
             <label className="block text-sm font-medium text-muted-foreground mb-1">Purchase Date Range</label>
             <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
           </div>
           <div className="flex-1">
             <label htmlFor="asset-category-filter" className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
             <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as AssetCategory | 'all')}>
                <SelectTrigger id="asset-category-filter">
                    <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {assetCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
             </Select>
           </div>
            <div className="flex-1">
             <label htmlFor="asset-status-filter" className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
             <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AssetStatus | 'all')}>
                <SelectTrigger id="asset-status-filter">
                    <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {assetStatuses.map(stat => <SelectItem key={stat} value={stat}>{stat}</SelectItem>)}
                </SelectContent>
             </Select>
           </div>
        </CardContent>
      </Card>

      {/* Actions Section */}
      <div className="flex gap-2">
        <Button onClick={handleGenerateAssetListReport} disabled={loading}>Generate Asset List</Button>
        <Button onClick={handleGenerateMaintenanceReport} variant="outline" disabled={loading}>Generate Maintenance Report</Button>
        {/* Add Export Buttons later */}
      </div>

      {/* Loading/Error State */}
      {loading && <p>Loading report data...</p>}
      {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      {/* Report Data Display / Charts */}
      <Card>
         <CardHeader>
            <CardTitle>Report Data Preview & Charts</CardTitle>
         </CardHeader>
         <CardContent>
            <p className="text-muted-foreground mb-4">Filtered Assets: {filteredAssetData.length}</p>
             {/* Basic Table Display */}
            {filteredAssetData.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="table-auto w-full">
                        <thead>
                            <tr className="text-left">
                                <th className="px-4 py-2">Name</th>
                                <th className="px-4 py-2">Category</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2">Purchase Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAssetData.map(asset => (
                                <tr key={asset.id}>
                                    <td className="border px-4 py-2">{asset.asset_name}</td>
                                    <td className="border px-4 py-2">{asset.category}</td>
                                    <td className="border px-4 py-2">{asset.status}</td>
                                    <td className="border px-4 py-2">{formatDate(asset.purchase_date)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="h-60 border rounded-md flex items-center justify-center text-muted-foreground">
                    No assets match the selected criteria.
                </div>
            )}
             {/* Placeholder for Charts */}
             {/* <AssetCharts data={filteredAssetData} /> */}
         </CardContent>
      </Card>
    </div>
  );
};

export default AssetReports;
