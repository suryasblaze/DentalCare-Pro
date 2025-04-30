import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/use-toast'; // Import toast for error feedback
import type { InventoryNotification } from '@/types';
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
      const { data, error } = await supabase
        .from('inventory_notifications')
        .insert([
          {
            user_id: userId,
            message,
            link_url: linkUrl,
            is_read: false,
          },
        ])
        .select();

      if (error) {
        console.error('Error creating notification:', error);
      } else {
        console.log('Notification created:', data);
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

  return { notifications, markAsRead, createNotification };
};

export default useNotifications;
