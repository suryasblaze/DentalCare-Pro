import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listUrgentPurchases } from '@/features/purchases/services/urgentPurchaseService';
import { UrgentPurchase } from '@/features/purchases/types';
import { format } from 'date-fns';

const isValidDate = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

const UrgentPurchaseMyRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [myUrgentPurchases, setMyUrgentPurchases] = useState<UrgentPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMyUrgentPurchases = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      toast({ variant: "destructive", title: "Error", description: "User not found. Please log in." });
      return;
    }
    setIsLoading(true);
    try {
      const requests = await listUrgentPurchases({ requested_by_user_id: user.id });
      setMyUrgentPurchases(requests);
    } catch (error) {
      console.error("Error fetching your urgent purchase requests:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load your urgent purchase requests." });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    fetchMyUrgentPurchases();
  }, [fetchMyUrgentPurchases]);

  const handleViewDetails = (purchaseId: string) => {
    navigate(`/purchases/urgent/${purchaseId}`);
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <PageHeader
        heading="My Urgent Purchase Requests"
        text="View your urgent purchase requests and their status."
      >
        <Button variant="outline" asChild>
          <Link to="/purchases/urgent">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Urgent Purchases
          </Link>
        </Button>
      </PageHeader>
      <div className="mt-6">
        {isLoading ? (
          <p>Loading your requests...</p>
        ) : myUrgentPurchases.length === 0 ? (
          <Card>
            <CardHeader><CardTitle>No Urgent Purchase Requests Found</CardTitle></CardHeader>
            <CardContent><p>You have not made any urgent purchase requests yet.</p></CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Your Urgent Purchase Requests</CardTitle>
              <CardDescription>{myUrgentPurchases.length} request(s) found.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request ID / Slip</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myUrgentPurchases.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{req.slip_filename || req.id.substring(0, 8) + '...'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          req.status === 'approved' ? 'bg-green-100 text-green-700' :
                          req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          req.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-700' :
                          req.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                          'bg-blue-100 text-blue-700' // Default for other statuses
                        }`}>
                          {req.status ? req.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>{isValidDate(req.requested_at) ? format(new Date(req.requested_at), 'PPpp') : 'N/A'}</TableCell>
                      <TableCell>{isValidDate(req.updated_at) ? format(new Date(req.updated_at), 'PPpp') : 'N/A'}</TableCell>
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

export default UrgentPurchaseMyRequestsPage;
