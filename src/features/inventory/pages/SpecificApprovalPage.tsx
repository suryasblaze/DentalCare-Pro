import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { 
    verifyAndGetAdjustmentRequest, 
    VerifiedAdjustmentRequestDetails,
    getAdjustmentPhotoUrl,
    approveAdjustmentRequest,
    rejectAdjustmentRequest
} from '../services/inventoryService';

const SpecificApprovalPage: React.FC = () => {
  const { requestId, approvalToken } = useParams<{ requestId: string; approvalToken: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [requestDetails, setRequestDetails] = useState<VerifiedAdjustmentRequestDetails | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchRequestForApproval = useCallback(async () => {
    if (!requestId || !approvalToken) {
      setError("Request ID or approval token is missing.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await verifyAndGetAdjustmentRequest(requestId, approvalToken);
      if (data) {
        setRequestDetails(data);
        if (data.photo_url) {
          getAdjustmentPhotoUrl(data.photo_url)
            .then(url => setPhotoUrl(url))
            .catch(err => console.error("Failed to load photo for approval page", err));
        }
      } else {
        setError("Invalid or expired approval link, or request not found/pending.");
      }
    } catch (err) {
      console.error("Error fetching request for approval:", err);
      setError((err as Error).message || "Could not load request details.");
    } finally {
      setIsLoading(false);
    }
  }, [requestId, approvalToken]);

  useEffect(() => {
    fetchRequestForApproval();
  }, [fetchRequestForApproval]);

  const handleApprove = async () => {
    if (!user?.id || !requestDetails) return;
    if (user.id === requestDetails.requested_by_user_id) {
        toast({ variant: "destructive", title: "Action Denied", description: "You cannot approve your own request." });
        return;
    }
    setIsProcessing(true);
    try {
      await approveAdjustmentRequest(requestDetails.id, user.id, reviewerNotes);
      toast({ title: "Success", description: "Request approved and stock updated." });
      // Optionally navigate away or show a success message and disable buttons
      navigate('/inventory/adjustment-requests'); // Or to dashboard
    } catch (error) {
      toast({ variant: "destructive", title: "Approval Failed", description: (error as Error).message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!user?.id || !requestDetails) return;
     if (user.id === requestDetails.requested_by_user_id) {
        toast({ variant: "destructive", title: "Action Denied", description: "You cannot reject your own request." });
        return;
    }
    if (!reviewerNotes.trim()) {
        toast({ variant: "destructive", title: "Validation Error", description: "Reviewer notes are required for rejection." });
        return;
    }
    setIsProcessing(true);
    try {
      await rejectAdjustmentRequest(requestDetails.id, user.id, reviewerNotes);
      toast({ title: "Success", description: "Request rejected." });
      navigate('/inventory/adjustment-requests'); // Or to dashboard
    } catch (error) {
      toast({ variant: "destructive", title: "Rejection Failed", description: (error as Error).message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-600">Access Denied or Error</h2>
        <p className="text-red-500 mt-2">{error}</p>
        <Button onClick={() => navigate('/')} className="mt-6">Go to Dashboard</Button>
      </div>
    );
  }

  if (!requestDetails) {
    // Should be caught by error state, but as a fallback
    return <div className="container mx-auto p-6 text-center">Request not found.</div>;
  }
  
  // If user is not logged in, or doesn't have approval role, this page might still show if token is valid.
  // Add role checks here if needed, beyond RLS on the approval/rejection actions.
  // For now, RLS on the action itself (approve/reject) will be the final gatekeeper.

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-2xl">
      <PageHeader
        heading="Approve Inventory Adjustment"
        text={`Review and process adjustment request ID: ...${requestDetails.id.slice(-8)}`}
      />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Item: {requestDetails.item_name || 'N/A'}</CardTitle>
          <CardDescription>
            Requested by: {requestDetails.requester_name || requestDetails.requested_by_user_id} on {new Date(requestDetails.requested_at).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p><strong>Quantity to Decrease:</strong> {requestDetails.quantity_to_decrease}</p>
          <p><strong>Reason:</strong> {requestDetails.reason}</p>
          <p><strong>Requester Notes:</strong> {requestDetails.notes}</p>
          {requestDetails.photo_url && (
            <div>
              <strong>Photo Proof:</strong><br />
              {photoUrl ? (
                <a href={photoUrl} target="_blank" rel="noopener noreferrer">
                  <img src={photoUrl} alt="Adjustment Proof" className="max-w-full md:max-w-md border rounded mt-1" />
                </a>
              ) : <p>Loading photo...</p>}
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor="reviewerNotes" className="text-sm font-medium">Your Reviewer Notes:</label>
            <Textarea
                id="reviewerNotes"
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Add notes for approval or rejection (required for rejection)"
                rows={3}
                disabled={isProcessing || requestDetails.status !== 'pending'}
            />
          </div>
        </CardContent>
        {requestDetails.status === 'pending' && (
          <CardFooter className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={handleReject} 
              disabled={isProcessing || user?.id === requestDetails.requested_by_user_id} 
              className="text-red-600 border-red-600 hover:bg-red-50 disabled:opacity-50"
              title={user?.id === requestDetails.requested_by_user_id ? "Cannot reject your own request" : ""}
            >
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </Button>
            <Button 
              onClick={handleApprove} 
              disabled={isProcessing || user?.id === requestDetails.requested_by_user_id} 
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
              title={user?.id === requestDetails.requested_by_user_id ? "Cannot approve your own request" : ""}
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Approve
            </Button>
          </CardFooter>
        )}
        {requestDetails.status !== 'pending' && (
            <CardFooter>
                <p className="text-sm text-muted-foreground">This request has already been processed (Status: {requestDetails.status}).</p>
            </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default SpecificApprovalPage;
