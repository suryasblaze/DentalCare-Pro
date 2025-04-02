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
import { AITreatmentGenerator } from '@/components/AITreatmentGenerator';
import { TreatmentPlanCard } from '@/components/TreatmentPlanCard'; // Added import
import { z } from 'zod';
import {
  Plus, Search, Calendar, CreditCard, FileText, User, ChevronRight, Pencil, Trash2, Check, Clock, Wallet, ArrowUpRight, Stethoscope, Loader2, RefreshCw, AlertCircle, X
} from 'lucide-react';

// Import Database type
import type { Database, Json } from '@/lib/database.types'; // Added Json type

// Define specific types based on generated types
type PatientRow = Database['public']['Tables']['patients']['Row'];
// Use the generated TreatmentPlanRow which has the 'plan' JSON field
type GeneratedTreatmentPlanRow = Database['public']['Tables']['treatment_plans']['Row'];
type TreatmentRow = Database['public']['Tables']['treatments']['Row'];

// Define a type for TreatmentPlan combining the generated row and calculated/processed fields
// Assuming title, description, start_date etc. are DIRECT columns on treatment_plans table
type TreatmentPlanWithDetails = GeneratedTreatmentPlanRow & {
  // Remove the nested 'plan' assumption
  // title, description, start_date, end_date, status, priority, estimated_cost are assumed to be direct properties of GeneratedTreatmentPlanRow
  treatments: TreatmentRow[] | null; // Store fetched/added treatments
  patientName: string; // Calculated field
  totalCost: number; // Calculated field
  progress: number; // Calculated field
  completedTreatments: number; // Calculated field
  totalTreatments: number; // Calculated field
};

