import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useRealTimeSubscription } from '@/lib/hooks/useRealTimeSubscription';
import { useOptimisticUpdate } from '@/lib/hooks/useOptimisticUpdate';
import { treatmentService } from '../services/treatmentService';
import { api } from '@/lib/api';
import { z } from 'zod';
import { treatmentPlanSchema } from '../components/TreatmentPlanForm';
import { treatmentSchema } from '../components/TreatmentForm';
import { format } from 'date-fns';
import type { Database } from 'supabase_types'; // Ensure Database type is imported
import type { AISuggestion } from '../components/AISuggestionForm'; // Added import

// Define TreatmentPlanUpdate for explicit casting if needed
type TreatmentPlanUpdate = Database['public']['Tables']['treatment_plans']['Update'];

// New function to get treatment IDs for visits that have a booked (non-cancelled) appointment
export const getAppointmentTreatmentIdsForPlan = async (planId: string): Promise<string[]> => {
  if (!planId) {
    console.log('[getAppointmentTreatmentIdsForPlan] No planId provided, exiting.');
    return [];
  }
  console.log(`[getAppointmentTreatmentIdsForPlan] Attempting to fetch for planId: ${planId}`);

  let visits = null;
  try {
    console.log(`[getAppointmentTreatmentIdsForPlan] ENTERING TRY BLOCK for planId: ${planId}`);

    console.log(`[getAppointmentTreatmentIdsForPlan] PRE: Calling treatmentService.getVisitsByPlanId for planId: ${planId}`);
    visits = await treatmentService.getVisitsByPlanId(planId);
    console.log(`[getAppointmentTreatmentIdsForPlan] POST: treatmentService.getVisitsByPlanId returned for planId ${planId}. Result:`, visits);

    if (!visits) {
      console.log(`[getAppointmentTreatmentIdsForPlan] Visits data is null or undefined for plan ${planId}.`);
      return [];
    }
    if (visits.length === 0) {
      console.log(`[getAppointmentTreatmentIdsForPlan] No visits found (empty array) for plan ${planId}`);
      return [];
    }

    const visitIds = visits.map(visit => visit.id);
    console.log(`[getAppointmentTreatmentIdsForPlan] Visit IDs for plan ${planId}:`, visitIds);
    if (visitIds.length === 0) {
        console.log(`[getAppointmentTreatmentIdsForPlan] No visit IDs extracted (map result empty) for plan ${planId}`);
        return [];
    }

    console.log(`[getAppointmentTreatmentIdsForPlan] PRE: Calling api.appointments.getAppointmentsByTreatmentIds with visitIds:`, visitIds);
    const appointments = await api.appointments.getAppointmentsByTreatmentIds(visitIds);
    console.log(`[getAppointmentTreatmentIdsForPlan] POST: api.appointments.getAppointmentsByTreatmentIds returned. Appointments for visit IDs (${visitIds.join(', ')}):`, appointments);
    
    if (!appointments) {
      console.log(`[getAppointmentTreatmentIdsForPlan] Appointments data is null or undefined for the given visit IDs.`);
      return [];
    }
    if (appointments.length === 0) {
      console.log(`[getAppointmentTreatmentIdsForPlan] No appointments found (empty array) for visit IDs`);
      return [];
    }

    const bookedTreatmentIds = appointments
      .filter(appt => {
        const isBooked = appt.status !== 'cancelled' && appt.treatment_id;
        return isBooked;
      })
      .map(appt => appt.treatment_id as string);
    console.log(`[getAppointmentTreatmentIdsForPlan] Filtered Booked Treatment IDs for plan ${planId}:`, bookedTreatmentIds);
      
    const uniqueBookedTreatmentIds = [...new Set(bookedTreatmentIds)];
    console.log(`[getAppointmentTreatmentIdsForPlan] Unique Booked Treatment IDs for plan ${planId} before returning:`, uniqueBookedTreatmentIds);
    return uniqueBookedTreatmentIds;

  } catch (error) {
    console.error(`[getAppointmentTreatmentIdsForPlan] CRITICAL ERROR in getAppointmentTreatmentIdsForPlan for planId ${planId}. Error:`, error);
    if (visits !== null) {
      console.error(`[getAppointmentTreatmentIdsForPlan] State of 'visits' when error occurred:`, visits);
    } else {
      console.error(`[getAppointmentTreatmentIdsForPlan] 'visits' was null when error occurred (error likely in getVisitsByPlanId itself).`);
    }
    return [];
  }
};

