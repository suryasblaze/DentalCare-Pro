import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2, AlertCircle, ArrowUpDown, Link as LinkIcon } from 'lucide-react'; // Add LinkIcon
import { Badge } from "@/components/ui/badge"; // Use Badge for status

import { supabase } from '@/lib/supabase';
import { deleteAsset } from '../services/assetService'; // Use asset service
import { Asset, AssetRow, AssetCategory, AssetStatus } from '../types'; // Use asset types
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AssetListProps {
  onEditAsset: (asset: AssetRow) => void; // Callback to open edit form
  refreshTrigger: number;
  searchTerm: string;
  categoryFilter: AssetCategory | 'all';
  statusFilter: AssetStatus | 'all';
  onDataFiltered: (filteredData: AssetRow[]) => void; // Pass raw rows for potential export
}

// Define sortable columns for assets
type SortableColumn = 'asset_name' | 'category' | 'serial_number' | 'location' | 'purchase_date' | 'warranty_expiry_date' | 'next_maintenance_due_date' | 'status';
type SortDirection = 'asc' | 'desc';

// Helper to format dates nicely
const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString();
    } catch (e) {
        return 'Invalid Date';
    }
};

// Helper to render status badge
const AssetStatusBadge: React.FC<{ status: AssetStatus | null }> = ({ status }) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;

    let variant: "default" | "secondary" | "destructive" | "outline" = "default";
    switch (status) {
        case 'Active': variant = 'default'; break; // Or 'success' if you add that variant
        case 'Under Maintenance': variant = 'secondary'; break; // Or 'warning'
        case 'Retired': variant = 'outline'; break;
        case 'Disposed': variant = 'destructive'; break;
        default: variant = 'outline';
    }
    return <Badge variant={variant}>{status}</Badge>;
};


