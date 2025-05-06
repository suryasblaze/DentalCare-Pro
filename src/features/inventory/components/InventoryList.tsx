import React, { useState, useEffect, useCallback, useRef } from 'react'; // Import useRef
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
import { deleteInventoryItem } from '../services/inventoryService';
import { InventoryItem, InventoryItemRow, StockStatus, InventoryItemCategory } from '../types'; // Add InventoryItemCategory
import InventoryStatusBadge from './InventoryStatusBadge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { logQuantityUpdate } from '../services/inventoryLogService';
import InventoryEditForm from './InventoryEditForm';
import QuantityUpdatePopover from './QuantityUpdatePopover';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
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

// Define a combined type for items in state, including the calculated status
type InventoryItemWithStatus = InventoryItemRow & { stock_status: StockStatus };

const InventoryList: React.FC<InventoryListProps> = ({ onEditItem, refreshTrigger, searchTerm, categoryFilter, onDataFiltered }) => {
  const [items, setItems] = useState<InventoryItemWithStatus[]>([]); // Use the combined type for state
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortableColumn>('item_name'); // Default sort
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { toast } = useToast();
  const { user } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null); // Ref to hold the channel instance
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null); // Ref for reconnect timer ID
  const reconnectAttemptsRef = useRef<number>(0); // Ref for reconnect attempts

  const MAX_RECONNECT_ATTEMPTS = 5;
  const INITIAL_RECONNECT_DELAY = 1000; // 1 second
  const MAX_RECONNECT_DELAY = 30000; // 30 seconds


  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from('inventory_items').select('*');

      if (searchTerm) {
        query = query.ilike('item_name', `%${searchTerm}%`);
      }
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const sortOptions: { ascending: boolean; nullsFirst?: boolean } = {
          ascending: sortDirection === 'asc',
      };
       if ((sortColumn === 'expiry_date' || sortColumn === 'purchase_price') && sortDirection === 'asc') {
           sortOptions.nullsFirst = false;
       } else if ((sortColumn === 'expiry_date' || sortColumn === 'purchase_price') && sortDirection === 'desc') {
            sortOptions.nullsFirst = true;
       }

      query = query.order(sortColumn, sortOptions);

      const { data: fetchedItems, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      const itemsWithStatus: InventoryItemWithStatus[] = (fetchedItems || []).map((item): InventoryItemWithStatus => ({
        ...(item as InventoryItemRow),
        stock_status: calculateStockStatus(item as InventoryItemRow),
      }));
      setItems(itemsWithStatus);
      onDataFiltered(itemsWithStatus as InventoryItem[]);

      // Notification checks removed - handled by useInventoryAlerts hook

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
  }, [searchTerm, categoryFilter, sortColumn, sortDirection, onDataFiltered]); // Dependencies updated

  useEffect(() => {
    fetchItems();
  }, [fetchItems, refreshTrigger]);


  // --- Realtime Subscription ---
  useEffect(() => {
    if (!supabase) {
      console.error('Supabase client is not available');
      return;
    }

    let channel = supabase
      .channel('inventory_items_changes') // Use a different channel name than the hook if needed
      .on<InventoryItemRow>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items' },
        (payload) => {
          // console.log('Realtime change received in List:', payload);
          // Only refetch data to update the UI, notifications handled globally
          fetchItems();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // console.log('List subscribed to inventory changes!');
          reconnectAttemptsRef.current = 0;
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`List Realtime subscription ${status}:`, err);
          if (err) console.error('Error message:', err.message);
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current += 1;
            const delay = Math.min(INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1), MAX_RECONNECT_DELAY);
            console.error(`List attempting to reconnect in ${delay / 1000} seconds...`);
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = setTimeout(() => {
              if (channelRef.current) channelRef.current.subscribe();
            }, delay);
          } else {
            console.error('List max reconnection attempts reached.');
             toast({
               title: "Realtime Connection Issue",
               description: "Inventory list updates may be delayed. Please refresh if needed.",
               variant: "destructive",
               duration: 10000
             });
          }
        }
      });

      channelRef.current = channel;

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      const currentChannel = channelRef.current;
      if (currentChannel) {
        supabase.removeChannel(currentChannel)
          .catch((err) => console.error('Error removing list channel:', err));
        channelRef.current = null;
      }
    };
  }, [supabase, fetchItems, toast]); // Added toast dependency


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

  if (items.length === 0) {
     return <p className="text-center text-gray-500 mt-4">No inventory items found. Add one to get started!</p>;
  }

  return (
    <div className="rounded-md border">
      <Table className="min-w-full divide-y divide-gray-200 bg-white shadow-md rounded-lg overflow-hidden">
        <TableHeader className="bg-gray-50">
          <TableRow className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <TableHead className="px-6 py-3">
              <Button variant="ghost" onClick={() => handleSort('item_name')} className="px-0 group">
                Item Name {renderSortIcon('item_name')}
              </Button>
            </TableHead>
            <TableHead className="px-6 py-3">
               <Button variant="ghost" onClick={() => handleSort('category')} className="px-0 group">
                 Category {renderSortIcon('category')}
               </Button>
            </TableHead>
            <TableHead className="px-6 py-3 text-right">
               <Button variant="ghost" onClick={() => handleSort('quantity')} className="px-0 group">
                 Quantity {renderSortIcon('quantity')}
               </Button>
            </TableHead>
            <TableHead className="px-6 py-3">
               <Button variant="ghost" onClick={() => handleSort('expiry_date')} className="px-0 group">
                 Expiry Date {renderSortIcon('expiry_date')}
               </Button>
            </TableHead>
            <TableHead className="px-6 py-3">Supplier</TableHead>
            <TableHead className="px-6 py-3 text-right">
               <Button variant="ghost" onClick={() => handleSort('purchase_price')} className="px-0 group">
                 Price{renderSortIcon('purchase_price')}
               </Button>
            </TableHead>
            <TableHead className="px-6 py-3">Status</TableHead>
            {/* Actions Header Removed */}
          </TableRow>
        </TableHeader>
        <TableBody className="bg-white divide-y divide-gray-200">
          {items.map((item: InventoryItemWithStatus) => (
            <TableRow key={item.id} className="hover:bg-gray-100 text-sm text-gray-900">
              <TableCell className="px-6 py-4 whitespace-nowrap">{item.item_name}</TableCell>
              <TableCell className="px-6 py-4 whitespace-nowrap">{item.category}</TableCell>
              <TableCell className="px-6 py-4 whitespace-nowrap text-right">{item.quantity ?? '-'}</TableCell>
              <TableCell className="px-6 py-4 whitespace-nowrap">{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}</TableCell>
              <TableCell className="px-6 py-4 whitespace-nowrap">{item.supplier_info || 'N/A'}</TableCell>
              <TableCell className="px-6 py-4 whitespace-nowrap text-right">
                {item.purchase_price !== null && item.purchase_price !== undefined
                  ? `₹${Number(item.purchase_price).toFixed(2)}`
                  : 'N/A'}
              </TableCell>
              <TableCell className="px-6 py-4 whitespace-nowrap">
                {item.stock_status === 'Low Stock' ? (
                  <QuantityUpdatePopover
                    currentItemQuantity={item.quantity ?? 0}
                    onUpdate={(newQty) => handleQuantityUpdate(item.id, newQty)}
                    itemId={item.id}
                  >
                    <InventoryStatusBadge
                      status={item.stock_status}
                      className={clsx(
                        getStockColor(item.stock_status),
                        "hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                      )}
                    />
                  </QuantityUpdatePopover>
                ) : (
                  <InventoryStatusBadge
                    status={item.stock_status}
                    className={getStockColor(item.stock_status)}
                  />
                )}
              </TableCell>
              {/* Actions Cell Removed */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  async function handleQuantityUpdate(id: string, newQuantity: number) {
    try {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const oldQuantity = item.quantity;

      const { error } = await supabase
        .from('inventory_items')
        .update({ quantity: newQuantity })
        .eq('id', id);
      if (error) throw error;

      // Optimistically update local state first for better UX
      setItems((prevItems) =>
        prevItems.map((i) => (i.id === id ? { ...i, quantity: newQuantity, stock_status: calculateStockStatus({...i, quantity: newQuantity}) } : i))
      );


      if (user) {
        await logQuantityUpdate(id, oldQuantity ?? 0, newQuantity, user.id); // Use nullish coalescing for oldQuantity
      } else {
        console.warn('User not available, skipping quantity update log.');
      }

      toast({ title: 'Success', description: 'Quantity updated successfully.' });
      // No need to call fetchItems() here due to optimistic update and realtime subscription
    } catch (err) {
      console.error(`Failed to update quantity for item ${id}:`, err);
      toast({
        title: 'Error Updating Quantity',
        description: err instanceof Error ? err.message : 'Could not update quantity.',
        variant: 'destructive',
      });
      // Consider reverting optimistic update here if needed, though realtime should correct it
      fetchItems(); // Refetch on error to be safe
    }
  }
};

export default InventoryList;
