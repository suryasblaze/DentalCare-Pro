import React, { useState, useMemo } from 'react';
import { format, differenceInDays, formatDistanceStrict } from 'date-fns'; // Import date calculation functions
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'; // Corrected path if needed, removed extra quotes
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // Component should now be available
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'; 
import { Button } from '@/components/ui/button'; 
import { Progress } from '@/components/ui/progress'; 
import { 
  User, 
  Calendar, 
  CreditCard, 
  Clock, 
  Check, 
  X, 
  Trash2, 
  RefreshCw,
  Plus,
  FileText,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList, // Replaced Tooth icon
  RotateCcw // Icon for Reopen
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/validation'; // Assuming formatCurrency exists
import { TreatmentItem } from './TreatmentItem';
import TreatmentProgressBar from './TreatmentProgressBar'; // Import the new component

// Import status type (only TreatmentStatus is needed)
import type { TreatmentStatus } from '@/types'; // Ensure path is correct

interface TreatmentPlanDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: any; // Consider using a more specific type if available
  onRefresh: () => Promise<void>;
  onAddTreatment: () => void;
  // Use TreatmentStatus for both plan and treatment status changes
  onStatusChange: (planId: string, status: TreatmentStatus) => Promise<void>;
  onDeletePlan: (planId: string) => Promise<void>;
  onTreatmentStatusChange: (treatmentId: string, status: TreatmentStatus) => Promise<void>;
  onDeleteTreatment: (treatmentId: string) => Promise<void>;
  loading?: boolean;
  navigateToPatient?: (patientId: string) => void;
}

