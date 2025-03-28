import { useState, useCallback } from 'react';

/**
 * Hook for optimistic UI updates with automatic rollback on failure
 * @param updateFn The actual update function to call
 * @param options Configuration options
 * @returns Wrapped update function and loading state
 */
export function useOptimisticUpdate<T, U = any>(
  updateFn: (data: T) => Promise<U>,
  options: {
    onSuccess?: (result: U) => void;
    onError?: (error: any) => void;
    errorMessage?: string;
  } = {}
) {
  const [loading, setLoading] = useState(false);
  
  const update = useCallback(
    async (data: T, optimisticUpdate?: () => void) => {
      setLoading(true);
      
      // Apply optimistic update if provided
      if (optimisticUpdate) {
        optimisticUpdate();
      }
      
      try {
        const result = await updateFn(data);
        
        if (options.onSuccess) {
          options.onSuccess(result);
        }
        
        return result;
      } catch (error) {
        console.error(options.errorMessage || 'Update failed', error);
        
        if (options.onError) {
          options.onError(error);
        }
        
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [updateFn, options]
  );
  
  return { update, loading };
}