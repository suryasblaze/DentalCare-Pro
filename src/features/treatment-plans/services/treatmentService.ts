import { api } from '@/lib/api';
import { z } from 'zod';
import { treatmentPlanSchema } from '../components/TreatmentPlanForm';
import { treatmentSchema } from '../components/TreatmentForm';

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
   * Update a treatment
   */
  async updateTreatment(id: string, treatmentData: Partial<z.infer<typeof treatmentSchema>>) {
    // Convert cost to number if it exists in the partial update
    const treatmentUpdateWithNumericCost = { ...treatmentData };
    if (treatmentUpdateWithNumericCost.cost !== undefined && treatmentUpdateWithNumericCost.cost !== null) {
       const costAsNumber = parseFloat(treatmentUpdateWithNumericCost.cost);
       // Assign the string representation of the number or keep undefined if conversion fails/original was nullish
       treatmentUpdateWithNumericCost.cost = isNaN(costAsNumber) ? undefined : costAsNumber.toString();
    } else {
       // If cost is not present or null/undefined in the update, remove it
       delete treatmentUpdateWithNumericCost.cost;
    }
    // Cast to 'any' as a temporary workaround if complex type mismatches occur
    return api.patients.updateTreatment(id, treatmentUpdateWithNumericCost as any); 
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
