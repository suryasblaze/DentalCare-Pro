import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useRealTimeSubscription } from '@/lib/hooks/useRealTimeSubscription';
import { useOptimisticUpdate } from '@/lib/hooks/useOptimisticUpdate';
import { treatmentService } from '../services/treatmentService';
import { api } from '@/lib/api';
import { z } from 'zod';
import { treatmentPlanSchema } from '../components/TreatmentPlanForm';
import { treatmentSchema } from '../components/TreatmentForm';

export function useTreatmentPlans() {
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
    (data: { treatmentId: string; newStatus: string }) => 
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
    (data: { planId: string; newStatus: string }) => 
      treatmentService.updateTreatmentPlan(data.planId, { status: data.newStatus }),
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
      
      // If there's a selected plan, refresh its data
      if (selectedPlan) {
        const updatedPlan = processedPlans.find((p) => p.id === selectedPlan.id);
        if (updatedPlan) {
          setSelectedPlan(updatedPlan);
        }
      }
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
  }, [selectedPlan, toast]);
  
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
  
  // Load initial data
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
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
  const createTreatmentPlan = useCallback(async (planData: z.infer<typeof treatmentPlanSchema>) => {
    try {
      setLoading(true);
      
      // Create plan with validated data
      const createdPlan = await treatmentService.createTreatmentPlan(planData);
      
      toast({
        title: "Success",
        description: "Treatment plan created successfully"
      });
      
      // Refresh data
      await fetchData();
      
      // Get the processed plan for display
      const processedPlan = treatmentService.processTreatmentPlanData(
        [createdPlan],
        patients
      )[0];
      
      // Return the newly created plan
      return processedPlan;
    } catch (error) {
      console.error('Error creating treatment plan:', error);
      toast({
        title: "Error",
        description: "Failed to create treatment plan",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchData, patients, toast]);
  
  // Create treatment
  const createTreatment = useCallback(async (treatmentData: z.infer<typeof treatmentSchema>) => {
    // Store original selected plan for potential rollback
    setOptimisticData({
      ...optimisticData,
      selectedPlan: { ...selectedPlan }
    });
    
    try {
      setLoading(true);
      
      // Apply optimistic update
      if (selectedPlan) {
        const newTreatmentObj = {
          id: `temp-${Date.now()}`,
          ...treatmentData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Add new treatment to the selected plan's treatments
        const updatedTreatments = [...(selectedPlan.treatments || []), newTreatmentObj];
        
        // Update the selected plan with the new treatment
        const updatedPlan = {
          ...selectedPlan,
          treatments: updatedTreatments,
          totalTreatments: selectedPlan.totalTreatments + 1,
          totalCost: selectedPlan.totalCost + treatmentData.cost,
        };
        
        setSelectedPlan(updatedPlan);
      }
      
      // Create treatment
      await treatmentService.createTreatment(treatmentData);
      
      toast({
        title: "Success",
        description: "Treatment added successfully"
      });
      
      // Refresh data to get the actual database state
      await fetchData();
      await refreshSelectedPlan();
    } catch (error) {
      console.error('Error adding treatment:', error);
      
      // Revert to the original plan on error
      if (optimisticData.selectedPlan) {
        setSelectedPlan(optimisticData.selectedPlan);
      }
      
      toast({
        title: "Error",
        description: "Failed to add treatment",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchData, refreshSelectedPlan, selectedPlan, optimisticData, toast]);
  
  // Update treatment status
  const handleUpdateTreatmentStatus = useCallback(async (treatmentId: string, newStatus: string) => {
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
  const handleUpdatePlanStatus = useCallback(async (planId: string, newStatus: string) => {
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
      
      // Refresh data to get the actual database state
      await fetchData();
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
  }, [fetchData, refreshSelectedPlan, selectedPlan, optimisticData, toast]);
  
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
    handleUpdateTreatmentStatus,
    handleUpdatePlanStatus,
    deleteTreatment,
    deletePlan
  };
}