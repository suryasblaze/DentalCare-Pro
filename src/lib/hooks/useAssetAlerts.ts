import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Database } from '../../../supabase_types'; // Use relative path from src/lib/hooks
import { subHours } from 'date-fns'; // Import date-fns function for throttling check
import {
  RealtimeChannel,
  RealtimePostgresChangesPayload, // Import this type
  REALTIME_SUBSCRIBE_STATES
} from '@supabase/supabase-js';

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Define AssetRow type using the Database type
type AssetRow = Database['public']['Tables']['assets']['Row'];

const ALERT_THRESHOLD_DAYS = 30; // Notify if due/expiring within 30 days

export function useAssetAlerts() {
  console.log('[AssetAlerts] Hook initializing...'); // Log hook initialization
  const { toast } = useToast();
  const { user } = useAuth();
  // Refs to track items already notified in this session
  const notifiedMaintenanceIds = useRef<Set<string>>(new Set());
  const notifiedWarrantyIds = useRef<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Function to request permission and show desktop notification (copied from useInventoryAlerts)
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
      askPermissionAndShow();
    }
  }, []);

  // Function to check assets and trigger notifications
  const checkAndNotifyAssets = useCallback(async (assets: AssetRow[]) => {
    console.log('[AssetAlerts] checkAndNotifyAssets called with:', assets); // Log function call
    if (!user) {
        console.log('[AssetAlerts] checkAndNotifyAssets skipped (no user).');
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date to midnight

    const thresholdDate = new Date(today);
    thresholdDate.setDate(today.getDate() + ALERT_THRESHOLD_DAYS);

    console.log(`[AssetAlerts] Check running. Today (normalized): ${today.toISOString()}, Threshold Date: ${thresholdDate.toISOString()}`);

    const maintenanceIdsToNotify = new Set<string>();
    const warrantyIdsToNotify = new Set<string>();
    const alertsToShow: Array<{ title: string; description: string; variant: "default" | "destructive" | "warning"; tag?: string }> = []; // Array to collect toasts

    for (const asset of assets) {
      const assetId = asset.id;

      // Check Next Maintenance Due Date
      if (asset.next_maintenance_due_date) {
        const maintenanceDateRaw = new Date(asset.next_maintenance_due_date);
        const maintenanceDate = new Date(maintenanceDateRaw.getFullYear(), maintenanceDateRaw.getMonth(), maintenanceDateRaw.getDate()); // Normalize

        console.log(`[AssetAlerts] Checking maintenance for asset "${asset.asset_name}" (ID: ${assetId}). Due Date (normalized): ${maintenanceDate.toISOString()}`);

        // Remove useRef check (!notifiedMaintenanceIds.current.has(assetId)) - rely on DB throttling
        if (maintenanceDate >= today && maintenanceDate <= thresholdDate) {
          const notificationType = 'maintenance_due';
          const twelveHoursAgo = subHours(new Date(), 12);

          // Check if a similar notification was sent recently
          const { count: recentNotificationCount, error: checkError } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('item_id', assetId)
            .eq('item_type', 'asset')
            .eq('notification_type', notificationType)
            .gte('created_at', twelveHoursAgo.toISOString());

          if (checkError) {
             console.error("Error checking recent maintenance notifications:", checkError);
           } else {
             console.log(`[AssetAlerts] Maintenance Throttling Check Result for ${asset.asset_name}: Count=${recentNotificationCount}`); // Log throttling result
           }

          if (!checkError && recentNotificationCount === 0) {
             console.log(`[AssetAlerts] PASSED maintenance check for asset "${asset.asset_name}". Triggering notification.`);
             maintenanceIdsToNotify.add(assetId);
             const message = `Asset "${asset.asset_name}" requires maintenance by ${maintenanceDate.toLocaleDateString()}.`;
            const linkUrl = `/assets?highlight=${assetId}`;
            const toastTag = `maintenance-due-${assetId}`;

            // Add to queue instead of showing immediately
            alertsToShow.push({
              title: "Maintenance Due Soon",
              description: message,
              variant: "default",
              tag: toastTag
            });

            // Show Desktop Notification (can still be immediate)
            showDesktopNotification("Maintenance Due Soon", { body: message, tag: toastTag });

            // Insert into DB Notifications (still happens immediately after check)
            try {
              const { error: insertError } = await supabase.from('notifications').insert({
                user_id: user.id,
                message: message,
                link_url: linkUrl,
                item_id: assetId,
                item_type: 'asset',
                notification_type: notificationType,
              });
              if (insertError) throw insertError;
            } catch (error) {
              console.error("Error inserting maintenance notification:", error);
            }
          } else if (!checkError && recentNotificationCount && recentNotificationCount > 0) {
              console.log(`[AssetAlerts] Skipped maintenance notification for asset "${asset.asset_name}" (sent recently).`);
          }
        }
      }

      // Check Warranty Expiry Date
      if (asset.warranty_expiry_date) {
        const warrantyDateRaw = new Date(asset.warranty_expiry_date);
        const warrantyDate = new Date(warrantyDateRaw.getFullYear(), warrantyDateRaw.getMonth(), warrantyDateRaw.getDate()); // Normalize

        console.log(`[AssetAlerts] Checking warranty for asset "${asset.asset_name}" (ID: ${assetId}). Expiry Date (normalized): ${warrantyDate.toISOString()}`);

        // Remove useRef check (!notifiedWarrantyIds.current.has(assetId)) - rely on DB throttling
        if (warrantyDate >= today && warrantyDate <= thresholdDate) {
          const notificationType = 'warranty_expiry';
          const twelveHoursAgo = subHours(new Date(), 12);

          // Check if a similar notification was sent recently
          const { count: recentNotificationCount, error: checkError } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('item_id', assetId)
            .eq('item_type', 'asset')
            .eq('notification_type', notificationType)
            .gte('created_at', twelveHoursAgo.toISOString());

          if (checkError) {
             console.error("Error checking recent warranty notifications:", checkError);
           } else {
             console.log(`[AssetAlerts] Warranty Throttling Check Result for ${asset.asset_name}: Count=${recentNotificationCount}`); // Log throttling result
           }

          if (!checkError && recentNotificationCount === 0) {
             console.log(`[AssetAlerts] PASSED warranty check for asset "${asset.asset_name}". Triggering notification.`);
             warrantyIdsToNotify.add(assetId);
             const message = `Warranty for asset "${asset.asset_name}" expires on ${warrantyDate.toLocaleDateString()}.`;
            const linkUrl = `/assets?highlight=${assetId}`;
            const toastTag = `warranty-expiry-${assetId}`;

            // Add to queue instead of showing immediately
            alertsToShow.push({
              title: "Warranty Expiring Soon",
              description: message,
              variant: "default",
              tag: toastTag
            });

            // Show Desktop Notification (can still be immediate)
            showDesktopNotification("Warranty Expiring Soon", { body: message, tag: toastTag });

            // Insert into DB Notifications (still happens immediately after check)
            try {
              const { error: insertError } = await supabase.from('notifications').insert({
                user_id: user.id,
                message: message,
                link_url: linkUrl,
                item_id: assetId,
                item_type: 'asset',
                notification_type: notificationType,
              });
              if (insertError) throw insertError;
            } catch (error) {
              console.error("Error inserting warranty notification:", error);
            }
          } else if (!checkError && recentNotificationCount && recentNotificationCount > 0) {
              console.log(`[AssetAlerts] Skipped warranty notification for asset "${asset.asset_name}" (sent recently).`);
          }
        }
      }
    } // End for...of loop

    // Update notified sets
    if (maintenanceIdsToNotify.size > 0) {
      notifiedMaintenanceIds.current = new Set([...notifiedMaintenanceIds.current, ...maintenanceIdsToNotify]);
    }
    if (warrantyIdsToNotify.size > 0) {
      notifiedWarrantyIds.current = new Set([...notifiedWarrantyIds.current, ...warrantyIdsToNotify]);
    }

    // Process the queued toasts with delays
    if (alertsToShow.length > 0) {
        console.log(`[AssetAlerts] Processing ${alertsToShow.length} queued toasts...`);
        await delay(2000); // Increase initial delay to 1.5 seconds
        for (const alertInfo of alertsToShow) {
            console.log(`[AssetAlerts] >>> Showing toast: ${alertInfo.title} - ${alertInfo.description}`);
            toast({
                title: alertInfo.title,
                description: alertInfo.description,
                variant: alertInfo.variant,
                duration: Infinity, // Make toast persistent until manually closed
            });
            console.log(`[AssetAlerts] <<< Shown toast: ${alertInfo.title}`);
            await delay(2000); // Wait 1.5 seconds before showing the next toast
        }
        console.log(`[AssetAlerts] Finished processing queued toasts.`);
    }

  }, [toast, user, showDesktopNotification]);

   // Initial fetch on mount
   useEffect(() => {
     const fetchInitialData = async () => {
       console.log('[AssetAlerts] Starting initial fetch...'); // Log fetch start
       try {
         const { data, error } = await supabase.from('assets').select('*');
         if (error) {
            console.error("Error fetching initial assets for alerts:", error); // Log fetch error
            throw error;
         }
         if (data) {
            console.log('[AssetAlerts] Initial fetch successful, data:', data); // Log fetch success
          checkAndNotifyAssets(data as AssetRow[]);
         } else {
            console.log('[AssetAlerts] Initial fetch returned no data.');
         }
       } catch (error) {
         // Error already logged above
       }
     };
     if (user) {
        console.log('[AssetAlerts] User found, calling fetchInitialData.');
      fetchInitialData();
    }
  }, [checkAndNotifyAssets, user]);

  // Realtime subscription logic for assets table
  useEffect(() => {
    if (!supabase || !user) return; // Ensure supabase client and user are available

    // Add RealtimePostgresChangesPayload to the import list at the top
    const handleAssetChange = (payload: RealtimePostgresChangesPayload<AssetRow>) => {
      console.log('[AssetAlerts] Asset change detected:', payload);
      const changedAsset = payload.new as AssetRow;
      if (changedAsset) {
        // Re-check the status of the changed asset
        checkAndNotifyAssets([changedAsset]);

        // Optional: Logic to remove from notified sets if date changes beyond threshold
        // (More complex than inventory quantity check, might skip for simplicity unless needed)
        // Example: If maintenance date is pushed out
        // if (asset.next_maintenance_due_date) { ... check if > thresholdDate ... notifiedMaintenanceIds.current.delete(assetId); }
      }
    };

    const assetChannelName = `asset-alerts-channel-${user.id}`;
    console.log(`[AssetAlerts] Attempting to subscribe to channel: ${assetChannelName}`);
    channelRef.current = supabase
      .channel(assetChannelName)
      .on<AssetRow>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assets' }, // Listen to all changes on assets table
        handleAssetChange
      )
      .subscribe((status, err) => {
         console.log(`[AssetAlerts] Channel ${assetChannelName} subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          // console.log(`[AssetAlerts] Subscribed to asset alerts channel: ${assetChannelName}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`[AssetAlerts] Asset Alert Realtime subscription ${status} on ${assetChannelName}:`, err);
        }
      });

    // Cleanup function
    return () => {
      const currentChannel = channelRef.current;
      if (currentChannel) {
        const currentChannelName = currentChannel.topic;
        console.log(`[AssetAlerts] Attempting to unsubscribe from channel: ${currentChannelName}`);
        supabase.removeChannel(currentChannel)
          .catch((err) => console.error(`[AssetAlerts] Error removing asset alert channel ${currentChannelName}:`, err))
          .finally(() => {
             if (channelRef.current === currentChannel) {
                channelRef.current = null;
             }
          });
      }
    };
  }, [supabase, checkAndNotifyAssets, user]); // Add dependencies

  // This hook doesn't need to return anything for the UI
  return null;
}
