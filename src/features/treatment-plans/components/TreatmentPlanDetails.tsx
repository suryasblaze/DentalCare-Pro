import React, { useState, useMemo, useEffect } from 'react';
import { format, differenceInDays, formatDistanceStrict, add, parseISO } from 'date-fns'; // Import date calculation functions and add/parseISO
import { useNavigate } from 'react-router-dom'; // Import useNavigate
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
  RotateCcw, // Icon for Reopen
  Stethoscope, // Added Stethoscope icon
  Calendar as CalendarIcon, // Renamed Calendar icon
  Smile, // Added Smile icon
  BrainCog, // Added BrainCog icon
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/validation'; // Assuming formatCurrency exists
import { TreatmentItem } from './TreatmentItem';
import TreatmentProgressBar from './TreatmentProgressBar'; // Import the new component
import { useToast } from '@/components/ui/use-toast'; // Re-add useToast if it was removed
import { treatmentService } from '../services/treatmentService'; // Import treatmentService

// Import status type (only TreatmentStatus is needed)
import type { TreatmentStatus } from '@/types'; // Ensure path is correct
// Import AISuggestion type if it's used for the new prop
import type { AISuggestion } from './AISuggestionForm';

// Helper function to parse timeGap string (e.g., "2 weeks", "1 month") and add to a date
const calculateEstimatedDate = (baseDateStr: string, timeGapStr: string | null | undefined): string => {
  if (!timeGapStr) return baseDateStr; // If no time gap, return base date

  try {
    // Try parsing baseDateStr as if it might already be in 'MMM d, yyyy' or as ISO
    let baseDate;
    try {
      baseDate = parseISO(baseDateStr); // Handles ISO strings like YYYY-MM-DDTHH:mm:ss.sssZ
      // Check if parseISO returned a valid date, if not, it might be already formatted 'MMM d, yyyy'
      // For simplicity, if baseDateStr is already 'MMM d, yyyy', parseISO might not work as expected
      // without a specific format string. Date-fns `parse` is more flexible for specific formats.
      // However, `add` function expects a Date object, so `baseDate` must be a valid Date.
      // If baseDateStr is 'Jan 1, 2024', parseISO might fail or give an unexpected result.
      // Let's assume baseDateStr is either ISO or we adjust it to be so before this function if needed.
      // For now, relying on parseISO and its robustness for common date strings.
    } catch (e) { // If parseISO fails, it could be an invalid format
      console.warn(`[calculateEstimatedDate] Could not parse baseDateStr with parseISO: ${baseDateStr}. Attempting to re-parse or defaulting.`);
      // Fallback or re-throw if critical. For now, let it proceed if it results in a date, or handle downstream.
      // This part might need more robust parsing if baseDateStr format varies widely and isn't ISO.
      baseDate = new Date(baseDateStr); // General Date constructor as a fallback, can be unreliable.
    }

    if (isNaN(baseDate.getTime())) { // Check if baseDate is valid
        console.error(`[calculateEstimatedDate] Invalid baseDate after parsing: ${baseDateStr}`);
        return baseDateStr; // Return original if baseDate is invalid
    }

    const parts = timeGapStr.toLowerCase().split(' ');
    if (parts.length !== 2) return format(baseDate, 'MMM d, yyyy'); // Expect "number unit" format, return formatted baseDate

    const amount = parseInt(parts[0], 10);
    const unit = parts[1].endsWith('s') ? parts[1] : parts[1] + 's'; // Ensure plural (e.g., week -> weeks)

    if (isNaN(amount)) return format(baseDate, 'MMM d, yyyy'); // If amount is NaN, return formatted baseDate

    let duration = {};
    if (unit === 'days') duration = { days: amount };
    else if (unit === 'weeks') duration = { weeks: amount };
    else if (unit === 'months') duration = { months: amount };
    else if (unit === 'years') duration = { years: amount };
    else return format(baseDate, 'MMM d, yyyy'); // Unknown unit, return formatted baseDate

    return format(add(baseDate, duration), 'MMM d, yyyy');
  } catch (error) {
    console.error(`Error calculating estimated date with baseDate: ${baseDateStr}, timeGap: ${timeGapStr}`, error);
    // Try to format baseDateStr if it's a valid date string itself, otherwise return as is
    try {
        return format(parseISO(baseDateStr), 'MMM d, yyyy');
    } catch (formatError) {
        return baseDateStr; // Fallback to original base date string on error
    }
  }
};

