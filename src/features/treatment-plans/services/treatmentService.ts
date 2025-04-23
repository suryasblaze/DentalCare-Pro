import { api } from '@/lib/api';
import { z } from 'zod';
import { treatmentPlanSchema } from '../components/TreatmentPlanForm';
import { treatmentSchema } from '../components/TreatmentForm';
import type { Database } from 'supabase_types'; // Try importing directly

// Define TreatmentRow based on Database types
type TreatmentRow = Database['public']['Tables']['treatments']['Row'];

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
  // Add toothIds argument
  async createTreatmentPlan(planData: z.infer<typeof treatmentPlanSchema>, toothIds: number[]) { 
    // Pass toothIds to the API layer
    return api.patients.createTreatmentPlan(planData, toothIds); 
  },
  
  /**
   * Create a treatment plan with its treatments in a single transaction
   */
  async createTreatmentPlanWithTreatments(
    planData: z.infer<typeof treatmentPlanSchema>,
    treatments: z.infer<typeof treatmentSchema>[]
  ) {
    // Convert cost to number before sending to API
    const treatmentsWithNumericCost = treatments.map(t => {
      const costAsNumber = parseFloat(t.cost);
      return {
        ...t,
        cost: isNaN(costAsNumber) ? 0 : costAsNumber, // Ensure it's a valid number, default to 0
      };
    });
    // Ensure the mapped type matches the expected TreatmentInsert type from api.ts
    // Cast to 'any' as a temporary workaround if complex type mismatches occur, 
    // ideally, ensure treatmentSchema aligns with TreatmentInsert type
    return api.patients.createTreatmentPlanWithTreatments(planData, treatmentsWithNumericCost as any); 
  },

  /**
   * Update a treatment plan
   */
  async updateTreatmentPlan(id: string, planData: Partial<z.infer<typeof treatmentPlanSchema>>) {
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
    const updatePayload: Partial<TreatmentRow> = { ...treatmentData }; // Use TreatmentRow type if available, else Partial<any>

    // Convert cost if present
    if (updatePayload.cost !== undefined && updatePayload.cost !== null) {
      const costAsNumber = parseFloat(String(updatePayload.cost)); // Ensure it's string before parsing
      // Update payload with numeric cost if valid, otherwise remove/handle error
      if (!isNaN(costAsNumber)) {
        updatePayload.cost = costAsNumber; 
      } else {
        // Decide how to handle invalid cost during update: remove or keep original? Removing for now.
        delete updatePayload.cost; 
        console.warn(`Invalid cost format during update for treatment ${id}: ${updatePayload.cost}`);
      }
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

      return {
        ...planWithoutJunction, // Use the plan without the junction table data
        patientName: patientInfo ? `${patientInfo.first_name} ${patientInfo.last_name}` : 'Unknown Patient',
        totalCost,
        progress,
        completedTreatments,
        totalTreatments,
        teeth // Add the processed teeth array
      };
    });
  }
};
