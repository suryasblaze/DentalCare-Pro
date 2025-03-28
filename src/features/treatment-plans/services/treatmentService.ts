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
  async createTreatmentPlan(planData: z.infer<typeof treatmentPlanSchema>) {
    return api.patients.createTreatmentPlan(planData);
  },
  
  /**
   * Create a treatment plan with its treatments in a single transaction
   */
  async createTreatmentPlanWithTreatments(
    planData: z.infer<typeof treatmentPlanSchema>,
    treatments: z.infer<typeof treatmentSchema>[]
  ) {
    return api.patients.createTreatmentPlanWithTreatments(planData, treatments);
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
    return api.patients.createTreatment(treatmentData);
  },
  
  /**
   * Update a treatment
   */
  async updateTreatment(id: string, treatmentData: Partial<z.infer<typeof treatmentSchema>>) {
    return api.patients.updateTreatment(id, treatmentData);
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
      
      return {
        ...plan,
        patientName: patientInfo ? `${patientInfo.first_name} ${patientInfo.last_name}` : 'Unknown Patient',
        totalCost,
        progress,
        completedTreatments,
        totalTreatments
      };
    });
  }
};