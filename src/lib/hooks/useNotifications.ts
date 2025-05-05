import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/use-toast'; // Import toast for error feedback
import type { InventoryNotification, InventoryNotificationInsert } from '@/types'; // Added InventoryNotificationInsert
import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  REALTIME_SUBSCRIBE_STATES
} from '@supabase/supabase-js';

// Define DbNotification type matching the database structure
type DbNotification = InventoryNotification;

const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InventoryNotification[]>([]); 
  const channelRef = useRef<RealtimeChannel | null>(null); 

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('inventory_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching inventory notifications:', error);
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
              table: 'inventory_notifications',
              filter: `user_id=eq.${user.id}`
            },
            (payload: RealtimePostgresChangesPayload<DbNotification>) => {
              if (payload.eventType === 'INSERT' && payload.new) {
                  console.log('New notification received:', payload.new);
                  setNotifications((prevNotifications) => {
                      if (prevNotifications.some(n => n.id === payload.new.id)) {
                          return prevNotifications;
                      }
                      return [payload.new, ...prevNotifications];
                  });
              } else {
                 console.log('Received non-insert or unexpected payload:', payload);
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
      .from('inventory_notifications')
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
        .from('inventory_notifications')
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
      const notificationData: InventoryNotificationInsert = {
        user_id: userId,
        message,
        link_url: linkUrl,
        is_read: false,
      };

      const { data, error } = await supabase
        .from('inventory_notifications')
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
    // Optimistically update UI first for better perceived performance
    setNotifications((prevNotifications) =>
      prevNotifications.filter((notification) => notification.id !== notificationId)
    );

    // Then, attempt to delete from the database
    const { error } = await supabase
      .from('inventory_notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: "Error",
        description: "Could not clear notification. Please try again.",
        variant: "destructive",
      });
      // Optional: Revert UI change if deletion fails (fetch notifications again or add back)
      // For simplicity, we'll leave the UI optimistic for now.
    } else {
      console.log('Notification cleared successfully:', notificationId);
      // Optionally show a success toast
      // toast({ title: "Notification Cleared" });
    }
  };


  return { notifications, markAsRead, createNotification, clearNotification }; // Return the new function
};

export default useNotifications;
