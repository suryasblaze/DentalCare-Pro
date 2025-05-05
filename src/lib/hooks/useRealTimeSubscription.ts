import { useEffect, useState } from 'react';
import { subscribeToChanges } from '../api';

// Define a type for the subscription object
type Subscription = {
  unsubscribe: () => void;
};

/**
 * Hook for subscribing to real-time changes in Supabase tables
 * @param table Table name to subscribe to
 * @param callback Optional callback to handle updates
 * @returns Whether the subscription is active
 */
export function useRealTimeSubscription(
  table: string,
  callback?: (payload: any) => void
) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let subscription: Subscription | undefined;
    try {
      subscription = subscribeToChanges(table, (payload) => {
        if (callback) {
          callback(payload);
        }
      });
      setIsActive(true);
    } catch (error) {
      console.error('Error subscribing to changes:', error);
      setIsActive(false);
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      setIsActive(false);
    };
  }, [table, callback]);

  return isActive;
}
