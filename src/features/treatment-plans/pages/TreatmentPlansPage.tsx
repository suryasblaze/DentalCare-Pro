import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useTreatmentPlans } from '../hooks/useTreatmentPlans';
import { TreatmentPlanCard } from '../components/TreatmentPlanCard';
import { TreatmentPlanForm } from '../components/TreatmentPlanForm';
import { TreatmentForm } from '../components/TreatmentForm';
import { TreatmentPlanDetails } from '../components/TreatmentPlanDetails';
import { Loader2, Plus, Search, Stethoscope } from 'lucide-react';

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
    deletePlan
  } = useTreatmentPlans();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showNewPlanDialog, setShowNewPlanDialog] = useState(false);
  const [showPlanDetailsDialog, setShowPlanDetailsDialog] = useState(false);
  const [showAddTreatmentDialog, setShowAddTreatmentDialog] = useState(false);
  
  // Handle creating a new treatment plan
  const handleCreatePlan = async (planData: any) => {
    try {
      const newPlan = await createTreatmentPlan(planData);
      setShowNewPlanDialog(false);
      
      // Show the details of the new plan
      setSelectedPlan(newPlan);
      setShowPlanDetailsDialog(true);
    } catch (error) {
      console.error('Error creating plan:', error);
    }
  };
  
  // Handle adding a treatment to the plan
  const handleAddTreatment = async (treatmentData: any) => {
    try {
      await createTreatment(treatmentData);
      setShowAddTreatmentDialog(false);
    } catch (error) {
      console.error('Error adding treatment:', error);
    }
  };
  
  // Handle viewing a plan's details
  const handleViewPlanDetails = (plan: any) => {
    setSelectedPlan(plan);
    setShowPlanDetailsDialog(true);
  };
  
  // Handle opening the add treatment dialog
  const handleOpenAddTreatmentDialog = () => {
    setShowAddTreatmentDialog(true);
  };
  
  // Navigate to patient details
  const navigateToPatient = (patientId: string) => {
    navigate(`/patients/${patientId}`);
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
      {selectedPlan && (
        <TreatmentPlanDetails
          open={showPlanDetailsDialog}
          onOpenChange={setShowPlanDetailsDialog}
          plan={selectedPlan}
          onRefresh={refreshSelectedPlan}
          onAddTreatment={handleOpenAddTreatmentDialog}
          onStatusChange={handleUpdatePlanStatus}
          onDeletePlan={deletePlan}
          onTreatmentStatusChange={handleUpdateTreatmentStatus}
          onDeleteTreatment={deleteTreatment}
          loading={loading || updatingTreatmentStatus || updatingPlanStatus}
          navigateToPatient={navigateToPatient}
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
    </div>
  );
}