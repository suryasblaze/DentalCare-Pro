import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { InventoryItemRow, StockStatus } from '@/features/inventory/types'; // Assuming types are here
import { AlertCircle, Archive } from 'lucide-react'; // Icons for toasts (Using Archive for low stock)
import { subHours } from 'date-fns'; // Import date-fns function for throttling check

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
  const { user } = useAuth(); // Get user from AuthContext
  // Refs to track items already notified in this session to prevent spam
  const notifiedLowStockIds = useRef<Set<string>>(new Set());
  const notifiedExpiringIds = useRef<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Function to request permission and show desktop notification
  const showDesktopNotification = useCallback((title: string, options: NotificationOptions) => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return;
    }

    const askPermissionAndShow = () => {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, options);
        } else {
          console.warn('Desktop notification permission denied.');
        }
      });
    };

    if (Notification.permission === 'granted') {
      new Notification(title, options);
    } else if (Notification.permission !== 'denied') {
      // We need to ask for permission
      // Best practice: Ask permission in response to a user action (e.g., a button click)
      // For simplicity here, we'll ask directly, but this might be blocked by browsers.
      // Consider adding a UI element for users to enable notifications.
      askPermissionAndShow();
    }
  }, []);


  // Function to check items and trigger notifications
  const checkAndNotify = useCallback(async (items: InventoryItemRow[]) => { // Make async
    if (!user) return; // Don't run if user is not logged in

    const today = new Date(); // Use a date variable for today
    today.setHours(0, 0, 0, 0); // Normalize today's date to midnight

    const thresholdDate = new Date(today); // Base threshold on normalized date
    thresholdDate.setDate(today.getDate() + EXPIRY_THRESHOLD_DAYS);
    // thresholdDate is now midnight, EXPIRY_THRESHOLD_DAYS days from today

    console.log(`[InventoryAlerts] Check running. Today (normalized): ${today.toISOString()}, Threshold Date: ${thresholdDate.toISOString()}`); // Log dates

    const lowStockIdsToNotify = new Set<string>();
    const expiringIdsToNotify = new Set<string>();
    const alertsToShow: Array<{ title: string; description: string; variant: "default" | "destructive" | "warning"; tag?: string }> = []; // Array to collect toasts

    // Use for...of loop to allow async operations inside
    for (const item of items) {
      const status = calculateStockStatus(item);
      const itemId = item.id;

      // Check Low Stock
      // Remove useRef check (!notifiedLowStockIds.current.has(itemId)) - rely on DB throttling
      if (status === 'Low Stock') {
        const notificationType = 'low_stock';
        const twelveHoursAgo = subHours(new Date(), 12);

        // Check if a similar notification was sent recently
        // Destructure count directly from the response object
        const { count: recentNotificationCount, error: checkError } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('item_id', itemId)
          .eq('item_type', 'inventory')
          .eq('notification_type', notificationType)
          .gte('created_at', twelveHoursAgo.toISOString());

        if (checkError) {
           console.error("Error checking recent low stock notifications:", checkError);
         }

        // Check the destructured count variable
        if (!checkError && recentNotificationCount === 0) {
            console.log(`[InventoryAlerts] PASSED low stock check for item "${item.item_name}". Queueing notification.`);
            lowStockIdsToNotify.add(itemId); // Still track for ref update if needed, though less critical now
            const message = `Item "${item.item_name}" is low on stock (${item.quantity ?? 0} remaining).`;
            const linkUrl = `/inventory?highlight=${itemId}`;
            const toastTag = `low-stock-${itemId}`;

            // Add to queue instead of showing immediately
            alertsToShow.push({
              title: "Low Stock Alert",
              description: message,
              variant: "warning",
              tag: toastTag
            });

            // Show Desktop Notification (can still be immediate)
            showDesktopNotification("Low Stock Alert", { body: message, tag: toastTag });
          // Insert into DB Notifications (still happens immediately after check)
          try {
            const { error: insertError } = await supabase.from('notifications').insert({
              user_id: user.id,
              message: message,
              link_url: linkUrl,
              item_id: itemId,
              item_type: 'inventory',
              notification_type: notificationType,
            });
            if (insertError) throw insertError;
          } catch (error) {
              console.error("Error inserting low stock notification:", error);
            }
          // Check the destructured count variable
          } else if (!checkError && recentNotificationCount && recentNotificationCount > 0) {
              console.log(`[InventoryAlerts] Skipped low stock notification for item "${item.item_name}" (sent recently).`);
          }
      }

      // Check Expiring Soon
      if (item.expiry_date) {
        const expiryDateRaw = new Date(item.expiry_date);
        const expiryDate = new Date(expiryDateRaw.getFullYear(), expiryDateRaw.getMonth(), expiryDateRaw.getDate()); // Normalize expiry date to midnight

        console.log(`[InventoryAlerts] Checking expiry for item "${item.item_name}" (ID: ${itemId}). Expiry Date (normalized): ${expiryDate.toISOString()}`); // Log item check

        // Condition: Expiry date is on or after today AND on or before the threshold date
        // Remove useRef check (!notifiedExpiringIds.current.has(itemId)) - rely on DB throttling
        if (expiryDate >= today && expiryDate <= thresholdDate) {
          const notificationType = 'expiry_soon';
           const twelveHoursAgo = subHours(new Date(), 12);

           // Check if a similar notification was sent recently
           // Destructure count directly from the response object
          const { count: recentNotificationCount, error: checkError } = await supabase
             .from('notifications')
             .select('id', { count: 'exact', head: true })
             .eq('user_id', user.id)
            .eq('item_id', itemId)
            .eq('item_type', 'inventory')
            .eq('notification_type', notificationType)
            .gte('created_at', twelveHoursAgo.toISOString());

           if (checkError) {
            console.error("Error checking recent expiry notifications:", checkError);
            }

           // Check the destructured count variable
           if (!checkError && recentNotificationCount === 0) {
              console.log(`[InventoryAlerts] PASSED expiry check for item "${item.item_name}". Queueing notification.`);
              expiringIdsToNotify.add(itemId); // Still track for ref update if needed
              const message = `Item "${item.item_name}" is expiring on ${expiryDate.toLocaleDateString()}.`;
              const linkUrl = `/inventory?highlight=${itemId}`;
              const toastTag = `expiry-soon-${itemId}`;

              // Add to queue instead of showing immediately
              alertsToShow.push({
                 title: "Expiry Soon Alert",
                 description: message,
                 variant: "default",
                 tag: toastTag
              });

              // Show Desktop Notification (can still be immediate)
              showDesktopNotification("Expiry Soon Alert", { body: message, tag: toastTag });

              // Insert into DB Notifications (still happens immediately after check)
              try {
              const { error: insertError } = await supabase.from('notifications').insert({
                user_id: user.id,
                message: message,
                link_url: linkUrl,
                item_id: itemId,
                item_type: 'inventory',
                notification_type: notificationType,
              });
              if (insertError) throw insertError;
            } catch (error) {
                console.error("Error inserting expiry soon notification:", error);
              }
            // Check the destructured count variable
            } else if (!checkError && recentNotificationCount && recentNotificationCount > 0) {
                console.log(`[InventoryAlerts] Skipped expiry soon notification for item "${item.item_name}" (sent recently).`);
            }
        }
      }
    } // End of for...of loop

    // Update notified sets
    if (lowStockIdsToNotify.size > 0) {
      notifiedLowStockIds.current = new Set([...notifiedLowStockIds.current, ...lowStockIdsToNotify]);
    }
    if (expiringIdsToNotify.size > 0) {
      notifiedExpiringIds.current = new Set([...notifiedExpiringIds.current, ...expiringIdsToNotify]);
    }

    // Process the queued toasts with delays
    if (alertsToShow.length > 0) {
        console.log(`[InventoryAlerts] Processing ${alertsToShow.length} queued toasts...`);
        await delay(2000); // Increase initial delay to 1.5 seconds
        for (const alertInfo of alertsToShow) {
            console.log(`[InventoryAlerts] >>> Showing toast: ${alertInfo.title} - ${alertInfo.description}`);
            toast({
                title: alertInfo.title,
                description: alertInfo.description,
                variant: alertInfo.variant,
                duration: Infinity, // Make toast persistent until manually closed
            });
            console.log(`[InventoryAlerts] <<< Shown toast: ${alertInfo.title}`);
            await delay(2000); // Wait 1.5 seconds before showing the next toast
        }
        console.log(`[InventoryAlerts] Finished processing queued toasts.`);
    }

  }, [toast, user, showDesktopNotification]); // Add user and showDesktopNotification as dependencies

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
    // Only run fetch if user is loaded
    if (user) {
        fetchInitialData();
    }
  }, [checkAndNotify, user]); // Add user dependency

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
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Realtime channel error, attempting to resubscribe...', err);
          // Optional: Implement retry logic here if needed
        } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn(`Inventory Alert Realtime subscription ${status}.`, err);
          // Optional: Attempt to resubscribe or notify user
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
  // Re-subscribe if user changes (e.g., login/logout) or supabase client instance changes
  }, [supabase, checkAndNotify, user]); // Add user dependency

  // Placeholder return - this hook doesn't need to return anything for the UI
  return null;
}
