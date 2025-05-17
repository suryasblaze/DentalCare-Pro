import { api } from '@/lib/api';
import { z } from 'zod';
import { treatmentPlanSchema } from '../components/TreatmentPlanForm';
import { treatmentSchema } from '../components/TreatmentForm';
import type { Database } from 'supabase_types'; // Try importing directly
import { format, addDays, addWeeks, addMonths, parseISO } from 'date-fns'; // Add date-fns import

// Define specific types based on generated types from database.types.ts
type TreatmentPlanRow = Database['public']['Tables']['treatment_plans']['Row'];
type TreatmentPlanInsert = Database['public']['Tables']['treatment_plans']['Insert'];
// Explicitly define TreatmentPlanUpdate based on Supabase generated types
type TreatmentPlanUpdate = Database['public']['Tables']['treatment_plans']['Update'];
type TreatmentRow = Database['public']['Tables']['treatments']['Row'];
// Add TreatmentVisitInsert type
type TreatmentVisitInsert = Database['public']['Tables']['treatment_visits']['Insert'];
// Assuming AISuggestion type is available or defined elsewhere, 
// for now, we'll use a placeholder for the structure of AI Sittings if not directly importable.
interface AISittingDetail {
  visit?: string;
  procedures?: string;
  estimatedDuration?: string;
  timeGap?: string; // e.g., "2 weeks", "1 month", "3-5 days"
}

// Helper function to parse timeGap string and add to date
const parseTimeGapAndAddDate = (currentScheduledDate: Date, timeGap: string): Date => {
  if (!timeGap) return currentScheduledDate; // Should not happen if AI provides it

  const gap = timeGap.toLowerCase();
  const parts = gap.match(/^(\d+)(-(\d+))?\s*(day|week|month)s?$/);

  if (!parts) {
    console.warn(`Invalid timeGap format: ${timeGap}. Defaulting to 1 day.`);
    return addDays(currentScheduledDate, 1); // Default to 1 day if format is unexpected
  }

  const value = parseInt(parts[1], 10); // Use the lower bound if it's a range like "3-5 days"
  const unit = parts[4];

  switch (unit) {
    case 'day':
      return addDays(currentScheduledDate, value);
    case 'week':
      return addWeeks(currentScheduledDate, value);
    case 'month':
      return addMonths(currentScheduledDate, value);
    default:
      console.warn(`Unknown timeGap unit: ${unit}. Defaulting to 1 day.`);
      return addDays(currentScheduledDate, 1);
  }
};

/**
 * Service for treatment plan related operations
 */
