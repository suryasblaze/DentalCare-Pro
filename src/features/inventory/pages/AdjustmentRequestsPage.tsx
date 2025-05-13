import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { AdjustmentRequestItem } from '../components/AdjustmentRequestItem';
import { getPendingAdjustmentRequests, AdjustmentRequestDetails } from '../services/inventoryService';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const AdjustmentRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<AdjustmentRequestDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPendingAdjustmentRequests();
      setRequests(data);
    } catch (err) {
      console.error("Failed to fetch pending adjustment requests:", err);
      setError((err as Error).message || "Could not load requests.");
      toast({ variant: "destructive", title: "Error", description: "Failed to load pending adjustment requests." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleRequestProcessed = () => {
    // Refresh the list after a request is approved or rejected
    fetchRequests();
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <PageHeader
        heading="Pending Inventory Adjustment Requests"
        text="Review and process requests to adjust stock quantities."
      />

      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 border rounded-md">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-10 w-full mb-2" />
              <Skeleton className="h-20 w-full mb-4" />
              <div className="flex justify-end space-x-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-red-500 flex items-center bg-red-100 p-4 rounded-md">
          <AlertCircle className="mr-2 h-5 w-5" />
          <p>Error loading requests: {error}</p>
        </div>
      )}

      {!isLoading && !error && requests.length === 0 && (
        <p className="text-center text-gray-500 mt-8">No pending adjustment requests.</p>
      )}

      {!isLoading && !error && requests.length > 0 && (
        <div className="space-y-6">
          {requests.map(request => (
            <AdjustmentRequestItem
              key={request.id}
              request={request}
              onProcessed={handleRequestProcessed}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdjustmentRequestsPage;
