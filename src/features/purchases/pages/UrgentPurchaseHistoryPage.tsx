import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { useAuth } from '@/context/AuthContext'; // To check user role for fetching all if admin/owner
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listUrgentPurchases } from '@/features/purchases/services/urgentPurchaseService';
import { UrgentPurchase } from '@/features/purchases/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge'; // For status display

const isValidDate = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

const UrgentPurchaseHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [purchaseHistory, setPurchaseHistory] = useState<UrgentPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPurchaseHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all urgent purchases.
      // Add role-based filtering if non-admins should see a limited history.
      // For now, fetches all records accessible by RLS.
      const history = await listUrgentPurchases();
      setPurchaseHistory(history);
    } catch (error) {
      console.error("Error fetching urgent purchase history:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load urgent purchase history." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPurchaseHistory();
  }, [fetchPurchaseHistory]);

  const handleViewDetails = (purchaseId: string) => {
    navigate(`/purchases/urgent/${purchaseId}`);
  };
  
  // Helper to display user ID or a placeholder. Ideally, fetch profile names.
  const displayUserId = (userId: string | null | undefined) => {
    if (!userId) return 'N/A';
    return userId.substring(0, 8) + '...'; // Shorten for display
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <PageHeader
        heading="Urgent Purchase Modification History"
        text="View the history and status of all urgent purchase entries."
      >
        <Button variant="outline" asChild>
          <Link to="/purchases/urgent">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Urgent Purchases
          </Link>
        </Button>
      </PageHeader>
      <div className="mt-6">
        {isLoading ? (
          <p>Loading history...</p>
        ) : purchaseHistory.length === 0 ? (
          <Card>
            <CardHeader><CardTitle>No Urgent Purchase History Found</CardTitle></CardHeader>
            <CardContent><p>There are no urgent purchase entries in the system yet.</p></CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Urgent Purchase History</CardTitle>
              <CardDescription>{purchaseHistory.length} record(s) found.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID / Slip</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead>Reviewed By</TableHead>
                    <TableHead>Reviewed At</TableHead>
                    <TableHead>Reviewer Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseHistory.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{req.slip_filename || req.id.substring(0, 8) + '...'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          req.status === 'approved' ? 'default' : // Using default for green-like
                          req.status === 'rejected' ? 'destructive' :
                          req.status === 'pending_approval' ? 'outline' : // Yellow-like with outline
                          req.status === 'draft' ? 'secondary' : // Gray-like
                          'secondary' // Default for other statuses
                        }
                        className={
                          req.status === 'approved' ? 'bg-green-100 text-green-700 border-green-300' :
                          req.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-300' :
                          req.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                           '' // No extra class for draft or others using Badge's secondary
                        }>
                          {req.status ? req.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>{displayUserId(req.requested_by_user_id)}</TableCell>
                      <TableCell>{isValidDate(req.requested_at) ? format(new Date(req.requested_at), 'PPp') : 'N/A'}</TableCell>
                      <TableCell>{displayUserId(req.reviewed_by_user_id)}</TableCell>
                      <TableCell>{isValidDate(req.reviewed_at) ? format(new Date(req.reviewed_at!), 'PPp') : 'N/A'}</TableCell> 
                      <TableCell className="max-w-xs truncate" title={req.reviewer_notes || undefined}>
                        {req.reviewer_notes || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(req.id)}>
                          <Eye className="mr-1 h-4 w-4" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UrgentPurchaseHistoryPage;
