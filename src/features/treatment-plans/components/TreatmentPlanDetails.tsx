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
  Pencil, // Added Pencil icon for Edit
  Download, // Added Download icon
  UserCircle, // Added UserCircle for doctor icon
  CalendarDays, // Added CalendarDays for date icon
  Printer, // Added Printer icon
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/validation'; // Assuming formatCurrency exists
import { TreatmentItem } from './TreatmentItem';
import TreatmentProgressBar from './TreatmentProgressBar'; // Import the new component
import { useToast } from '@/components/ui/use-toast'; // Re-add useToast if it was removed
import { treatmentService } from '../services/treatmentService'; // Import treatmentService

// Import jsPDF and autoTable for PDF generation
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Import status type (only TreatmentStatus is needed)
import type { TreatmentStatus } from '@/types'; // Ensure path is correct
// Import AISuggestion type if it's used for the new prop
import type { AISuggestion as ImportedAISuggestion } from './AISuggestionForm';
// Remove import type { Database } from 'supabase_types'; // Import the Database type
import type { BookedAppointmentDetail } from '../hooks/useTreatmentPlans'; // Import BookedAppointmentDetail

// Helper function to parse timeGap string (e.g., "2 weeks", "1 month") and add to a date
const calculateEstimatedDate = (baseDateStr: string, timeGapStr: string | null | undefined): string => {
  if (!timeGapStr) {
    // If no time gap, try to parse and reformat baseDateStr to 'yyyy-MM-dd' or return original if invalid
    try {
      return format(parseISO(baseDateStr), 'yyyy-MM-dd'); // Attempt ISO parse first
    } catch (e) {
      try {
        // Attempt to parse "MMM d, yyyy" format, e.g., "May 15, 2025"
        // Date-fns `parse` is better for specific formats but new Date() can sometimes handle it.
        const parsedDate = new Date(baseDateStr); // More lenient parsing
        if (!isNaN(parsedDate.getTime())) {
          return format(parsedDate, 'yyyy-MM-dd');
        }
        console.warn(`[calculateEstimatedDate] Could not parse baseDateStr with any known method: ${baseDateStr}`);
        return baseDateStr; // Fallback to original if all parsing fails
      } catch (e2) {
        console.warn(`[calculateEstimatedDate] Further error parsing baseDateStr: ${baseDateStr}`);
        return baseDateStr;
      }
    }
  }

  let baseDate;
  try {
    baseDate = parseISO(baseDateStr);
  } catch (e) {
    try {
      baseDate = new Date(baseDateStr); // Try general parser for baseDateStr if parseISO fails
      if (isNaN(baseDate.getTime())) throw new Error('Invalid base date after new Date()');
    } catch (e2) {
      console.error(`[calculateEstimatedDate] Invalid baseDate: ${baseDateStr}`, e2);
      return 'Invalid Date'; // Return a clear error string
    }
  }
  if (isNaN(baseDate.getTime())) {
    console.error(`[calculateEstimatedDate] BaseDate is invalid after parsing attempts: ${baseDateStr}`);
    return 'Invalid Date';
  }

  try {
    const parts = timeGapStr.toLowerCase().split(' ');
    if (parts.length !== 2) return format(baseDate, 'yyyy-MM-dd');

    const amount = parseInt(parts[0], 10);
    const unit = parts[1].endsWith('s') ? parts[1] : parts[1] + 's';

    if (isNaN(amount)) return format(baseDate, 'yyyy-MM-dd');

    let duration = {};
    if (unit === 'days') duration = { days: amount };
    else if (unit === 'weeks') duration = { weeks: amount };
    else if (unit === 'months') duration = { months: amount };
    else if (unit === 'years') duration = { years: amount };
    else return format(baseDate, 'yyyy-MM-dd');

    return format(add(baseDate, duration), 'yyyy-MM-dd'); // Output yyyy-MM-dd
  } catch (error) {
    console.error(`Error calculating estimated date with baseDate: ${baseDateStr}, timeGap: ${timeGapStr}`, error);
    try {
      return format(baseDate, 'yyyy-MM-dd'); // Fallback to formatted baseDate if calculation fails
    } catch {
      return 'Invalid Date'; // Final fallback
    }
  }
};

// Add interface for visits
// Ensure this interface is comprehensive for editing purposes
export interface TreatmentVisit { // Added export
  id: string;
  treatment_plan_id: string;
  visit_number: number;
  procedures: string;
  estimated_duration?: string;
  time_gap?: string;
  status: 'pending' | 'completed' | 'cancelled';
  scheduled_date?: string;
  cost?: number | string; // Assuming cost can be part of a visit/treatment item
  type?: string; // As seen in other treatment structures
  description?: string; // As seen in other treatment structures, though 'procedures' is here
  priority?: string; // Assuming priority might be editable per visit
}

interface AISuggestion {
  title?: string;
  description?: string;
  planDetails?: {
    planName?: string;
    keyMaterials?: string;
    appointmentPlan?: {
      totalSittings?: string | number;
      sittingDetails?: Array<{
        visit?: string;
        timeGap?: string;
        procedures?: string;
        estimatedDuration?: string;
      }>;
      medicalPrecautions?: string;
      totalTreatmentTime?: string;
    };
    clinicalProtocol?: string;
    expectedOutcomes?: string;
    isPatientSelected?: boolean;
    clinicalConsiderations?: string;
  };
  caseOverview?: any;
  patientFactors?: any;
  clinicalRationale?: string;
  postTreatmentCare?: string;
  recommendedInvestigations?: string;
  // Add any other fields that are part of the AI suggestion object
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
    treatments: any[]; // Consider typing this more strictly if possible
    metadata: {
      clinical_considerations: string | null;
      key_materials: string | null;
      post_treatment_care: string | null;
      total_visits: number; // This might be from AI plan, or calculated
      completed_visits: number; // This might be from AI plan, or calculated
      originalAISuggestion?: AISuggestion | null; // Added for full AI suggestion
      aiPlanClinicalConsiderations?: string | null; // Added from DB schema
      aiPlanKeyMaterials?: string | null; // Added from DB schema
      aiOutputPostTreatmentCare?: string | null; // Added from DB schema
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
    patient?: {
      full_name: string;
      age: number;
      gender: string;
      registration_number: string;
    };
    originalAISuggestion?: AISuggestion | null; // Existing direct prop on plan
  };
  onRefresh: () => Promise<void>;
  onAddTreatment: () => void;
  onStatusChange: (planId: string, status: TreatmentStatus) => Promise<void>;
  onDeletePlan: (planId: string) => Promise<void>;
  onTreatmentStatusChange: (treatmentId: string, status: TreatmentStatus) => Promise<void>;
  onDeleteTreatment: (treatmentId: string) => Promise<void>;
  loading?: boolean;
  navigateToPatient?: (patientId: string) => void;
  aiInitialSuggestion?: AISuggestion | null; // Prop for passing initial AI suggestion
  onEditTreatment: (treatment: TreatmentVisit) => void;
  bookedAppointments?: BookedAppointmentDetail[];
}

// Add these type definitions at the top of the file after the imports
interface PrintableContentProps {
  plan: {
    id: string;
    patientName: string;
    title: string;
    status: string;
    description?: string;
    start_date: string;
    end_date?: string;
    priority?: string;
    totalCost?: number;
    insurance_coverage?: number;
    metadata?: Array<{
      clinical_considerations: string | null;
      key_materials: string | null;
      post_treatment_care: string | null;
      total_visits?: number;
      completed_visits?: number;
    }> | null;
    patient?: {
      gender?: string;
      age?: number;
      registration_number?: string;
      full_name?: string;
    };
    teeth?: { tooth_id: number }[] | null;
  };
  treatmentsWithEstimatedDates: Array<{
    id?: string;
    type?: string;
    title?: string;
    status: string;
    description?: string;
    procedures?: string;
    scheduled_date?: string;
    completed_date?: string;
    estimatedVisitDate?: string;
    cost?: number | string;
    visit_number?: number;
  }>;
}

