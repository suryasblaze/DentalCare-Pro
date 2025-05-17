import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useTreatmentPlans, getBookedAppointmentDetailsForPlan, type BookedAppointmentDetail } from '../hooks/useTreatmentPlans';
import { TreatmentPlanCard } from '../components/TreatmentPlanCard';
import { TreatmentPlanForm } from '../components/TreatmentPlanForm';
import { TreatmentForm } from '../components/TreatmentForm';
import { TreatmentPlanDetails, type TreatmentVisit } from '../components/TreatmentPlanDetails';
import { AITreatmentGenerator } from '@/components/AITreatmentGenerator';
// Assuming status enums are defined in database types
import type { Database } from '@/lib/database.types';
type TreatmentPlanStatus = Database['public']['Enums']['treatment_plan_status'];
type TreatmentStatus = Database['public']['Enums']['treatment_status'];
import { Loader2 } from 'lucide-react';
import { Plus } from 'lucide-react';
import { Search } from 'lucide-react';
import { Stethoscope } from 'lucide-react';
import { Wand2 } from 'lucide-react'; // Added Wand2 icon
import { z } from 'zod';

// Import the renamed function and the new type from the hook
import { createTreatmentPlan, createTreatment, refreshSelectedPlan, deletePlan, deleteTreatment, handleUpdatePlanStatus, handleUpdateTreatmentStatus, updateTreatmentDetails, treatmentPlansSubscribed, updatingTreatmentStatus, updatingPlanStatus, filterPlans } from '../hooks/useTreatmentPlans';

