import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { InventoryItemRow, StockStatus } from '@/features/inventory/types'; // Assuming types are here
import { AlertCircle, Archive } from 'lucide-react'; // Icons for toasts (Using Archive for low stock)

// Re-use or import the status calculation logic
const calculateStockStatus = (item: InventoryItemRow): StockStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (item.expiry_date) {
    const expiryDate = new Date(item.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);
    if (expiryDate < today) {
      return 'Expired'; // Although expired items might not trigger alerts here
    }
  }
  if ((item.quantity ?? 0) <= (item.low_stock_threshold ?? 0)) {
    return 'Low Stock';
  }
  return 'In Stock';
};

const EXPIRY_THRESHOLD_DAYS = 30; // Notify if expiring within 30 days

export function useInventoryAlerts() {
  const { toast } = useToast();
  // Refs to track items already notified in this session to prevent spam
  const notifiedLowStockIds = useRef<Set<string>>(new Set());
  const notifiedExpiringIds = useRef<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Function to check items and trigger notifications
  const checkAndNotify = useCallback((items: InventoryItemRow[]) => {
    const now = new Date();
    const thresholdDate = new Date(now);
    thresholdDate.setDate(now.getDate() + EXPIRY_THRESHOLD_DAYS);
    const lowStockIdsToNotify = new Set<string>();
    const expiringIdsToNotify = new Set<string>();

    items.forEach(item => {
      const status = calculateStockStatus(item);
      const itemId = item.id;

      // Check Low Stock
      if (status === 'Low Stock' && !notifiedLowStockIds.current.has(itemId)) {
        lowStockIdsToNotify.add(itemId);
        toast({
          title: "Low Stock Alert", // Simplified title
          description: `Item "${item.item_name}" is low on stock (${item.quantity ?? 0} remaining).`,
          variant: "destructive",
          // Consider adding an icon prop if your Toast component supports it
        });
      }

      // Check Expiring Soon
      if (item.expiry_date) {
        const expiryDate = new Date(item.expiry_date);
        if (expiryDate <= thresholdDate && expiryDate >= now && !notifiedExpiringIds.current.has(itemId)) {
          expiringIdsToNotify.add(itemId);
          toast({
             title: "Expiry Soon Alert", // Simplified title
             description: `Item "${item.item_name}" is expiring on ${expiryDate.toLocaleDateString()}.`,
             variant: "default", // Or use a 'warning' variant if defined
             // Consider adding an icon prop if your Toast component supports it
          });
        }
      }
    });

    // Update notified sets
    if (lowStockIdsToNotify.size > 0) {
      notifiedLowStockIds.current = new Set([...notifiedLowStockIds.current, ...lowStockIdsToNotify]);
    }
    if (expiringIdsToNotify.size > 0) {
      notifiedExpiringIds.current = new Set([...notifiedExpiringIds.current, ...expiringIdsToNotify]);
    }
  }, [toast]); // Add toast as dependency

  // Initial fetch on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data, error } = await supabase.from('inventory_items').select('*');
        if (error) throw error;
        if (data) {
          checkAndNotify(data as InventoryItemRow[]);
        }
      } catch (error) {
        console.error("Error fetching initial inventory for alerts:", error);
        // Optionally show a toast error here
      }
    };
    fetchInitialData();
  }, [checkAndNotify]); // Run once on mount

  // Realtime subscription logic
  useEffect(() => {
    if (!supabase) return; // Ensure supabase client is available

    const handleInventoryChange = (payload: any) => {
      const newItem = payload.new as InventoryItemRow;
      if (newItem) {
        // Check status of the changed item
        checkAndNotify([newItem]);

        // If quantity increased above threshold, remove from notified set
        const status = calculateStockStatus(newItem);
        if (status === 'In Stock' && notifiedLowStockIds.current.has(newItem.id)) {
          notifiedLowStockIds.current.delete(newItem.id);
        }
      }
    };

    channelRef.current = supabase
      .channel('inventory_items_alerts')
      .on<InventoryItemRow>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items' },
        handleInventoryChange
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // console.log('Subscribed to inventory alerts!');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`Inventory Alert Realtime subscription ${status}:`, err);
        }
      });

    // Cleanup function
    return () => {
      const currentChannel = channelRef.current;
      if (currentChannel) {
        supabase.removeChannel(currentChannel)
          .catch((err) => console.error('Error removing inventory alert channel:', err));
        channelRef.current = null;
      }
    };
  }, [supabase, checkAndNotify]); // Add dependencies

  // Placeholder return - this hook doesn't need to return anything for the UI
  return null;
}
