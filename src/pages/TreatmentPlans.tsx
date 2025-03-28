import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormFieldError } from '@/components/ui/form-field-error';
import { useOptimisticUpdate } from '@/lib/hooks/useOptimisticUpdate';
import { useFormValidation } from '@/lib/hooks/useFormValidation';
import { useRealTimeSubscription } from '@/lib/hooks/useRealTimeSubscription';
import { safeNumberConversion, formatCurrency } from '@/lib/utils/validation';
import { useToast } from '@/components/ui/use-toast';
import { z } from 'zod';
import {
  Plus,
  Search,
  Calendar,
  CreditCard,
  FileText,
  User,
  ChevronRight,
  Pencil,
  Trash2,
  Check,
  Clock,
  Wallet,
  ArrowUpRight,
  Stethoscope,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

// Validation schemas
const treatmentPlanSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  patient_id: z.string().min(1, "Patient is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional().nullable(),
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]),
  priority: z.enum(["low", "medium", "high"]),
  estimated_cost: z.string().optional().transform(val => val ? parseFloat(val) : null),
});

const treatmentSchema = z.object({
  type: z.string().min(1, "Treatment type is required"),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["pending", "completed", "cancelled"]),
  cost: z.string().min(1, "Cost is required")
    .refine(val => !isNaN(parseFloat(val)), "Cost must be a valid number")
    .transform(val => parseFloat(val)),
  estimated_duration: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
  plan_id: z.string().min(1)
});