export function TreatmentPlansPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    loading,
    treatmentPlans,
    patients,
    selectedPlan,
    setSelectedPlan,
    treatmentPlansSubscribed,
    updatingTreatmentStatus,
    updatingPlanStatus,
    filterPlans,
    refreshSelectedPlan,
    createTreatmentPlan,
    createTreatment,
    handleUpdateTreatmentStatus,
    handleUpdatePlanStatus,
    deleteTreatment,
    deletePlan,
    updateTreatmentDetails,
  } = useTreatmentPlans();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showNewPlanDialog, setShowNewPlanDialog] = useState(false);
  const [showPlanDetailsDialog, setShowPlanDetailsDialog] = useState(false);
  const [showAddTreatmentDialog, setShowAddTreatmentDialog] = useState(false);
  const [showAIGeneratorDialog, setShowAIGeneratorDialog] = useState(false); // Added state for AI dialog
  const [currentAiSuggestionForDetails, setCurrentAiSuggestionForDetails] = useState<AISuggestion | null>(null); // New state
  const [bookedAppointmentDetails, setBookedAppointmentDetails] = useState<BookedAppointmentDetail[]>([]); // Type updated
  
  // State for editing a treatment/visit
  const [editingTreatment, setEditingTreatment] = useState<TreatmentVisit | null>(null);
  const [showEditTreatmentDialog, setShowEditTreatmentDialog] = useState(false);
  
  // Handle creating a new treatment plan
  // Update signature to accept toothIds
  const handleCreatePlan = async (planData: any, toothIds: number[]) => { 
    try {
      // Pass toothIds to the hook function (will update hook next)
      const newPlan = await createTreatmentPlan(planData, toothIds); 
      setShowNewPlanDialog(false);
      
      setSelectedPlan(newPlan);
      console.log('[TreatmentPlansPage] handleCreatePlan - newPlan object:', newPlan);
      console.log('[TreatmentPlansPage] handleCreatePlan - newPlan.originalAISuggestion:', newPlan?.originalAISuggestion);
      if (newPlan?.originalAISuggestion) { 
        setCurrentAiSuggestionForDetails(newPlan.originalAISuggestion);
      } else {
        setCurrentAiSuggestionForDetails(null);
      }
      setShowPlanDetailsDialog(true);
    } catch (error) {
      console.error('Error creating plan:', error);
      // Error toast is likely handled within createTreatmentPlan or its service calls
    }
  };

  // Handle creating a plan from AI generator
  const handleAIGeneratePlan = async (planData: any) => {
    try {
      // Assuming the AI generator returns data compatible with createTreatmentPlan
      // Pass empty array for toothIds as AI generator doesn't provide them directly here
      // Note: This function might be redundant now as AITreatmentGenerator handles its own logic.
      const newPlan = await createTreatmentPlan(planData, []); 
      setShowAIGeneratorDialog(false);
      
      // Show the details of the new plan
      setSelectedPlan(newPlan);
      setShowPlanDetailsDialog(true);
      toast({
        title: "AI Plan Created",
        description: `Treatment plan for ${newPlan.patient?.first_name} ${newPlan.patient?.last_name} generated successfully.`,
      });
    } catch (error) {
      console.error('Error creating AI plan:', error);
      toast({
        title: "Error",
        description: "Failed to create treatment plan from AI generator.",
        variant: "destructive",
      });
    }
  };
  
  // Handle adding a treatment to the plan
  const handleAddTreatment = async (treatmentData: any) => {
    try {
      // Reverted: Pass original data, assuming createTreatment handles mapping or expects this structure
      await createTreatment(treatmentData); 
      setShowAddTreatmentDialog(false);
      await refreshSelectedPlan(); // Refresh plan details after adding
    } catch (error) {
      console.error('Error adding treatment:', error);
    }
  };
  
  // New handler for updating a treatment/visit
  const handleUpdateTreatment = async (formData: Partial<z.infer<typeof treatmentSchema>>) => {
    if (!editingTreatment || !editingTreatment.id) {
      toast({ title: "Error", description: "No treatment selected for update.", variant: "destructive" });
      return;
    }
    try {
      // Ensure plan_id is part of the formData, or add it from editingTreatment
      // The form should include plan_id as it's part of treatmentSchema and populated by initialData
      const dataToUpdate: Partial<z.infer<typeof treatmentSchema>> = {
        ...formData,
        plan_id: formData.plan_id || editingTreatment.plan_id, // Ensure plan_id is present
      };

      await updateTreatmentDetails(editingTreatment.id, dataToUpdate);
      
      // Toast for success is now handled within updateTreatmentDetails hook
      setShowEditTreatmentDialog(false);
      setEditingTreatment(null);
      // refreshSelectedPlan is also called within the hook
    } catch (error) {
      console.error('Error updating treatment:', error);
      // Toast for error is also handled within updateTreatmentDetails hook,
      // but we can add a specific one here if needed, or let the hook handle it.
      // For now, assume hook's toast is sufficient.
    }
  };
  
  // Handle opening the edit treatment dialog
  const handleOpenEditTreatmentDialog = (treatment: TreatmentVisit) => {
    setEditingTreatment(treatment);
    setShowEditTreatmentDialog(true);
  };
  
  // Handle viewing a plan's details
  const handleViewPlanDetails = async (plan: any) => {
    setSelectedPlan(plan);
    setShowPlanDetailsDialog(true);
    try {
      const details = await getBookedAppointmentDetailsForPlan(plan.id); // Use renamed function
      setBookedAppointmentDetails(details);
    } catch (error) {
      console.error('Error fetching booked appointment details:', error);
      setBookedAppointmentDetails([]);
    }
  };
  
  // Handle opening the add treatment dialog
  const handleOpenAddTreatmentDialog = () => {
    setShowAddTreatmentDialog(true);
  };
  
  // Navigate to patient details
  const navigateToPatient = (patientId: string) => {
    navigate(`/patients/${patientId}`);
  };

  // Wrapper functions to satisfy TreatmentPlanDetails prop types
  const handlePlanStatusChangeWrapper = (planId: string, status: string): Promise<void> => {
    // Cast the string status to the expected enum type
    return handleUpdatePlanStatus(planId, status as TreatmentPlanStatus);
  };

  const handleTreatmentStatusChangeWrapper = (treatmentId: string, status: string): Promise<void> => {
    // Cast the string status to the expected enum type
    return handleUpdateTreatmentStatus(treatmentId, status as TreatmentStatus);
  };
  
  return (
    <div className="space-y-6">
      <PageHeader
        heading="Treatment Plans"
        text="Manage dental treatment plans and procedures"
      >
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search treatment plans..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select 
            value={selectedPatient || 'all'} 
            onValueChange={(value) => setSelectedPatient(value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by patient" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Patients</SelectItem>
              {patients.map((patient) => (
                <SelectItem key={patient.id} value={patient.id}>
                  {patient.first_name} {patient.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={filterStatus || 'all'} 
            onValueChange={(value) => setFilterStatus(value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <Button className="ai-insights-button" onClick={() => setShowAIGeneratorDialog(true)}>
            <Wand2 className="h-4 w-4 mr-2" />
            AI Generate Plan
          </Button>
          <Button onClick={() => setShowNewPlanDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Treatment Plan
          </Button>
        </div>
      </PageHeader>
      
      {/* Real-time status indicator */}
      <div className="flex items-center justify-end">
        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
          <div className={`h-2 w-2 rounded-full ${treatmentPlansSubscribed ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>Real-time updates {treatmentPlansSubscribed ? 'active' : 'inactive'}</span>
        </div>
      </div>
      
      {loading && (
        <div className="flex justify-center my-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading treatment plans...</p>
          </div>
        </div>
      )}
      
      {!loading && filterPlans(searchQuery, selectedPatient, filterStatus).length === 0 && (
        <div className="text-center py-12 border rounded-lg">
          <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Treatment Plans Found</h3>
          <p className="text-muted-foreground mt-1 mb-6">
            Create your first treatment plan to get started
          </p>
          <Button onClick={() => setShowNewPlanDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Treatment Plan
          </Button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filterPlans(searchQuery, selectedPatient, filterStatus).map((plan) => (
          <TreatmentPlanCard
            key={plan.id}
            plan={plan}
            onViewDetails={handleViewPlanDetails}
          />
        ))}
      </div>
      
      {/* Treatment Plan Form Dialog */}
      <TreatmentPlanForm
        open={showNewPlanDialog}
        onOpenChange={setShowNewPlanDialog}
        onSubmit={handleCreatePlan}
        patients={patients}
        loading={loading}
      />
      
      {/* Treatment Plan Details Dialog */}
      {showPlanDetailsDialog && selectedPlan && (
        <TreatmentPlanDetails
          key={selectedPlan.id}
          open={showPlanDetailsDialog}
          onOpenChange={(isOpen) => {
            setShowPlanDetailsDialog(isOpen);
            if (!isOpen) {
              setBookedAppointmentDetails([]);
            } else if (isOpen && selectedPlan) { 
              const fetchDetails = async () => {
                try {
                  const details = await getBookedAppointmentDetailsForPlan(selectedPlan.id);
                  setBookedAppointmentDetails(details);
                } catch (error) {
                  console.error('[TreatmentPlansPage] fetchDetails: Error fetching booked appointment details on dialog open:', error);
                  setBookedAppointmentDetails([]); 
                }
              };
              fetchDetails();
            }
          }}
          plan={selectedPlan}
          onRefresh={async () => {
            await refreshSelectedPlan();
            if (selectedPlan) {
              try {
                const details = await getBookedAppointmentDetailsForPlan(selectedPlan.id);
                setBookedAppointmentDetails(details);
              } catch (error) {
                console.error('Error fetching booked appointment details after refresh:', error);
                setBookedAppointmentDetails([]);
              }
            }
          }}
          onAddTreatment={handleOpenAddTreatmentDialog}
          onStatusChange={handlePlanStatusChangeWrapper}
          onDeletePlan={async (planId) => { await deletePlan(planId); setShowPlanDetailsDialog(false); }}
          onTreatmentStatusChange={handleTreatmentStatusChangeWrapper}
          onDeleteTreatment={deleteTreatment}
          onEditTreatment={handleOpenEditTreatmentDialog}
          loading={loading || updatingPlanStatus || updatingTreatmentStatus}
          navigateToPatient={navigateToPatient}
          aiInitialSuggestion={currentAiSuggestionForDetails}
          bookedAppointments={bookedAppointmentDetails}
        />
      )}
      
      {/* Add Treatment Dialog */}
      {selectedPlan && (
        <TreatmentForm
          open={showAddTreatmentDialog}
          onOpenChange={setShowAddTreatmentDialog}
          onSubmit={handleAddTreatment}
          planId={selectedPlan.id}
          loading={loading}
        />
      )}

      {/* Edit Treatment Dialog - Reusing TreatmentForm */}
      {selectedPlan && editingTreatment && (
        <TreatmentForm
          open={showEditTreatmentDialog}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setEditingTreatment(null); // Clear editing state when dialog is closed
            }
            setShowEditTreatmentDialog(isOpen);
          }}
          onSubmit={handleUpdateTreatment} // Use the update handler
          planId={selectedPlan.id} // Still need planId for context if form needs it
          initialData={editingTreatment} // Pass the treatment data to pre-fill
          loading={loading} // Or a specific loading state for update
          isEditMode={true} // Add a prop to signify edit mode
        />
      )}

      {/* AI Treatment Generator Dialog */}
      <AITreatmentGenerator
        open={showAIGeneratorDialog}
        onOpenChange={setShowAIGeneratorDialog}
        // Remove the non-existent onSubmit prop
        patients={patients}
        // Remove the non-existent loading prop
      />
    </div>
  );
}
