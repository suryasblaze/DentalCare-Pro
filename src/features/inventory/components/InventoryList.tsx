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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For errors
import clsx from 'clsx'; // For conditional class names
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import { Pencil, Trash2, AlertCircle, ArrowUpDown } from 'lucide-react'; // Icons, Add ArrowUpDown for sorting
import { supabase } from '@/lib/supabase'; // Import supabase client for direct querying
// Removed getInventoryItems as direct query is used
import { deleteInventoryItem } from '../services/inventoryService';
import { InventoryItem, InventoryItemRow, StockStatus, InventoryItemCategory } from '../types'; // Add InventoryItemCategory
import InventoryStatusBadge from './InventoryStatusBadge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import useNotifications from '@/lib/hooks/useNotifications';
import { logQuantityUpdate } from '../services/inventoryLogService';
import InvoiceUpload from './InvoiceUpload';
import InventoryEditForm from './InventoryEditForm';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
// Import InvoiceUpload
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


// Re-use the helper function or import if moved to a shared location
const calculateStockStatus = (item: InventoryItemRow): StockStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (item.expiry_date) {
    const expiryDate = new Date(item.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);
    if (expiryDate < today) {
      return 'Expired';
    }
  }
  // Use nullish coalescing as quantity/threshold might be null if DB schema changed unexpectedly
  if ((item.quantity ?? 0) <= (item.low_stock_threshold ?? 0)) {
    return 'Low Stock';
  }
  return 'In Stock';
};

const getStockColor = (status: StockStatus) => {
  switch (status) {
    case 'In Stock':
      return 'text-green-600 font-bold';
    case 'Low Stock':
      return 'text-red-600 font-bold';
    default:
      return '';
  }
};

interface InventoryListProps {
  onEditItem: (item: InventoryItemRow) => void; // Callback to open edit form
  refreshTrigger: number; // Simple counter to trigger refresh from parent
  searchTerm: string; // Add search term prop
  categoryFilter: InventoryItemCategory | 'all'; // Add category filter prop
  onDataFiltered: (filteredData: InventoryItem[]) => void; // Callback with filtered data
}

// Define sortable columns and directions
type SortableColumn = 'item_name' | 'category' | 'quantity' | 'expiry_date' | 'purchase_price';
type SortDirection = 'asc' | 'desc';