const AssetList: React.FC<AssetListProps> = ({ onEditAsset, refreshTrigger, searchTerm, categoryFilter, statusFilter, onDataFiltered }) => {
  const [assets, setAssets] = useState<AssetRow[]>([]); // Store raw AssetRow
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortableColumn>('asset_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { toast } = useToast();
  // Add state for maintenance notifications if desired
  // const [maintenanceNotifiedIds, setMaintenanceNotifiedIds] = useState<Set<string>>(new Set());

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('assets').select('*');

      // Apply search filter (case-insensitive) on asset_name or serial_number
      if (searchTerm) {
         query = query.or(`asset_name.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%`);
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply sorting
      const sortOptions: { ascending: boolean; nullsFirst?: boolean } = {
          ascending: sortDirection === 'asc',
      };
       const columnsNullsLastAsc: SortableColumn[] = ['serial_number', 'location', 'purchase_date', 'warranty_expiry_date', 'next_maintenance_due_date', 'status'];
       if (columnsNullsLastAsc.includes(sortColumn) && sortDirection === 'asc') {
           sortOptions.nullsFirst = false;
       } else if (columnsNullsLastAsc.includes(sortColumn) && sortDirection === 'desc') {
            sortOptions.nullsFirst = true;
       }

      query = query.order(sortColumn, sortOptions);

      const { data: fetchedAssets, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setAssets(fetchedAssets || []);
      onDataFiltered(fetchedAssets || []); // Pass raw data up

      // --- Add Maintenance Due Check/Notification ---
      // Example: Check for items due within 7 days
      // const checkDate = new Date();
      // checkDate.setDate(checkDate.getDate() + 7);
      // const newlyDue = (fetchedAssets || []).filter(asset =>
      //     asset.next_maintenance_due_date &&
      //     new Date(asset.next_maintenance_due_date) <= checkDate &&
      //     !maintenanceNotifiedIds.has(asset.id) &&
      //     asset.status === 'Active' // Only notify for active assets
      // );
      // if (newlyDue.length > 0) {
      //     const updatedNotifiedIds = new Set(maintenanceNotifiedIds);
      //     newlyDue.forEach(asset => {
      //         toast({
      //             title: "Maintenance Due Soon",
      //             description: `Asset "${asset.asset_name}" is due for maintenance on ${formatDate(asset.next_maintenance_due_date)}.`,
      //         });
      //         updatedNotifiedIds.add(asset.id);
      //     });
      //     setMaintenanceNotifiedIds(updatedNotifiedIds);
      // }
      // --- End Maintenance Check ---

    } catch (err) {
      console.error("Failed to fetch assets:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      toast({
        title: 'Error Fetching Assets',
        description: err instanceof Error ? err.message : 'Could not load assets.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, searchTerm, categoryFilter, statusFilter, sortColumn, sortDirection, onDataFiltered]); // Add statusFilter

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets, refreshTrigger]);


  // --- Realtime Subscription for Assets ---
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('assets_changes')
      .on<AssetRow>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assets' },
        (payload) => {
          console.log('Asset Realtime change received:', payload);
          // Basic refetch on any change. Could be optimized to update state directly.
          fetchAssets();

          // Example: Notify on status change
          // const newItem = payload.new as AssetRow;
          // const oldItem = payload.old as AssetRow | undefined;
          // if (payload.eventType === 'UPDATE' && newItem.status !== oldItem?.status) {
          //    toast({ title: 'Asset Status Changed', description: `Asset "${newItem.asset_name}" status changed to ${newItem.status}.` });
          // }
        }
      )
      .subscribe((status, err) => {
         if (status === 'SUBSCRIBED') {
            console.log('Subscribed to asset changes!');
         }
         if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'){
             console.error('Asset Realtime subscription error/closed:', status, err);
         }
      });

    return () => {
      console.log('Unsubscribing from asset changes');
      supabase.removeChannel(channel);
    };
  }, [supabase, toast, fetchAssets]); // Dependencies


  const handleDelete = async (id: string, assetName: string) => {
    try {
      await deleteAsset(id);
      toast({ title: 'Success', description: `Asset "${assetName}" deleted successfully.` });
      fetchAssets(); // Refresh list
    } catch (err) {
      console.error(`Failed to delete asset ${id}:`, err);
      toast({
        title: 'Error Deleting Asset',
        description: err instanceof Error ? err.message : 'Could not delete asset.',
        variant: 'destructive',
      });
    }
  };

  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (column: SortableColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30 group-hover:opacity-100" />;
    }
    return <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'asc' ? '' : 'rotate-180'}`} />;
  };


  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (assets.length === 0) {
     return <p className="text-center text-gray-500 mt-4">No assets found matching the criteria.</p>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSort('asset_name')} className="px-0 group">
                Asset Name {renderSortIcon('asset_name')}
              </Button>
            </TableHead>
            <TableHead>
               <Button variant="ghost" onClick={() => handleSort('category')} className="px-0 group">
                 Category {renderSortIcon('category')}
               </Button>
            </TableHead>
             <TableHead>
               <Button variant="ghost" onClick={() => handleSort('serial_number')} className="px-0 group">
                 Serial No. {renderSortIcon('serial_number')}
               </Button>
            </TableHead>
             <TableHead>
               <Button variant="ghost" onClick={() => handleSort('location')} className="px-0 group">
                 Location {renderSortIcon('location')}
               </Button>
            </TableHead>
             <TableHead>
               <Button variant="ghost" onClick={() => handleSort('status')} className="px-0 group">
                 Status {renderSortIcon('status')}
               </Button>
            </TableHead>
            <TableHead className="hidden md:table-cell">
               <Button variant="ghost" onClick={() => handleSort('purchase_date')} className="px-0 group">
                 Purchase Date {renderSortIcon('purchase_date')}
               </Button>
            </TableHead>
             <TableHead className="hidden md:table-cell">
               <Button variant="ghost" onClick={() => handleSort('warranty_expiry_date')} className="px-0 group">
                 Warranty Expiry {renderSortIcon('warranty_expiry_date')}
               </Button>
            </TableHead>
             <TableHead className="hidden md:table-cell">
               <Button variant="ghost" onClick={() => handleSort('next_maintenance_due_date')} className="px-0 group">
                 Next Maintenance {renderSortIcon('next_maintenance_due_date')}
               </Button>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => (
            <TableRow key={asset.id}>
              <TableCell className="font-medium p-2 text-center text-sm">{asset.asset_name}</TableCell>
              <TableCell className="p-2 text-center text-sm">{asset.category}</TableCell>
              <TableCell className="p-2 text-center text-sm">{asset.serial_number || 'N/A'}</TableCell>
              <TableCell className="p-2 text-center text-sm">{asset.location || 'N/A'}</TableCell>
              {/* Cast status to the expected type for the badge */}
              <TableCell className="p-2 text-center text-sm"><AssetStatusBadge status={asset.status as AssetStatus | null} /></TableCell>
              <TableCell className="hidden md:table-cell p-2 text-center text-sm">{formatDate(asset.purchase_date)}</TableCell>
              <TableCell className="hidden md:table-cell p-2 text-center text-sm">{formatDate(asset.warranty_expiry_date)}</TableCell>
              <TableCell className="hidden md:table-cell p-2 text-center text-sm">{formatDate(asset.next_maintenance_due_date)}</TableCell>
              <TableCell className="text-right p-2 text-center text-sm flex items-center">
                 {asset.service_document_url && (
                    <Button variant="ghost" size="icon" asChild title="View Service Document">
                        <a href={asset.service_document_url} target="_blank" rel="noopener noreferrer">
                            <LinkIcon className="h-4 w-4" />
                        </a>
                    </Button>
                 )}
                 <Button variant="ghost" size="icon" onClick={() => onEditAsset(asset)} title="Edit Asset">
                   <Pencil className="h-4 w-4" />
                 </Button>
                 <AlertDialog>
                   <AlertDialogTrigger asChild>
                     <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" title="Delete Asset">
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   </AlertDialogTrigger>
                   <AlertDialogContent>
                     <AlertDialogHeader>
                       <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                       <AlertDialogDescription>
                         This action cannot be undone. This will permanently delete the asset
                         "{asset.asset_name}".
                       </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                       <AlertDialogCancel>Cancel</AlertDialogCancel>
                       <AlertDialogAction
                         onClick={() => handleDelete(asset.id, asset.asset_name)}
                         className="bg-red-600 hover:bg-red-700"
                       >
                         Delete
                       </AlertDialogAction>
                     </AlertDialogFooter>
                   </AlertDialogContent>
                 </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AssetList;
