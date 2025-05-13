import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext'; // To get current user
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { BellRing, CheckCircle2, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Added missing import

interface Notification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  link_url: string | null;
  created_at: string;
}

const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setNotifications(data || []);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'Failed to load notifications.');
      toast({ title: 'Error', description: 'Could not load notifications.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications_user_${user.id}`)
      .on<Notification>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('Notification change received:', payload);
          fetchNotifications(); // Refetch on any change for simplicity
          // Optionally, show a toast for new notifications
          if (payload.eventType === 'INSERT') {
             toast({ title: 'New Notification', description: payload.new.message });
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to notifications channel');
        } else if (err) {
          console.error('Subscription error:', err);
        }
      });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications, toast]);


  const markAsRead = async (notificationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (updateError) throw updateError;
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (err: any) {
      console.error('Error marking notification as read:', err);
      toast({ title: 'Error', description: 'Could not mark notification as read.', variant: 'destructive' });
    }
  };
  
  const markAllAsRead = async () => {
    if (!user) return;
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false); // Only update unread ones
      if (updateError) throw updateError;
      fetchNotifications(); // Refresh the list
      toast({ title: 'Success', description: 'All notifications marked as read.' });
    } catch (err: any) {
      console.error('Error marking all notifications as read:', err);
      toast({ title: 'Error', description: 'Could not mark all notifications as read.', variant: 'destructive' });
    }
  };


  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <PageHeader heading="Notifications" />
        <div className="mt-4 space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <PageHeader heading="Notifications" />
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-4">
        <PageHeader heading="Notifications" className="mb-0" />
        {notifications.some(n => !n.is_read) && (
          <Button onClick={markAllAsRead} size="sm">Mark All as Read</Button>
        )}
      </div>
      
      {notifications.length === 0 ? (
        <p className="text-center text-gray-500 mt-8">You have no notifications.</p>
      ) : (
        <div className="space-y-4">
          {notifications.map(notification => (
            <Card key={notification.id} className={`${notification.is_read ? 'bg-gray-50 opacity-70' : 'bg-white'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <BellRing className="mr-2 h-5 w-5 text-primary" />
                  Notification
                </CardTitle>
                <CardDescription>
                  {new Date(notification.created_at).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>{notification.message}</p>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                {!notification.is_read && (
                  <Button variant="outline" size="sm" onClick={() => markAsRead(notification.id)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Read
                  </Button>
                )}
                {notification.link_url && (
                  <Button variant="default" size="sm" asChild>
                    <Link to={notification.link_url}>View Details</Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