export function TreatmentPlanDetails({
  open,
  onOpenChange,
  plan,
  onRefresh,
  onAddTreatment,
  onStatusChange,
  onDeletePlan,
  onTreatmentStatusChange,
  onDeleteTreatment,
  loading = false,
  navigateToPatient,
}: TreatmentPlanDetailsProps) {
  // --- Confirmation Dialog State ---
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  // --- End Confirmation Dialog State ---

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5; // Show 5 treatments per page

  const paginatedTreatments = useMemo(() => {
    if (!plan?.treatments) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return plan.treatments.slice(startIndex, endIndex);
  }, [plan?.treatments, currentPage]);

  const totalPages = useMemo(() => {
    if (!plan?.treatments) return 1;
    return Math.ceil(plan.treatments.length / ITEMS_PER_PAGE);
  }, [plan?.treatments]);
  // --- End Pagination State ---

  if (!plan) return null;

  // Calculate duration
  const duration = useMemo(() => {
    if (!plan.start_date || !plan.end_date) return null;
    try {
      const start = new Date(plan.start_date);
      const end = new Date(plan.end_date);
      // Add 1 day because differenceInDays is exclusive of the end date for durations
      // return differenceInDays(end, start) + 1; 
      // Using formatDistanceStrict for better readability (e.g., "1 month", "2 weeks", "10 days")
      return formatDistanceStrict(end, start, { addSuffix: false }); 
    } catch (error) {
      console.error("Error calculating duration:", error);
      return null; // Handle potential invalid date formats
    }
  }, [plan.start_date, plan.end_date]);

  // --- Progress Bar Logic ---
  const treatmentSteps = useMemo(() => [
    { id: 'planned', title: 'Planned', description: 'Plan created' },
    { id: 'in_progress', title: 'In Progress', description: 'Treatment started' },
    { id: 'completed', title: 'Completed', description: 'Plan finished' },
    // Consider adding 'cancelled' if needed visually
  ], []);

  const completedStepIds = useMemo(() => {
    const completed: string[] = [];
    if (!plan?.status) return completed;

    const currentIndex = treatmentSteps.findIndex(step => step.id === plan.status);

    // Mark all steps before the current one as completed
    for (let i = 0; i < currentIndex; i++) {
      completed.push(treatmentSteps[i].id);
    }
    
    // If the status is 'completed', mark 'in_progress' as completed too
    if (plan.status === 'completed') {
        if (!completed.includes('planned')) completed.push('planned');
        if (!completed.includes('in_progress')) completed.push('in_progress');
    }

    // Handle cancellation - show progress up to the point of cancellation
    if (plan.status === 'cancelled') {
        // This logic depends on how cancellation is tracked. Assuming we know the status *before* cancellation.
        // For simplicity, let's assume if cancelled, we show progress based on treatments done, or just the 'planned' stage if none started.
        // A more robust approach would store the status before cancellation.
        // Let's default to showing only 'planned' as potentially complete if cancelled early.
        // If any treatments were done, 'in_progress' might be considered complete before cancellation.
        // For now, let's keep it simple: if cancelled, completed steps depend on when it happened.
        // We'll pass the current status ('cancelled') as currentStepId, but the completed logic needs refinement if pre-cancel status isn't available.
        // Let's assume for now cancellation doesn't mark prior steps as 'complete' in the visual.
    }


    return completed;
  }, [plan?.status, treatmentSteps]);
  // --- End Progress Bar Logic ---

  // Render status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    let color = 'bg-gray-100 text-gray-800';
    
    switch (status) {
      case 'planned':
        color = 'bg-blue-100 text-blue-800';
        break;
      case 'in_progress':
        color = 'bg-yellow-100 text-yellow-800';
        break;
      case 'completed':
        color = 'bg-green-100 text-green-800';
        break;
      case 'cancelled':
        color = 'bg-red-100 text-red-800';
        break;
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };
  
  // Render priority badge with appropriate color
  const renderPriorityBadge = (priority: string) => {
    let color = 'bg-gray-100 text-gray-800';
    
    switch (priority) {
      case 'low':
        color = 'bg-green-100 text-green-800';
        break;
      case 'medium':
        color = 'bg-yellow-100 text-yellow-800';
        break;
      case 'high':
        color = 'bg-red-100 text-red-800';
        break;
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {priority}
      </span>
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Treatment Plan Details</DialogTitle>
          <DialogDescription>
            Created on {format(new Date(plan.created_at), 'MMMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>
        
        {/* Added container for scrolling */}
        <div className="pr-6 py-4 max-h-[70vh] overflow-y-auto"> 
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">{plan.title}</h2>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {renderStatusBadge(plan.status)}
              {plan.priority && renderPriorityBadge(plan.priority)}
            </div>
          </div>

          {/* --- Add Treatment Progress Bar --- */}
          {/* Only show progress bar for active statuses, hide if cancelled? Or show cancelled state? */}
          {/* Let's show it unless cancelled for now */}
          {plan.status !== 'cancelled' && (
             <div className="my-6"> {/* Add margin */}
               <TreatmentProgressBar
                 steps={treatmentSteps}
                 currentStepId={plan.status} // Current status is the current step
                 completedStepIds={completedStepIds}
               />
             </div>
          )}
          {/* --- End Treatment Progress Bar --- */}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Patient</p>
                  <p>{plan.patientName}</p>
                </div>
                {navigateToPatient && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => navigateToPatient(plan.patient_id)}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Timeframe</p>
                  <p>
                    {format(new Date(plan.start_date), 'MMMM d, yyyy')}
                    {plan.end_date && ` to ${format(new Date(plan.end_date), 'MMMM d, yyyy')}`}
                  </p>
                  {duration && (
                     <p className="text-sm text-muted-foreground">Duration: {duration}</p>
                  )}
                </div>
              </div>

              {/* Display Associated Teeth */}
              {plan.teeth && plan.teeth.length > 0 && (
                <div className="flex items-start gap-2"> {/* Use items-start for alignment */}
                  <ClipboardList className="h-5 w-5 text-muted-foreground mt-1" /> {/* Use ClipboardList icon */}
                  <div>
                    <p className="text-sm font-medium">Associated Teeth</p>
                    <div className="mt-1 flex flex-wrap gap-1"> {/* Reduced gap */}
                      {plan.teeth.map((tooth: any) => (
                        <span
                          key={tooth.id}
                          className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800" // Use blue badge style
                        >
                          {tooth.id} - {tooth.description}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Total Cost</p>
                  <p>{formatCurrency(plan.totalCost)}</p>
                </div>
              </div>
              
              {/* Removed the old Progress component section */}
              
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Treatments</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onRefresh}
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onAddTreatment}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Treatment
                </Button>
              </div>
            </div>
            
            {plan.treatments && plan.treatments.length > 0 ? (
              <>
                <div className="space-y-3">
                  {paginatedTreatments.map((treatment: any) => (
                    <TreatmentItem
                      key={treatment.id}
                      treatment={treatment}
                      onStatusChange={onTreatmentStatusChange}
                      onDelete={onDeleteTreatment}
                      loading={loading}
                    />
                  ))}
                </div>
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 border rounded-lg">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No treatments added yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={onAddTreatment}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add First Treatment
                </Button>
              </div>
            )}
          </div>
          
<Tabs defaultValue="treatments" className="w-full">
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="treatments">Additional Information</TabsTrigger>
    <TabsTrigger value="financial">Financial Information</TabsTrigger>
  </TabsList>
  <TabsContent value="treatments" className="space-y-4">
    <div className="border rounded-lg p-4">
      <h4 className="font-medium">Notes</h4>
      <p className="text-sm text-muted-foreground mt-2">
        {plan.notes || "No additional notes for this treatment plan."}
      </p>
    </div>
  </TabsContent>
  <TabsContent value="financial" className="space-y-4">
    <div className="border rounded-lg p-4">
      <h4 className="font-medium">Financial Summary</h4>
      <div className="mt-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-sm">Total Treatment Cost:</span>
          <span className="font-medium">{formatCurrency(plan.totalCost)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">Insurance Coverage (Est.):</span>
          {/* Assuming plan.insurance_coverage exists */}
          <span className="font-medium">{formatCurrency(plan.insurance_coverage ?? 0)}</span> 
        </div>
        <div className="flex justify-between">
          <span className="text-sm">Patient Responsibility:</span>
          {/* Calculate based on totalCost and insurance_coverage */}
          <span className="font-medium">{formatCurrency(plan.totalCost - (plan.insurance_coverage ?? 0))}</span>
        </div>
      </div>
    </div>
  </TabsContent>
</Tabs>
          <DialogFooter className="flex justify-between mt-6"> {/* Added margin-top */}
            {/* Left side: Delete Button with Confirmation */}
            <div>
              <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={loading}
                    title="Delete this treatment plan permanently"
                  >
                    {loading && showDeleteConfirm ? ( // Show loader only if this action is loading
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1" />
                    )}
                    Delete Plan
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the treatment plan "{plan.title}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDeletePlan(plan.id)} 
                    disabled={loading}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Yes, delete plan
                  </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Right side: Action Buttons & Close */}
            <div className="flex gap-2 items-center"> {/* Wrap actions in a div */}
              {/* --- Refined Button Logic --- */}

              {/* Start Treatment: Only show if status is 'planned' */}
              {plan.status === 'planned' && (
                <Button
                  variant="outline"
                  onClick={() => onStatusChange(plan.id, 'in_progress')}
                  disabled={loading}
                  title="Start this treatment plan"
                >
                  {loading && !showDeleteConfirm && !showCancelConfirm ? ( // Show loader only if this action is loading
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4 mr-1" />
                  )}
                  Start Treatment
                </Button>
              )}

              {/* Mark Completed: Only show if status is 'in_progress' */}
              {plan.status === 'in_progress' && (
                <Button
                  variant="outline"
                  onClick={() => onStatusChange(plan.id, 'completed')}
                  disabled={loading}
                  title="Mark this plan as completed"
                >
                  {loading && !showDeleteConfirm && !showCancelConfirm ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Mark Completed
                </Button>
              )}

              {/* Cancel Plan: Show if 'planned' or 'in_progress', triggers confirmation */}
              {(plan.status === 'planned' || plan.status === 'in_progress') && (
                <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={loading}
                      title="Cancel this treatment plan"
                    >
                      {loading && showCancelConfirm ? ( // Show loader only if this action is loading
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 mr-1" /> // Use X icon for Cancel
                      )}
                      Cancel Plan
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Cancellation</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel the treatment plan "{plan.title}"? This action can be reopened later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={loading}>Back</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onStatusChange(plan.id, 'cancelled')}
                        disabled={loading}
                        // Optional: Add specific styling for cancel confirmation
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Yes, cancel plan
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* Reopen Plan: Show if 'completed' or 'cancelled' */}
              {(plan.status === 'completed' || plan.status === 'cancelled') && (
                <Button
                  variant="outline"
                  onClick={() => onStatusChange(plan.id, plan.status === 'completed' ? 'in_progress' : 'planned')}
                  disabled={loading}
                  title={plan.status === 'completed' ? "Reopen and set to 'In Progress'" : "Reopen and set to 'Planned'"}
                >
                  {loading && !showDeleteConfirm && !showCancelConfirm ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-1" /> // Use RotateCcw icon for Reopen
                  )}
                  Reopen Plan
                </Button>
              )}
              {/* --- End Refined Button Logic --- */}

              <Button
                variant="secondary" // Keep Close button always visible
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div> {/* End right side actions div */}
          </DialogFooter>
        </div> 
       </div> {/* End scrolling container */}
      </DialogContent>
    </Dialog>
  );
}