export function useTreatmentPlans() {
  // Define Status Types
  type TreatmentPlanStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
  type TreatmentStatus = 'pending' | 'completed' | 'cancelled';

  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [treatmentPlans, setTreatmentPlans] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [optimisticData, setOptimisticData] = useState<{
    plans: any[] | null;
    selectedPlan: any | null;
  }>({ plans: null, selectedPlan: null });
  
  // Subscribe to real-time updates
  const treatmentPlansSubscribed = useRealTimeSubscription('treatment_plans', () => {
    fetchData();
  });
  
  const treatmentsSubscribed = useRealTimeSubscription('treatments', (payload) => {
    // If the update affects the selected plan, refresh it
    if (selectedPlan && payload.new && payload.new.plan_id === selectedPlan.id) {
      refreshSelectedPlan();
    } else {
      fetchData();
    }
  });
  
  // Optimistic updates
  const { update: updateTreatmentStatus, loading: updatingTreatmentStatus } = useOptimisticUpdate(
    // Apply TreatmentStatus type
    (data: { treatmentId: string; newStatus: TreatmentStatus }) => 
      treatmentService.updateTreatment(data.treatmentId, { status: data.newStatus }),
    {
      onError: () => {
        toast({
          title: "Update Failed",
          description: "Failed to update treatment status. Please try again.",
          variant: "destructive"
        });
        // Revert optimistic update on error
        if (selectedPlan && optimisticData.selectedPlan) {
          setSelectedPlan({ ...optimisticData.selectedPlan });
        }
      }
    }
  );
  
  const { update: updatePlanStatus, loading: updatingPlanStatus } = useOptimisticUpdate(
    // Apply TreatmentPlanStatus type
    (data: { planId: string; newStatus: TreatmentPlanStatus }) => 
      treatmentService.updateTreatmentPlan(data.planId, { status: data.newStatus } as TreatmentPlanUpdate),
    {
      onError: () => {
        toast({
          title: "Update Failed",
          description: "Failed to update plan status. Please try again.",
          variant: "destructive"
        });
        // Revert optimistic update on error
        if (optimisticData.plans) {
          setTreatmentPlans([...optimisticData.plans]);
        }
      }
    }
  );
  
  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [plansData, patientsData] = await Promise.all([
        treatmentService.getAllTreatmentPlans(),
        api.patients.getAll()
      ]);
      
      const processedPlans = treatmentService.processTreatmentPlanData(plansData, patientsData);
      
      setTreatmentPlans(processedPlans);
      setPatients(patientsData);
      
      // Removed logic that updates selectedPlan from within fetchData
      // // If there's a selected plan, refresh its data
      // if (selectedPlan) {
      //   const updatedPlan = processedPlans.find((p) => p.id === selectedPlan.id);
      //   if (updatedPlan) {
      //     setSelectedPlan(updatedPlan);
      //   }
      // }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load treatment plans",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]); // Removed selectedPlan from dependencies
  
  // Refresh selected plan
  const refreshSelectedPlan = useCallback(async () => {
    if (!selectedPlan) return;
    
    try {
      const plans = await treatmentService.getAllTreatmentPlans();
      const updatedPlan = plans.find((p) => p.id === selectedPlan.id);
      
      if (updatedPlan) {
        const processedPlan = treatmentService.processTreatmentPlanData([updatedPlan], patients)[0];
        setSelectedPlan(processedPlan);
      }
    } catch (error) {
      console.error('Error refreshing plan:', error);
    }
  }, [selectedPlan, patients]);
  
  // Load initial data - Run only once on mount
  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed fetchData dependency to prevent re-running on selectedPlan change
  
  // Filter plans
  const filterPlans = useCallback((
    searchQuery: string,
    patientFilter: string | null,
    statusFilter: string | null
  ) => {
    return treatmentPlans.filter(plan => {
      // Filter by search query (plan title, description, or patient name)
      const matchesSearch = searchQuery ? 
        (plan.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         plan.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         plan.patientName?.toLowerCase().includes(searchQuery.toLowerCase())) : 
        true;
      
      // Filter by patient
      const matchesPatient = patientFilter && patientFilter !== 'all' ? plan.patient_id === patientFilter : true;
      
      // Filter by status
      const matchesStatus = statusFilter && statusFilter !== 'all' ? plan.status === statusFilter : true;
      
      return matchesSearch && matchesPatient && matchesStatus;
    });
  }, [treatmentPlans]);
  
  // Create treatment plan
  // Add toothIds as the second argument
  const createTreatmentPlan = useCallback(async (
    planDetailsFromForm: Partial<z.infer<typeof treatmentPlanSchema>> & { /* initialTreatments?: any[], */ originalAISuggestion?: AISuggestion }, 
    toothIds: number[]
  ) => { 
    let createdPlanId: string | null = null;
    let createdPlanObjectForReturn: any = null;

    try {
      setLoading(true);
      
      const { 
        // initialTreatments, // No longer creating treatments here
        originalAISuggestion, 
        clinical_considerations,
        materials,
        post_treatment_care,
        total_visits: totalVisitsFromForm,
        ...planTableFields 
      } = planDetailsFromForm;

      const finalPlanTableData = {
        title: planTableFields.title || 'Untitled Plan',
        description: planTableFields.description || 'No description',
        patient_id: planTableFields.patient_id || '', 
        status: planTableFields.status || 'planned',
        start_date: planTableFields.start_date || format(new Date(), 'yyyy-MM-dd'),
        priority: planTableFields.priority || 'medium',
        // ai_generated will be true if originalAISuggestion exists
        ai_generated: !!originalAISuggestion, 
      };

      // Step 1: Create the main treatment plan record & associate teeth
      const planCreationResult = await treatmentService.createTreatmentPlan(finalPlanTableData, toothIds);

      if (planCreationResult.error || !planCreationResult.data || !planCreationResult.data.id) {
        console.error('Error creating base treatment plan:', planCreationResult.error);
        toast({
          title: "Error",
          description: planCreationResult.error?.message || "Failed to create base treatment plan record.",
          variant: "destructive"
        });
        throw planCreationResult.error || new Error("Base plan creation failed or ID missing.");
      }
      createdPlanId = planCreationResult.data.id;
      createdPlanObjectForReturn = planCreationResult.data; 

      toast({
        title: "Plan Created",
        description: "Base plan record and teeth associations saved. Saving metadata..."
      });
      
      // Step 2: Create Metadata
      const metadataPayload = {
        treatment_plan_id: createdPlanId,
        clinical_considerations: clinical_considerations || null,
        key_materials: materials || null, 
        post_treatment_care: post_treatment_care || null,
        // total_visits now comes from the form, or can be derived from aiSuggestion if needed by metadata directly
        total_visits: totalVisitsFromForm ? parseInt(totalVisitsFromForm) : 
                      (originalAISuggestion?.planDetails?.appointmentPlan?.sittingDetails?.length || 0),
        completed_visits: 0,
      };

      try {
        await api.patients.createTreatmentPlanMetadata(metadataPayload);
        toast({
            title: "Metadata Saved",
            description: "Additional plan details saved successfully."
        });
      } catch (metaError) {
        console.error('Error creating treatment plan metadata:', metaError);
        toast({
          title: "Warning",
          description: "Plan created, but failed to save some additional details (metadata).",
          variant: "default"
        });
      }
      
      // Step 3: Fetch full details of the newly created plan
      const detailsResult = await api.patients.getTreatmentPlanDetails(createdPlanId);

      if (detailsResult.error || !detailsResult.data) {
        console.error('Error fetching new plan details:', detailsResult.error);
        toast({
          title: "Warning",
          description: "Plan fully created, but failed to fetch updated details. A manual refresh may be needed.",
          variant: "default"
        });
        fetchData(); 
        // Return a synthesized plan object if fetching fails (treatments will be empty initially)
        const placeholderPlan = treatmentService.processTreatmentPlanData([{ ...createdPlanObjectForReturn, treatments: [], metadata: metadataPayload }], patients)[0];
        return {
            ...placeholderPlan,
            originalAISuggestion: originalAISuggestion 
        };
      }

      const newPlanWithFullDetails = detailsResult.data;
      // The newPlanWithFullDetails.treatments will be empty as none were created here.
      const processedPlan = treatmentService.processTreatmentPlanData([newPlanWithFullDetails], patients)[0];
      
      fetchData(); 
      
      console.log('[useTreatmentPlans] createTreatmentPlan - Returning originalAISuggestion:', planDetailsFromForm.originalAISuggestion);
      return {
        ...processedPlan, // treatments array will be empty or reflect actual DB state (empty)
        originalAISuggestion: planDetailsFromForm.originalAISuggestion
      };
    } catch (error) {
      console.error('Error in createTreatmentPlan process:', error);
      toast({
        title: "Error",
        description: `An unexpected error occurred: ${error instanceof Error ? error.message : "Please check console."}`, 
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchData, patients, toast]); 
  
  // Create treatment
  const createTreatment = useCallback(async (treatmentData: z.infer<typeof treatmentSchema>) => {
    try {
      setLoading(true);
      await treatmentService.createTreatment(treatmentData);
      toast({
        title: "Treatment Added",
        description: "New treatment has been successfully added to the plan."
      });
      await refreshSelectedPlan(); // Refresh to show the new treatment
    } catch (error: any) {
      console.error('Error creating treatment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add treatment.",
        variant: "destructive"
      });
      // Rethrow to allow the calling component to handle if needed
      throw error; 
    } finally {
      setLoading(false);
    }
  }, [toast, refreshSelectedPlan]);
  
  // Update a treatment's details
  const updateTreatmentDetails = useCallback(async (treatmentId: string, data: Partial<z.infer<typeof treatmentSchema>>) => {
    try {
      setLoading(true);
      await treatmentService.updateTreatment(treatmentId, data);
      toast({
        title: "Treatment Updated",
        description: "Treatment details have been successfully updated."
      });
      await refreshSelectedPlan();
    } catch (error: any) {
      console.error('Error updating treatment details:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update treatment details.",
        variant: "destructive"
      });
      throw error; // Rethrow to allow the calling component to handle if needed
    } finally {
      setLoading(false);
    }
  }, [toast, refreshSelectedPlan]);
  
  // Update treatment status
  // Apply TreatmentStatus type
  const handleUpdateTreatmentStatus = useCallback(async (treatmentId: string, newStatus: TreatmentStatus) => {
    // Store current state for potential rollback
    setOptimisticData({
      ...optimisticData,
      selectedPlan: { ...selectedPlan }
    });
    
    // Apply optimistic update to UI
    if (selectedPlan) {
      const updatedTreatments = selectedPlan.treatments.map((t: any) => 
        t.id === treatmentId ? { ...t, status: newStatus } : t
      );
      
      const completedTreatments = updatedTreatments.filter((t: any) => t.status === 'completed').length;
      const progress = Math.round((completedTreatments / updatedTreatments.length) * 100);
      
      setSelectedPlan({
        ...selectedPlan,
        treatments: updatedTreatments,
        completedTreatments,
        progress
      });
    }
    
    // Call the API with optimistic update
    await updateTreatmentStatus({ treatmentId, newStatus });
  }, [selectedPlan, optimisticData, updateTreatmentStatus]);
  
  // Update plan status
  // Apply TreatmentPlanStatus type
  const handleUpdatePlanStatus = useCallback(async (planId: string, newStatus: TreatmentPlanStatus) => {
    // Store current state for potential rollback
    setOptimisticData({
      ...optimisticData,
      plans: [...treatmentPlans]
    });
    
    // Apply optimistic update to UI
    const updatedPlans = treatmentPlans.map(plan => 
      plan.id === planId ? { ...plan, status: newStatus } : plan
    );
    
    setTreatmentPlans(updatedPlans);
    
    if (selectedPlan && selectedPlan.id === planId) {
      setSelectedPlan({ ...selectedPlan, status: newStatus });
    }
    
    // Call the API with optimistic update
    // Assuming treatmentService.updateTreatmentPlan correctly calls api.patients.updateTreatmentPlan
    // The linter error on line 63 was related to the type expected by treatmentService.updateTreatmentPlan.
    // If api.patients.updateTreatmentPlan handles { status: newStatus } correctly, this should be fine.
    await updatePlanStatus({ planId, newStatus });
  }, [treatmentPlans, selectedPlan, optimisticData, updatePlanStatus]);
  
  // Delete treatment
  const deleteTreatment = useCallback(async (treatmentId: string) => {
    // Store current state for potential rollback
    setOptimisticData({
      ...optimisticData,
      selectedPlan: { ...selectedPlan }
    });
    
    try {
      setLoading(true);
      
      // Apply optimistic update
      if (selectedPlan) {
        const treatmentToDelete = selectedPlan.treatments.find((t: any) => t.id === treatmentId);
        const updatedTreatments = selectedPlan.treatments.filter((t: any) => t.id !== treatmentId);
        
        const completedTreatments = updatedTreatments.filter((t: any) => t.status === 'completed').length;
        const totalTreatments = updatedTreatments.length;
        const progress = totalTreatments ? Math.round((completedTreatments / totalTreatments) * 100) : 0;
        const totalCost = updatedTreatments.reduce((sum: number, t: any) => sum + parseFloat(t.cost || 0), 0);
        
        setSelectedPlan({
          ...selectedPlan,
          treatments: updatedTreatments,
          completedTreatments,
          totalTreatments,
          progress,
          totalCost
        });
      }
      
      // Delete the treatment
      await treatmentService.deleteTreatment(treatmentId);
      
      toast({
        title: "Success",
        description: "Treatment deleted successfully"
      });
      
      // Refresh data to get the actual database state - Only refresh selected plan
      // await fetchData(); // Removed redundant fetch
      await refreshSelectedPlan();
    } catch (error) {
      console.error('Error deleting treatment:', error);
      
      // Revert to the original plan on error
      if (optimisticData.selectedPlan) {
        setSelectedPlan(optimisticData.selectedPlan);
      }
      
      toast({
        title: "Error",
        description: "Failed to delete treatment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [refreshSelectedPlan, selectedPlan, optimisticData, toast]); // Removed fetchData from dependencies
  
  // Delete plan
  const deletePlan = useCallback(async (planId: string) => {
    try {
      setLoading(true);
      
      // Apply optimistic update
      const updatedPlans = treatmentPlans.filter(plan => plan.id !== planId);
      setTreatmentPlans(updatedPlans);
      
      // Delete the plan
      await treatmentService.deleteTreatmentPlan(planId);
      
      toast({
        title: "Success",
        description: "Treatment plan deleted successfully"
      });
      
      // Clear selected plan if it was deleted
      if (selectedPlan && selectedPlan.id === planId) {
        setSelectedPlan(null);
      }
    } catch (error) {
      console.error('Error deleting treatment plan:', error);
      
      // Revert the optimistic update
      fetchData();
      
      toast({
        title: "Error",
        description: "Failed to delete treatment plan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [fetchData, treatmentPlans, selectedPlan, toast]);
  
  return {
    loading,
    treatmentPlans,
    patients,
    selectedPlan,
    setSelectedPlan,
    treatmentPlansSubscribed,
    treatmentsSubscribed,
    updatingTreatmentStatus,
    updatingPlanStatus,
    filterPlans,
    fetchData,
    refreshSelectedPlan,
    createTreatmentPlan,
    createTreatment,
    updateTreatmentDetails,
    handleUpdateTreatmentStatus,
    handleUpdatePlanStatus,
    deleteTreatment,
    deletePlan
  };
}