export function TreatmentPlans() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [treatmentPlans, setTreatmentPlans] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showNewPlanDialog, setShowNewPlanDialog] = useState(false);
  const [showPlanDetailsDialog, setShowPlanDetailsDialog] = useState(false);
  const [showAddTreatmentDialog, setShowAddTreatmentDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [optimisticData, setOptimisticData] = useState<{
    plans: any[] | null;
    selectedPlan: any | null;
  }>({ plans: null, selectedPlan: null });
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState<{
    localChanges: any;
    serverData: any;
    type: 'plan' | 'treatment';
    id: string;
  } | null>(null);
  
  // Form state
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    patient_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    status: 'planned',
    priority: 'medium',
    estimated_cost: ''
  });
  
  const [newTreatment, setNewTreatment] = useState({
    type: '',
    description: '',
    status: 'pending',
    cost: '',
    estimated_duration: '',
    priority: 'medium',
    plan_id: ''
  });
  
  // Form validation
  const planValidation = useFormValidation(treatmentPlanSchema);
  const treatmentValidation = useFormValidation(treatmentSchema);
  
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
      api.patients.updateTreatment(data.treatmentId, { status: data.newStatus }),
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
      api.patients.updateTreatmentPlan(data.planId, { status: data.newStatus }),
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
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansData, patientsData] = await Promise.all([
        api.patients.getTreatmentPlans(null),
        api.patients.getAll()
      ]);
      
      // Pre-process data for display
      const processedPlans = plansData.map((plan: any) => {
        const patientInfo = patientsData.find((p: any) => p.id === plan.patient_id);
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
      
      setTreatmentPlans(processedPlans);
      setPatients(patientsData);
      
      // If there's a selected plan, refresh its data
      if (selectedPlan) {
        const updatedPlan = processedPlans.find((p: any) => p.id === selectedPlan.id);
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
  };
  
  const refreshSelectedPlan = async () => {
    if (!selectedPlan) return;
    
    try {
      const plans = await api.patients.getTreatmentPlans(null);
      const updatedPlan = plans.find((p: any) => p.id === selectedPlan.id);
      
      if (updatedPlan) {
        const patientInfo = patients.find((p: any) => p.id === updatedPlan.patient_id);
        const totalCost = updatedPlan.treatments?.reduce((sum: number, t: any) => sum + parseFloat(t.cost || 0), 0) || 0;
        const completedTreatments = updatedPlan.treatments?.filter((t: any) => t.status === 'completed').length || 0;
        const totalTreatments = updatedPlan.treatments?.length || 0;
        const progress = totalTreatments ? Math.round((completedTreatments / totalTreatments) * 100) : 0;
        
        const processedPlan = {
          ...updatedPlan,
          patientName: patientInfo ? `${patientInfo.first_name} ${patientInfo.last_name}` : 'Unknown Patient',
          totalCost,
          progress,
          completedTreatments,
          totalTreatments
        };
        
        setSelectedPlan(processedPlan);
      }
    } catch (error) {
      console.error('Error refreshing plan:', error);
    }
  };
  
  const filterPlans = () => {
    return treatmentPlans.filter(plan => {
      // Filter by search query (plan title, description, or patient name)
      const matchesSearch = searchQuery ? 
        (plan.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         plan.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         plan.patientName?.toLowerCase().includes(searchQuery.toLowerCase())) : 
        true;
      
      // Filter by patient
      const matchesPatient = selectedPatient ? plan.patient_id === selectedPatient : true;
      
      // Filter by status
      const matchesStatus = filterStatus ? plan.status === filterStatus : true;
      
      return matchesSearch && matchesPatient && matchesStatus;
    });
  };
  
  const handleCreatePlan = async () => {
    const validationResult = planValidation.validate(newPlan);
    
    if (!validationResult.isValid) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Create plan with validated data
      const createdPlan = await api.patients.createTreatmentPlan(validationResult.data!);
      
      toast({
        title: "Success",
        description: "Treatment plan created successfully"
      });
      
      // Reset form and close dialog
      setNewPlan({
        title: '',
        description: '',
        patient_id: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: '',
        status: 'planned',
        priority: 'medium',
        estimated_cost: ''
      });
      setShowNewPlanDialog(false);
      
      // Refresh data
      await fetchData();
      
      // Show plan details dialog for the new plan
      const processedPlan = {
        ...createdPlan,
        patientName: patients.find(p => p.id === createdPlan.patient_id)?.first_name + ' ' + 
                    patients.find(p => p.id === createdPlan.patient_id)?.last_name || 'Unknown Patient',
        totalCost: 0,
        progress: 0,
        completedTreatments: 0,
        totalTreatments: 0,
        treatments: []
      };
      
      setSelectedPlan(processedPlan);
      setShowPlanDetailsDialog(true);
    } catch (error) {
      console.error('Error creating treatment plan:', error);
      toast({
        title: "Error",
        description: "Failed to create treatment plan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddTreatment = async () => {
    const validationResult = treatmentValidation.validate(newTreatment);
    
    if (!validationResult.isValid) {
      return;
    }
    
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
          ...validationResult.data,
          cost: safeNumberConversion(newTreatment.cost, 0),
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
          totalCost: selectedPlan.totalCost + safeNumberConversion(newTreatment.cost, 0),
        };
        
        setSelectedPlan(updatedPlan);
      }
      
      // Create treatment with transaction support
      const treatmentData = validationResult.data!;
      await api.patients.createTreatment(treatmentData);
      
      toast({
        title: "Success",
        description: "Treatment added successfully"
      });
      
      // Reset form and close dialog
      setNewTreatment({
        type: '',
        description: '',
        status: 'pending',
        cost: '',
        estimated_duration: '',
        priority: 'medium',
        plan_id: ''
      });
      setShowAddTreatmentDialog(false);
      
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
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateTreatmentStatus = async (treatmentId: string, newStatus: string) => {
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
  };
  
  const handleUpdatePlanStatus = async (planId: string, newStatus: string) => {
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
  };
  
  const handleDeleteTreatment = async (treatmentId: string) => {
    if (!confirm('Are you sure you want to delete this treatment?')) return;
    
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
      await api.patients.deleteTreatment(treatmentId);
      
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
  };
  
  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this treatment plan? This will delete all associated treatments.')) return;
    
    try {
      setLoading(true);
      
      // Apply optimistic update
      const updatedPlans = treatmentPlans.filter(plan => plan.id !== planId);
      setTreatmentPlans(updatedPlans);
      
      // Delete the plan
      await api.patients.deleteTreatmentPlan(planId);
      
      toast({
        title: "Success",
        description: "Treatment plan deleted successfully"
      });
      
      // Close details dialog if it's open for the deleted plan
      if (selectedPlan && selectedPlan.id === planId) {
        setShowPlanDetailsDialog(false);
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
  };
  
  const resolveConflict = async (useServerData: boolean) => {
    if (!conflictData) return;
    
    try {
      if (conflictData.type === 'plan') {
        if (useServerData) {
          // Refresh the plan data from the server
          await fetchData();
        } else {
          // Try to update with local changes again
          await api.patients.updateTreatmentPlan(conflictData.id, conflictData.localChanges);
        }
      } else if (conflictData.type === 'treatment') {
        if (useServerData) {
          // Refresh the treatment data from the server
          await refreshSelectedPlan();
        } else {
          // Try to update with local changes again
          await api.patients.updateTreatment(conflictData.id, conflictData.localChanges);
        }
      }
      
      // Clear conflict data and close dialog
      setConflictData(null);
      setShowConflictDialog(false);
      
      toast({
        title: "Conflict Resolved",
        description: `Changes ${useServerData ? 'discarded' : 'saved'} successfully`
      });
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast({
        title: "Error",
        description: "Failed to resolve conflict",
        variant: "destructive"
      });
    }
  };
  
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
      case 'pending':
        color = 'bg-purple-100 text-purple-800';
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
          
          <Select value={selectedPatient || ''} onValueChange={setSelectedPatient}>
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
          
          <Select value={filterStatus || ''} onValueChange={setFilterStatus}>
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
          
          <Button onClick={() => {
            planValidation.clearErrors();
            setShowNewPlanDialog(true);
          }}>
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
      
      {!loading && filterPlans().length === 0 && (
        <div className="text-center py-12 border rounded-lg">
          <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Treatment Plans Found</h3>
          <p className="text-muted-foreground mt-1 mb-6">
            Create your first treatment plan to get started
          </p>
          <Button onClick={() => {
            planValidation.clearErrors();
            setShowNewPlanDialog(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            New Treatment Plan
          </Button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filterPlans().map((plan) => (
          <Card key={plan.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{plan.title}</CardTitle>
                {renderStatusBadge(plan.status)}
              </div>
              <CardDescription className="line-clamp-2">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-4">
                <div className="flex items-center text-sm">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{plan.patientName}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>
                    {format(new Date(plan.start_date), 'MMM d, yyyy')}
                    {plan.end_date && ` to ${format(new Date(plan.end_date), 'MMM d, yyyy')}`}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Total Cost: {formatCurrency(plan.totalCost)}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span>{plan.completedTreatments} of {plan.totalTreatments} treatments</span>
                  </div>
                  <Progress value={plan.progress} />
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2 flex justify-between">
              <div className="flex gap-2">
                {plan.priority && renderPriorityBadge(plan.priority)}
              </div>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => {
                  setSelectedPlan(plan);
                  setShowPlanDetailsDialog(true);
                }}
              >
                View Details <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* New Treatment Plan Dialog */}
      <Dialog open={showNewPlanDialog} onOpenChange={setShowNewPlanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Treatment Plan</DialogTitle>
            <DialogDescription>
              Create a comprehensive treatment plan for a patient
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Patient *</Label>
              <Select 
                value={newPlan.patient_id} 
                onValueChange={(value) => {
                  setNewPlan({...newPlan, patient_id: value});
                  planValidation.clearFieldError('patient_id');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {planValidation.errors.patient_id && (
                <FormFieldError message={planValidation.errors.patient_id} />
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input 
                placeholder="Treatment plan title" 
                value={newPlan.title}
                onChange={(e) => {
                  setNewPlan({...newPlan, title: e.target.value});
                  planValidation.clearFieldError('title');
                }}
              />
              {planValidation.errors.title && (
                <FormFieldError message={planValidation.errors.title} />
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea 
                placeholder="Detailed description of the treatment plan" 
                value={newPlan.description}
                onChange={(e) => {
                  setNewPlan({...newPlan, description: e.target.value});
                  planValidation.clearFieldError('description');
                }}
                rows={3}
              />
              {planValidation.errors.description && (
                <FormFieldError message={planValidation.errors.description} />
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input 
                  type="date" 
                  value={newPlan.start_date}
                  onChange={(e) => {
                    setNewPlan({...newPlan, start_date: e.target.value});
                    planValidation.clearFieldError('start_date');
                  }}
                />
                {planValidation.errors.start_date && (
                  <FormFieldError message={planValidation.errors.start_date} />
                )}
              </div>
              
              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Input 
                  type="date"
                  value={newPlan.end_date}
                  onChange={(e) => setNewPlan({...newPlan, end_date: e.target.value})}
                  min={newPlan.start_date}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={newPlan.status} 
                  onValueChange={(value) => setNewPlan({...newPlan, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={newPlan.priority} 
                  onValueChange={(value) => setNewPlan({...newPlan, priority: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Estimated Total Cost ($)</Label>
              <Input 
                type="number"
                placeholder="0.00"
                value={newPlan.estimated_cost}
                onChange={(e) => setNewPlan({...newPlan, estimated_cost: e.target.value})}
                min="0"
                step="0.01"
              />
              {planValidation.errors.estimated_cost && (
                <FormFieldError message={planValidation.errors.estimated_cost} />
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPlanDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePlan} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Treatment Plan Details Dialog */}
      <Dialog 
        open={showPlanDetailsDialog} 
        onOpenChange={setShowPlanDetailsDialog}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Treatment Plan Details</DialogTitle>
            {selectedPlan && (
              <DialogDescription>
                Created on {format(new Date(selectedPlan.created_at), 'MMMM d, yyyy')}
              </DialogDescription>
            )}
          </DialogHeader>
          
          {selectedPlan && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">{selectedPlan.title}</h2>
                  <p className="text-sm text-muted-foreground">{selectedPlan.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {renderStatusBadge(selectedPlan.status)}
                  {selectedPlan.priority && renderPriorityBadge(selectedPlan.priority)}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Patient</p>
                      <p>{selectedPlan.patientName}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={() => {
                        // Navigate to patient details
                        navigate(`/patients/${selectedPlan.patient_id}`);
                      }}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Timeframe</p>
                      <p>
                        {format(new Date(selectedPlan.start_date), 'MMMM d, yyyy')}
                        {selectedPlan.end_date && ` to ${format(new Date(selectedPlan.end_date), 'MMMM d, yyyy')}`}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Total Cost</p>
                      <p>{formatCurrency(selectedPlan.totalCost)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Progress</p>
                      <div className="flex items-center gap-2">
                        <Progress value={selectedPlan.progress} className="flex-1" />
                        <span className="text-sm">{selectedPlan.progress}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Treatments</h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={refreshSelectedPlan}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Refresh
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setNewTreatment({
                          ...newTreatment,
                          plan_id: selectedPlan.id
                        });
                        treatmentValidation.clearErrors();
                        setShowAddTreatmentDialog(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Treatment
                    </Button>
                  </div>
                </div>
                
                {selectedPlan.treatments && selectedPlan.treatments.length > 0 ? (
                  <div className="space-y-3">
                    {selectedPlan.treatments.map((treatment: any) => (
                      <div key={treatment.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{treatment.type}</h4>
                            <p className="text-sm text-muted-foreground">{treatment.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderStatusBadge(treatment.status)}
                            {treatment.priority && renderPriorityBadge(treatment.priority)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm">Cost: {formatCurrency(treatment.cost)}</p>
                          </div>
                          
                          {treatment.estimated_duration && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <p className="text-sm">Duration: {treatment.estimated_duration}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-end gap-2 mt-4">
                          {treatment.status !== 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateTreatmentStatus(treatment.id, 'completed')}
                              disabled={updatingTreatmentStatus}
                            >
                              {updatingTreatmentStatus ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3 mr-1" />
                              )}
                              Mark Complete
                            </Button>
                          )}
                          
                          {treatment.status !== 'cancelled' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateTreatmentStatus(treatment.id, 'cancelled')}
                              disabled={updatingTreatmentStatus}
                            >
                              {updatingTreatmentStatus ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <X className="h-3 w-3 mr-1" />
                              )}
                              Cancel
                            </Button>
                          )}
                          
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteTreatment(treatment.id)}
                            disabled={loading}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border rounded-lg">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No treatments added yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => {
                        setNewTreatment({
                          ...newTreatment,
                          plan_id: selectedPlan.id
                        });
                        treatmentValidation.clearErrors();
                        setShowAddTreatmentDialog(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add First Treatment
                    </Button>
                  </div>
                )}
              </div>
              
              <Tabs defaultValue="treatments" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="treatments">Additional Information</TabsTrigger>
                  <TabsTrigger value="financial">Financial Information</TabsTrigger>
                </TabsList>
                <TabsContent value="treatments" className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium">Notes</h4>
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedPlan.notes || "No additional notes for this treatment plan."}
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="financial" className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium">Financial Summary</h4>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Total Treatment Cost:</span>
                        <span className="font-medium">{formatCurrency(selectedPlan.totalCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Insurance Coverage (Est.):</span>
                        <span className="font-medium">$0.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Patient Responsibility:</span>
                        <span className="font-medium">{formatCurrency(selectedPlan.totalCost)}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              <DialogFooter className="flex justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => handleDeletePlan(selectedPlan.id)}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1" />
                    )}
                    Delete Plan
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  {selectedPlan.status !== 'in_progress' && selectedPlan.status !== 'cancelled' && (
                    <Button
                      variant="outline"
                      onClick={() => handleUpdatePlanStatus(selectedPlan.id, 'in_progress')}
                      disabled={updatingPlanStatus}
                    >
                      {updatingPlanStatus ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Clock className="h-4 w-4 mr-1" />
                      )}
                      Start Treatment
                    </Button>
                  )}
                  
                  {selectedPlan.status !== 'completed' && selectedPlan.status !== 'cancelled' && (
                    <Button
                      variant="outline"
                      onClick={() => handleUpdatePlanStatus(selectedPlan.id, 'completed')}
                      disabled={updatingPlanStatus}
                    >
                      {updatingPlanStatus ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Mark Completed
                    </Button>
                  )}
                  
                  <Button
                    variant="secondary"
                    onClick={() => setShowPlanDetailsDialog(false)}
                  >
                    Close
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Add Treatment Dialog */}
      <Dialog 
        open={showAddTreatmentDialog} 
        onOpenChange={setShowAddTreatmentDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Treatment</DialogTitle>
            <DialogDescription>
              Add a treatment procedure to the plan
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Treatment Type *</Label>
              <Input 
                placeholder="e.g., Root Canal, Filling, Crown" 
                value={newTreatment.type}
                onChange={(e) => {
                  setNewTreatment({...newTreatment, type: e.target.value});
                  treatmentValidation.clearFieldError('type');
                }}
              />
              {treatmentValidation.errors.type && (
                <FormFieldError message={treatmentValidation.errors.type} />
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea 
                placeholder="Detailed description of the treatment" 
                value={newTreatment.description}
                onChange={(e) => {
                  setNewTreatment({...newTreatment, description: e.target.value});
                  treatmentValidation.clearFieldError('description');
                }}
                rows={3}
              />
              {treatmentValidation.errors.description && (
                <FormFieldError message={treatmentValidation.errors.description} />
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost ($) *</Label>
                <Input 
                  type="number"
                  placeholder="0.00"
                  value={newTreatment.cost}
                  onChange={(e) => {
                    setNewTreatment({...newTreatment, cost: e.target.value});
                    treatmentValidation.clearFieldError('cost');
                  }}
                  min="0"
                  step="0.01"
                />
                {treatmentValidation.errors.cost && (
                  <FormFieldError message={treatmentValidation.errors.cost} />
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Estimated Duration</Label>
                <Input 
                  placeholder="e.g., 1 hour" 
                  value={newTreatment.estimated_duration}
                  onChange={(e) => setNewTreatment({...newTreatment, estimated_duration: e.target.value})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={newTreatment.status} 
                  onValueChange={(value) => setNewTreatment({...newTreatment, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={newTreatment.priority} 
                  onValueChange={(value) => setNewTreatment({...newTreatment, priority: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAddTreatmentDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddTreatment}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add Treatment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Conflict Resolution Dialog */}
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              <span>Data Conflict Detected</span>
            </DialogTitle>
            <DialogDescription>
              Your changes conflict with updates made by another user.
              Please choose how to resolve this conflict.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Concurrent Edit Detected
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Another user has modified this {conflictData?.type} while you were editing it.
                      Please choose whether to save your changes or use the latest data from the server.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => resolveConflict(true)}
            >
              Use Server Data
            </Button>
            <Button
              onClick={() => resolveConflict(false)}
            >
              Save My Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}