// Update the PrintableContent component with types
export const PrintableContent = ({ plan, treatmentsWithEstimatedDates }: PrintableContentProps) => {
  // Debug log for patient section print
  console.log('[PrintableContent PATIENT SECTION] plan:', plan);
  console.log('[PrintableContent PATIENT SECTION] treatmentsWithEstimatedDates:', treatmentsWithEstimatedDates);
  if (!plan) return null;

  const formatDate = (dateStr?: string) => dateStr ? format(new Date(dateStr), 'MMM d, yyyy') : 'N/A';
  const formatStatus = (status?: string) => status ? status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ') : 'N/A';
  const formatPriority = (priority?: string) => priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'N/A';

  return (
    <div id="printable-content" className="print-only" style={{
      display: 'none',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: 'white',
      color: '#000',
      minHeight: '100vh',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <img src="https://i.postimg.cc/j2qGSXwJ/facetslogo.png" alt="Facets Logo" style={{ height: '35px' }} />
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ fontSize: 22, margin: 0, color: '#0060df', fontWeight: 700 }}>Treatment Plan</h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: 12, fontWeight: 500 }}>Generated on: {format(new Date(), 'MMM d, yyyy')}</p>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#000' }}>Patient: {plan.patientName || plan.patient?.full_name || 'N/A'}</p>
        <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: '#000' }}>Reg. No: {plan.patient?.registration_number || 'N/A'}</p>
        <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: '#000' }}>Affected Teeth: {plan.teeth && plan.teeth.length > 0 ? plan.teeth.map((t: { tooth_id: number }) => t.tooth_id).sort((a: number, b: number) => a - b).join(', ') : 'N/A'}</p>
      </div>
      <div style={{ borderBottom: '2px solid #0060df', marginBottom: 15 }}></div>

      {/* Plan Details */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, color: '#0060df', marginBottom: 10, fontWeight: 700 }}>Plan Details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, marginBottom: 10 }}>
          <div>
            <p style={{ margin: 0, color: '#666', fontWeight: 500 }}>Plan Title</p>
            <p style={{ margin: 0, color: '#000', fontWeight: 700 }}>{plan.title || 'N/A'}</p>
          </div>
          <div>
            <p style={{ margin: 0, color: '#666', fontWeight: 500 }}>Priority</p>
            <p style={{ margin: 0, color: '#0060df', fontWeight: 700 }}>{formatPriority(plan.priority)}</p>
          </div>
          <div>
            <p style={{ margin: 0, color: '#666', fontWeight: 500 }}>Status</p>
            <p style={{ margin: 0, color: '#000', fontWeight: 700 }}>{formatStatus(plan.status)}</p>
          </div>
          <div>
            <p style={{ margin: 0, color: '#666', fontWeight: 500 }}>Start Date</p>
            <p style={{ margin: 0, color: '#000', fontWeight: 700 }}>{formatDate(plan.start_date)}</p>
          </div>
          <div>
            <p style={{ margin: 0, color: '#666', fontWeight: 500 }}>End Date</p>
            <p style={{ margin: 0, color: '#000', fontWeight: 700 }}>{formatDate(plan.end_date)}</p>
          </div>
        </div>
        {/* Description */}
        <div>
          <p style={{ margin: '0 0 4px', color: '#666', fontSize: 13, fontWeight: 500 }}>Description</p>
          <div style={{ border: '1px solid #e5e7eb', padding: 10, fontSize: 13, lineHeight: 1.4, color: '#000', fontWeight: 500 }}>
            {plan.description || 'No description available.'}
          </div>
        </div>
      </div>

      {/* Treatments Table */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, color: '#0060df', marginBottom: 10, fontWeight: 700 }}>Treatments / Visits</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #0060df' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px 8px 0', fontWeight: 700, color: '#000' }}>#</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 700, color: '#000' }}>Treatment</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 700, color: '#000' }}>Description</th>
              <th style={{ textAlign: 'center', padding: '8px 10px', fontWeight: 700, color: '#000', width: 80 }}>Status</th>
              <th style={{ textAlign: 'center', padding: '8px 10px', fontWeight: 700, color: '#000', width: 90 }}>Date</th>
              <th style={{ textAlign: 'right', padding: '8px 0 8px 10px', fontWeight: 700, color: '#000', width: 80 }}>Cost</th>
            </tr>
          </thead>
          <tbody>
            {(treatmentsWithEstimatedDates && treatmentsWithEstimatedDates.length > 0) ? (
              treatmentsWithEstimatedDates.map((treatment, index) => (
                <tr key={treatment.id || index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '10px 10px 10px 0', verticalAlign: 'top', color: '#000', fontWeight: 700 }}>{treatment.visit_number || (index + 1)}</td>
                  <td style={{ padding: '10px', verticalAlign: 'top', color: '#000', fontWeight: 700 }}>{treatment.type || treatment.title || `Visit ${index + 1}`}</td>
                  <td style={{ padding: '10px', verticalAlign: 'top', color: '#000', fontWeight: 500 }}>{treatment.description || treatment.procedures || 'N/A'}</td>
                  <td style={{ padding: '10px', textAlign: 'center', verticalAlign: 'top' }}>
                    <span style={{ color: treatment.status === 'pending' ? '#f97316' : '#000', fontWeight: 700 }}>{formatStatus(treatment.status)}</span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', verticalAlign: 'top', color: '#000', fontWeight: 700 }}>{treatment.scheduled_date ? formatDate(treatment.scheduled_date) : treatment.estimatedVisitDate ? formatDate(treatment.estimatedVisitDate) : 'N/A'}</td>
                  <td style={{ padding: '10px 0 10px 10px', textAlign: 'right', verticalAlign: 'top', color: '#000', fontWeight: 700 }}>{treatment.cost ? formatCurrency(parseFloat(String(treatment.cost))) : 'N/A'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#888' }}>No treatments or visits recorded for this plan.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Financial Summary */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, color: '#0060df', marginBottom: 10, fontWeight: 700 }}>Financial Summary</h2>
        <div style={{ border: '1px solid #e5e7eb', fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 10, borderBottom: '1px solid #e5e7eb' }}>
            <span style={{ color: '#0060df', fontWeight: 700 }}>Total Treatment Cost:</span>
            <span style={{ fontWeight: 700 }}>{formatCurrency(plan.totalCost || 0)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 10, borderBottom: '1px solid #e5e7eb' }}>
            <span style={{ color: '#0060df', fontWeight: 700 }}>Insurance Coverage (Est.):</span>
            <span style={{ fontWeight: 700 }}>{formatCurrency(plan.insurance_coverage || 0)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 10 }}>
            <span style={{ color: '#0060df', fontWeight: 700 }}>Patient Responsibility:</span>
            <span style={{ fontWeight: 700 }}>{formatCurrency((plan.totalCost || 0) - (plan.insurance_coverage || 0))}</span>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, color: '#0060df', marginBottom: 10, fontWeight: 700 }}>Additional Information</h2>
        <div style={{ marginBottom: 15 }}>
          <h3 style={{ fontSize: 13, margin: '0 0 6px', fontWeight: 700, color: '#000' }}>Post-Treatment Care</h3>
          <div style={{ border: '1px solid #e5e7eb', padding: 10, fontSize: 13, lineHeight: 1.4, color: '#000', fontWeight: 500 }}>
            {plan.metadata?.[0]?.post_treatment_care || 'No post-treatment care instructions available.'}
          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div style={{ marginTop: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30 }}>
          <div style={{ width: '45%' }}>
            <div style={{ borderBottom: '1px solid #000', marginBottom: 6 }}></div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#000' }}>Doctor's Signature</p>
          </div>
          <div style={{ width: '45%' }}>
            <div style={{ borderBottom: '1px solid #000', marginBottom: 6 }}></div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#000' }}>Patient's Signature</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', color: '#000', fontSize: 13, marginBottom: 20 }}>
        <p style={{ margin: 0, color: '#000', fontWeight: 500 }}>This treatment plan is valid for 6 months from the date of issue.</p>
        <p style={{ margin: '4px 0 0', color: '#000', fontWeight: 500 }}>For any queries, please contact your dental care provider.</p>
      </div>
    </div>
  );
};

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
  aiInitialSuggestion: aiInitialSuggestionProp, // Destructure new prop
  onEditTreatment, 
  bookedAppointments = [], 
}: TreatmentPlanDetailsProps) {
  const { toast } = useToast(); 
  const navigate = useNavigate(); 
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5; 
  const [isCreatingAiTreatments, setIsCreatingAiTreatments] = useState(false); 

  // --- BEGIN PATIENT SECTION DEBUG LOGS ---
  if (typeof console !== 'undefined' && console.groupCollapsed && console.log && console.groupEnd) {
    console.groupCollapsed(`[TreatmentPlanDetails PROPS - Plan ID: ${plan?.id}]`);
    console.log('[TreatmentPlanDetails PROPS] Received plan:', JSON.parse(JSON.stringify(plan || {})));
    console.log('[TreatmentPlanDetails PROPS] plan.treatments:', JSON.parse(JSON.stringify(plan?.treatments || [])));
    console.log('[TreatmentPlanDetails PROPS] plan.originalAISuggestion:', JSON.parse(JSON.stringify(plan?.originalAISuggestion || null)));
    console.log('[TreatmentPlanDetails PROPS] Received aiInitialSuggestionProp:', JSON.parse(JSON.stringify(aiInitialSuggestionProp || null)));
    console.groupEnd();
  }
  // --- END PATIENT SECTION DEBUG LOGS ---

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
    return undefined; 
  };

  const [aiInitialSuggestion, setAiInitialSuggestion] = useState<AISuggestion | null>(null);

  useEffect(() => {
    let isMounted = true;

    const findExistingSuggestion = (): AISuggestion | null => {
      if (aiInitialSuggestionProp) {
        // console.log('[TreatmentPlanDetails] Using aiInitialSuggestionProp:', aiInitialSuggestionProp);
        return aiInitialSuggestionProp;
      }
      if (plan?.originalAISuggestion) {
        // console.log('[TreatmentPlanDetails] Using plan.originalAISuggestion:', plan.originalAISuggestion);
        return plan.originalAISuggestion;
      }
      if (plan?.metadata && plan.metadata.length > 0 && plan.metadata[0]?.originalAISuggestion) {
        // console.log('[TreatmentPlanDetails] Using plan.metadata[0].originalAISuggestion:', plan.metadata[0].originalAISuggestion);
        return plan.metadata[0].originalAISuggestion as AISuggestion;
      }
      return null;
    };

    const existingSuggestion = findExistingSuggestion();

    if (isMounted) {
      if (existingSuggestion) {
        setAiInitialSuggestion(existingSuggestion);
        // console.log('[TreatmentPlanDetails] Set aiInitialSuggestion from existing:', existingSuggestion);
      } else {
        // Only attempt to fetch if no existing suggestion is found AND specific conditions are met.
        // This helps prevent re-fetching if a plan is opened that genuinely had no AI suggestion initially.
        if (
          open && plan && plan.id && plan.patient_id && plan.description &&
          (!plan.treatments || plan.treatments.length === 0) && // Only if no manual treatments exist
          !plan.visits?.length // And no visits already exist
        ) {
          // console.log('[TreatmentPlanDetails] No existing AI suggestion found, attempting to fetch for new/empty plan...');
          import('../services/treatmentService')
            .then(m => m.treatmentService.getAiSuggestionForPlan(plan))
            .then(suggestion => {
              if (isMounted) {
                setAiInitialSuggestion(suggestion);
                // console.log('[TreatmentPlanDetails] (auto-fetched) AI Suggestion:', suggestion);
              }
            })
            .catch(e => {
              console.error('[TreatmentPlanDetails] Error auto-fetching AI suggestion:', e);
              if (isMounted) setAiInitialSuggestion(null);
            });
        } else if (aiInitialSuggestion !== null) { // Clear if conditions not met and suggestion was present
            // This case handles if the plan changes to one that shouldn't auto-fetch, or if it already has treatments/visits
            // setAiInitialSuggestion(null); // Or decide if stale suggestion should persist. For now, let's not clear aggressively.
        }
      }
    }

    return () => { isMounted = false; };
  }, [open, plan, aiInitialSuggestionProp]); // Effect dependencies

  // console.log('[TreatmentPlanDetails] Rendering. Plan:', plan);
  // console.log('[TreatmentPlanDetails] aiInitialSuggestion:', aiInitialSuggestion);
  // if (aiInitialSuggestion?.planDetails?.appointmentPlan) {
  // ... existing code ...

  // New memo to sort treatments by visit_number
  const sortedAndUniqueTreatments = useMemo(() => {
    if (!plan?.treatments || plan.treatments.length === 0) return [];

    // De-duplicate by id (assuming id is the primary unique key from the database)
    const uniqueByIdMap = new Map();
    for (const treatment of plan.treatments) {
      // Ensure treatment and treatment.id exist before adding to map
      if (treatment && typeof treatment.id !== 'undefined') {
        if (!uniqueByIdMap.has(treatment.id)) {
          uniqueByIdMap.set(treatment.id, treatment);
        }
      } else {
        // Log or handle treatments without an id if necessary, for now, we skip them for de-duplication
        console.warn('[TreatmentPlanDetails] Encountered a treatment without an ID:', treatment);
      }
    }
    const uniqueTreatments = Array.from(uniqueByIdMap.values());

    // Sort by visit_number first, then by created_at if visit_number is the same
    // If visit_number is missing, treat it as Infinity to put it at the end
    return uniqueTreatments.sort((a, b) => {
      const visitA = typeof a.visit_number === 'number' ? a.visit_number : Infinity;
      const visitB = typeof b.visit_number === 'number' ? b.visit_number : Infinity;
      
      if (visitA !== visitB) {
        return visitA - visitB;
      }
      
      // If visit numbers are the same, maintain original order using created_at
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateA - dateB;
    });
  }, [plan?.treatments]);

  const paginatedTreatments = useMemo(() => {
    if (!sortedAndUniqueTreatments) return []; // Use sortedAndUniqueTreatments
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedAndUniqueTreatments.slice(startIndex, endIndex); // Use sortedAndUniqueTreatments
  }, [sortedAndUniqueTreatments, currentPage]);

  // Calculate estimated dates for treatments
  const treatmentsWithEstimatedDates = useMemo(() => {
    if (!sortedAndUniqueTreatments || sortedAndUniqueTreatments.length === 0) return [];

    let runningDate = plan.start_date || plan.created_at; // Base date for the first treatment

    return sortedAndUniqueTreatments.map((treatment, index) => { // Use sortedAndUniqueTreatments
      let estimatedVisitDate;
      if (index === 0) {
        estimatedVisitDate = format(parseISO(runningDate), 'yyyy-MM-dd');
      } else {
        // For subsequent treatments, calculate based on the previous treatment's time_gap
        // Note: This assumes treatments are sorted.
        // The time_gap on treatment[i] dictates the gap AFTER treatment[i-1] is notionally completed.
        // Or, if time_gap is on treatment[i-1], it means the gap before treatment[i] starts.
        // Let's assume `treatment.time_gap` means "next visit in X time *after this current visit*".
        // So, to calculate date for treatment[i], we need time_gap of treatment[i-1].
        // The current data model seems to have time_gap on the *current* treatment, meaning "this visit occurs X time after the PREVIOUS one".
        const previousTreatment = sortedAndUniqueTreatments[index - 1]; // Use sortedAndUniqueTreatments
        runningDate = calculateEstimatedDate(runningDate, previousTreatment.time_gap);
        estimatedVisitDate = runningDate; // calculateEstimatedDate already formats it
      }
      return { ...treatment, estimatedVisitDate };
    });
  }, [sortedAndUniqueTreatments, plan?.start_date, plan?.created_at]); // Dependency on sortedAndUniqueTreatments

  // Use treatmentsWithEstimatedDates for pagination
  const paginatedTreatmentsWithDates = useMemo(() => {
    if (!treatmentsWithEstimatedDates) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return treatmentsWithEstimatedDates.slice(startIndex, endIndex);
  }, [treatmentsWithEstimatedDates, currentPage]);

  const totalPages = useMemo(() => {
    if (!sortedAndUniqueTreatments) return 1; // Use sortedAndUniqueTreatments
    return Math.ceil(sortedAndUniqueTreatments.length / ITEMS_PER_PAGE); // Use sortedAndUniqueTreatments
  }, [sortedAndUniqueTreatments]);
  // --- End Pagination State ---

  // --- PDF Generation Handler ---
  const handleDownloadPdf = async () => { // Made async for potential image loading
    if (!plan) return;

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const pdfMargin = 14; // Standard margin for PDF content
    let currentY = 20; // Initial Y position

    // Set a base font for the document
    doc.setFont('helvetica', 'normal');

    // Helper to add horizontal line
    const addSectionLine = (y: number) => {
      doc.setDrawColor(200, 200, 200); // Light gray line
      doc.line(pdfMargin, y, pageWidth - pdfMargin, y);
    };

    // --- Document Header with Logo ---
    try {
      // Attempt to load logo
      const logoResponse = await fetch('https://i.postimg.cc/j2qGSXwJ/facetslogo.png'); // Use the provided URL
      if (!logoResponse.ok) {
        throw new Error(`Failed to fetch logo: ${logoResponse.status} ${logoResponse.statusText}`);
      }
      const blob = await logoResponse.blob();
      if (blob.size === 0) {
        throw new Error('Fetched logo blob is empty.');
      }
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          if (reader.result) {
            resolve(reader.result as string);
          } else {
            reject(new Error('FileReader failed to read blob.'));
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
      });
      const dataUrlStr: string = dataUrl as string; // Explicitly type as string
      if (!dataUrlStr.startsWith('data:image')) {
        throw new Error('Generated Data URL is not an image.');
      }
      const imgProps = doc.getImageProperties(dataUrlStr);
      const logoHeight = 12; // Adjusted logo height
      const logoWidth = (imgProps.width * logoHeight) / imgProps.height;
      const logoX = pdfMargin;
      const logoY = currentY - 7; // Position logo slightly above the title line

      doc.addImage(dataUrlStr, imgProps.fileType.toUpperCase(), logoX, logoY, logoWidth, logoHeight);
      
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      const titleX = logoX + logoWidth + 10; // Position title next to logo
      const titleY = logoY + logoHeight / 2; // Vertically align title with logo center
      doc.text('Treatment Plan Report', titleX, titleY, { baseline: 'middle' });
      doc.setFont('helvetica', 'normal'); // Reset font
      currentY += Math.max(logoHeight, 10) + 10; // Increased spacing after header

    } catch (error) {
      console.error("Error loading logo:", error);
      // Fallback if logo fails: Center title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Treatment Plan Report', pageWidth / 2, currentY, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      currentY += 18; // Increased spacing
    }
    
    addSectionLine(currentY);
    currentY += 12; // Increased spacing

    // --- Patient and Plan Information ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Patient & Plan Details', pdfMargin, currentY);
    doc.setFont('helvetica', 'normal');
    currentY += 10; // Increased spacing

    const patientPlanDetailsRows = [
      ["Patient Name:", plan.patientName],
      ["Plan Title:", plan.title],
      ["Plan Description:", plan.description || 'N/A'],
      ["Plan Dates:", `${format(new Date(plan.start_date), 'MMM d, yyyy')}${plan.end_date ? ` to ${format(new Date(plan.end_date), 'MMM d, yyyy')}` : ''}`],
      ["Priority:", plan.priority ? plan.priority.charAt(0).toUpperCase() + plan.priority.slice(1) : 'N/A'],
      ["Status:", plan.status ? plan.status.replace('_', ' ').charAt(0).toUpperCase() + plan.status.replace('_', ' ').slice(1) : 'N/A'],
    ];

    autoTable(doc, {
        body: patientPlanDetailsRows,
        startY: currentY,
        theme: 'plain',
        styles: { 
            fontSize: 8, 
            cellPadding: 1.5, 
            font: 'helvetica',
            valign: 'middle',
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 45 }, 
            1: { cellWidth: 'auto' },
        },
        didDrawPage: (data) => {
            const pageCount = doc.getNumberOfPages();
            doc.setFontSize(8);
            doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, pageHeight - 10);
        }
    });
    currentY = (doc as any).lastAutoTable.finalY + 10; // Increased spacing
    addSectionLine(currentY);
    currentY += 12; // Increased spacing
    
    // --- Treatments/Visits Table ---
    if (currentY > pageHeight - 60) { doc.addPage(); currentY = 20; } // Check space
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Treatments / Visits', pdfMargin, currentY);
    doc.setFont('helvetica', 'normal');
    currentY += 10; // Increased spacing

    const tableColumn = ["#", "Treatment / Visit", "Procedures", "Status", "Date", "Cost"];
    const tableRows: any[] = [];

    // Adjusted column widths for better text fitting
    const treatmentVisitColWidth = 70; // Increased from 60
    const proceduresColWidth = 43; // Decreased from 53
    const cellPaddingVal = 1.5; // Matching autoTable style
    const cellHorizontalPadding = cellPaddingVal * 2; 
    
    const maxTreatmentVisitTextWidth = treatmentVisitColWidth - cellHorizontalPadding;
    const maxProcedureTextWidth = proceduresColWidth - cellHorizontalPadding;

    (treatmentsWithEstimatedDates || []).forEach((treatmentWithDate, index) => { // Iterate the processed list
      // treatmentWithDate object already contains properties from original treatment + estimatedVisitDate
      const visitDate = treatmentWithDate.scheduled_date 
        ? format(new Date(treatmentWithDate.scheduled_date), 'MMM d, yyyy') 
        : (treatmentWithDate.completed_date 
            ? format(new Date(treatmentWithDate.completed_date), 'MMM d, yyyy') 
            : (treatmentWithDate.estimatedVisitDate // Directly use the property
                ? format(new Date(treatmentWithDate.estimatedVisitDate),'MMM d, yyyy')
                : 'N/A'));
      
      const cost = treatmentWithDate.cost ? formatCurrency(parseFloat(String(treatmentWithDate.cost))) : 'N/A';
      
      const rawTreatmentVisitText = treatmentWithDate.type || treatmentWithDate.title || 'N/A';
      const treatmentVisitTextLines = doc.splitTextToSize(rawTreatmentVisitText, maxTreatmentVisitTextWidth);
      const formattedTreatmentVisitText = treatmentVisitTextLines.join('\n');

      const rawProcedureText = treatmentWithDate.description || treatmentWithDate.procedures || 'N/A';
      const procedureTextLines = doc.splitTextToSize(rawProcedureText, maxProcedureTextWidth);
      const formattedProcedureText = procedureTextLines.join('\n');

      const treatmentData = [
        treatmentWithDate.visit_number || (index + 1), // visit_number from treatmentWithDate
        formattedTreatmentVisitText,
        formattedProcedureText,
        treatmentWithDate.status ? treatmentWithDate.status.charAt(0).toUpperCase() + treatmentWithDate.status.slice(1) : 'N/A',
        visitDate,
        cost,
      ];
      tableRows.push(treatmentData);
    });
    
    if (tableRows.length === 0) {
        doc.setFontSize(9); // Adjusted font size
        doc.text("No treatments or visits recorded for this plan.", pdfMargin, currentY);
        currentY += 10;
    } else {
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: currentY,
            theme: 'grid',
            headStyles: { 
                fillColor: [0, 96, 223], // Brighter blue from theme #0060df
                textColor: 255, 
                fontStyle: 'bold', 
                font: 'helvetica', 
                fontSize: 9,
                valign: 'middle',
            },
            styles: { 
                fontSize: 7, // Reduced from 8 for better text fit
                cellPadding: cellPaddingVal, 
                font: 'helvetica',
                valign: 'middle',
            },
            columnStyles: {
                0: { cellWidth: 6, halign: 'center' },    
                1: { cellWidth: treatmentVisitColWidth }, // Now 70
                2: { cellWidth: proceduresColWidth }, // Now 43
                3: { cellWidth: 22, halign: 'center' }, // Status
                4: { cellWidth: 16, halign: 'center' }, // Date
                5: { cellWidth: 25, halign: 'right', cellPadding: {top: cellPaddingVal, bottom: cellPaddingVal, left:cellPaddingVal, right: 2} }, // Cost
            },
            didDrawPage: (data) => { 
                const pageCount = doc.getNumberOfPages();
                doc.setFontSize(8);
                doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, pageHeight - 10);
            }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
    }
    addSectionLine(currentY);
    currentY += 12; // Increased spacing

    // --- Financial Summary ---
    if (currentY > pageHeight - 75) { doc.addPage(); currentY = 20; } // Check space
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Summary', pdfMargin, currentY);
    doc.setFont('helvetica', 'normal');
    currentY += 10; // Increased spacing
    
    const financialTableColumn = ["Item", "Amount"];
    const financialTableRows = [
        ["Total Treatment Cost:", formatCurrency(plan.totalCost || 0)],
        ["Insurance Coverage (Est.):", formatCurrency(plan.insurance_coverage || 0)], // Assuming INR is handled by formatCurrency
        ["Patient Responsibility:", formatCurrency((plan.totalCost || 0) - (plan.insurance_coverage || 0))],
    ];

    const financialItemColWidth = pageWidth - (pdfMargin * 2) - 50; // 50 for Amount column
    autoTable(doc, {
        head: [financialTableColumn],
        body: financialTableRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { 
            fillColor: [0, 96, 223], // Brighter blue from theme #0060df
            textColor: 255, 
            fontStyle: 'bold', 
            halign: 'center', 
            font: 'helvetica',
            fontSize: 9,
            valign: 'middle',
        },
        styles: { 
            fontSize: 8, 
            cellPadding: 2, 
            font: 'helvetica',
            valign: 'middle',
        },
        columnStyles: {
            0: { cellWidth: financialItemColWidth, fontStyle: 'bold' }, 
            1: { cellWidth: 50, halign: 'right', cellPadding: {top: 2, bottom: 2, left:2, right: 3} },
        },
        didDrawPage: (data) => {
            const pageCount = doc.getNumberOfPages();
            doc.setFontSize(8);
            doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, pageHeight - 10);
        }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
    addSectionLine(currentY);
    currentY += 12; // Increased spacing

    // --- Clinical Information ---
    if (currentY > pageHeight - 60) { doc.addPage(); currentY = 20; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Clinical Information', pdfMargin, currentY);
    doc.setFont('helvetica', 'normal');
    currentY += 10; // Increased spacing
    doc.setFontSize(9); // Content font size for clinical info

    if (plan.metadata && plan.metadata.length > 0) {
        const meta = plan.metadata[0];
        const clinicalFields = [
            { label: 'Clinical Considerations:', value: meta.clinical_considerations },
            { label: 'Key Materials:', value: meta.key_materials },
            { label: 'Post-Treatment Care:', value: meta.post_treatment_care },
        ];

        clinicalFields.forEach(field => {
            if (currentY > pageHeight - 25) { doc.addPage(); currentY = 20; } // Check space for label + one line
            doc.setFont('helvetica', 'bold');
            doc.text(field.label, pdfMargin, currentY);
            currentY += 6; // Space after label
            doc.setFont('helvetica', 'normal');
            const textContent = field.value || 'Not Specified';
            const lines = doc.splitTextToSize(textContent, pageWidth - (pdfMargin * 2));
            doc.text(lines, pdfMargin, currentY);
            currentY += (lines.length * 4.5) + 5; // Adjusted line height and spacing
        });
    } else {
        doc.text('No additional clinical information available.', pdfMargin, currentY);
        currentY += 7;
    }
    currentY += 8; // Increased spacing
    addSectionLine(currentY);
    currentY += 12; // Increased spacing
    
    // --- Signatures ---
    const signatureSectionHeight = 50; // Estimated height for signature section
    if (pageHeight - currentY < signatureSectionHeight) { 
        doc.addPage(); 
        currentY = pdfMargin; // Reset Y for new page, signatures will be placed from bottom
    }
    
    const signatureLineLength = (pageWidth / 2) - pdfMargin - 35; // Adjusted length
    const signatureYPos = pageHeight - 35; // Position higher from bottom

    doc.setFontSize(9); // Font size for signature labels
    doc.setFont('helvetica', 'normal');
    
    doc.text('Doctor Signature:', pdfMargin, signatureYPos);
    doc.line(pdfMargin + doc.getTextWidth('Doctor Signature:') + 5, signatureYPos + 1, pdfMargin + doc.getTextWidth('Doctor Signature:') + 5 + signatureLineLength, signatureYPos + 1);

    const patientSigX = pageWidth / 2 + 15; // Adjusted X for patient signature
    doc.text('Patient Signature:', patientSigX, signatureYPos);
    doc.line(patientSigX + doc.getTextWidth('Patient Signature:') + 5, signatureYPos + 1, patientSigX + doc.getTextWidth('Patient Signature:') + 5 + signatureLineLength, signatureYPos + 1);
    
    // Final check for page numbers on all pages
    const totalPdfPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPdfPages; i++) {
        doc.setPage(i);
        // Check if autoTable might have already added page number for this page
        // This is a fallback; autoTable's didDrawPage should handle most cases.
        // This is a simplification.
        if ( (doc as any).lastAutoTable && i <= (doc as any).lastAutoTable.pageCount) {
             // Potentially drawn by autoTable, check near bottom
        } else {
             // Add if not likely drawn by autoTable
             doc.setFontSize(8);
             doc.text(`Page ${i} of ${totalPdfPages}`, pdfMargin, pageHeight - 10);
        }
    }

    doc.save(`Treatment_Plan_${plan.patientName.replace(/[^a-zA-Z0-9]/g, '_')}_${plan.id.substring(0,8)}.pdf`);
    toast({
      title: "PDF Downloaded",
      description: "The treatment plan PDF has been generated and downloaded with an updated design.",
    });
  };
  // --- End PDF Generation Handler ---

  // --- Direct Print Handler ---
  const handleDirectPrint = () => {
    // Create and append print styles
    const printStyleId = 'print-styles';
    let styleElement = document.getElementById(printStyleId);
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = printStyleId;
    }

    styleElement.innerHTML = `
        @media print {
            /* Hide everything except print content */
            body * {
                visibility: hidden;
            }
            #printable-content,
            #printable-content * {
                visibility: visible;
                color: black;
            }
            #printable-content {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white;
            }
            @page {
                size: auto;
                margin: 20mm;
            }
        }
    `;
    document.head.appendChild(styleElement);

    // Show print content
    const printContent = document.getElementById('printable-content');
    if (printContent) {
        printContent.style.display = 'block';
    }

    // Print
    window.print();

    // Cleanup after print
    const afterPrint = () => {
        if (printContent) {
            printContent.style.display = 'none';
        }
        if (styleElement && styleElement.parentNode) {
            styleElement.parentNode.removeChild(styleElement);
        }
        window.removeEventListener('afterprint', afterPrint);
    };
    window.addEventListener('afterprint', afterPrint);
};
  // --- End Direct Print Handler ---

  // Helper function to prepare visit data for editing
  const prepareVisitForEditing = (treatmentData: any, currentPlanId: string, visitIndex?: number): TreatmentVisit => {
    const visitNumber = typeof visitIndex === 'number' ? visitIndex + 1 : treatmentData.visit_number;
    let finalScheduledDate = null;
    // Prefer treatmentData.scheduled_date if it exists and is valid yyyy-MM-dd
    if (treatmentData.scheduled_date && /^\d{4}-\d{2}-\d{2}$/.test(treatmentData.scheduled_date)) {
      finalScheduledDate = treatmentData.scheduled_date;
    } else if (treatmentData.estimatedVisitDate && /^\d{4}-\d{2}-\d{2}$/.test(treatmentData.estimatedVisitDate)) {
      // Use estimatedVisitDate if it's valid yyyy-MM-dd (now produced by calculateEstimatedDate)
      finalScheduledDate = treatmentData.estimatedVisitDate;
    } else if (treatmentData.scheduled_date) { // If scheduled_date is present but not yyyy-MM-dd, try to parse it
      try {
        finalScheduledDate = format(parseISO(treatmentData.scheduled_date), 'yyyy-MM-dd');
      } catch (e) {
          try {
              const parsed = new Date(treatmentData.scheduled_date);
              if(!isNaN(parsed.getTime())) finalScheduledDate = format(parsed, 'yyyy-MM-dd');
          } catch (e2) { /* ignore if unparseable */ }
      }
    }

    return {
      id: treatmentData.id,
      treatment_plan_id: currentPlanId,
      visit_number: visitNumber || 0,
      procedures: treatmentData.description || treatmentData.procedures || '',
      type: treatmentData.type || treatmentData.title || '',
      estimated_duration: treatmentData.estimated_duration,
      time_gap: treatmentData.time_gap,
      status: treatmentData.status || 'pending',
      scheduled_date: finalScheduledDate, // This should be yyyy-MM-dd or null
      cost: treatmentData.cost,
      priority: treatmentData.priority || 'medium',
    };
  };

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
      for (const [index, sitting] of aiInitialSuggestion.planDetails.appointmentPlan.sittingDetails.entries()) {
        const treatmentDescription = sitting.procedures || 'No procedures detailed.';
        const proceduresSummary = treatmentDescription.substring(0, 50) + (treatmentDescription.length > 50 ? '...' : '');
        const treatmentTitle = `${sitting.visit || `Visit ${index + 1}`} - ${proceduresSummary}`;
        const formattedDuration = parseAndFormatDurationForInterval(sitting.estimatedDuration);
        const treatmentData = {
          type: treatmentTitle,
          description: treatmentDescription,
          status: 'pending' as const,
          priority: 'medium' as const,
          cost: "0",
          estimated_duration: formattedDuration,
          time_gap: sitting.timeGap || null,
          plan_id: plan.id
        };
        await treatmentService.createTreatment(treatmentData);
        treatmentsCreatedCount++;
      }
      toast({
        title: "Success",
        description: `${treatmentsCreatedCount} of ${totalSuggestions} AI suggested treatments created. Waiting for visits to appear...`,
      });
      setAiInitialSuggestion(null);
      await onRefresh(); // Just refresh once after creation
    } catch (error) {
      console.error("Error creating AI suggested treatments:", error);
      toast({
        title: "Creation Failed",
        description: `Failed to create some or all AI suggested treatments. ${treatmentsCreatedCount} created. ${(error as Error).message}`,
        variant: "destructive",
      });
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
    <>
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
                  <h2 className="text-xl font-semibold">{plan.title || 'Plan Title N/A'}</h2>
                  <p className="text-sm text-muted-foreground">{plan.description || 'No description available.'}</p>
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
                      <p>{plan.patientName || 'Patient Name N/A'}</p>
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
                        {plan.start_date ? format(new Date(plan.start_date), 'MMMM d, yyyy') : 'Start Date N/A'}
                        {plan.start_date && plan.end_date && ` to ${format(new Date(plan.end_date), 'MMMM d, yyyy')}`}
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
                  {plan.teeth && plan.teeth.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <Smile className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Affected Teeth</p>
                        <p className="text-sm text-muted-foreground">
                          {plan.teeth.map(t => t.tooth_id).sort((a, b) => a - b).join(', ')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Smile className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Affected Teeth</p>
                        <p className="text-sm text-muted-foreground">N/A</p>
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
                    {/* Moved and Renamed PDF Download Button to Print Plan with direct print */}
                    <Button 
                        onClick={handleDirectPrint} // Changed to direct print handler
                        variant="outline" 
                        size="sm" 
                        disabled={loading} 
                        title="Print this treatment plan"
                    >
                        <Printer className="h-4 w-4 mr-1" /> {/* Changed icon to Printer */}
                        Print Plan
                    </Button>
                  </div>
                </div>
                
                {plan.treatments && plan.treatments.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      {paginatedTreatmentsWithDates.map((treatment: any, index: number) => (
                        <TreatmentItem
                          key={treatment.id}
                          treatment={treatment}
                          onStatusChange={onTreatmentStatusChange} 
                          onDelete={onDeleteTreatment}
                          onEdit={() => {
                            const visitToEdit = prepareVisitForEditing(treatment, plan.id, index);
                            onEditTreatment(visitToEdit);
                          }}
                          loading={loading} 
                        />
                      ))}
                    </div>
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-4 pagination-controls-print-hide">
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
                  // MODIFIED BLOCK: Always show AI suggestion box if available, never show Add First Treatment button
                  (() => {
                    const aiSittings1 = aiInitialSuggestion?.planDetails?.appointmentPlan?.sittingDetails;
                    const aiSittings2 = aiInitialSuggestionProp?.planDetails?.appointmentPlan?.sittingDetails;
                    const aiSittings3 = plan.originalAISuggestion?.planDetails?.appointmentPlan?.sittingDetails;
                    const showAiVisits = (Array.isArray(aiSittings1) && aiSittings1.length > 0)
                      || (Array.isArray(aiSittings2) && aiSittings2.length > 0)
                      || (Array.isArray(aiSittings3) && aiSittings3.length > 0);

                    // --- BEGIN PATIENT SECTION DEBUG LOGS (IIFE) ---
                    if (typeof console !== 'undefined' && console.groupCollapsed && console.log && console.groupEnd) {
                        console.groupCollapsed(`[TreatmentPlanDetails IIFE - Plan ID: ${plan?.id}] AI Logic`);
                        console.log('[TreatmentPlanDetails IIFE] Internal aiInitialSuggestion state:', JSON.parse(JSON.stringify(aiInitialSuggestion || null)));
                        console.log('[TreatmentPlanDetails IIFE] Prop aiInitialSuggestionProp:', JSON.parse(JSON.stringify(aiInitialSuggestionProp || null)));
                        console.log('[TreatmentPlanDetails IIFE] Plan plan.originalAISuggestion:', JSON.parse(JSON.stringify(plan.originalAISuggestion || null)));
                        console.log('[TreatmentPlanDetails IIFE] aiSittings1 (from internal state):', JSON.parse(JSON.stringify(aiSittings1 || null)));
                        console.log('[TreatmentPlanDetails IIFE] aiSittings2 (from prop):', JSON.parse(JSON.stringify(aiSittings2 || null)));
                        console.log('[TreatmentPlanDetails IIFE] aiSittings3 (from plan object):', JSON.parse(JSON.stringify(aiSittings3 || null)));
                        console.log('[TreatmentPlanDetails IIFE] Calculated showAiVisits:', showAiVisits);
                        console.groupEnd();
                    }
                    // --- END PATIENT SECTION DEBUG LOGS (IIFE) ---

                    // console.log('[TreatmentPlanDetails] aiInitialSuggestion:', aiInitialSuggestion);
                    // console.log('[TreatmentPlanDetails] aiInitialSuggestionProp:', aiInitialSuggestionProp);
                    // console.log('[TreatmentPlanDetails] plan.originalAISuggestion:', plan.originalAISuggestion);
                    // console.log('[TreatmentPlanDetails] aiSittings1:', aiSittings1);
                    // console.log('[TreatmentPlanDetails] aiSittings2:', aiSittings2);
                    // console.log('[TreatmentPlanDetails] aiSittings3:', aiSittings3);
                    // console.log('[TreatmentPlanDetails] showAiVisits:', showAiVisits);
                    if (showAiVisits) {
                      return (
                        <div className="text-center py-6 border rounded-lg">
                          <BrainCog className="h-8 w-8 mx-auto text-primary mb-3" /> 
                          <p className="text-muted-foreground mb-4">
                            AI-generated treatment visits are available for this plan.
                          </p>
                          <Button
                            onClick={handleCreateAiSuggestedTreatments}
                            disabled={isCreatingAiTreatments || loading}
                            size="sm"
                          >
                            {isCreatingAiTreatments ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="mr-2 h-4 w-4" />
                            )}
                            Add AI Suggested Visits
                          </Button>
                        </div>
                      );
                    }
                    return null;
                  })()
                )}
              </div>

              {/* Tabs for Additional Information */}
              <Tabs defaultValue="additionalInfo" className="w-full tabs-print-all-content">
                {/* Ultra-modern, glassy TabsList with gradient overlay and perfect vertical centering */}
                <TabsList
                  className="flex items-center min-h-[44px] grid w-full grid-cols-3 print-hide rounded-2xl bg-white/30 bg-gradient-to-br from-white/60 to-[#e3f0ff]/60 backdrop-blur-lg border border-[#d0e6ff] shadow-xl px-2 py-0 relative"
                  style={{ boxShadow: '0 6px 32px 0 #e3f0ff' }}
                >
                  <TabsTrigger
                    value="additionalInfo"
                    className="flex h-full items-center justify-center gap-2 px-5 py-0 text-base font-semibold text-brand-medium rounded-xl focus:outline-none data-[state=active]:bg-white/80 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-blue-200 data-[state=active]:z-10 data-[state=active]:text-brand-primary hover:bg-white/40 transition-all"
                  >
                    <Stethoscope className="w-5 h-5" />
                    Additional Information
                  </TabsTrigger>
                  <TabsTrigger
                    value="visits"
                    className="flex h-full items-center justify-center gap-2 px-5 py-0 text-base font-semibold text-brand-medium rounded-xl focus:outline-none data-[state=active]:bg-white/80 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-blue-200 data-[state=active]:z-10 data-[state=active]:text-brand-primary hover:bg-white/40 transition-all"
                  >
                    <Calendar className="w-5 h-5" />
                    Scheduled Visits
                  </TabsTrigger>
                  <TabsTrigger
                    value="financial"
                    className="flex h-full items-center justify-center gap-2 px-5 py-0 text-base font-semibold text-brand-medium rounded-xl focus:outline-none data-[state=active]:bg-white/80 data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-blue-200 data-[state=active]:z-10 data-[state=active]:text-brand-primary hover:bg-white/40 transition-all"
                  >
                    <CreditCard className="w-5 h-5" />
                    Financial Information
                  </TabsTrigger>
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
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">Scheduled Visits Overview</h4>
                    </div>
                    
                    {treatmentsWithEstimatedDates && treatmentsWithEstimatedDates.length > 0 ? (
                      <div className="space-y-3">
                        {treatmentsWithEstimatedDates.map((treatment: any, index: number) => {
                          // Ensure bookedAppointments is an array before calling .find()
                          const currentBookedAppointments = bookedAppointments || [];
                          const bookedAppointment = currentBookedAppointments.find(appt => appt.treatment_id === treatment.id && appt.status !== 'cancelled');
                          const isBooked = !!bookedAppointment;
                          
                          let bookedInfo = null;
                          if (isBooked && bookedAppointment) {
                            let displayDate = 'N/A';
                            let displayTime = 'N/A';
                            
                            // Ensure staff object and its properties exist before accessing
                            const doctorName = (bookedAppointment.staff && bookedAppointment.staff.first_name && bookedAppointment.staff.last_name)
                              ? `${bookedAppointment.staff.first_name} ${bookedAppointment.staff.last_name}`
                              : 'N/A';

                            if (bookedAppointment.start_time && typeof bookedAppointment.start_time === 'string') {
                              try {
                                const parsedStartTime = parseISO(bookedAppointment.start_time);
                                displayDate = format(parsedStartTime, 'MMM dd, yyyy');
                                displayTime = format(parsedStartTime, 'p');
                              } catch (e) {
                                console.error(`[TreatmentPlanDetails] Error parsing start_time for booked appointment: ${bookedAppointment.start_time}`, e);
                                // displayDate and displayTime remain 'N/A'
                              }
                            } else {
                              console.warn('[TreatmentPlanDetails] Booked appointment start_time is missing or not a string.');
                            }

                            bookedInfo = {
                              bookedDate: displayDate,
                              bookedTime: displayTime,
                              doctorName: doctorName,
                            };
                          }

                          return (
                            <div key={treatment.id || index} className="border rounded-md p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="font-medium text-gray-800">{treatment.type || treatment.title || `Visit ${index + 1}`}</h5>
                                  <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{treatment.description || treatment.procedures || 'No description'}</p>
                                </div>
                                {treatment.status && (
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                        treatment.status === 'completed' ? 'bg-green-100 text-green-700' :
                                        treatment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                        'bg-blue-100 text-blue-700'
                                    }`}>
                                      {treatment.status.charAt(0).toUpperCase() + treatment.status.slice(1)}
                                    </span>
                                )}
                              </div>
                              
                              <div className="mt-3 space-y-2 text-xs text-gray-600">
                                <div className="flex items-center">
                                  <CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                  <strong>Est. Visit:</strong>&nbsp;{treatment.scheduled_date || treatment.estimatedVisitDate || 'Not set'}
                                </div>
                                {treatment.estimated_duration && (
                                  <div className="flex items-center">
                                    <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                    <strong>Duration:</strong>&nbsp;{treatment.estimated_duration}
                                  </div>
                                )}
                                {treatment.time_gap && (
                                  <div className="flex items-center">
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                    <strong>Next visit in:</strong>&nbsp;{treatment.time_gap}
                                  </div>
                                )}
                                {(treatment.cost !== undefined && treatment.cost !== null && parseFloat(String(treatment.cost)) > 0) && (
                                  <div className="flex items-center">
                                    <CreditCard className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                                    <strong>Cost:</strong>&nbsp;{formatCurrency(parseFloat(String(treatment.cost)))}
                                  </div>
                                )}
                              </div>

                              <div className="mt-4 flex justify-end items-center">
                                {isBooked ? (
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center justify-center h-9 px-3 text-sm font-medium text-white bg-green-500 rounded-md">
                                      <Check className="w-3.5 h-3.5 mr-1.5" />
                                      Booked
                                    </div>
                                    {bookedInfo && (
                                    <div className="ml-4 p-3 bg-gray-50 rounded-md border border-blue-600 space-y-2 shadow-sm">
                                      <div className="flex items-center space-x-2">
                                        <CalendarDays className="h-4 w-4 text-gray-500" />
                                        <span className="text-xs text-gray-600 font-medium">Date:</span>
                                        <span className="text-xs text-green-600 font-semibold">{bookedInfo.bookedDate}</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Clock className="h-4 w-4 text-gray-500" />
                                        <span className="text-xs text-gray-600 font-medium">Time:</span>
                                        <span className="text-xs text-gray-800">{bookedInfo.bookedTime}</span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <UserCircle className="h-4 w-4 text-gray-500" />
                                        <span className="text-xs text-gray-600 font-medium">Doctor:</span>
                                        <span className="text-xs text-gray-800">{bookedInfo.doctorName}</span>
                                      </div>
                                    </div>
                                    )}
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const visitDate = treatment.scheduled_date || treatment.estimatedVisitDate;
                                      const patientId = plan.patient_id;
                                      const treatmentContextId = treatment.id; // ID of the specific treatment/visit item
                                      const visitTitle = treatment.type || treatment.title || 'New Appointment';

                                      if (!visitDate) {
                                        toast({
                                          title: "Cannot Book Appointment",
                                          description: "This visit does not have a scheduled or estimated date yet.",
                                          variant: "destructive"
                                        });
                                        return;
                                      }
                                      
                                      const queryParams = new URLSearchParams({
                                        date: visitDate, // Assumes YYYY-MM-DD format
                                        patientId: patientId,
                                      });
                                      if (treatmentContextId) {
                                        queryParams.append('treatmentId', treatmentContextId);
                                      }
                                      if (visitTitle) {
                                        queryParams.append('description', visitTitle);
                                      }
                                      
                                      navigate(`/appointments?${queryParams.toString()}`);
                                    }}
                                    disabled={loading || isCreatingAiTreatments}
                                  >
                                    <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                                    Book Appointment
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 border rounded-lg">
                        <CalendarIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No scheduled visits for this plan yet.</p>
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
              <DialogFooter className="pt-4 mt-auto dialog-footer-print-hide"> {/* Added dialog-footer-print-hide */}
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

                  {/* Conditionally render Reopen Plan button */}
                  {plan.status === 'completed' && (
                      <Button 
                          variant="outline" 
                          onClick={() => onStatusChange(plan.id, 'in_progress' as TreatmentStatus)} // Assuming 'in_progress' is the status to reopen to
                          disabled={loading}
                          className="mr-auto" // Pushes this button to the far left
                      >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reopen Plan
                      </Button>
                  )}

                  <Button 
                      variant="outline" 
                      onClick={() => onOpenChange(false)}
                      disabled={loading}
                  >
                      Close
                  </Button>

                  {plan.status !== 'completed' && plan.status !== 'cancelled' && (
                      <Button
                        onClick={() => {
                          // Check if all treatments are completed
                          if (!plan.treatments || plan.treatments.length === 0) {
                            toast({
                              title: "No Treatments",
                              description: "Please add at least one treatment before completing the plan.",
                              variant: "destructive",
                            });
                            return;
                          }
                          const incomplete = plan.treatments.find(
                            (t: any) => t.status !== 'completed'
                          );
                          if (incomplete) {
                            // Find the first incomplete visit number or title
                            const visitLabel =
                              incomplete.visit_number
                                ? `Visit ${incomplete.visit_number}`
                                : incomplete.type || incomplete.title || "a treatment";
                            toast({
                              title: "Cannot Complete Plan",
                              description: `Please complete ${visitLabel} before marking the entire plan as completed.`,
                              variant: "destructive",
                            });
                            return;
                          }
                          onStatusChange(plan.id, 'completed' as TreatmentStatus);
                        }}
                        disabled={loading || !plan.treatments || plan.treatments.length === 0}
                        variant="default"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark as Completed
                      </Button>
                  )}
                </div>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <PrintableContent 
        plan={{
          ...plan,
          patient: {
            full_name: plan.patientName,
            age: plan.patient?.age || 0,
            gender: plan.patient?.gender || '',
            registration_number: plan.patient?.registration_number || '',
            ...plan.patient
          }
        }} 
        treatmentsWithEstimatedDates={treatmentsWithEstimatedDates} 
      />
    </>
  );
}

// Exported PDF Download Handler for use in other files
export async function handleDownloadPdf(plan: PrintableContentProps['plan'], treatmentsWithEstimatedDates: PrintableContentProps['treatmentsWithEstimatedDates']) {
  if (!plan) return;

  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const pdfMargin = 14; // Standard margin for PDF content
  let currentY = 20; // Initial Y position

  doc.setFont('helvetica', 'normal');
  const addSectionLine = (y: number) => {
    doc.setDrawColor(200, 200, 200);
    doc.line(pdfMargin, y, pageWidth - pdfMargin, y);
  };

  // --- Document Header with Logo ---
  try {
    const logoResponse = await fetch('https://i.postimg.cc/j2qGSXwJ/facetslogo.png');
    if (!logoResponse.ok) throw new Error(`Failed to fetch logo: ${logoResponse.status} ${logoResponse.statusText}`);
    const blob = await logoResponse.blob();
    if (blob.size === 0) throw new Error('Fetched logo blob is empty.');
    const reader = new FileReader();
    const dataUrl = await new Promise((resolve, reject) => {
      reader.onloadend = () => reader.result ? resolve(reader.result) : reject(new Error('FileReader failed to read blob.'));
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(blob);
    });
    const dataUrlStr: string = dataUrl as string; // Explicitly type as string
    if (!dataUrlStr.startsWith('data:image')) throw new Error('Generated Data URL is not an image.');
    const imgProps = doc.getImageProperties(dataUrlStr);
    const logoHeight = 12;
    const logoWidth = (imgProps.width * logoHeight) / imgProps.height;
    const logoX = pdfMargin;
    const logoY = currentY - 7;
    doc.addImage(dataUrlStr, imgProps.fileType.toUpperCase(), logoX, logoY, logoWidth, logoHeight);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    const titleX = logoX + logoWidth + 10;
    const titleY = logoY + logoHeight / 2;
    doc.text('Treatment Plan Report', titleX, titleY, { baseline: 'middle' });
    doc.setFont('helvetica', 'normal');
    currentY += Math.max(logoHeight, 10) + 10;
  } catch (error) {
    console.error('Error loading logo:', error);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Treatment Plan Report', pageWidth / 2, currentY, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    currentY += 18;
  }
  addSectionLine(currentY);
  currentY += 12;

  // --- Patient and Plan Information ---
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient & Plan Details', pdfMargin, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 10;

  const patientPlanDetailsRows = [
    ['Patient Name:', plan.patientName],
    ['Plan Title:', plan.title],
    ['Plan Description:', plan.description || 'N/A'],
    ['Plan Dates:', `${format(new Date(plan.start_date), 'MMM d, yyyy')}${plan.end_date ? ` to ${format(new Date(plan.end_date), 'MMM d, yyyy')}` : ''}`],
    ['Priority:', plan.priority ? plan.priority.charAt(0).toUpperCase() + plan.priority.slice(1) : 'N/A'],
    ['Status:', plan.status ? plan.status.replace('_', ' ').charAt(0).toUpperCase() + plan.status.replace('_', ' ').slice(1) : 'N/A'],
  ];

  autoTable(doc, {
    body: patientPlanDetailsRows,
    startY: currentY,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.5, font: 'helvetica', valign: 'middle' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 }, 1: { cellWidth: 'auto' } },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, pageHeight - 10);
    }
  });
  currentY = (doc as any).lastAutoTable.finalY + 10;
  addSectionLine(currentY);
  currentY += 12;

  // --- Treatments/Visits Table ---
  if (currentY > pageHeight - 60) { doc.addPage(); currentY = 20; }
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Treatments / Visits', pdfMargin, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 10;

  const tableColumn = ['#', 'Treatment / Visit', 'Procedures', 'Status', 'Date', 'Cost'];
  const tableRows: any[] = [];
  const treatmentVisitColWidth = 70;
  const proceduresColWidth = 43;
  const cellPaddingVal = 1.5;
  const cellHorizontalPadding = cellPaddingVal * 2;
  const maxTreatmentVisitTextWidth = treatmentVisitColWidth - cellHorizontalPadding;
  const maxProcedureTextWidth = proceduresColWidth - cellHorizontalPadding;

  (treatmentsWithEstimatedDates || []).forEach((treatmentWithDate, index) => {
    const visitDate = treatmentWithDate.scheduled_date
      ? format(new Date(treatmentWithDate.scheduled_date), 'MMM d, yyyy')
      : (treatmentWithDate.completed_date
        ? format(new Date(treatmentWithDate.completed_date), 'MMM d, yyyy')
        : (treatmentWithDate.estimatedVisitDate
          ? format(new Date(treatmentWithDate.estimatedVisitDate), 'MMM d, yyyy')
          : 'N/A'));
    const cost = treatmentWithDate.cost ? formatCurrency(parseFloat(String(treatmentWithDate.cost))) : 'N/A';
    const rawTreatmentVisitText = treatmentWithDate.type || treatmentWithDate.title || 'N/A';
    const treatmentVisitTextLines = doc.splitTextToSize(rawTreatmentVisitText, maxTreatmentVisitTextWidth);
    const formattedTreatmentVisitText = treatmentVisitTextLines.join('\n');
    const rawProcedureText = treatmentWithDate.description || treatmentWithDate.procedures || 'N/A';
    const procedureTextLines = doc.splitTextToSize(rawProcedureText, maxProcedureTextWidth);
    const formattedProcedureText = procedureTextLines.join('\n');
    const treatmentData = [
      treatmentWithDate.visit_number || (index + 1),
      formattedTreatmentVisitText,
      formattedProcedureText,
      treatmentWithDate.status ? treatmentWithDate.status.charAt(0).toUpperCase() + treatmentWithDate.status.slice(1) : 'N/A',
      visitDate,
      cost,
    ];
    tableRows.push(treatmentData);
  });
  if (tableRows.length === 0) {
    doc.setFontSize(9);
    doc.text('No treatments or visits recorded for this plan.', pdfMargin, currentY);
    currentY += 10;
  } else {
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: currentY,
      theme: 'grid',
      headStyles: { fillColor: [0, 96, 223], textColor: 255, fontStyle: 'bold', font: 'helvetica', fontSize: 9, valign: 'middle' },
      styles: { fontSize: 7, cellPadding: cellPaddingVal, font: 'helvetica', valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 6, halign: 'center' },
        1: { cellWidth: treatmentVisitColWidth },
        2: { cellWidth: proceduresColWidth },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 25, halign: 'right', cellPadding: { top: cellPaddingVal, bottom: cellPaddingVal, left: cellPaddingVal, right: 2 } },
      },
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, pageHeight - 10);
      }
    });
    currentY = (doc as any).lastAutoTable.finalY + 15;
  }
  addSectionLine(currentY);
  currentY += 12;

  // --- Financial Summary ---
  if (currentY > pageHeight - 75) { doc.addPage(); currentY = 20; }
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Summary', pdfMargin, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 10;
  const financialTableColumn = ['Item', 'Amount'];
  const financialTableRows = [
    ['Total Treatment Cost:', formatCurrency(plan.totalCost || 0)],
    ['Insurance Coverage (Est.):', formatCurrency(plan.insurance_coverage || 0)],
    ['Patient Responsibility:', formatCurrency((plan.totalCost || 0) - (plan.insurance_coverage || 0))],
  ];
  const financialItemColWidth = pageWidth - (pdfMargin * 2) - 50;
  autoTable(doc, {
    head: [financialTableColumn],
    body: financialTableRows,
    startY: currentY,
    theme: 'grid',
    headStyles: { fillColor: [0, 96, 223], textColor: 255, fontStyle: 'bold', halign: 'center', font: 'helvetica', fontSize: 9, valign: 'middle' },
    styles: { fontSize: 8, cellPadding: 2, font: 'helvetica', valign: 'middle' },
    columnStyles: { 0: { cellWidth: financialItemColWidth, fontStyle: 'bold' }, 1: { cellWidth: 50, halign: 'right', cellPadding: { top: 2, bottom: 2, left: 2, right: 3 } } },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, pageHeight - 10);
    }
  });
  currentY = (doc as any).lastAutoTable.finalY + 15;
  addSectionLine(currentY);
  currentY += 12;

  // --- Clinical Information ---
  if (currentY > pageHeight - 60) { doc.addPage(); currentY = 20; }
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Clinical Information', pdfMargin, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 10;
  doc.setFontSize(9);
  if (plan.metadata && plan.metadata.length > 0) {
    const meta = plan.metadata[0];
    const clinicalFields = [
      { label: 'Clinical Considerations:', value: meta.clinical_considerations },
      { label: 'Key Materials:', value: meta.key_materials },
      { label: 'Post-Treatment Care:', value: meta.post_treatment_care },
    ];
    clinicalFields.forEach(field => {
      if (currentY > pageHeight - 25) { doc.addPage(); currentY = 20; }
      doc.setFont('helvetica', 'bold');
      doc.text(field.label, pdfMargin, currentY);
      currentY += 6;
      doc.setFont('helvetica', 'normal');
      const textContent = field.value || 'Not Specified';
      const lines = doc.splitTextToSize(textContent, pageWidth - (pdfMargin * 2));
      doc.text(lines, pdfMargin, currentY);
      currentY += (lines.length * 4.5) + 5;
    });
  } else {
    doc.text('No additional clinical information available.', pdfMargin, currentY);
    currentY += 7;
  }
  currentY += 8;
  addSectionLine(currentY);
  currentY += 12;

  // --- Signatures ---
  const signatureSectionHeight = 50;
  if (pageHeight - currentY < signatureSectionHeight) {
    doc.addPage();
    currentY = pdfMargin;
  }
  const signatureLineLength = (pageWidth / 2) - pdfMargin - 35;
  const signatureYPos = pageHeight - 35;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Doctor Signature:', pdfMargin, signatureYPos);
  doc.line(pdfMargin + doc.getTextWidth('Doctor Signature:') + 5, signatureYPos + 1, pdfMargin + doc.getTextWidth('Doctor Signature:') + 5 + signatureLineLength, signatureYPos + 1);
  const patientSigX = pageWidth / 2 + 15;
  doc.text('Patient Signature:', patientSigX, signatureYPos);
  doc.line(patientSigX + doc.getTextWidth('Patient Signature:') + 5, signatureYPos + 1, patientSigX + doc.getTextWidth('Patient Signature:') + 5 + signatureLineLength, signatureYPos + 1);
  const totalPdfPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPdfPages; i++) {
    doc.setPage(i);
    if ((doc as any).lastAutoTable && i <= (doc as any).lastAutoTable.pageCount) {
      // Already drawn
    } else {
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${totalPdfPages}`, pdfMargin, pageHeight - 10);
    }
  }
  doc.save(`Treatment_Plan_${plan.patientName.replace(/[^a-zA-Z0-9]/g, '_')}_${plan.id.substring(0,8)}.pdf`);
}