// Validation schemas
// Schema for the data sent to the API (FLAT structure)
const treatmentPlanApiSchema = z.object({
  patient_id: z.string().min(1, "Patient is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional().nullable(),
  status: z.enum(["planned", "in_progress", "completed", "cancelled"]),
  priority: z.enum(["low", "medium", "high"]),
  estimated_cost: z.number().nullable().optional(), // Keep as number for validation
});


const treatmentSchema = z.object({
  type: z.string().min(1, "Treatment type is required"),
  description: z.string().min(1, "Description is required"),
  status: z.enum(["pending", "completed", "cancelled"]),
  cost: z.number().min(0, "Cost must be zero or positive"), // Expect number
  estimated_duration: z.string().optional().nullable(), // Allow null
  priority: z.enum(["low", "medium", "high"]),
  plan_id: z.string().min(1)
});

// Define input state types separately if needed, or handle conversion before validation
// Input state for the new plan form - keep flat for easier form handling
interface NewPlanInputState {
    title: string;
    description: string;
    patient_id: string;
    start_date: string;
    end_date: string;
    // Use status/priority types directly from the table definition if available, or keep as string enums
    status: "planned" | "in_progress" | "completed" | "cancelled";
    priority: "low" | "medium" | "high";
    estimated_cost: string; // Keep as string for input field
}

interface NewTreatmentInputState {
    type: string;
    description: string;
    status: TreatmentRow['status']; // Status comes directly from TreatmentRow
    cost: string; // Keep as string for input field
    estimated_duration: string;
    priority: TreatmentRow['priority'];
    plan_id: string;
}


export function TreatmentPlans() {
  // Hooks must be called inside the component body
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlanWithDetails[]>([]); // Use updated type
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showNewPlanDialog, setShowNewPlanDialog] = useState(false);
  const [showPlanDetailsDialog, setShowPlanDetailsDialog] = useState(false);
  const [showAddTreatmentDialog, setShowAddTreatmentDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlanWithDetails | null>(null); // Use updated type
  const [optimisticData, setOptimisticData] = useState<{
    plans: TreatmentPlanWithDetails[] | null;
    selectedPlan: TreatmentPlanWithDetails | null;
  }>({ plans: null, selectedPlan: null });
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState<{
    localChanges: any;
    serverData: any;
    type: 'plan' | 'treatment';
    id: string;
  } | null>(null);
  const [selectedPatientIdForAI, setSelectedPatientIdForAI] = useState<string | null>(null);

  // Form state using defined interfaces
  const [newPlan, setNewPlan] = useState<NewPlanInputState>({
    title: '',
    description: '',
    patient_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    status: 'planned', // No need to cast if type matches
    priority: 'medium', // No need to cast if type matches
    estimated_cost: ''
  });

  const [newTreatment, setNewTreatment] = useState<NewTreatmentInputState>({
    type: '',
    description: '',
    status: 'pending' as TreatmentRow['status'], // Cast initial state
    cost: '',
    estimated_duration: '',
    priority: 'medium' as TreatmentRow['priority'], // Cast initial state
    plan_id: ''
  });

  // Form validation
  const planValidation = useFormValidation<z.infer<typeof treatmentPlanApiSchema>>(treatmentPlanApiSchema);
  const treatmentValidation = useFormValidation<z.infer<typeof treatmentSchema>>(treatmentSchema);

  // Subscribe to real-time updates
  const treatmentPlansSubscribed = useRealTimeSubscription('treatment_plans', () => {
    fetchData();
  });

  const treatmentsSubscribed = useRealTimeSubscription('treatments', (payload) => {
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
        toast({ title: "Update Failed", description: "Failed to update treatment status.", variant: "destructive" });
        if (selectedPlan && optimisticData.selectedPlan) setSelectedPlan({ ...optimisticData.selectedPlan });
      }
    }
  );

  // Optimistic update for plan status (assuming flat structure for update)
  const { update: updatePlanStatus, loading: updatingPlanStatus } = useOptimisticUpdate(
    (data: { planId: string; updatedFields: Partial<GeneratedTreatmentPlanRow> }) => // Update with partial flat fields
      api.patients.updateTreatmentPlan(data.planId, data.updatedFields),
    {
      onError: (error) => { // Correct onError signature
        console.error("Failed to update plan status:", error);
        toast({ title: "Update Failed", description: "Failed to update plan status.", variant: "destructive" });
        // Revert optimistic update - Need access to variables, maybe store them temporarily?
        // For now, just revert the list simply. A more robust revert might be needed.
        if (optimisticData.plans) setTreatmentPlans([...optimisticData.plans]);
        // Reverting selectedPlan is tricky without variables here. Fetching might be safer.
        if (selectedPlan && optimisticData.selectedPlan) { // Basic revert attempt
             setSelectedPlan({...optimisticData.selectedPlan});
        }
      }
    }
  );

  // Define fetchData before useEffect uses it
  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansData, patientsData] = await Promise.all([
        api.patients.getTreatmentPlans(null), // Assuming this fetches plans with treatments nested or joined
        api.patients.getAll()
      ]);

      const plansTyped = plansData as GeneratedTreatmentPlanRow[]; // Use correct type
      const patientsTyped = patientsData as PatientRow[];

      // Process plans, assuming flat structure
      const processedPlans = plansTyped.map((plan: GeneratedTreatmentPlanRow) => {
        const patientInfo = patientsTyped.find((p) => p.id === plan.patient_id);
        // Assuming treatments are fetched separately or joined correctly by the API call
        const treatmentsArray = (plan as any).treatments || []; // Keep treatment fetching logic

        const totalCost = treatmentsArray.reduce((sum: number, t: TreatmentRow) => sum + (t.cost ?? 0), 0);
        const completedTreatments = treatmentsArray.filter((t: TreatmentRow) => t.status === 'completed').length;
        const totalTreatments = treatmentsArray.length;
        const progress = totalTreatments > 0 ? Math.round((completedTreatments / totalTreatments) * 100) : 0;

        // Construct the TreatmentPlanWithDetails object (now flat)
        const planWithDetails: TreatmentPlanWithDetails = {
          ...plan, // Spread the original row data (which includes title, desc, etc.)
          treatments: treatmentsArray, // Assign fetched/added treatments
          patientName: patientInfo ? `${patientInfo.first_name} ${patientInfo.last_name}` : 'Unknown Patient',
          totalCost: totalCost ?? 0, // Assign calculated fields
          progress: progress ?? 0,
          completedTreatments: completedTreatments ?? 0,
          totalTreatments: totalTreatments ?? 0
        };
        return planWithDetails;
      });


      setTreatmentPlans(processedPlans);
      setPatients(patientsTyped);

      if (selectedPlan) {
        const updatedPlan = processedPlans.find((p) => p.id === selectedPlan.id);
        if (updatedPlan) {
          setSelectedPlan(updatedPlan);
        } else {
           setSelectedPlan(null);
           setShowPlanDetailsDialog(false);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Error", description: "Failed to load treatment plans", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

   useEffect(() => {
    fetchData();
  }, []);

  const refreshSelectedPlan = async () => {
    if (!selectedPlan) return;
    // Rely on fetchData to refresh the list which will update the selectedPlan if it still exists
    await fetchData();
    // Check if the plan still exists after fetch
    const planStillExists = treatmentPlans.some(p => p.id === selectedPlan.id);
    if (!planStillExists) {
        setSelectedPlan(null);
        setShowPlanDetailsDialog(false);
        toast({ title: "Info", description: "Selected plan may have been deleted." });
    }
  };

  const filterPlans = () => {
    return treatmentPlans.filter(plan => {
      const lowerSearchQuery = searchQuery.toLowerCase();
      // Access properties directly from the plan object
      const matchesSearch = searchQuery ?
        (plan.title?.toLowerCase().includes(lowerSearchQuery) ||
         plan.description?.toLowerCase().includes(lowerSearchQuery) ||
         plan.patientName?.toLowerCase().includes(lowerSearchQuery)) :
        true;

      const matchesPatient = !selectedPatient || selectedPatient === 'all' || plan.patient_id === selectedPatient;
      const matchesStatus = !filterStatus || filterStatus === 'all' || plan.status === filterStatus; // Access status directly

      return matchesSearch && matchesPatient && matchesStatus;
    });
  };

  const handleCreatePlan = async () => {
    // 1. Construct the FLAT data object from the form state
    const dataToValidate: z.infer<typeof treatmentPlanApiSchema> = {
      patient_id: newPlan.patient_id,
      title: newPlan.title,
      description: newPlan.description,
      start_date: newPlan.start_date,
      end_date: newPlan.end_date || null,
      status: newPlan.status,
      priority: newPlan.priority,
      // Convert cost string to number for validation
      estimated_cost: newPlan.estimated_cost ? parseFloat(newPlan.estimated_cost) : null,
    };

    // 2. Validate the flat data structure
    const validationResult = planValidation.validate(dataToValidate);

    if (!validationResult.isValid || !validationResult.data) {
      console.error("Plan validation failed:", planValidation.errors);
      toast({ title: "Validation Error", description: "Please check the form fields.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      // 3. Send the validated, FLAT data to the API.
      const createdPlan = await api.patients.createTreatmentPlan(validationResult.data);

      toast({ title: "Success", description: "Treatment plan created successfully" });

      // Reset flat form state
      setNewPlan({
        title: '', description: '', patient_id: '',
        start_date: format(new Date(), 'yyyy-MM-dd'), end_date: '',
        status: 'planned', // Reset to default
        priority: 'medium', // Reset to default
        estimated_cost: ''
      });
      setShowNewPlanDialog(false);

      await fetchData(); // Refresh list

      // Find the newly created plan in the refreshed list
       const newlyFetchedPlan = treatmentPlans.find(p => p.id === createdPlan.id);
       if (newlyFetchedPlan) {
          setSelectedPlan(newlyFetchedPlan);
          setShowPlanDetailsDialog(true);
       }
       // Optional: Handle case where it might not be found immediately (race condition?)

    } catch (error) {
      console.error('Error creating treatment plan:', error);
      toast({ title: "Error", description: "Failed to create treatment plan", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTreatment = async () => {
     // Convert cost string to number before validation
     const dataToValidate = {
        ...newTreatment,
        cost: parseFloat(newTreatment.cost), // Convert string cost to number
        estimated_duration: newTreatment.estimated_duration || null, // Ensure null if empty
     };
    const validationResult = treatmentValidation.validate(dataToValidate);

    if (!validationResult.isValid || !validationResult.data) {
       console.error("Treatment validation failed:", treatmentValidation.errors);
       toast({ title: "Validation Error", description: "Please check the treatment form fields.", variant: "destructive" });
      return;
    }
    if (!selectedPlan) return;

    setOptimisticData({ ...optimisticData, selectedPlan: { ...selectedPlan } });

    try {
      setLoading(true);

      // Optimistic UI Update using validated data
      const newTreatmentObj: TreatmentRow = {
        id: `temp-${Date.now()}`,
        plan_id: selectedPlan.id,
        type: validationResult.data.type,
        description: validationResult.data.description,
        status: validationResult.data.status,
        cost: validationResult.data.cost, // Already a number from validation
        estimated_duration: validationResult.data.estimated_duration, // Use validated value (string | null)
        priority: validationResult.data.priority,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Add potentially missing properties from TreatmentRow with default values (ensure these exist in TreatmentRow type)
        completion_date: null,
        // notes: null, // Removed as it likely doesn't exist on TreatmentRow
        risks: null,
        benefits: null,
        alternative_options: null, // Make sure this matches TreatmentRow type
        next_review_date: null,
        completion_notes: null,
        assigned_staff_id: null,
        version: null
      };

      // Ensure selectedPlan.treatments is treated as an array
      const currentTreatments = Array.isArray(selectedPlan.treatments) ? selectedPlan.treatments : [];
      const updatedTreatments = [...currentTreatments, newTreatmentObj];
      const newTotalTreatments = updatedTreatments.length;
      const newTotalCost = updatedTreatments.reduce((sum, t) => sum + (t.cost ?? 0), 0);
      const newCompletedTreatments = updatedTreatments.filter(t => t.status === 'completed').length;
      const newProgress = newTotalTreatments > 0 ? Math.round((newCompletedTreatments / newTotalTreatments) * 100) : 0;

      // Ensure the updated plan maintains the correct structure
      const updatedPlan: TreatmentPlanWithDetails = {
        ...selectedPlan, // Spread existing plan data
        treatments: updatedTreatments, // Update treatments
        // Update calculated fields
        totalTreatments: newTotalTreatments,
        totalCost: newTotalCost,
        completedTreatments: newCompletedTreatments,
        progress: newProgress,
      };
      setSelectedPlan(updatedPlan);

      // API Call using validated data
      await api.patients.createTreatment(validationResult.data);

      toast({ title: "Success", description: "Treatment added successfully" });

      setNewTreatment({ // Reset state
        type: '', description: '', status: 'pending', cost: '',
        estimated_duration: '', priority: 'medium', plan_id: ''
      });
      setShowAddTreatmentDialog(false);

      await refreshSelectedPlan();
      await fetchData();

    } catch (error) {
      console.error('Error adding treatment:', error);
      if (optimisticData.selectedPlan) setSelectedPlan(optimisticData.selectedPlan);
      toast({ title: "Error", description: "Failed to add treatment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTreatmentStatus = async (treatmentId: string, newStatus: TreatmentRow['status']) => {
     if (!selectedPlan) return;
    setOptimisticData({ ...optimisticData, selectedPlan: { ...selectedPlan } });

    // Ensure selectedPlan.treatments is treated as an array
    const currentTreatments = Array.isArray(selectedPlan.treatments) ? selectedPlan.treatments : [];
    if (currentTreatments) {
      const updatedTreatments = currentTreatments.map(t =>
        t.id === treatmentId ? { ...t, status: newStatus } : t
      );
      const newCompletedTreatments = updatedTreatments.filter(t => t.status === 'completed').length;
      const newTotalTreatments = updatedTreatments.length;
      const newProgress = newTotalTreatments > 0 ? Math.round((newCompletedTreatments / newTotalTreatments) * 100) : 0;

      // Ensure the updated plan maintains the correct structure
      setSelectedPlan({
        ...selectedPlan, // Spread existing plan data
        treatments: updatedTreatments, // Update treatments
        // Update calculated fields
        completedTreatments: newCompletedTreatments,
        progress: newProgress,
        totalTreatments: newTotalTreatments,
      });
    }

    await updateTreatmentStatus({ treatmentId, newStatus });
  };

  // Update plan status (flat structure)
  const handleUpdatePlanStatus = async (planId: string, newStatus: GeneratedTreatmentPlanRow['status']) => {
    const planToUpdate = treatmentPlans.find(p => p.id === planId);
    if (!planToUpdate) {
        toast({ title: "Error", description: "Plan not found.", variant: "destructive" });
        return;
    }

    // Prepare optimistic update data
    setOptimisticData({ plans: [...treatmentPlans], selectedPlan: selectedPlan ? { ...selectedPlan } : null });

    // Create the updated fields object (only status)
    const updatedFields: Partial<GeneratedTreatmentPlanRow> = {
        status: newStatus,
    };

    // Optimistically update the list
    const updatedPlans = treatmentPlans.map(p =>
      p.id === planId ? { ...p, ...updatedFields } : p // Spread updated fields
    );
    setTreatmentPlans(updatedPlans);

    // Optimistically update the selected plan if it's the one being changed
    if (selectedPlan && selectedPlan.id === planId) {
      setSelectedPlan({ ...selectedPlan, ...updatedFields }); // Spread updated fields
    }

    // Call the hook with the planId and the updated fields object
    await updatePlanStatus({ planId, updatedFields });
  };


  const handleDeleteTreatment = async (treatmentId: string) => {
    if (!confirm('Are you sure you want to delete this treatment?')) return;
    if (!selectedPlan) return;

    setOptimisticData({ ...optimisticData, selectedPlan: { ...selectedPlan } });

    try {
      setLoading(true);

      // Ensure selectedPlan.treatments is treated as an array
      const currentTreatments = Array.isArray(selectedPlan.treatments) ? selectedPlan.treatments : [];
      if (currentTreatments) {
        const updatedTreatments = currentTreatments.filter(t => t.id !== treatmentId);
        const newCompletedTreatments = updatedTreatments.filter(t => t.status === 'completed').length;
        const newTotalTreatments = updatedTreatments.length;
        const newProgress = newTotalTreatments > 0 ? Math.round((newCompletedTreatments / newTotalTreatments) * 100) : 0;
        const newTotalCost = updatedTreatments.reduce((sum, t) => sum + (t.cost ?? 0), 0);

        setSelectedPlan({
          ...selectedPlan,
          treatments: updatedTreatments,
          completedTreatments: newCompletedTreatments,
          totalTreatments: newTotalTreatments,
          progress: newProgress,
          totalCost: newTotalCost,
        });
      }

      await api.patients.deleteTreatment(treatmentId);
      toast({ title: "Success", description: "Treatment deleted successfully" });

      await refreshSelectedPlan();
      await fetchData();

    } catch (error) {
      console.error('Error deleting treatment:', error);
      if (optimisticData.selectedPlan) setSelectedPlan(optimisticData.selectedPlan);
      toast({ title: "Error", description: "Failed to delete treatment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this treatment plan? This will delete all associated treatments.')) return;

    const originalPlans = [...treatmentPlans];
    setOptimisticData({ ...optimisticData, plans: originalPlans });

    try {
      setLoading(true);

      const updatedPlans = treatmentPlans.filter(plan => plan.id !== planId);
      setTreatmentPlans(updatedPlans);

      if (selectedPlan && selectedPlan.id === planId) {
        setShowPlanDetailsDialog(false);
        setSelectedPlan(null);
      }

      await api.patients.deleteTreatmentPlan(planId);
      toast({ title: "Success", description: "Treatment plan deleted successfully" });

    } catch (error) {
      console.error('Error deleting treatment plan:', error);
      setTreatmentPlans(originalPlans);
      toast({ title: "Error", description: "Failed to delete treatment plan", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resolveConflict = async (useServerData: boolean) => {
    if (!conflictData) return;

    try {
      if (conflictData.type === 'plan') {
        if (useServerData) {
          await fetchData();
        } else {
          await api.patients.updateTreatmentPlan(conflictData.id, conflictData.localChanges);
          await fetchData();
        }
      } else if (conflictData.type === 'treatment') {
         // Ensure localChanges matches the expected update structure for treatments
        const treatmentUpdateData = conflictData.localChanges as Partial<TreatmentRow>;
        if (useServerData) {
          await refreshSelectedPlan();
        } else {
          await api.patients.updateTreatment(conflictData.id, treatmentUpdateData);
          await refreshSelectedPlan();
        }
      }

      setConflictData(null);
      setShowConflictDialog(false);
      toast({ title: "Conflict Resolved", description: `Changes ${useServerData ? 'discarded' : 'saved'} successfully` });
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast({ title: "Error", description: "Failed to resolve conflict", variant: "destructive" });
    }
  };

  // Render status badge with appropriate color
  const renderStatusBadge = (status: string | null | undefined) => {
    if (!status) return null;
    let color = 'bg-gray-100 text-gray-800';
    switch (status) {
      case 'planned': color = 'bg-blue-100 text-blue-800'; break;
      case 'in_progress': color = 'bg-yellow-100 text-yellow-800'; break;
      case 'completed': color = 'bg-green-100 text-green-800'; break;
      case 'cancelled': color = 'bg-red-100 text-red-800'; break;
      case 'pending': color = 'bg-purple-100 text-purple-800'; break;
    }
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{status.replace('_', ' ')}</span>;
  };

  // Render priority badge with appropriate color
  const renderPriorityBadge = (priority: string | null | undefined) => {
     if (!priority) return null;
    let color = 'bg-gray-100 text-gray-800';
    switch (priority) {
      case 'low': color = 'bg-green-100 text-green-800'; break;
      case 'medium': color = 'bg-yellow-100 text-yellow-800'; break;
      case 'high': color = 'bg-red-100 text-red-800'; break;
    }
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{priority}</span>;
  };

  return (
    <div className="space-y-6">
      {/* AI Treatment Generator Section */}
      <div className="space-y-4 p-6 border rounded-lg"> {/* Replaced Card with a simple div */}
        <h2 className="text-xl font-semibold">AI Treatment Plan Generation</h2> {/* Added a heading */}
        <div className="space-y-2">
          <Label htmlFor="ai-patient-select">Select Patient</Label>
          <Select
            value={selectedPatientIdForAI || ""}
            onValueChange={(value) => setSelectedPatientIdForAI(value === "none" ? null : value)}
          >
            <SelectTrigger id="ai-patient-select" className="w-full md:w-[300px]">
              <SelectValue placeholder="Select a patient to generate a plan..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- Select Patient --</SelectItem>
              {patients.map((patient: PatientRow) => (
                <SelectItem key={patient.id} value={patient.id}>
                  {patient.first_name} {patient.last_name} (ID: {patient.id.substring(0, 6)}...)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Removed the AITreatmentGenerator rendering from here for now to fix other errors.
            It should likely be triggered by a button and rendered in a Dialog.
        */}
      </div>
      {/* End AI Treatment Generator Section */}

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

          <Select value={selectedPatient || 'all'} onValueChange={(value) => setSelectedPatient(value === 'all' ? null : value)}>
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

          <Select value={filterStatus || 'all'} onValueChange={(value) => setFilterStatus(value === 'all' ? null : value)}>
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
          <TreatmentPlanCard
            key={plan.id}
            plan={plan}
            onViewDetails={(selectedPlan) => {
              setSelectedPlan(selectedPlan);
              setShowPlanDetailsDialog(true);
            }}
          />
        ))}
      </div>

      {/* New Treatment Plan Dialog */}
      <Dialog open={showNewPlanDialog} onOpenChange={setShowNewPlanDialog}>
        {/* Add max-height and vertical scroll */}
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto"> {/* Added max-h and overflow */}
          <DialogHeader>
            <DialogTitle>Create New Treatment Plan</DialogTitle>
            <DialogDescription>
              Create a comprehensive treatment plan for a patient
            </DialogDescription>
          </DialogHeader>

          {/* Add height constraint and scroll to the inner form container */}
          <div className="space-y-4 max-h-[calc(90vh-150px)] overflow-y-auto p-1"> {/* Adjust 150px as needed */}
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
                  value={newPlan.end_date || ''} // Fix: Ensure value is string or undefined
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
                  onValueChange={(value) => setNewPlan({...newPlan, status: value as NewPlanInputState['status']})} // Use type from input state
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
                  onValueChange={(value) => setNewPlan({...newPlan, priority: value as NewPlanInputState['priority']})} // Use type from input state
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
                 // Ensure message is always a string
                <FormFieldError message={String(planValidation.errors.estimated_cost ?? "Invalid cost")} />
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
            {selectedPlan?.created_at && (
              <DialogDescription>
                Created on {format(new Date(selectedPlan.created_at), 'MMMM d, yyyy')}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-6">
              {/* Access properties directly from selectedPlan */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">{selectedPlan.title || 'Untitled Plan'}</h2>
                  <p className="text-sm text-muted-foreground">{selectedPlan.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {renderStatusBadge(selectedPlan.status)}
                  {renderPriorityBadge(selectedPlan.priority)}
                </div>
              </div>

              {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                </div> */}
              {/* End removed div */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Patient</p>
                      <p>{selectedPlan.patientName || 'Unknown Patient'}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={() => {
                        if (selectedPlan?.patient_id) {
                           navigate(`/patients/${selectedPlan.patient_id}`);
                        }
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
                        {selectedPlan.start_date ? format(new Date(selectedPlan.start_date), 'MMM d, yyyy') : 'No start date'}
                        {selectedPlan.end_date && ` to ${format(new Date(selectedPlan.end_date), 'MMM d, yyyy')}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Total Cost</p>
                      <p>{formatCurrency(selectedPlan.totalCost ?? 0)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Progress</p>
                      <div className="flex items-center gap-2">
                        <Progress value={selectedPlan.progress ?? 0} className="flex-1" />
                        <span className="text-sm">{selectedPlan.progress ?? 0}%</span>
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
                        if (selectedPlan?.id) {
                          setNewTreatment({
                            ...newTreatment,
                            plan_id: selectedPlan.id
                          });
                          treatmentValidation.clearErrors();
                          setShowAddTreatmentDialog(true);
                        }
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Treatment
                    </Button>
                  </div>
                </div>

                {selectedPlan.treatments && selectedPlan.treatments.length > 0 ? (
                  <div className="space-y-3">
                    {selectedPlan.treatments.map((treatment: TreatmentRow) => (
                      <div key={treatment.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{treatment.type || 'Untitled Treatment'}</h4>
                            <p className="text-sm text-muted-foreground">{treatment.description || 'No description'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderStatusBadge(treatment.status)}
                            {renderPriorityBadge(treatment.priority)}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm">Cost: {formatCurrency(treatment.cost ?? 0)}</p>
                          </div>
                          {/* Ensure estimated_duration is handled correctly (might be null) */}
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
                         if (selectedPlan?.id) {
                           setNewTreatment({
                             ...newTreatment,
                             plan_id: selectedPlan.id
                           });
                           treatmentValidation.clearErrors();
                           setShowAddTreatmentDialog(true);
                         }
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
                     <p className="text-sm text-muted-foreground mt-2">No additional notes available.</p>
                  </div>
                </TabsContent>
                <TabsContent value="financial" className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium">Financial Summary</h4>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Total Treatment Cost:</span>
                        <span className="font-medium">{formatCurrency(selectedPlan?.totalCost ?? 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Insurance Coverage (Est.):</span>
                        <span className="font-medium">$0.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Patient Responsibility:</span>
                        <span className="font-medium">{formatCurrency(selectedPlan?.totalCost ?? 0)}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="flex justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => { if (selectedPlan?.id) handleDeletePlan(selectedPlan.id); }}
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
                  {/* Access status directly */}
                  {selectedPlan.status !== 'in_progress' && selectedPlan.status !== 'cancelled' && (
                    <Button
                      variant="outline"
                      onClick={() => { if (selectedPlan?.id) handleUpdatePlanStatus(selectedPlan.id, 'in_progress'); }}
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

                  {/* Access status directly */}
                  {selectedPlan.status !== 'completed' && selectedPlan.status !== 'cancelled' && (
                    <Button
                      variant="outline"
                      onClick={() => { if (selectedPlan?.id) handleUpdatePlanStatus(selectedPlan.id, 'completed'); }}
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
                   // Ensure message is always a string
                  <FormFieldError message={String(treatmentValidation.errors.cost ?? "Invalid cost")} />
                )}
              </div>

              <div className="space-y-2">
                <Label>Estimated Duration</Label>
                <Input
                  placeholder="e.g., 1 hour"
                  value={newTreatment.estimated_duration ?? ''} // Ensure value is string for the input
                  onChange={(e) => setNewTreatment({...newTreatment, estimated_duration: e.target.value || null})} // Set state to null if empty
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={newTreatment.status}
                  onValueChange={(value) => setNewTreatment({...newTreatment, status: value as NewTreatmentInputState['status']})} // Use type from input state
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
                  onValueChange={(value) => setNewTreatment({...newTreatment, priority: value as NewTreatmentInputState['priority']})} // Use type from input state
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
    </div> // Closing tag for the main component div
  );
} // Closing brace for the TreatmentPlans component function