// Add interface for visits
interface TreatmentVisit {
  id: string;
  treatment_plan_id: string;
  visit_number: number;
  procedures: string;
  estimated_duration?: string;
  time_gap?: string;
  status: 'pending' | 'completed' | 'cancelled';
  scheduled_date?: string;
}

interface TreatmentPlanDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: {
    id: string;
    patient_id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    start_date: string;
    end_date?: string;
    patientName: string;
    treatments: any[];
    metadata: {
      clinical_considerations: string | null;
      key_materials: string | null;
      post_treatment_care: string | null;
      total_visits: number;
      completed_visits: number;
    }[] | null;
    visits: {
      id: string;
      visit_number: number;
      procedures: string;
      estimated_duration?: string;
      time_gap?: string;
      status: 'pending' | 'completed' | 'cancelled';
      scheduled_date?: string;
      completed_date?: string;
    }[] | null;
    teeth: { tooth_id: number }[] | null;
    created_at: string;
    totalCost: number;
    insurance_coverage: number;
  };
  onRefresh: () => Promise<void>;
  onAddTreatment: () => void;
  onStatusChange: (planId: string, status: TreatmentStatus) => Promise<void>;
  onDeletePlan: (planId: string) => Promise<void>;
  onTreatmentStatusChange: (treatmentId: string, status: TreatmentStatus) => Promise<void>;
  onDeleteTreatment: (treatmentId: string) => Promise<void>;
  loading?: boolean;
  navigateToPatient?: (patientId: string) => void;
  aiInitialSuggestion?: AISuggestion | null; // New prop for initial AI suggestion
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
  aiInitialSuggestion, // Destructure new prop
}: TreatmentPlanDetailsProps) {
  const { toast } = useToast(); // Initialize toast for feedback
  const navigate = useNavigate(); // Initialize navigate
  // --- Confirmation Dialog State ---
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  // --- End Confirmation Dialog State ---

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5; // Show 5 treatments per page
  const [isCreatingAiTreatments, setIsCreatingAiTreatments] = useState(false); // New state

  // Helper function to parse duration strings (e.g., "40-50 minutes", "1 hour", "3 weeks")
  // and format for PostgreSQL interval (e.g., "50 minutes", "1 hour", "3 weeks")
  const parseAndFormatDurationForInterval = (durationStr?: string): string | undefined => {
    if (!durationStr || typeof durationStr !== 'string') return undefined;

    durationStr = durationStr.trim();

    // Pattern 1: "X-Y units" (e.g., "40-50 minutes", "2–3 weeks") - handles HYPHEN-MINUS and EN DASH
    const rangeWithUnitsMatch = durationStr.match(/^(\d+)\s*[-–]\s*(\d+)\s+(\w+)$/i);
    if (rangeWithUnitsMatch && rangeWithUnitsMatch.length === 4) {
      return `${rangeWithUnitsMatch[2]} ${rangeWithUnitsMatch[3]}`; // Use upper bound + units
    }

    // Pattern 2: "X units" (e.g., "60 minutes", "1 hour", "3 days")
    const singleWithUnitsMatch = durationStr.match(/^(\d+)\s+(\w+)$/i);
    if (singleWithUnitsMatch && singleWithUnitsMatch.length === 3) {
      return `${singleWithUnitsMatch[1]} ${singleWithUnitsMatch[2]}`;
    }
    
    // Pattern 3: Just a number (assume minutes, e.g., "30" -> "30 minutes")
    // Make sure it's ONLY a number, no spaces or other characters.
    const numberOnlyMatch = durationStr.match(/^(\d+)$/);
    if (numberOnlyMatch && numberOnlyMatch.length === 2) {
      return `${numberOnlyMatch[1]} minutes`;
    }
    
    // Specific case for "X-Y" without units (e.g. "4-5" implying a unit from context)
    // This is risky as unit is unknown. For now, let's try taking upper and ASSUMING 'days' as a guess or log error.
    // Or better, let it fail parsing if units are critical and missing.
    // For now, let's make it fail by not matching, so it returns undefined.

    console.warn(`[TreatmentPlanDetails] Could not parse duration: "${durationStr}". It does not match expected formats (e.g., "X-Y units", "X units", "X"). Falling back to undefined.`);
    return undefined; // Or a default like '30 minutes' if preferred
  };

  console.log('[TreatmentPlanDetails] Rendering. Plan:', plan);
  console.log('[TreatmentPlanDetails] aiInitialSuggestion:', aiInitialSuggestion);
  if (aiInitialSuggestion?.planDetails?.appointmentPlan) {
    console.log('[TreatmentPlanDetails] aiInitialSuggestion.planDetails.appointmentPlan.sittingDetails:', aiInitialSuggestion.planDetails.appointmentPlan.sittingDetails);
    console.log('[TreatmentPlanDetails] sittingDetails length:', aiInitialSuggestion.planDetails.appointmentPlan.sittingDetails?.length);
  }
  console.log('[TreatmentPlanDetails] plan.treatments:', plan?.treatments);

  const paginatedTreatments = useMemo(() => {
    if (!plan?.treatments) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return plan.treatments.slice(startIndex, endIndex);
  }, [plan?.treatments, currentPage]);

  // Calculate estimated dates for treatments
  const treatmentsWithEstimatedDates = useMemo(() => {
    if (!plan?.treatments || plan.treatments.length === 0) return [];

    let runningDate = plan.start_date || plan.created_at; // Base date for the first treatment

    return plan.treatments.map((treatment, index) => {
      let estimatedVisitDate;
      if (index === 0) {
        estimatedVisitDate = format(parseISO(runningDate), 'MMM d, yyyy');
      } else {
        // For subsequent treatments, calculate based on the previous treatment's time_gap
        // Note: This assumes treatments are sorted.
        // The time_gap on treatment[i] dictates the gap AFTER treatment[i-1] is notionally completed.
        // Or, if time_gap is on treatment[i-1], it means the gap before treatment[i] starts.
        // Let's assume `treatment.time_gap` means "next visit in X time *after this current visit*".
        // So, to calculate date for treatment[i], we need time_gap of treatment[i-1].
        // The current data model seems to have time_gap on the *current* treatment, meaning "this visit occurs X time after the PREVIOUS one".
        const previousTreatment = plan.treatments[index - 1];
        runningDate = calculateEstimatedDate(runningDate, previousTreatment.time_gap);
        estimatedVisitDate = runningDate; // calculateEstimatedDate already formats it
      }
      return { ...treatment, estimatedVisitDate };
    });
  }, [plan?.treatments, plan?.start_date, plan?.created_at]);

  // Use treatmentsWithEstimatedDates for pagination
  const paginatedTreatmentsWithDates = useMemo(() => {
    if (!treatmentsWithEstimatedDates) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return treatmentsWithEstimatedDates.slice(startIndex, endIndex);
  }, [treatmentsWithEstimatedDates, currentPage]);

  const totalPages = useMemo(() => {
    if (!plan?.treatments) return 1;
    return Math.ceil(plan.treatments.length / ITEMS_PER_PAGE);
  }, [plan?.treatments]);
  // --- End Pagination State ---

  // New handler function to create treatments from AI suggestions
  const handleCreateAiSuggestedTreatments = async () => {
    if (!aiInitialSuggestion?.planDetails?.appointmentPlan?.sittingDetails || !plan?.id) {
      toast({
        title: "Error",
        description: "No AI suggestion details found or plan ID is missing.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingAiTreatments(true);
    let treatmentsCreatedCount = 0;
    const totalSuggestions = aiInitialSuggestion.planDetails.appointmentPlan.sittingDetails.length;

    try {
      for (const sitting of aiInitialSuggestion.planDetails.appointmentPlan.sittingDetails) {
        // Add console.log to inspect the raw sitting object from AI
        console.log("[TreatmentPlanDetails] [handleCreateAiSuggestedTreatments] Processing sitting:", sitting);

        const treatmentDescription = sitting.procedures || 'No procedures detailed.';
        // Create a more concise title, perhaps Visit Number + first few words of procedures
        const proceduresSummary = treatmentDescription.substring(0, 50) + (treatmentDescription.length > 50 ? '...' : '');
        const treatmentTitle = `${sitting.visit || 'AI Suggested Visit'} - ${proceduresSummary}`;
        
        const formattedDuration = parseAndFormatDurationForInterval(sitting.estimatedDuration);

        const treatmentData = {
          type: treatmentTitle, // Use the new descriptive title
          description: treatmentDescription, // Full procedures in description
          status: 'pending' as TreatmentStatus,
          priority: 'medium', // Default priority
          cost: "0", // Default cost
          estimated_duration: formattedDuration, // Use parsed and formatted duration
          time_gap: sitting.timeGap || null, // Add time_gap here
          plan_id: plan.id,
        };

        await treatmentService.createTreatment(treatmentData as any);
        treatmentsCreatedCount++;
      }

      toast({
        title: "Success",
        description: `${treatmentsCreatedCount} of ${totalSuggestions} AI suggested treatments created. Refreshing...`,
      });
      await onRefresh(); // Refresh the plan to show new treatments
    } catch (error) {
      console.error("Error creating AI suggested treatments:", error);
      toast({
        title: "Creation Failed",
        description: `Failed to create some or all AI suggested treatments. ${treatmentsCreatedCount} created. ${(error as Error).message}`,
        variant: "destructive",
      });
      if (treatmentsCreatedCount > 0) { // Still refresh if some were made
        await onRefresh();
      }
    } finally {
      setIsCreatingAiTreatments(false);
    }
  };

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
            {plan.status !== 'cancelled' && (
               <div className="my-6">
                 <TreatmentProgressBar
                   steps={treatmentSteps}
                   currentStepId={plan.status}
                   completedStepIds={completedStepIds}
                 />
               </div>
            )}
            
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
                       <p className="text-sm text-muted-foreground">Calculated Duration: {duration}</p>
                    )}
                    {/* Display AI Suggested Total Treatment Time */}
                    {aiInitialSuggestion?.planDetails?.appointmentPlan?.totalTreatmentTime && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Suggested Total Plan Duration: {aiInitialSuggestion.planDetails.appointmentPlan.totalTreatmentTime}
                      </p>
                    )}
                  </div>
                </div>

                {/* Display Associated Teeth */}
                {plan.teeth && plan.teeth.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Smile className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Affected Teeth</p>
                      <p className="text-sm text-muted-foreground">
                        {plan.teeth.map(t => t.tooth_id).sort((a, b) => a - b).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Treatments Section */}
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
                    {paginatedTreatmentsWithDates.map((treatment: any) => (
                      <TreatmentItem
                        key={treatment.id}
                        treatment={treatment}
                        onStatusChange={onTreatmentStatusChange}
                        onDelete={onDeleteTreatment}
                        loading={loading}
                        estimatedVisitDate={treatment.estimatedVisitDate}
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
                // MODIFIED BLOCK: Check for AI suggestions if no actual treatments exist
                aiInitialSuggestion?.planDetails?.appointmentPlan?.sittingDetails && aiInitialSuggestion.planDetails.appointmentPlan.sittingDetails.length > 0 ? (
                  // New: Shows a message and JUST the button to add AI visits
                  <div className="text-center py-6 border rounded-lg">
                    <BrainCog className="h-8 w-8 mx-auto text-primary mb-3" /> 
                    <p className="text-muted-foreground mb-4">
                      AI-generated treatment visits are available for this plan.
                    </p>
                    <Button
                      onClick={handleCreateAiSuggestedTreatments}
                      disabled={isCreatingAiTreatments || loading}
                      size="sm" // Or default, matching other similar buttons
                    >
                      {isCreatingAiTreatments ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" /> // Or BrainCog icon
                      )}
                      Add AI Suggested Visits
                    </Button>
                  </div>
                ) : (
                  // Original fallback if no treatments and no AI suggestions
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
                )
              )}
            </div>

            {/* Tabs for Additional Information */}
            <Tabs defaultValue="additionalInfo" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="additionalInfo">Additional Information</TabsTrigger>
                <TabsTrigger value="visits">Scheduled Visits</TabsTrigger>
                <TabsTrigger value="financial">Financial Information</TabsTrigger>
              </TabsList>
              
              <TabsContent value="additionalInfo" className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium">Clinical Information</h4>
                  <div className="mt-4 space-y-4">
                    {/* Access metadata from the first element of the array */}
                    {plan.metadata && plan.metadata.length > 0 && plan.metadata[0].clinical_considerations && (
                      <div>
                        <h5 className="text-sm font-medium">Clinical Considerations</h5>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                          {plan.metadata[0].clinical_considerations}
                        </p>
                      </div>
                    )}
                    {plan.metadata && plan.metadata.length > 0 && plan.metadata[0].key_materials && (
                      <div>
                        <h5 className="text-sm font-medium">Key Materials</h5>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                          {plan.metadata[0].key_materials}
                        </p>
                      </div>
                    )}
                    {plan.metadata && plan.metadata.length > 0 && plan.metadata[0].post_treatment_care && (
                      <div>
                        <h5 className="text-sm font-medium">Post-Treatment Care</h5>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                          {plan.metadata[0].post_treatment_care}
                        </p>
                      </div>
                    )}
                    {/* Fallback condition: if metadata array is empty or all relevant fields in the first item are null/empty */}
                    {(!plan.metadata || plan.metadata.length === 0 || 
                      (plan.metadata.length > 0 && 
                       !plan.metadata[0].clinical_considerations && 
                       !plan.metadata[0].key_materials && 
                       !plan.metadata[0].post_treatment_care)) && (
                      <p className="text-sm text-muted-foreground">No additional clinical information available.</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="visits" className="space-y-4">
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b">
                    <h4 className="font-semibold text-lg text-gray-700">Visits & Booking</h4>
                    <div className="text-sm text-gray-600">
                      {/* This metadata might reflect actual booked visits, which could differ from plannable treatments */}
                      {/* For now, let's show total plannable treatments as total visits */}
                      Completed: {plan.metadata?.[0]?.completed_visits || 0} of {treatmentsWithEstimatedDates?.length || 0} potential visits
                    </div>
                  </div>

                  {treatmentsWithEstimatedDates && treatmentsWithEstimatedDates.length > 0 ? (
                    <div className="space-y-3">
                      {treatmentsWithEstimatedDates.map((treatment: any, index: number) => (
                        <div key={treatment.id || index} className="border rounded-md p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium text-gray-800">{treatment.type || `Visit ${index + 1}`}</h5>
                              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{treatment.description || 'No description'}</p>
                            </div>
                            {/* Optional: Display treatment status if relevant here (e.g. pending, completed) */}
                            {/* For booking, all listed here are typically pending completion */}
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-700 mb-2 sm:mb-0">
                              <CalendarIcon className="h-4 w-4 text-blue-500" />
                              <span>Est. Date: {treatment.estimatedVisitDate || 'Not calculated'}</span>
                            </div>
                            <Button 
                              variant="default"
                              size="sm"
                              onClick={() => navigate('/appointments')} // Ensure '/appointments' is your correct route
                              // Disable if treatment status is completed or cancelled, or if no estimated date
                              disabled={treatment.status === 'completed' || treatment.status === 'cancelled' || !treatment.estimatedVisitDate}
                              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-150 ease-in-out"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              Book Appointment
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-500">No treatment visits to schedule.</p>
                       {/* Optional: Link to add treatments if none exist and this tab is shown */}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="financial" className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium">Financial Summary</h4>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Treatment Cost:</span>
                      <span className="font-medium">{formatCurrency(plan.totalCost || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Insurance Coverage (Est.):</span>
                      <span className="font-medium">{formatCurrency(plan.insurance_coverage || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Patient Responsibility:</span>
                      <span className="font-medium">{formatCurrency((plan.totalCost || 0) - (plan.insurance_coverage || 0))}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <DialogFooter>
              <div className="flex gap-2 items-center">
                {/* --- Refined Button Logic --- */}

                {/* Start Treatment: Only show if status is 'planned' */}
                {plan.status === 'planned' && (
                  <Button
                    variant="outline"
                    onClick={() => onStatusChange(plan.id, 'in_progress')}
                    disabled={loading}
                    title="Start this treatment plan"
                  >
                    {loading && !showDeleteConfirm && !showCancelConfirm ? (
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
                        {loading && showCancelConfirm ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4 mr-1" />
                        )}
                        Cancel Plan
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Treatment Plan</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to cancel this treatment plan? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>No, Keep Plan</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            onStatusChange(plan.id, 'cancelled');
                            setShowCancelConfirm(false);
                          }}
                        >
                          Yes, Cancel Plan
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Delete Plan: Always show, triggers confirmation */}
                <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={loading}
                      title="Delete this treatment plan"
                    >
                      {loading && showDeleteConfirm ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-1" />
                      )}
                      Delete Plan
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Treatment Plan</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this treatment plan? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>No, Keep Plan</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          onDeletePlan(plan.id);
                          setShowDeleteConfirm(false);
                        }}
                      >
                        Yes, Delete Plan
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