export const treatmentService = {
  /**
   * Get all treatment plans
   */
  async getAllTreatmentPlans() {
    return api.patients.getTreatmentPlans(null);
  },
  
  /**
   * Get treatment plans for a specific patient
   */
  async getPatientTreatmentPlans(patientId: string) {
    return api.patients.getTreatmentPlans(patientId);
  },
  
  /**
   * Create a new treatment plan
   */
  async createTreatmentPlan(planData: Partial<z.infer<typeof treatmentPlanSchema>>, toothIds: number[]) { 
    // Construct the full object required by the API, ensuring all non-nullable fields are present
    const fullPlanData = {
      ...planData, // Spread the data from the form
      title: planData.title || 'Untitled Plan', // Ensure title is present
      description: planData.description || 'No description', // Ensure description is present
      patient_id: planData.patient_id || '', // Ensure patient_id is present (form validation should catch this earlier)
      status: planData.status || 'planned', // Default status if not provided
      start_date: planData.start_date || format(new Date(), 'yyyy-MM-dd'), // Default start_date if not provided
      priority: planData.priority || 'medium', // Default priority
      ai_generated: planData.ai_generated !== undefined ? planData.ai_generated : false, // Default ai_generated
      // Add other potentially required fields with defaults if necessary,
      // matching what api.patients.createTreatmentPlan expects
    };
    // Ensure all required fields by your DB schema for treatment_plans are here.
    // The linter error was because planData (from treatmentPlanSchema) was missing status and start_date.
    // Now, fullPlanData should satisfy the type expected by api.patients.createTreatmentPlan.
    return api.patients.createTreatmentPlan(fullPlanData as any, toothIds); // Using 'as any' temporarily if precise typing is complex. Ideally, fullPlanData matches the API's expected type.
  },
  
  /**
   * Create a treatment plan with its treatments in a single transaction
   */
  async createTreatmentPlanWithTreatments(
    planData: Partial<z.infer<typeof treatmentPlanSchema>>,
    treatments: z.infer<typeof treatmentSchema>[]
  ) {
    const fullPlanData = {
      ...planData,
      title: planData.title || 'Untitled Plan',
      description: planData.description || 'No description',
      patient_id: planData.patient_id || '',
      status: planData.status || 'planned',
      start_date: planData.start_date || format(new Date(), 'yyyy-MM-dd'),
      priority: planData.priority || 'medium',
      ai_generated: planData.ai_generated !== undefined ? planData.ai_generated : false,
    };

    const treatmentsWithNumericCost = treatments.map(t => {
      const costAsNumber = parseFloat(t.cost);
      return {
        ...t,
        cost: isNaN(costAsNumber) ? 0 : costAsNumber, // Ensure it's a valid number, default to 0
      };
    });
    // Cast to 'any' as a temporary workaround if complex type mismatches occur, 
    // ideally, ensure treatmentSchema aligns with TreatmentInsert type
    return api.patients.createTreatmentPlanWithTreatments(fullPlanData as any, treatmentsWithNumericCost as any); 
  },

  /**
   * Update a treatment plan
   */
  async updateTreatmentPlan(id: string, planData: TreatmentPlanUpdate) {
    return api.patients.updateTreatmentPlan(id, planData);
  },
  
  /**
   * Delete a treatment plan
   */
  async deleteTreatmentPlan(id: string) {
    return api.patients.deleteTreatmentPlan(id);
  },
  
  /**
   * Create a new treatment
   */
  async createTreatment(treatmentData: z.infer<typeof treatmentSchema>) {
    // Convert cost to number before sending to API
    const costAsNumber = parseFloat(treatmentData.cost);
    const treatmentWithNumericCost = {
      ...treatmentData,
      cost: isNaN(costAsNumber) ? 0 : costAsNumber, // Ensure valid number
    };
    // Cast to 'any' as a temporary workaround if complex type mismatches occur
    return api.patients.createTreatment(treatmentWithNumericCost as any); 
  },

  /**
   * Update a treatment, including setting actual start/end times based on status change.
   */
  async updateTreatment(id: string, treatmentData: Partial<z.infer<typeof treatmentSchema>>) {
    // Prepare the update object
    const updatePayload: Partial<TreatmentRow> = {};

    // Explicitly map fields from treatmentData (string-based schema) to updatePayload (number-based for cost)
    for (const key in treatmentData) {
      if (key === 'cost' && treatmentData.cost !== undefined) {
        const costAsNumber = parseFloat(treatmentData.cost);
        updatePayload.cost = isNaN(costAsNumber) ? undefined : costAsNumber; // Assign number or undefined
      } else if (key === 'status' && treatmentData.status !== undefined) { 
        updatePayload.status = treatmentData.status;
      } else if (key === 'description' && treatmentData.description !== undefined) {
        updatePayload.description = treatmentData.description;
      } else if (key === 'type' && treatmentData.type !== undefined) {
        updatePayload.type = treatmentData.type;
      } else if (key === 'priority' && treatmentData.priority !== undefined) {
        updatePayload.priority = treatmentData.priority;
      } else if (key === 'plan_id' && treatmentData.plan_id !== undefined) {
        updatePayload.plan_id = treatmentData.plan_id;
      } else if (key === 'scheduled_date' && treatmentData.scheduled_date !== undefined) {
        // Ensure scheduled_date is either a valid date string or null
        updatePayload.scheduled_date = treatmentData.scheduled_date ? treatmentData.scheduled_date : null;
      } else if (key === 'time_gap' && treatmentData.time_gap !== undefined) {
        // Include time_gap in the payload. Ensure it can be null.
        updatePayload.time_gap = treatmentData.time_gap || null;
      }
      // Add other fields from treatmentSchema as needed
    }

    // --- Add logic for actual start/end times ---
    const newStatus = treatmentData.status;
    const now = new Date().toISOString(); // Get current time in ISO format

    if (newStatus === 'completed' || newStatus === 'cancelled') {
      // If marking as completed or cancelled, set the end time
      updatePayload.actual_end_time = now;
      // Optionally clear start time if reopening? Depends on desired logic.
      // If status changes FROM in_progress TO completed/cancelled, set end time.
      // We might need the *previous* status to be more precise, but this covers the main cases.
    } else if (newStatus === 'pending') {
       // If reopening (setting back to pending), clear both start and end times
       updatePayload.actual_start_time = null;
       updatePayload.actual_end_time = null;
    } else if (newStatus === 'in_progress') {
       // If starting the treatment, set start time and ensure end time is null
       updatePayload.actual_start_time = now;
       updatePayload.actual_end_time = null; 
    }
    // Note: If status is unchanged or changes between other states, times are not modified here.
    // For now, we assume start time is tied to the plan's start or managed elsewhere.
    // Let's add a placeholder: if status becomes 'in_progress' (if that's a valid status for individual items), set start time.
    // Assuming 'pending' is the initial state and 'completed'/'cancelled' are end states.
    // Let's refine: If the status is being set *to* 'completed' or 'cancelled', set end time.
    // If status is set *to* 'pending' (reopened), clear times.

    console.log(`Updating treatment ${id} with payload:`, updatePayload); // Log payload

    // Pass the potentially modified payload (with timestamps and numeric cost) to the API layer
    // Cast needed if updatePayload doesn't perfectly match the expected API type
    return api.patients.updateTreatment(id, updatePayload as any); 
  },

  /**
   * Delete a treatment
   */
  async deleteTreatment(id: string) {
    return api.patients.deleteTreatment(id);
  },
  
  /**
   * Process treatment data for display
   */
  processTreatmentPlanData(plans: any[], patients: any[]) {
    return plans.map((plan) => {
      const patientInfo = patients.find((p) => p.id === plan.patient_id);
      const totalCost = plan.treatments?.reduce((sum: number, t: any) => sum + parseFloat(t.cost || 0), 0) || 0;
      const completedTreatments = plan.treatments?.filter((t: any) => t.status === 'completed').length || 0;
      const totalTreatments = plan.treatments?.length || 0;
      const progress = totalTreatments ? Math.round((completedTreatments / totalTreatments) * 100) : 0;

      // Extract teeth data
      const teeth = Array.isArray(plan.treatment_plan_teeth)
        ? plan.treatment_plan_teeth
            .map((tpt: any) => tpt.teeth) // Extract the teeth object
            .filter((tooth: any) => tooth !== null) // Filter out nulls
        : [];
      
      // Remove the junction table data from the plan object before returning
      const planWithoutJunction = { ...plan };
      delete planWithoutJunction.treatment_plan_teeth;

      // Keep the patient details from the API response if available, otherwise use the patientInfo
      const patient = plan.patient || (patientInfo ? {
        full_name: `${patientInfo.first_name} ${patientInfo.last_name}`,
        age: patientInfo.age,
        gender: patientInfo.gender,
        registration_number: patientInfo.registration_number
      } : undefined);

      return {
        ...planWithoutJunction, // Use the plan without the junction table data
        patientName: patient?.full_name || 'Unknown Patient',
        totalCost,
        progress,
        completedTreatments,
        totalTreatments,
        teeth, // Add the processed teeth array
        patient // Add the patient details
      };
    });
  },

  /**
   * Get all visits for a specific treatment plan.
   */
  async getVisitsByPlanId(planId: string): Promise<{ id: string }[]> { 
    if (!planId) {
      console.warn('[treatmentService.getVisitsByPlanId] planId is required, exiting.');
      return [];
    }
    console.log(`[treatmentService.getVisitsByPlanId] Attempting for planId: ${planId}`);
    try {
      console.log(`[treatmentService.getVisitsByPlanId] PRE-AWAIT for api.patients.getVisitsByPlanId with planId: ${planId}`);
      const visitsData = await api.patients.getVisitsByPlanId(planId);
      console.log(`[treatmentService.getVisitsByPlanId] POST-AWAIT for api.patients.getVisitsByPlanId. Result for planId ${planId}:`, visitsData);

      if (!visitsData) {
        console.warn(`[treatmentService.getVisitsByPlanId] visitsData is null/undefined for planId ${planId}.`);
        return []; // Return empty array if visitsData is null or undefined
      }
      if (!Array.isArray(visitsData)) {
        console.error(`[treatmentService.getVisitsByPlanId] visitsData is not an array for planId ${planId}. Received:`, visitsData);
        return []; // Return empty array if not an array
      }
      if (visitsData.length === 0) {
        console.log(`[treatmentService.getVisitsByPlanId] visitsData is an empty array for planId ${planId}.`);
        // return []; // No need to return, map of empty will be empty
      }
      
      const mappedVisits = visitsData.map((v: any, index: number) => {
        if (typeof v !== 'object' || v === null || typeof v.id === 'undefined') {
          console.warn(`[treatmentService.getVisitsByPlanId] Invalid visit object at index ${index} for planId ${planId}:`, v);
          return { id: 'INVALID_VISIT_DATA' }; // Or filter out, or throw
        }
        return { id: v.id };
      });
      console.log(`[treatmentService.getVisitsByPlanId] Mapped visits for planId ${planId}:`, mappedVisits);
      return mappedVisits;
    } catch (error) {
      console.error(`[treatmentService.getVisitsByPlanId] CRITICAL ERROR fetching visits for plan ${planId}:`, error);
      throw error; 
    }
  },

  // New function to create multiple visits for a plan based on AI suggestions
  async createMultipleVisits(planId: string, aiSittings: AISittingDetail[], planStartDateString: string) {
    if (!aiSittings || aiSittings.length === 0) {
      return { data: [], error: null }; // No sittings to create
    }

    let currentScheduledDate = parseISO(planStartDateString); // Start with the plan's start date
    const visitsToCreate: TreatmentVisitInsert[] = [];

    for (let i = 0; i < aiSittings.length; i++) {
      const sitting = aiSittings[i];
      
      if (i > 0 && aiSittings[i-1].timeGap) {
        // For subsequent visits, calculate based on the PREVIOUS visit's timeGap
        currentScheduledDate = parseTimeGapAndAddDate(currentScheduledDate, aiSittings[i-1].timeGap!);
      }
      // For the first visit (i=0), currentScheduledDate remains planStartDateString as parsed initially

      const visitData: TreatmentVisitInsert = {
        treatment_plan_id: planId,
        visit_number: i + 1,
        procedures: sitting.procedures || 'N/A',
        estimated_duration: sitting.estimatedDuration,
        time_gap: sitting.timeGap, // Store the original timeGap from AI for this visit
        status: 'pending', // Default status
        scheduled_date: format(currentScheduledDate, 'yyyy-MM-dd'), // Format to string for DB
      };
      visitsToCreate.push(visitData);
    }

    return api.patients.createTreatmentVisitsBatch(visitsToCreate);
  },
};
