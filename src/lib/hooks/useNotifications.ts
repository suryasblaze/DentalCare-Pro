import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/use-toast'; // Import toast for error feedback
// Import necessary types from supabase-js
import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  REALTIME_SUBSCRIBE_STATES
} from '@supabase/supabase-js';

// Define DbNotification type matching the database structure
// (Could be imported from a central types file if available)
interface DbNotification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  link_url?: string | null;
  created_at: string; // ISO string from DB
}

const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<DbNotification[]>([]); // Use DbNotification type
  const channelRef = useRef<RealtimeChannel | null>(null); // Use RealtimeChannel type

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications:', error);
        toast({
          title: "Error",
          description: "Could not fetch notifications.",
          variant: "destructive",
        });
      } else {
        setNotifications(data || []);
      }
    };

    fetchNotifications();

    // Ensure channel is only created once and cleaned up properly
    if (!channelRef.current && user) { // Check user exists before creating channel
        // Revert to a simpler, potentially more stable channel name
        // Ensure RLS is configured properly in Supabase for 'notifications' table
        // or rely on the filter below.
        const channelName = `notifications-channel-${user.id}`; // User-specific but simple name
        console.log(`Attempting to subscribe to channel: ${channelName}`);
        channelRef.current = supabase.channel(channelName);

        channelRef.current
          .on<DbNotification>( // Use DbNotification type for payload
            'postgres_changes',
            {
              event: 'INSERT', // Only listen for new inserts
              schema: 'public',
              table: 'notifications',
              // Filter client-side if RLS isn't fully handling it,
              // though server-side filtering via RLS is preferred.
              // Let's keep the filter here for robustness.
              filter: `user_id=eq.${user.id}`
            },
            // Add explicit type for the payload
            (payload: RealtimePostgresChangesPayload<DbNotification>) => {
              // Check if the payload is for an INSERT event and has new data
              if (payload.eventType === 'INSERT' && payload.new) {
                  console.log('New notification received:', payload.new);
                  // Add the new notification to the beginning of the list, ensuring no duplicates
                  setNotifications((prevNotifications) => {
                      // Check if notification already exists (e.g., from initial fetch)
                      if (prevNotifications.some(n => n.id === payload.new.id)) {
                          return prevNotifications;
                      }
                      return [payload.new, ...prevNotifications];
                  });
              } else {
                 // Handle other event types or errors if necessary
                 console.log('Received non-insert or unexpected payload:', payload);
              }
            }
          )
           // Add explicit types for status and err
          .subscribe((status: `${REALTIME_SUBSCRIBE_STATES}`, err?: Error) => {
            console.log(`Channel ${channelName} subscription status: ${status}`); // Log status changes
            if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
              console.log(`Successfully subscribed to notifications channel: ${channelName}`);
            } else if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) {
              console.error(`Notifications subscription error on channel ${channelName}:`, err);
              toast({
                title: "Realtime Error",
                description: `Connection error for notifications: ${err?.message || 'Unknown error'}`,
                variant: "destructive",
              });
            } else if (status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT) {
               console.warn(`Notifications subscription timed out on channel ${channelName}.`);
               toast({
                 title: "Realtime Warning",
                 description: "Notification connection timed out.",
                 variant: "default",
               });
            } else if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
                console.log(`Notifications channel closed: ${channelName}.`);
            }
          });
    }

    // Cleanup function
    return () => {
      if (channelRef.current) {
        const currentChannel = channelRef.current; // Capture ref before potential async operations
        const currentChannelName = currentChannel.topic; // Get channel name for logging
        console.log(`Attempting to unsubscribe from channel: ${currentChannelName}`);
        supabase.removeChannel(currentChannel)
          .then((status) => {
            console.log(`Unsubscribed from notifications channel ${currentChannelName}:`, status);
          })
          .catch(error => {
            console.error(`Error removing notifications channel ${currentChannelName}:`, error);
          })
          .finally(() => {
             // Ensure ref is cleared even if removeChannel fails,
             // but only if it hasn't been replaced by a new effect run.
             if (channelRef.current === currentChannel) {
                channelRef.current = null;
             }
          });
      }
    };
  }, [user]); // Re-run effect if user changes

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
    } else {
      // Optimistically update the UI
      setNotifications((prevNotifications) => // Type is inferred
        prevNotifications.map((notification) =>
          notification.id === notificationId ? { ...notification, is_read: true } : notification
        )
      );
    }
  };

  return { notifications, markAsRead };
};

export default useNotifications;
