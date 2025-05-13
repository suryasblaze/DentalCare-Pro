import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DatePickerWithRange } from '@/components/ui/date-range-picker'; // Corrected import name
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getInventoryLogs } from '../services/inventoryService'; // This function will be created next
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

// Define the structure of a log entry (aligning with InventoryLogEntryWithDetails from service)
export interface InventoryLogEntry {
  id: string;
  created_at: string;
  inventory_items: { // Nested item details
    item_name: string;
    item_code?: string | null;
  } | null;
  quantity_change: number;
  change_type: string;
  // profiles field removed as it's not reliably fetched yet
  notes?: string | null;
  // Include other fields from inventory_log table directly if needed
  purchase_order_item_id?: string | null;
  inventory_item_batch_id?: string | null;
  user_id?: string | null; // The raw user_id from the log table
}

// Define the structure for filter parameters
import { DateRange } from 'react-day-picker'; // Import DateRange type

// Define the structure for filter parameters
interface LogFilters {
  dateRange?: DateRange; // Corrected type
  month?: string; // e.g., "2023-01"
  searchTerm?: string;
}

const months = [
  { value: "01", label: "January" }, { value: "02", label: "February" },
  { value: "03", label: "March" }, { value: "04", label: "April" },
  { value: "05", label: "May" }, { value: "06", label: "June" },
  { value: "07", label: "July" }, { value: "08", label: "August" },
  { value: "09", label: "September" }, { value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" }
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i); // Last 5 years

export const InventoryLogHistory: React.FC = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<InventoryLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<InventoryLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<LogFilters>({});
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);


  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      // Pass filters to the service function (to be implemented)
      const fetchedLogs = await getInventoryLogs({ 
        startDate: filters.dateRange?.from,
        endDate: filters.dateRange?.to,
        searchTerm: filters.searchTerm 
      });
      setLogs(fetchedLogs || []);
      setFilteredLogs(fetchedLogs || []); // Initially, filtered logs are all fetched logs
    } catch (error) {
      console.error("Failed to fetch inventory logs:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to load inventory log history." });
      setLogs([]);
      setFilteredLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast, filters.dateRange, filters.searchTerm]); // Add dependencies for filters

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Apply client-side filtering based on month (if date range is not primary)
  // Or, ideally, month filtering should also be part of the backend query if possible
  useEffect(() => {
    let tempLogs = [...logs];

    if (selectedMonth && selectedYear) {
      const monthYearPrefix = `${selectedYear}-${selectedMonth}`;
      tempLogs = tempLogs.filter(log => log.created_at.startsWith(monthYearPrefix));
    }
    
    // Search term filtering (can be combined with backend or done client-side)
    if (filters.searchTerm) {
        const lowerSearchTerm = filters.searchTerm.toLowerCase();
        tempLogs = tempLogs.filter(log => {
            const itemNameMatch = log.inventory_items?.item_name?.toLowerCase().includes(lowerSearchTerm);
            const itemCodeMatch = log.inventory_items?.item_code?.toLowerCase().includes(lowerSearchTerm);
            const changeTypeMatch = log.change_type.toLowerCase().includes(lowerSearchTerm);
            // const userEmailMatch = log.profiles?.email?.toLowerCase().includes(lowerSearchTerm); // Removed profile email search
            const userIdMatch = log.user_id?.toLowerCase().includes(lowerSearchTerm);
            const notesMatch = log.notes?.toLowerCase().includes(lowerSearchTerm);
            return itemNameMatch || itemCodeMatch || changeTypeMatch || userIdMatch || notesMatch;
        });
    }

    setFilteredLogs(tempLogs);
  }, [logs, selectedMonth, selectedYear, filters.searchTerm]);


  const handleFilterChange = <K extends keyof LogFilters>(filterName: K, value: LogFilters[K]) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };
  
  const handleMonthYearChange = () => {
    // This will trigger the useEffect for filtering when selectedMonth or selectedYear changes
    // The actual date range for the backend query is handled by filters.dateRange
    // If we want month/year to directly influence the backend query, we need to adjust fetchLogs
    // For now, month/year is a client-side refinement on top of potentially date-ranged data
    // Or, if dateRange is not set, it filters the whole dataset by month/year
    
    // If a specific month and year are selected, and no explicit dateRange is set,
    // we could construct a dateRange here to send to the backend.
    if (selectedYear && selectedMonth && !filters.dateRange) {
        const firstDay = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
        const lastDay = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0); // Day 0 of next month is last day of current
         handleFilterChange('dateRange', { from: firstDay, to: lastDay });
    } else if (!selectedMonth && !filters.dateRange) { // If month is cleared, and no date range, clear date range filter
        handleFilterChange('dateRange', undefined);
    }
    // If a dateRange is already set, month/year selection acts as an additional client-side filter on that range.
  };

  useEffect(() => {
    // This effect calls handleMonthYearChange when selectedMonth or selectedYear changes,
    // which in turn might update the dateRange filter for the backend.
    handleMonthYearChange();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]); // Dependencies are selectedMonth and selectedYear

  const clearFilters = () => {
    setFilters({});
    setSelectedMonth(undefined);
    setSelectedYear(currentYear.toString());
    // fetchLogs will be called by useEffect due to filter change
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-md bg-muted/40">
        <div>
          <label className="text-sm font-medium mb-1 block">Date Range</label>
          <DatePickerWithRange
            date={filters.dateRange} // Corrected prop name
            onDateChange={(newDateRange) => { // Corrected prop name and handler
                handleFilterChange('dateRange', newDateRange);
                // If a date range is picked, clear specific month/year selection
                // as the date range is more specific.
                setSelectedMonth(undefined); 
            }}
            // displayFormat="MMM d, yyyy" // displayFormat is not a prop of DatePickerWithRange
            className="w-full"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Year</label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
            <SelectContent>
              {years.map(year => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Month</label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger><SelectValue placeholder="Select Month (All)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_MONTHS">All Months</SelectItem> {/* Option to clear month filter */}
              {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Search Logs</label>
          <Input
            placeholder="Search by item, user, notes..."
            value={filters.searchTerm || ''}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            className="w-full"
          />
        </div>
        <div className="lg:col-span-4 flex justify-end">
            <Button variant="ghost" onClick={clearFilters}>Clear Filters</Button>
        </div>
      </div>

      <ScrollArea className="h-[400px] md:h-[500px] border rounded-md">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center h-32">Loading log history...</TableCell></TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center h-32">No log entries match your filters.</TableCell></TableRow>
            ) : (
              filteredLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                  <TableCell className="font-medium">{log.inventory_items?.item_name || 'N/A'}</TableCell>
                  <TableCell>{log.inventory_items?.item_code || 'N/A'}</TableCell>
                  <TableCell className={`text-right font-semibold ${log.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change}
                  </TableCell>
                  <TableCell>{log.change_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</TableCell>
                  <TableCell>{log.user_id ? `User: ${log.user_id.substring(0, 8)}...` : 'System'}</TableCell>
                  <TableCell className="text-xs max-w-xs truncate" title={log.notes || ''}>{log.notes || 'N/A'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};
