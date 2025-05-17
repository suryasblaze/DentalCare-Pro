import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/use-toast'; // Import toast for error feedback
// Remove InventoryNotification specific types if not needed for the general table
// import type { InventoryNotification, InventoryNotificationInsert } from '@/types';
import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  REALTIME_SUBSCRIBE_STATES
} from '@supabase/supabase-js';

// Define DbNotification type matching the 'notifications' table structure from migration 20250401105100
interface DbNotification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean; // NOT NULL in the target table
  link_url: string | null; // Nullable
  created_at: string; // NOT NULL
}

// Define Insert type for the 'notifications' table
interface DbNotificationInsert {
  user_id: string;
  message: string;
  link_url?: string | null; // Optional on insert
  is_read?: boolean; // Optional on insert, defaults to false in DB
  // created_at defaults to now() in DB
}


const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<DbNotification[]>([]); // Use the new type
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications') // Changed table name
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false) // Only fetch unread notifications
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notifications from `notifications` table:', error); // More specific log
        toast({
          title: "Error",
          description: "Could not fetch notifications.", // Keep user message simple
          variant: "destructive",
        });
      } else {
        console.log('Fetched notifications:', data); // Log fetched data
        setNotifications(data || []);
      }
    };

    fetchNotifications(); // Fetch on initial load or user change

    // Ensure channel is only created once and cleaned up properly
    if (!channelRef.current && user) { 
        const channelName = `notifications-channel-${user.id}`; 
        console.log(`Attempting to subscribe to channel: ${channelName}`);
        channelRef.current = supabase.channel(channelName);

        channelRef.current
          .on<DbNotification>( 
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications', // Changed table name
              filter: `user_id=eq.${user.id}`
            },
            (payload: RealtimePostgresChangesPayload<DbNotification>) => {
              console.log('[useNotifications] Realtime event received:', payload); // Log all events
              if (payload.eventType === 'INSERT' && payload.new) {
                  const newNotification = payload.new as DbNotification;
                  console.log('[useNotifications] Realtime INSERT detected:', newNotification);

                  // Add more logging around state update
                  setNotifications((prevNotifications) => {
                      console.log('[useNotifications] Attempting state update via realtime. Prev length:', prevNotifications.length);
                      // Prevent duplicates if realtime event arrives slightly delayed after fetch
                      if (prevNotifications.some(n => n.id === newNotification.id)) {
                          console.log(`[useNotifications] Duplicate notification ID ${newNotification.id} detected in realtime update, skipping state update.`);
                          return prevNotifications; // Return previous state if duplicate
                      }
                      const newState = [newNotification, ...prevNotifications];
                      console.log('[useNotifications] State update successful via realtime. New length:', newState.length);
                      return newState; // Return new state
                  });
              } else {
                 console.log('[useNotifications] Received non-insert or unexpected payload via realtime:', payload); // Clarify log source
              }
            }
          )
          .subscribe((status: `${REALTIME_SUBSCRIBE_STATES}`, err?: Error) => {
            console.log(`Channel ${channelName} subscription status: ${status}`); 
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

    return () => {
      if (channelRef.current) {
        const currentChannel = channelRef.current; 
        const currentChannelName = currentChannel.topic; 
        console.log(`Attempting to unsubscribe from channel: ${currentChannelName}`);
        supabase.removeChannel(currentChannel)
          .then((status) => {
            console.log(`Unsubscribed from notifications channel ${currentChannelName}:`, status);
          })
          .catch(error => {
            console.error(`Error removing notifications channel ${currentChannelName}:`, error);
          })
          .finally(() => {
             if (channelRef.current === currentChannel) {
                channelRef.current = null;
             }
          });
      }
    };
  }, [user]); 

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications') // Changed table name
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
    } else {
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notification.id === notificationId ? { ...notification, is_read: true } : notification
        )
      );
    }
  };

  const createNotification = async (userId: string, message: string, linkUrl?: string) => {
    try {
      // 1. Calculate the timestamp for 2 hours ago
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
      const twoHoursAgoISO = twoHoursAgo.toISOString();

      // 2. Check for recent identical notifications
      // Use { count: 'exact', head: true } which returns { count: number | null, data: null, error: ... }
      const { count: existingNotificationCount, error: checkError } = await supabase
        .from('notifications') // Changed table name
        .select('*', { count: 'exact', head: true }) // Select '*' but only get count due to head:true
        .eq('user_id', userId)
        .eq('message', message) // Match the exact message
        .gte('created_at', twoHoursAgoISO); // Check if created within the last 2 hours

      if (checkError) {
        console.error('Error checking for existing notifications:', checkError);
        // Proceed with creation despite the check error? Or handle differently?
        // For now, let's log the error and proceed cautiously.
      }

      // 3. If a recent identical notification exists (count > 0), skip creation
      if (existingNotificationCount && existingNotificationCount > 0) {
        console.log(`Skipping notification creation: Identical notification found within the last 2 hours for message: "${message}"`);
        return; // Exit the function
      }

      // 4. If no recent identical notification, proceed with creation
      const notificationData: DbNotificationInsert = { // Use the new insert type
        user_id: userId,
        message,
        link_url: linkUrl,
        is_read: false, // Explicitly set default
      };

      const { data, error } = await supabase
        .from('notifications') // Changed table name
        .insert([notificationData])
        .select();

      if (error) {
        console.error('Error creating notification:', error);
        toast({ // Added toast for creation error
          title: "Error",
          description: `Could not create notification: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log('Notification created:', data);
        // Trigger browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Notification', {
            body: message,
            icon: '/dentalcarelogo.png',
          });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new Notification('New Notification', {
                body: message,
                icon: '/dentalcarelogo.png',
              });
            }
          });
        }
      }
    } catch (err) {
      console.error('Error creating notification:', err);
    }
  };

  // Function to clear/delete a notification
  const clearNotification = async (notificationId: string) => {
    // Optimistically update UI by marking as read (or filtering, depending on desired behavior)
    // For "don't show again", marking as read and filtering is the goal.
    setNotifications((prevNotifications) =>
      prevNotifications.map((notification) =>
        notification.id === notificationId ? { ...notification, is_read: true } : notification
      ).filter(notification => !(notification.id === notificationId && notification.is_read)) // Immediately hide it
    );

    // Then, attempt to mark as read in the database
    const { error } = await supabase
      .from('notifications') // Changed table name
      .update({ is_read: true }) // Mark as read
      .eq('id', notificationId)
      .eq('user_id', user?.id); // Ensure user can only update their own

    if (error) {
      console.error('Error marking notification as read (clearing):', error);
      // Revert optimistic update if db update fails
      // This requires fetching the original state or simply re-fetching all notifications
      // For simplicity here, we'll log and the user might see it reappear on next full fetch if error persists
      // A more robust solution would be to revert the specific notification's is_read status locally.
      toast({
        title: "Error",
        description: "Could not clear notification. It may reappear.",
        variant: "destructive",
      });
      // Attempt to refetch or revert
      // For now, we will filter it out locally, but if the DB call failed, it will come back on refresh
      // A proper revert would be:
      // setNotifications((prevNotifications) =>
      //   prevNotifications.map((notification) =>
      //     notification.id === notificationId ? { ...notification, is_read: false } : notification // Revert
      //   )
      // );
    } else {
      // Successfully marked as read in DB.
      // The local state is already updated to hide it.
      // If we want to keep it in the list but styled as "read", the filter in setNotifications would be removed.
      // Since the goal is to "not show again", filtering it out after marking as read is appropriate.
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  const deleteNotificationPermanently = async (notificationId: string) => {
    // ... existing code ...
  };

  return { notifications, markAsRead, createNotification, clearNotification }; // Return the new function
};

export default useNotifications;