const InventoryList: React.FC<InventoryListProps> = ({ onEditItem, refreshTrigger, searchTerm, categoryFilter, onDataFiltered }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortableColumn>('item_name'); // Default sort
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { toast } = useToast();
  const { createNotification } = useNotifications();
  // Keep track of items known to be low stock or expiring soon to avoid repeated toasts
  const [lowStockNotifiedIds, setLowStockNotifiedIds] = useState<Set<string>>(new Set());
  const [expiringSoonNotifiedIds, setExpiringSoonNotifiedIds] = useState<Set<string>>(new Set());
  const EXPIRY_THRESHOLD_DAYS = 30; // Notify if expiring within 30 days
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use supabase client directly to build dynamic query
      let query = supabase.from('inventory_items').select('*');

      // Apply search filter (case-insensitive) on item_name
      if (searchTerm) {
        query = query.ilike('item_name', `%${searchTerm}%`);
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      // Apply sorting
      const sortOptions: { ascending: boolean; nullsFirst?: boolean } = {
          ascending: sortDirection === 'asc',
      };
       // Place nulls last when ascending for optional date/numeric fields being sorted
       if ((sortColumn === 'expiry_date' || sortColumn === 'purchase_price') && sortDirection === 'asc') {
           sortOptions.nullsFirst = false; // Supabase default is true for ascending
       } else if ((sortColumn === 'expiry_date' || sortColumn === 'purchase_price') && sortDirection === 'desc') {
            sortOptions.nullsFirst = true; // Keep nulls first when descending
       }

      query = query.order(sortColumn, sortOptions);

      const { data: fetchedItems, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // Calculate status for each item
      const itemsWithStatus: InventoryItem[] = (fetchedItems || []).map((item): InventoryItem => ({ // Add return type
        ...item,
        stock_status: calculateStockStatus(item), // calculateStockStatus defined above
      }));
      setItems(itemsWithStatus);
      onDataFiltered(itemsWithStatus); // Pass filtered data up

      // --- Check for low stock items on initial fetch ---
      const newlyLowStockItems = itemsWithStatus.filter((item: InventoryItem) => {
          return item.stock_status === 'Low Stock' && !lowStockNotifiedIds.has(item.id);
      });

      if (newlyLowStockItems.length > 0) {
          const updatedNotifiedIds = new Set(lowStockNotifiedIds);
          newlyLowStockItems.forEach((item: InventoryItem) => {
              updatedNotifiedIds.add(item.id);
              if (user) {
                createNotification(
                  user.id,
                  `Item "${item.item_name}" is low on stock (${item.quantity} remaining).`,
                  `/inventory`
                );
                toast({
                  title: "Low Stock Alert",
                  description: `Item "${item.item_name}" is low on stock (${item.quantity} remaining).`,
                  variant: "default", 
                });
              }
            });
            setLowStockNotifiedIds(updatedNotifiedIds);
      }
      // --- End Check for low stock items ---

      // --- Check for expiring items ---
      const now = new Date();
      const thresholdDate = new Date(now);
      thresholdDate.setDate(now.getDate() + EXPIRY_THRESHOLD_DAYS);

      const newlyExpiringItems = itemsWithStatus.filter((item: InventoryItem) => { // Add type
          if (!item.expiry_date) return false;
          const expiryDate = new Date(item.expiry_date);
          return expiryDate <= thresholdDate && expiryDate >= now && !expiringSoonNotifiedIds.has(item.id);
      });

      if (newlyExpiringItems.length > 0) {
          const updatedNotifiedIds = new Set(expiringSoonNotifiedIds);
          newlyExpiringItems.forEach((item: InventoryItem) => { // Add type
              toast({

                  title: "Expiry Soon Alert",
                  description: `Item "${item.item_name}" is expiring on ${new Date(item.expiry_date!).toLocaleDateString()}.`,
                  variant: "default", // Or a 'warning' variant if available
              });
              if (user) {
                createNotification(
                  user.id,
                  `Item "${item.item_name}" is expiring on ${new Date(item.expiry_date!).toLocaleDateString()}.`,
                  `/inventory`
                );
              }
              updatedNotifiedIds.add(item.id);
          });
          setExpiringSoonNotifiedIds(updatedNotifiedIds);
      }
      // --- End Check for expiring items ---


    } catch (err) {
      console.error("Failed to fetch inventory items:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      toast({
        title: 'Error Fetching Inventory',
        description: err instanceof Error ? err.message : 'Could not load items.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
    // Update dependencies for useCallback
  }, [toast, searchTerm, categoryFilter, sortColumn, sortDirection, onDataFiltered, expiringSoonNotifiedIds]); // Add expiringSoonNotifiedIds

  useEffect(() => {
    fetchItems();
    // Update dependencies for useEffect
  }, [fetchItems, refreshTrigger]); // Keep refreshTrigger, fetchItems has others


  // --- Realtime Subscription ---
  useEffect(() => {
    // Ensure supabase client is available
    if (!supabase) {
      console.error('Supabase client is not available');
      return;
    }

    let channel = supabase
      .channel('inventory_items_changes')
      .on<InventoryItemRow>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items' },
        (payload) => {
          console.log('Realtime change received:', payload);
          const newItem = payload.new as InventoryItemRow;
          const oldItem = payload.old as InventoryItemRow | undefined; // Might be undefined for INSERT

          // Check for low stock on INSERT or UPDATE
          if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && newItem) {
             // Use nullish coalescing
             const currentQuantity = newItem.quantity ?? 0;
             const currentThreshold = newItem.low_stock_threshold ?? 0;
             const isNowLowStock = currentQuantity <= currentThreshold;

             const oldQuantity = oldItem?.quantity ?? 0;
             const oldThreshold = oldItem?.low_stock_threshold ?? 0;
             const wasPreviouslyLowStock = oldItem ? oldQuantity <= oldThreshold : false;

             // Trigger notification only if it just became low stock and wasn't already notified
             if (isNowLowStock && !wasPreviouslyLowStock && !lowStockNotifiedIds.has(newItem.id)) {
               toast({
                 title: "Low Stock Alert",
                 description: `Item "${newItem.item_name}" is low on stock (${currentQuantity} remaining).`,
                 variant: "destructive", // Use destructive variant for alerts
               });
               // Add to notified set to prevent spamming toasts for the same item
               setLowStockNotifiedIds(prev => new Set(prev).add(newItem.id));
             } else if (!isNowLowStock && lowStockNotifiedIds.has(newItem.id)) {
                // Optional: Remove from notified set if stock increases above threshold
                setLowStockNotifiedIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(newItem.id);
                    return newSet;
                });
             }
          }

          // Refetch data to update the list UI after any change
          // Debounce or throttle this if changes are very frequent
          fetchItems();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to inventory changes!');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Realtime subscription error:', status, err);
        } else if (status === 'TIMED_OUT') {
          console.error('Realtime subscription timed out:', status, err);
        } else if (status === 'CLOSED') {
          console.error('Realtime subscription closed:', status, err);
          if (err) {
            console.error('Error message:', err.message);
          }
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('Attempting to reconnect...');
          setTimeout(() => {
            if (channel) {
              channel.subscribe();
            }
          }, 5000); // Reconnect after 5 seconds
        }
      });

    // Cleanup function to remove the channel subscription when the component unmounts
    return () => {
      console.log('Unsubscribing from inventory changes');
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, toast, fetchItems, lowStockNotifiedIds]);


  const handleDelete = async (id: string) => {
    try {
      await deleteInventoryItem(id);
      toast({ title: 'Success', description: 'Item deleted successfully.' });
      fetchItems(); // Refresh list after delete
    } catch (err) {
      console.error(`Failed to delete item ${id}:`, err);
      toast({
        title: 'Error Deleting Item',
        description: err instanceof Error ? err.message : 'Could not delete item.',
        variant: 'destructive',
      });
    }
  };

  // Handler for changing sort
  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Helper function for sort button rendering
  const renderSortIcon = (column: SortableColumn) => {
    if (sortColumn !== column) {
      // Indicate sortable but not active
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30 group-hover:opacity-100" />;
    }
    // Indicate active sort direction
    return <ArrowUpDown className={`ml-2 h-4 w-4 ${sortDirection === 'asc' ? '' : 'rotate-180'}`} />;
  };


  if (loading) {
    // Display skeleton loaders while loading
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

  if (items.length === 0) {
     return <p className="text-center text-gray-500 mt-4">No inventory items found. Add one to get started!</p>;
  }

  return (
    <div className="rounded-md border">
<Table className="min-w-full divide-y divide-gray-200 bg-white shadow-md rounded-lg overflow-hidden">
<TableHeader className="bg-gray-50">
<TableRow className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            {/* Make headers buttons for sorting */}
<TableHead className="px-6 py-3">
              <Button variant="ghost" onClick={() => handleSort('item_name')} className="px-0 group">
                Item Name {renderSortIcon('item_name')}
              </Button>
            </TableHead>
            <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
               <Button variant="ghost" onClick={() => handleSort('category')} className="px-0 group">
                 Category {renderSortIcon('category')}
               </Button>
            </TableHead>
            <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
               <Button variant="ghost" onClick={() => handleSort('quantity')} className="px-0 group">
                 Quantity {renderSortIcon('quantity')}
               </Button>
            </TableHead>
            <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
               <Button variant="ghost" onClick={() => handleSort('expiry_date')} className="px-0 group">
                 Expiry Date {renderSortIcon('expiry_date')}
               </Button>
            </TableHead>
<TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</TableHead>{/* Not sorting by supplier */}<TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
               <Button variant="ghost" onClick={() => handleSort('purchase_price')} className="px-0 group">
                 Price{renderSortIcon('purchase_price')}
               </Button>
            </TableHead><TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</TableHead>{/* Stock Status */}<TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</TableHead>
          </TableRow>
        </TableHeader>
<TableBody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
<TableRow key={item.id} className="hover:bg-gray-100 text-sm text-gray-900">
<TableCell className="px-6 py-4 whitespace-nowrap">{item.item_name}</TableCell>
<TableCell className="px-6 py-4 whitespace-nowrap">{item.category}</TableCell>
<TableCell className="px-6 py-4 whitespace-nowrap text-right">{item.quantity ?? '-'}</TableCell>
<TableCell className="px-6 py-4 whitespace-nowrap">{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}</TableCell>
<TableCell className="px-6 py-4 whitespace-nowrap">{item.supplier_info || 'N/A'}</TableCell>
<TableCell className="px-6 py-4 whitespace-nowrap text-right">
{item.purchase_price != null ? `₹${Number(item.purchase_price).toFixed(2)}` : 'N/A'}
</TableCell>
<TableCell className="px-6 py-4 whitespace-nowrap">
  {/* Ensure status is valid before passing */}
  {item.stock_status ? <InventoryStatusBadge status={item.stock_status} className={getStockColor(item.stock_status)}/> : 'N/A'}
</TableCell>
<TableCell className="px-6 py-4 whitespace-nowrap text-right space-x-1">
                 <Dialog>
                   <DialogTrigger asChild>
                     <Button variant="ghost" size="icon" title="Edit Item">
                       <Pencil className="h-4 w-4" />
                     </Button>
                   </DialogTrigger>
                   <DialogContent>
<InventoryEditForm item={item} onClose={() => setDialogOpen(false)} />
                   </DialogContent>
                 </Dialog>
                 {/* Confirmation Dialog for Delete */}
                 <AlertDialog>
                   <AlertDialogTrigger asChild>
                     <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" title="Delete Item">
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   </AlertDialogTrigger>
                   <AlertDialogContent>
                     <AlertDialogHeader>
                       <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                       <AlertDialogDescription>
                         This action cannot be undone. This will permanently delete the item
                         "{item.item_name}" from your inventory.
                       </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                       <AlertDialogCancel>Cancel</AlertDialogCancel>
                       <AlertDialogAction
                         onClick={() => handleDelete(item.id)}
                         className="bg-red-600 hover:bg-red-700" // Destructive action style
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

  async function handleQuantityUpdate(id: string, newQuantity: number) {
    try {
      const item = items.find((item) => item.id === id);
      if (!item) return;

      const oldQuantity = item.quantity;

      // Update quantity in the database
      const { data, error } = await supabase
        .from('inventory_items')
        .update({ quantity: newQuantity })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setItems((prevItems) =>
        prevItems.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item))
      );

      // Log the quantity update
      await logQuantityUpdate(id, oldQuantity, newQuantity, user.id);

      toast({ title: 'Success', description: 'Quantity updated successfully.' });
    } catch (err) {
      console.error(`Failed to update quantity for item ${id}:`, err);
      toast({
        title: 'Error Updating Quantity',
        description: err instanceof Error ? err.message : 'Could not update quantity.',
        variant: 'destructive',
      });
    }
  }
};

export default InventoryList;
