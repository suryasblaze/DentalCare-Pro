import { useEffect, useState } from 'react';
import { subscribeToChanges } from '../api';

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
    const subscription = subscribeToChanges(table, (payload) => {
      setIsActive(true);
      
      if (callback) {
        callback(payload);
      }
    });
    
    setIsActive(true);
    
    return () => {
      subscription.unsubscribe();
      setIsActive(false);
    };
  }, [table, callback]);
  
  return isActive;
}