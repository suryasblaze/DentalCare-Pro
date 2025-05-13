import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"; // Added DialogDescription
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { RoleBasedGuard } from '@/components/RoleBasedGuard';
import { PageHeader } from '@/components/ui/page-header'; // Assuming PageHeader is a custom component
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs
import { 
    getPendingAdjustmentRequests, 
    approveAdjustmentRequest, 
    rejectAdjustmentRequest,
    getAdjustmentPhotoUrl,
    AdjustmentRequestDetails 
} from '@/features/inventory/services/inventoryService';
import {
    listUrgentPurchases,
    approveUrgentPurchase,
    rejectUrgentPurchase,
    // getUrgentPurchaseSlipUrl, // Placeholder if needed for slip preview
} from '@/features/purchases/services/urgentPurchaseService';
import { UrgentPurchase } from '@/features/purchases/types'; // Import UrgentPurchase type
import { format } from 'date-fns'; // Import format for dates
import { AlertCircle, CheckCircle2, Eye, ThumbsDown, ThumbsUp, Image as ImageIcon, FileText } from 'lucide-react';
import type { Profile } from '@/types'; // Import Profile type

type ProfileRole = Profile['role']; // Use Profile type for role


// Utility function to check for valid date, can be moved to a shared util file
const isValidDate = (dateString: string | null | undefined): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};


const InventoryApprovalPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for Inventory Adjustments
  const [pendingAdjustmentRequests, setPendingAdjustmentRequests] = useState<AdjustmentRequestDetails[]>([]);
  const [isLoadingAdjustments, setIsLoadingAdjustments] = useState(true);
  const [selectedAdjustmentRequest, setSelectedAdjustmentRequest] = useState<AdjustmentRequestDetails | null>(null);
  const [adjustmentPhotoPreviewUrl, setAdjustmentPhotoPreviewUrl] = useState<string | null>(null);

  // State for Urgent Purchases
  const [pendingUrgentPurchases, setPendingUrgentPurchases] = useState<UrgentPurchase[]>([]);
  const [isLoadingUrgentPurchases, setIsLoadingUrgentPurchases] = useState(true);
  const [selectedUrgentPurchase, setSelectedUrgentPurchase] = useState<UrgentPurchase | null>(null);
  // const [urgentPurchaseSlipPreviewUrl, setUrgentPurchaseSlipPreviewUrl] = useState<string | null>(null); // If slip preview is needed

  // Shared Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [currentApprovalType, setCurrentApprovalType] = useState<'adjustment' | 'urgent_purchase' | null>(null);


  const fetchPendingAdjustments = useCallback(async () => {
    if (!user?.id || !user?.role) {
      setIsLoadingAdjustments(false);
      if (user?.id && !user?.role) toast({ variant: "destructive", title: "Error", description: "User role not found for adjustments." });
      return;
    }
    setIsLoadingAdjustments(true);
    try {
      const requests = await getPendingAdjustmentRequests(user.id, user.role as Profile['role']); 
      setPendingAdjustmentRequests(requests);
    } catch (error) {
      console.error("Error fetching pending adjustment requests:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load pending adjustment requests." });
    } finally {
      setIsLoadingAdjustments(false);
    }
  }, [toast, user]);

  const fetchPendingUrgentPurchasesList = useCallback(async () => {
    if (!user?.id || !user?.role) {
        setIsLoadingUrgentPurchases(false);
        if (user?.id && !user?.role) toast({ variant: "destructive", title: "Error", description: "User role not found for urgent purchases." });
        return;
    }
    setIsLoadingUrgentPurchases(true);
    try {
        // Fetch all pending_approval requests the user can see based on RLS
        const allPendingRequests = await listUrgentPurchases({ status: 'pending_approval' });
        // Filter out requests made by the current user, as this page is for approving others' requests
        const requestsForApprovalByOthers = allPendingRequests.filter(
            (req) => req.requested_by_user_id !== user.id
        );
        setPendingUrgentPurchases(requestsForApprovalByOthers);
    } catch (error) {
        console.error("Error fetching pending urgent purchases:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load pending urgent purchases." });
    } finally {
        setIsLoadingUrgentPurchases(false);
    }
  }, [toast, user]);

  useEffect(() => {
    if (user) {
        fetchPendingAdjustments();
        fetchPendingUrgentPurchasesList();
    }
  }, [fetchPendingAdjustments, fetchPendingUrgentPurchasesList, user]);

  const handleOpenAdjustmentReviewModal = async (request: AdjustmentRequestDetails, action: 'approve' | 'reject') => {
    setSelectedAdjustmentRequest(request);
    setCurrentApprovalType('adjustment');
    setReviewAction(action);
    setShowReviewModal(true);
    setReviewerNotes('');
    setAdjustmentPhotoPreviewUrl(null);
    if (request.photo_url) {
      try {
        const url = await getAdjustmentPhotoUrl(request.photo_url);
        setAdjustmentPhotoPreviewUrl(url);
      } catch (error) {
        console.error("Error fetching photo preview for adjustment:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load adjustment proof photo." });
      }
    }
  };

  const handleOpenUrgentPurchaseReviewModal = async (request: UrgentPurchase, action: 'approve' | 'reject') => {
    setSelectedUrgentPurchase(request);
    setCurrentApprovalType('urgent_purchase');
    setReviewAction(action);
    setShowReviewModal(true);
    setReviewerNotes('');
    // setUrgentPurchaseSlipPreviewUrl(null); // If slip preview is implemented
    // if (request.slip_image_path) {
    //   try {
    //     // const url = await getUrgentPurchaseSlipUrl(request.slip_image_path);
    //     // setUrgentPurchaseSlipPreviewUrl(url);
    //   } catch (error) { /* ... */ }
    // }
  };
  
  const handleSubmitReview = async () => {
    if (!reviewAction || !user?.id) return;
    if (currentApprovalType === 'adjustment' && !selectedAdjustmentRequest) return;
    if (currentApprovalType === 'urgent_purchase' && !selectedUrgentPurchase) return;

    setIsSubmittingReview(true);
    try {
      if (currentApprovalType === 'adjustment') {
        const request = selectedAdjustmentRequest!;
        if (reviewAction === 'approve') {
          await approveAdjustmentRequest(request.id, user.id, reviewerNotes);
          toast({ title: "Success", description: `Adjustment Request ${request.id.substring(0,8)} approved.` });
        } else {
          await rejectAdjustmentRequest(request.id, user.id, reviewerNotes);
          toast({ title: "Success", description: `Adjustment Request ${request.id.substring(0,8)} rejected.` });
        }
        fetchPendingAdjustments();
      } else if (currentApprovalType === 'urgent_purchase') {
        const request = selectedUrgentPurchase!;
        if (reviewAction === 'approve') {
          await approveUrgentPurchase(request.id, user.id, reviewerNotes);
          toast({ title: "Success", description: `Urgent Purchase ${request.id.substring(0,8)} approved.` });
        } else {
          // Ensure reviewerNotes is not empty for rejection
          if (!reviewerNotes.trim() && (user?.role === 'admin' || user?.role === 'owner')) {
             toast({ variant: "destructive", title: "Validation Error", description: "Reviewer notes are required to reject." });
             setIsSubmittingReview(false);
             return;
          }
          await rejectUrgentPurchase(request.id, user.id, reviewerNotes);
          toast({ title: "Success", description: `Urgent Purchase ${request.id.substring(0,8)} rejected.` });
        }
        fetchPendingUrgentPurchasesList();
      }
      setShowReviewModal(false);
      setSelectedAdjustmentRequest(null);
      setSelectedUrgentPurchase(null);
      setCurrentApprovalType(null);
    } catch (error: any) {
      console.error(`Error ${reviewAction}ing request:`, error);
      toast({ variant: "destructive", title: "Error", description: error.message || `Failed to ${reviewAction} request.` });
    } finally {
      setIsSubmittingReview(false);
    }
  };
  
  const allowedRoles: Array<ProfileRole> = ['admin', 'owner', 'doctor'];

  const renderAdjustmentRequests = () => (
    <>
    {isLoadingAdjustments ? (
      <p>Loading adjustment requests...</p>
    ) : pendingAdjustmentRequests.length === 0 ? (
      <Card>
        <CardHeader><CardTitle>No Pending Adjustment Requests</CardTitle></CardHeader>
        <CardContent><p>There are currently no inventory adjustment requests awaiting approval.</p></CardContent>
      </Card>
    ) : (
      <Card>
        <CardHeader>
          <CardTitle>Pending Adjustment Requests</CardTitle>
          <CardDescription>{pendingAdjustmentRequests.length} request(s) awaiting review.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingAdjustmentRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{req.inventory_items?.item_name || 'N/A'}</TableCell>
                  <TableCell>{req.quantity_to_decrease}</TableCell>
                  <TableCell>{req.reason}</TableCell>
                  <TableCell>{req.requester_profile?.first_name || ''} {req.requester_profile?.last_name || ''}</TableCell>
                  <TableCell>{new Date(req.requested_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenAdjustmentReviewModal(req, 'approve')}>
                      <ThumbsUp className="mr-1 h-4 w-4" /> Approve
                    </Button>
                    {(user?.role === 'admin' || user?.role === 'owner') && (
                      <Button variant="outline" size="sm" onClick={() => handleOpenAdjustmentReviewModal(req, 'reject')}>
                        <ThumbsDown className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )}
    </>
  );

  const renderUrgentPurchaseRequests = () => (
    <>
    {isLoadingUrgentPurchases ? (
      <p>Loading urgent purchase requests...</p>
    ) : pendingUrgentPurchases.length === 0 ? (
      <Card>
        <CardHeader><CardTitle>No Pending Urgent Purchases</CardTitle></CardHeader>
        <CardContent><p>There are currently no urgent purchase requests awaiting approval.</p></CardContent>
      </Card>
    ) : (
      <Card>
        <CardHeader>
          <CardTitle>Pending Urgent Purchase Requests</CardTitle>
          <CardDescription>{pendingUrgentPurchases.length} request(s) awaiting review.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slip/Notes</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Requested By (ID)</TableHead> {/* TODO: Fetch profile for name */}
                <TableHead>Targeted Role</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingUrgentPurchases.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{req.slip_filename || req.notes?.substring(0,30) || 'N/A'}{req.notes && req.notes.length > 30 ? '...' : ''}</TableCell>
                  <TableCell>{req.items.length} item(s)</TableCell>
                  <TableCell className="font-mono text-xs">{req.requested_by_user_id.substring(0,8)}...</TableCell>
                  <TableCell>{req.target_approval_role ? req.target_approval_role.charAt(0).toUpperCase() + req.target_approval_role.slice(1) : 'N/A'}</TableCell>
                  <TableCell>{isValidDate(req.requested_at) ? format(new Date(req.requested_at), 'PP') : 'N/A'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenUrgentPurchaseReviewModal(req, 'approve')}>
                      <ThumbsUp className="mr-1 h-4 w-4" /> Approve
                    </Button>
                     {(user?.role === 'admin' || user?.role === 'owner') && (
                        <Button variant="outline" size="sm" onClick={() => handleOpenUrgentPurchaseReviewModal(req, 'reject')}>
                            <ThumbsDown className="mr-1 h-4 w-4" /> Reject
                        </Button>
                     )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    )}
    </>
  );

  return (
    <RoleBasedGuard allowedRoles={allowedRoles}>
      <div className="container mx-auto p-4 md:p-6">
        <PageHeader
          heading="Approval Requests"
          text="Review and process pending requests."
        />
        <Tabs defaultValue="adjustments" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="adjustments">Inventory Adjustments</TabsTrigger>
            <TabsTrigger value="urgent_purchases">Urgent Purchases</TabsTrigger>
          </TabsList>
          <TabsContent value="adjustments" className="mt-4">
            {renderAdjustmentRequests()}
          </TabsContent>
          <TabsContent value="urgent_purchases" className="mt-4">
            {renderUrgentPurchaseRequests()}
          </TabsContent>
        </Tabs>
      </div>

      {showReviewModal && (
        <Dialog open={showReviewModal} onOpenChange={(isOpen) => {
            setShowReviewModal(isOpen);
            if (!isOpen) {
                setSelectedAdjustmentRequest(null);
                setSelectedUrgentPurchase(null);
                setCurrentApprovalType(null);
            }
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{reviewAction === 'approve' ? 'Approve' : 'Reject'} {currentApprovalType === 'adjustment' ? 'Adjustment' : 'Urgent Purchase'} Request</DialogTitle>
              {currentApprovalType === 'adjustment' && selectedAdjustmentRequest && (
                <DialogDescription>
                  Review details for request ID: {selectedAdjustmentRequest.id.substring(0,8)}... for item: {selectedAdjustmentRequest.inventory_items?.item_name || 'N/A'}
                </DialogDescription>
              )}
              {currentApprovalType === 'urgent_purchase' && selectedUrgentPurchase && (
                <DialogDescription>
                  Review details for urgent purchase ID: {selectedUrgentPurchase.id.substring(0,8)}...
                  {selectedUrgentPurchase.slip_filename ? ` (Slip: ${selectedUrgentPurchase.slip_filename})` : ''}
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {currentApprovalType === 'adjustment' && selectedAdjustmentRequest && (
                <>
                  <p><strong>Item:</strong> {selectedAdjustmentRequest.inventory_items?.item_name}</p>
                  <p><strong>Quantity to Decrease:</strong> {selectedAdjustmentRequest.quantity_to_decrease}</p>
                  <p><strong>Reason:</strong> {selectedAdjustmentRequest.reason}</p>
                  <p><strong>Notes by Requester:</strong> {selectedAdjustmentRequest.notes}</p>
                  <p><strong>Requested By:</strong> {selectedAdjustmentRequest.requester_profile?.first_name || ''} {selectedAdjustmentRequest.requester_profile?.last_name || ''}</p>
                  <p><strong>Requested At:</strong> {new Date(selectedAdjustmentRequest.requested_at).toLocaleString()}</p>
                  {selectedAdjustmentRequest.photo_url && (
                    <div>
                      <strong>Proof Photo:</strong>
                      {adjustmentPhotoPreviewUrl ? (
                        <img src={adjustmentPhotoPreviewUrl} alt="Adjustment Proof" className="rounded-md border max-w-xs max-h-64 mt-1" />
                      ) : (
                        <p className="text-sm text-muted-foreground">Loading photo...</p>
                      )}
                    </div>
                  )}
                </>
              )}
              {currentApprovalType === 'urgent_purchase' && selectedUrgentPurchase && (
                <>
                  <p><strong>Requested By (ID):</strong> {selectedUrgentPurchase.requested_by_user_id}</p> {/* TODO: Fetch profile */}
                  <p><strong>Requested At:</strong> {isValidDate(selectedUrgentPurchase.requested_at) ? format(new Date(selectedUrgentPurchase.requested_at), 'PPpp') : 'N/A'}</p>
                  <p><strong>Targeted For Role:</strong> {selectedUrgentPurchase.target_approval_role ? selectedUrgentPurchase.target_approval_role.charAt(0).toUpperCase() + selectedUrgentPurchase.target_approval_role.slice(1) : 'N/A'}</p>
                  {selectedUrgentPurchase.slip_filename && <p><strong>Slip Filename:</strong> {selectedUrgentPurchase.slip_filename}</p>}
                  {selectedUrgentPurchase.invoice_delivery_date && <p><strong>Invoice/Delivery Date:</strong> {isValidDate(selectedUrgentPurchase.invoice_delivery_date) ? format(new Date(selectedUrgentPurchase.invoice_delivery_date!), 'PP') : 'N/A'}</p>}
                  <p><strong>Notes:</strong> {selectedUrgentPurchase.notes || 'N/A'}</p>
                  <p><strong>Items:</strong></p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {selectedUrgentPurchase.items.map(item => (
                      <li key={item.id || item.inventory_item_id}>
                        {item.matched_item_name} (Qty: {item.quantity})
                        {item.batch_number && ` - Batch: ${item.batch_number}`}
                        {item.expiry_date && ` - Expires: ${new Date(item.expiry_date).toLocaleDateString()}`}
                      </li>
                    ))}
                  </ul>
                  {/* Add slip image preview if getUrgentPurchaseSlipUrl is implemented */}
                </>
              )}
              <div>
                <label htmlFor="reviewerNotes" className="block text-sm font-medium">
                  Reviewer Notes {reviewAction === 'approve' ? '(Optional)' : '(Required for Reject)'}:
                </label>
                <Textarea
                  id="reviewerNotes"
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="Add any notes for this decision..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReviewModal(false)} disabled={isSubmittingReview}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitReview} 
                disabled={isSubmittingReview || (reviewAction === 'reject' && (user?.role === 'admin' || user?.role === 'owner') && !reviewerNotes.trim())}
                variant={reviewAction === 'reject' && (user?.role === 'admin' || user?.role === 'owner') ? 'destructive' : 'default'}
              >
                {isSubmittingReview ? 'Submitting...' : `Confirm ${reviewAction === 'approve' ? 'Approve' : 'Reject'}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </RoleBasedGuard>
  );
};

export default InventoryApprovalPage;
