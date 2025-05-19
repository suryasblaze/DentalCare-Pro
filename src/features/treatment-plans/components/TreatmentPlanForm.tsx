import React, { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Smile, BrainCog, Save } from 'lucide-react'; // Use Smile icon, Add BrainCog, Add Save
import { format, addDays } from 'date-fns';
// Import DentalChart, InitialToothState, ToothCondition, and DentalChartHandle
import DentalChart, { InitialToothState, ToothCondition, DentalChartHandle } from './DentalChart';
import { api } from '@/lib/api'; // Import the api object
import { useToast } from '@/components/ui/use-toast'; // Import useToast
import { AISuggestionForm } from './AISuggestionForm'; // Removed AISuggestion from import
import { Badge } from "@/components/ui/badge"; // May or may not be needed for new accordion display

// Imports for Accordion display from AISuggestionForm.tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from '@/lib/utils'; // cn might already be imported
import { Clock, Calendar } from 'lucide-react'; // Icons for accordion
import { useNavigate } from 'react-router-dom';

// Define schema for treatment plan form
export const treatmentPlanSchema = z.object({
  symptoms: z.string().min(1, "Symptoms are required"),
  description: z.string().min(1, "Description is required"),
  patient_id: z.string().min(1, "Patient is required"),
  domain: z.string().optional(),
  condition: z.string().optional(),
  treatment: z.string().min(1, "Select a treatment").optional(),
  estimated_duration: z.string().optional(),
  total_visits: z.string().optional(),
  materials: z.string().optional(),
  clinical_considerations: z.string().optional(),
  post_treatment_care: z.string().optional(),
  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']).optional(),
  start_date: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  ai_generated: z.boolean().optional(),
  initialTreatments: z.array(z.any()).optional(),
  originalAISuggestion: z.any().optional()
});

export type TreatmentPlanFormValues = z.infer<typeof treatmentPlanSchema>;

interface TreatmentPlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TreatmentPlanFormValues, toothIds: number[]) => Promise<any>;
  patients: any[];
  loading?: boolean;
  initialData?: TreatmentPlanFormValues;
}

interface ToothConditionData {
  tooth_id: number;
  conditions: ToothCondition[];
  patient_id: string;
}

// Add interface for treatment plan item
interface TreatmentPlanItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  appointmentDetails: {
    totalVisits: number;
    completedVisits: number;
    nextVisit?: {
      date: string;
      procedures: string;
      duration: string;
    };
  };
}

// Interface definitions from AISuggestionForm.tsx
interface AppointmentDetail {
  visit: string;
  procedures: string;
  estimatedDuration: string;
  timeGap: string;
}

interface AppointmentPlan {
  totalSittings: string;
  sittingDetails: AppointmentDetail[];
  totalTreatmentTime: string;
  medicalPrecautions?: string;
}

// Updated AISuggestion interface from AISuggestionForm.tsx
export interface AISuggestion {
  title: string;
  description: string; // Corresponds to output.clinicalAssessment
  planDetails: {
    planName: string;
    clinicalProtocol: string;
    keyMaterials: string;
    clinicalConsiderations: string;
    expectedOutcomes: string;
    appointmentPlan?: AppointmentPlan;
    isPatientSelected?: boolean;
  };
  caseOverview?: {
    condition: string; // Domain from our form
    severity: string; // From matrix
    teethInvolved: string; // toothIds from our form
    patientSymptoms?: string; // symptoms from our form
    patientSelectedTreatment?: string; // treatment from our form
  };
  patientFactors?: {
    relevantMedicalConditions: string;
    medicationConsiderations: string;
    ageRelatedConsiderations: string;
  };
  recommendedInvestigations?: string;
  clinicalRationale?: string;
  postTreatmentCare: string;
}

interface BookedAppointment {
  treatment_id: string;
  status: string;
  start_time: string;
  staff?: {
    first_name?: string;
    last_name?: string;
  };
}

export function TreatmentPlanForm({
  open,
  onOpenChange,
  onSubmit,
  patients,
  loading = false,
  initialData,
}: TreatmentPlanFormProps) {
  // State for patient search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState<string | null>(null);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [errorPatients, setErrorPatients] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientRecord, setSelectedPatientRecord] = useState<any | null>(null); // Added state for full patient record
  const [isLoadingPatientDetails, setIsLoadingPatientDetails] = useState(false); // Added state for loading full patient details

  // State for selected teeth IDs (confirmed from dialog)
  const [selectedToothIds, setSelectedToothIds] = useState<number[]>([]);
  // State for the Dental Chart Dialog visibility
  const [isChartDialogOpen, setIsChartDialogOpen] = useState(false);
  // Temporary state for selection within the dialog
  const [dialogSelectedToothIds, setDialogSelectedToothIds] = useState<number[]>([]);
  // Key to force DentalChart re-mount on dialog open
  const [chartDialogKey, setChartDialogKey] = useState(Date.now());
  // State to hold the initial state for the chart when the dialog opens
  const [chartInitialState, setChartInitialState] = useState<InitialToothState>({});
  // Optional: State to hold chart data including conditions if needed across dialog openings
  // const [chartState, setChartState] = useState<InitialToothState>({});
  // State for dropdown options
  const [matrixOptions, setMatrixOptions] = useState<{ domain: string; condition: string }[]>([]); // Store fetched pairs
  const [domains, setDomains] = useState<string[]>([]); // Unique domains derived from pairs
  const [filteredConditions, setFilteredConditions] = useState<string[]>([]); // Conditions filtered by selected domain
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  // State for the fetched matrix details based on selection
  const [matrixDetails, setMatrixDetails] = useState<any | null>(null); // Using any due to TS issues
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  // State for AI suggestions
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]); // USE THE NEW DETAILED INTERFACE
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isSavingChart, setIsSavingChart] = useState(false); // State for saving indicator
  const [selectedAISuggestionForSubmit, setSelectedAISuggestionForSubmit] = useState<AISuggestion | null>(null); // New state for applied AI suggestion
  const [conditionAppliedInChart, setConditionAppliedInChart] = useState<string | null>(null); // New state

  const { toast } = useToast(); // Initialize toast
  const dentalChartRef = useRef<DentalChartHandle>(null); // Ref for DentalChart component
  const navigate = useNavigate();

  const form = useForm<TreatmentPlanFormValues>({
    resolver: zodResolver(treatmentPlanSchema),
    defaultValues: initialData || {
      symptoms: '',
      description: '',
      patient_id: '',
      domain: '',
      condition: '',
      treatment: '',
      estimated_duration: '',
      total_visits: '',
      materials: '',
      clinical_considerations: '',
      post_treatment_care: '',
      status: 'planned',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      priority: 'medium',
      ai_generated: false,
      initialTreatments: [],
      originalAISuggestion: null
    }
  });

  // Reset form and selected teeth when main dialog closes/opens
  useEffect(() => {
    if (!open) {
      setSelectedToothIds([]); // Reset confirmed teeth selection
      setSelectedPatientId(null);
      setSelectedPatientName(null);
      setSearchTerm('');
      setMatrixDetails(null); // Clear matrix details
      setAiSuggestions([]); // Clear AI suggestions
      setIsGeneratingSuggestions(false); // Reset AI loading state
      setSelectedPatientRecord(null); // Reset patient record
      setSelectedAISuggestionForSubmit(null); // Reset applied AI suggestion
      setIsLoadingPatientDetails(false); // Reset patient details loading state
      form.reset();
      setIsChartDialogOpen(false); // Ensure chart dialog is closed too
      setDialogSelectedToothIds([]); // Reset temporary selection
    } else {
       form.reset({
         symptoms: '',
         description: '',
         patient_id: selectedPatientId || '',
         domain: '',
         condition: '',
         treatment: '',
         estimated_duration: '',
         total_visits: '',
         materials: '',
         clinical_considerations: '',
         post_treatment_care: '',
       });
       // Keep selectedToothIds as they might be relevant if reopening for edit
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedPatientId]); // Removed form and setters from deps as they are stable

  // Fetch domain and condition options when the dialog opens
  useEffect(() => {
    if (open) {
      const fetchOptions = async () => {
        setIsLoadingOptions(true);
        try {
          const optionsPairs = await api.getTreatmentMatrixOptions();
          setMatrixOptions(optionsPairs); // Store all pairs
          // Derive unique domains
          const uniqueDomains = [...new Set(optionsPairs.map(p => p.domain))].sort();
          setDomains(uniqueDomains);
          // Initially, no conditions are filtered
          setFilteredConditions([]);
        } catch (error) {
          console.error("Failed to fetch treatment options:", error);
          // Optionally show an error message to the user
        } finally {
          setIsLoadingOptions(false);
        }
      };
      fetchOptions();
    }
  }, [open]);

  // Watch form values for domain and condition
  const selectedDomain = form.watch('domain');

  // Update filtered conditions when selectedDomain changes
  useEffect(() => {
    console.log(`Domain changed to: ${selectedDomain}. Full matrix options:`, matrixOptions); // Log domain change and options
    if (selectedDomain) {
      const relatedConditions = matrixOptions
        .filter(p => p.domain === selectedDomain)
        .map(p => p.condition)
        .sort();
      console.log(`Filtered conditions for ${selectedDomain}:`, relatedConditions); // Log filtered conditions
      setFilteredConditions(relatedConditions);
    } else {
      setFilteredConditions([]);
      setMatrixDetails(null);
      setAiSuggestions([]);
    }
  }, [selectedDomain, matrixOptions, form]);

  // useEffect to fetch matrix details when domain and conditionAppliedInChart change
  useEffect(() => {
    if (!selectedDomain || !conditionAppliedInChart) {
      setMatrixDetails(null);
      // Reset related form fields if domain/condition changes and details are cleared
      // form.setValue('treatment', ''); // Keep existing treatment if user typed something
      // form.setValue('symptoms', '');
      // form.setValue('description', '');
      return;
    }

    const fetchDetails = async () => {
      setIsLoadingDetails(true);
      try {
        console.log(`Fetching matrix details for Domain: ${selectedDomain}, Condition: ${conditionAppliedInChart}`);
        // Corrected API call based on the definition found in src/lib/api.ts
        const details = await api.getMatrixDetails(selectedDomain, conditionAppliedInChart); 
        setMatrixDetails(details);
        // Pre-filling logic adjusted based on actual available fields in 'details' object
        // The 'details' object provides: urgency, severity, risk_impact, recommended_investigations, treatment_options
        // It does NOT provide: treatment_title, default_symptoms, default_description, default_duration_weeks, default_visits

        // If there are treatment_options, and the form's treatment field is empty, 
        // we could potentially set the first option as default, but this might be too presumptive.
        // For now, let user/AI fill the main 'treatment' field based on these options.
        // Example: if (details?.treatment_options?.[0] && !form.getValues('treatment')) {
        //   form.setValue('treatment', details.treatment_options[0]);
        // }

      } catch (error) {
        console.error("Failed to fetch matrix details:", error);
        setMatrixDetails(null);
        toast({ title: "Error", description: "Could not load details for the selected domain/condition.", variant: "destructive" });
      } finally {
        setIsLoadingDetails(false);
      }
    };
    fetchDetails();
  }, [selectedDomain, conditionAppliedInChart, form, toast]);

  const handleDomainChange = (value: string) => {
    form.setValue('domain', value);
    setMatrixDetails(null);
    setAiSuggestions([]);
    // Filtered conditions will be updated by the useEffect watching selectedDomain
  };

  // handleConditionChange is no longer needed for the main form
  /* const handleConditionChange = (value: string) => {
    form.setValue('condition', value);
    // Fetching details is handled by useEffect
  }; */

  const handlePatientSelect = async (patient: any) => {
    setSelectedPatientId(patient.id);
    setSelectedPatientName(`${patient.first_name || ''} ${patient.last_name || ''}`.trim());
    // setSelectedPatientRecord(patient); // Store the full patient object - Will be set after fetching full details
    form.setValue('patient_id', patient.id, { shouldValidate: true });
    setSearchTerm('');
    setChartInitialState({}); // Clear previous patient's chart state immediately
    setSelectedToothIds([]); // Clear selected teeth for the new patient
    setSelectedPatientRecord(null); // Clear previous full patient record
    setIsLoadingPatientDetails(true);

    try {
      // Fetch full patient details
      console.log(`Fetching full patient details for patient: ${patient.id}`);
      // IMPORTANT: Assume api.patients.getPatientDetails(id) exists and returns the full record.
      // You might need to adjust this API call based on your actual API structure.
      const fullPatientRecord = await api.patients.getById(patient.id); 
      setSelectedPatientRecord(fullPatientRecord);
      console.log("Fetched full patient record:", fullPatientRecord);

      // Fetch existing tooth conditions for the selected patient
      console.log(`Fetching tooth conditions for patient: ${patient.id}`);
      const conditionsData = await api.patients.getPatientToothConditions(patient.id);
      console.log("Fetched conditions data:", conditionsData);

      // Format the fetched data and determine initial selection
      const formattedInitialState: InitialToothState = {};
      const initiallySelectedIds: number[] = []; // Store IDs to be initially selected

      conditionsData.forEach(item => {
        // Update the conditions handling
        const validConditions = Array.isArray(item.conditions)
          ? (item.conditions as unknown[]).filter((c): c is ToothCondition => 
              typeof c === 'string' && [
                'healthy',
                'decayed',
                'filled',
                'missing',
                'treatment-planned',
                'root-canal',
                'extraction',
                'crown',
                'has-treatment-before',
                'recommended-to-be-treated'
              ].includes(c)
            )
          : [];

        const finalConditions = validConditions.length > 0 ? validConditions : ['healthy' as ToothCondition];
        const isInitiallySelected = finalConditions.length > 1 || (finalConditions.length === 1 && finalConditions[0] !== 'healthy');

        if (item.tooth_id) { // Check if tooth_id is not null
          formattedInitialState[item.tooth_id] = {
            conditions: finalConditions,
            isSelected: isInitiallySelected // Set selection based on conditions
          };
          if (isInitiallySelected) {
            initiallySelectedIds.push(item.tooth_id); // Add to list if selected
          }
        }
      });

      console.log("Formatted initialState for chart:", formattedInitialState);
      console.log("Initially selected IDs based on conditions:", initiallySelectedIds);

      setChartInitialState(formattedInitialState); // Set the state to be used when opening the dialog
      setSelectedToothIds(initiallySelectedIds); // Update the main display of selected teeth
      // No need to set dialogSelectedToothIds here, it's set when the dialog opens

    } catch (error) {
      console.error("Failed to fetch patient details or tooth conditions:", error);
      toast({
        title: "Error Loading Patient Data",
        description: "Could not load patient details or tooth conditions.",
        variant: "destructive",
      });
      setSelectedPatientRecord(null); // Clear record on error
      setChartInitialState({}); // Reset to empty on error
      setSelectedToothIds([]);
    } finally {
      setIsLoadingPatientDetails(false);
    }
  };

  // Handler for selection changes *inside* the dental chart dialog
  const handleDialogChartSelectionChange = (selectedIds: number[]) => {
    setDialogSelectedToothIds(selectedIds);
    // If tracking conditions: update temporary chart state here
  };

  // Handler for confirming the selection from the dialog - SAVE DATA HERE
  const handleConfirmChartSelection = async () => {
    if (!dentalChartRef.current || !selectedPatientId) {
      console.error("Dental chart ref not available or no patient selected.");
      toast({
        title: "Error",
        description: "Could not save chart data. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingChart(true);
    try {
      // 1. Get the current state from the DentalChart component via ref
      const currentChartState = dentalChartRef.current.getTeethData();
      const lastActiveConditionInChart = dentalChartRef.current.getLastActiveCondition();
      console.log("Data from chart ref:", currentChartState);
      console.log("Last active condition from chart ref:", lastActiveConditionInChart);

      // 2. Transform the data into the format expected by the API
      // Convert single condition to array format for the database
      const conditionsToSave: ToothConditionData[] = Object.entries(currentChartState)
        .filter(([, toothData]) => {
          return toothData.isSelected && toothData.condition !== 'healthy';
        })
        .map(([toothIdStr, toothData]) => ({
          tooth_id: parseInt(toothIdStr, 10),
          conditions: [toothData.condition], // Convert single condition to array
          patient_id: selectedPatientId,
        }));

      console.log("Filtered and transformed data to save:", conditionsToSave);

      // 3. Call the API function to save the data
      await api.patients.savePatientToothConditionsDetailed(selectedPatientId, conditionsToSave);

      // 4. Update the local state
      const currentSelectedIds = Object.entries(currentChartState)
        .filter(([, data]) => data.isSelected)
        .map(([id]) => parseInt(id, 10));
      setSelectedToothIds(currentSelectedIds);

      // Update chartInitialState to reflect the saved state
      const formattedSavedState: InitialToothState = {};
      Object.entries(currentChartState).forEach(([id, data]) => {
        formattedSavedState[parseInt(id, 10)] = {
          condition: data.condition,
          conditions: [data.condition], // Add conditions array for database compatibility
          isSelected: data.isSelected
        };
      });
      setChartInitialState(formattedSavedState);

      // Set the condition applied in chart
      if (lastActiveConditionInChart) {
        setConditionAppliedInChart(lastActiveConditionInChart);
      } else {
        const firstSelectedToothWithCondition = Object.values(currentChartState).find(td => 
          td.isSelected && td.condition !== 'healthy'
        );
        setConditionAppliedInChart(firstSelectedToothWithCondition?.condition || null);
      }

      toast({
        title: "Chart Saved",
        description: "Patient's tooth conditions have been updated.",
        variant: "default",
      });
      setIsChartDialogOpen(false);

    } catch (error) {
      console.error("Failed to save tooth conditions:", error);
      toast({
        title: "Save Failed",
        description: "Could not save tooth conditions to the database.",
        variant: "destructive",
      });
    } finally {
      setIsSavingChart(false);
    }
  };

  // Open dialog handler - use fetched initial state, set key, then open
  const openChartDialog = () => {
    if (!selectedPatientId) {
      toast({
        title: "No Patient Selected",
        description: "Please select a patient before opening the dental chart.",
        variant: "default",
      });
      return;
    }
    // chartInitialState should already be populated by handlePatientSelect
    // We just need to ensure the dialog uses it and syncs temporary selections
    console.log("Opening chart dialog with prepared initial state:", chartInitialState);
    // Sync temporary dialog selection state with the initially selected IDs derived from conditions
    setDialogSelectedToothIds([...selectedToothIds]);
    setChartDialogKey(Date.now()); // Generate a new key to force re-mount with potentially new initialState
    setIsChartDialogOpen(true);
  };

  // Add useEffect to log dialog state changes
  useEffect(() => {
    console.log("isChartDialogOpen state changed:", isChartDialogOpen);
  }, [isChartDialogOpen]);

   // Main form submission handler
   const handleSubmit = async (values: TreatmentPlanFormValues) => {
    if (!selectedPatientId) {
      toast({
        title: 'Patient Not Selected',
        description: 'Please select a patient before submitting.',
        variant: 'destructive',
      });
      return;
    }

    let dataForSubmit: any = { ...values };

    // Map symptoms back to title for backend compatibility
    if (dataForSubmit.symptoms) {
      dataForSubmit.title = dataForSubmit.symptoms;
      delete dataForSubmit.symptoms;
    }

    // Remove fields not directly part of the main plan table or used for initial setup
    // but keep ones that might be used by metadata or other related tables if creating a new plan
    delete dataForSubmit.patient_name; // This is for display, patient_id is the fk

    if (selectedAISuggestionForSubmit) {
      dataForSubmit.originalAISuggestion = selectedAISuggestionForSubmit;
      // ai_generated is now handled by useTreatmentPlans based on originalAISuggestion presence
      // dataForSubmit.ai_generated = true; // No longer set here

      // DO NOT create initialTreatments here anymore.
      // These will be handled by TreatmentPlanDetails if the user wants to add them.
      /*
      if (selectedAISuggestionForSubmit.planDetails?.appointmentPlan?.sittingDetails) {
        dataForSubmit.initialTreatments = selectedAISuggestionForSubmit.planDetails.appointmentPlan.sittingDetails.map(
          (sitting, index) => ({
            type: `Visit ${sitting.visit}: ${sitting.procedures.substring(0, 50)}...`,
            description: sitting.procedures,
            status: 'pending',
            priority: 'medium',
            cost: 0, // Default cost, can be updated later
            estimated_duration: sitting.estimatedDuration,
            // plan_id will be set by the service if creating plan + treatments together
          })
        );
      }
      */
    } else {
      dataForSubmit.ai_generated = false;
    }

    // If editing, some fields might not be present in `values` if they weren't changed,
    // so merge with `initialData` for updates, but only if `initialData` exists (i.e., editing an existing plan)
    /*
    if (initialData && initialData.id) {
      dataForSubmit = { ...initialData, ...dataForSubmit, id: initialData.id };
    }
    */
    
    try {
      await onSubmit(dataForSubmit, selectedToothIds); 
      form.reset();
      setSelectedAISuggestionForSubmit(null); 
      onOpenChange(false); 
    } catch (error) {
      console.error("Error submitting treatment plan form:", error);
      toast({
        title: "Submission Error",
        description: "Failed to save the treatment plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to fetch AI suggestions from n8n
  const handleGetAISuggestions = useCallback(async () => {
    if (!selectedPatientId || selectedToothIds.length === 0 || !selectedDomain || !selectedPatientRecord) {
      toast({
        title: "Missing Information",
        description: "Please select patient, teeth (and apply conditions in chart), and domain first.",
        variant: "default",
        duration: 3000,
      });
      return;
    }

    setIsGeneratingSuggestions(true);
    setAiSuggestions([]);

    try {
      const webhookUrl = 'https://n8n1.kol.tel/webhook/2169736a-368b-49b5-b93f-ffc215203d99';
      const payload = {
        patientId: selectedPatientId,
        toothIds: selectedToothIds,
        domain: selectedDomain,
        details: matrixDetails, 
        treatment: form.getValues('treatment'), 
        patientRecord: selectedPatientRecord, 
      };
      console.log("Sending payload to n8n:", payload);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Error response from n8n webhook:', response.status, errorBody);
        throw new Error(`AI suggestion call failed: ${response.status}`);
      }

      const responseData = await response.json();
      console.log("Received response from n8n:", responseData);

      // --- Adapt parsing from AISuggestionForm.tsx ---
      const output = responseData[0]?.output?.response;

      if (!output || !output.treatmentPlans || !Array.isArray(output.treatmentPlans)) {
        console.warn("Invalid AI response structure: treatmentPlans missing or not an array. Response:", responseData);
        setAiSuggestions([]);
        toast({
          title: "AI Response Error",
          description: "The AI returned an unexpected data format.",
          variant: "destructive",
        });
        setIsGeneratingSuggestions(false);
        return;
      }

      const parsedSuggestions: AISuggestion[] = output.treatmentPlans.map((plan: any) => {
        const planNameOriginal = plan.planName;
        const planNameLower = planNameOriginal?.toLowerCase();
        const patientSelectedTreatmentForm = form.getValues('treatment');
        const patientSelectedTreatmentLower = patientSelectedTreatmentForm?.toLowerCase();

        let isPatientSelected = false;
        if (planNameLower) {
            isPatientSelected = planNameLower.includes('(patient-selected)') || planNameLower.includes('(patient selected)');
            if (!isPatientSelected && patientSelectedTreatmentLower && planNameLower.startsWith(patientSelectedTreatmentLower)) {
                isPatientSelected = true;
            }
        }
        
        const caseOverviewData = {
          condition: selectedDomain || output.caseOverview?.condition || 'N/A',
          severity: matrixDetails?.severity || output.caseOverview?.severity || 'N/A',
          teethInvolved: selectedToothIds.join(', ') || output.caseOverview?.teethInvolved || 'N/A',
          patientSymptoms: form.getValues('symptoms') || output.caseOverview?.patientSymptoms,
          patientSelectedTreatment: patientSelectedTreatmentForm || output.caseOverview?.patientSelectedTreatment,
        };

        return {
          title: plan.planName || "AI Suggested Plan",
          description: output.clinicalAssessment || plan.description || plan.clinicalProtocol || "No detailed assessment provided.",
          planDetails: {
            planName: plan.planName,
            clinicalProtocol: plan.clinicalProtocol,
            keyMaterials: plan.keyMaterials,
            clinicalConsiderations: plan.clinicalConsiderations,
            expectedOutcomes: plan.expectedOutcomes,
            appointmentPlan: plan.appointmentPlan || plan.planDetails?.appointmentPlan,
            isPatientSelected: isPatientSelected,
          },
          caseOverview: caseOverviewData, // Use the constructed caseOverviewData
          patientFactors: output.patientFactors, // Directly from AI response output
          recommendedInvestigations: output.recommendedInvestigations, // Directly from AI response output
          clinicalRationale: output.clinicalRationale, // Directly from AI response output
          postTreatmentCare: output.postTreatmentCare || plan.postTreatmentCare || "", // Check both output level and plan level
        };
      });

      if (parsedSuggestions.length > 0) {
        setAiSuggestions(parsedSuggestions);
        toast({
          title: "AI Suggestions Ready",
          description: `Received ${parsedSuggestions.length} new suggestions.`,
          variant: "default",
          duration: 3000,
        });
      } else {
         console.warn("Parsed suggestions array is empty. Raw AI output:", output);
         setAiSuggestions([]);
         toast({
           title: "No Specific Suggestions",
           description: "The AI did not return specific treatment plans based on the input.",
           variant: "default",
           duration: 3000,
         });
      }
      // --- End adapted parsing ---

    } catch (error: unknown) {
      console.error('Error fetching AI suggestions:', error);
      toast({
        title: "AI Suggestion Failed",
        description: error instanceof Error ? error.message : "Could not get suggestions. Check console.",
        variant: "destructive",
        duration: 5000,
      });
      setAiSuggestions([]); // Clear suggestions on error
    } finally {
      setIsGeneratingSuggestions(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatientId, selectedToothIds, selectedDomain, matrixDetails, form, toast, selectedPatientRecord]); // Removed selectedCondition from deps

  // Function to apply a selected AI suggestion to the form
  const handleApplySuggestion = (suggestion: AISuggestion) => {
    setSelectedAISuggestionForSubmit(suggestion);
    form.setValue('symptoms', suggestion.title);
    form.setValue('description', suggestion.description);

    if (suggestion.planDetails?.clinicalConsiderations) {
      form.setValue('clinical_considerations', suggestion.planDetails.clinicalConsiderations);
    }
    if (suggestion.postTreatmentCare) {
      form.setValue('post_treatment_care', suggestion.postTreatmentCare);
    }
    if (suggestion.planDetails?.keyMaterials) {
        form.setValue('materials', suggestion.planDetails.keyMaterials);
    }
    if (suggestion.planDetails?.appointmentPlan?.totalSittings) {
        form.setValue('total_visits', suggestion.planDetails.appointmentPlan.totalSittings);
    }
    if (suggestion.planDetails?.appointmentPlan?.totalTreatmentTime) {
        // This might need parsing if AISuggestion.totalTreatmentTime is e.g. "Ongoing"
        // For now, let's assume it can be directly set or requires specific mapping
        form.setValue('estimated_duration', suggestion.planDetails.appointmentPlan.totalTreatmentTime);
    }

    // Attempt to pre-fill the 'treatment' radio button based on the suggestion title
    if (matrixDetails?.treatment_options && Array.isArray(matrixDetails.treatment_options) && suggestion.title) {
      const matchedOption = matrixDetails.treatment_options.find((opt: string) => 
        suggestion.title.toLowerCase().includes(opt.toLowerCase())
      );
      if (matchedOption) {
        form.setValue('treatment', matchedOption);
      }
    }

    form.setValue('ai_generated', true); // Mark that this plan is AI assisted

    toast({
      title: 'AI Suggestion Applied',
      description: `"${suggestion.title}" has been pre-filled into the form.`,
    });
  };

  // Need to wrap the return in a Fragment as Dialogs are siblings
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Treatment Plan</DialogTitle>
            <DialogDescription>
              Create a comprehensive treatment plan for a patient
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pb-6">
              {/* Patient Search Input */}
              <FormField
                control={form.control}
                name="patient_id"
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel htmlFor="patient-search">Patient *</FormLabel>
                    <FormControl>
                      <Input
                        type="search"
                        id="patient-search"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setSelectedPatientName(null);
                        }}
                        placeholder={selectedPatientName || "Search by name, phone, or registration..."}
                        disabled={isLoadingPatients}
                        className="w-full"
                      />
                    </FormControl>
                    {isLoadingPatients && <p className="text-sm text-muted-foreground mt-1">Loading patients...</p>}
                    {errorPatients && <p className="text-sm text-destructive mt-1">{errorPatients}</p>}
                    {/* Search Results Dropdown */}
                    {searchTerm && !isLoadingPatients && !errorPatients && (
                      <ScrollArea className="absolute z-10 w-full bg-background border rounded-md shadow-lg mt-1 max-h-60">
                        <div className="p-2">
                          {patients.filter(patient => {
                            const name = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase();
                            const phone = patient.phone?.toLowerCase() || '';
                            const regNum = patient.registration_number?.toLowerCase() || '';
                            const searchLower = searchTerm.toLowerCase();
                            return name.includes(searchLower) || phone.includes(searchLower) || regNum.includes(searchLower);
                          }).length > 0 ? (
                            patients
                              .filter(patient => {
                                const name = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase();
                                const phone = patient.phone?.toLowerCase() || '';
                                const regNum = patient.registration_number?.toLowerCase() || '';
                                const searchLower = searchTerm.toLowerCase();
                                return name.includes(searchLower) || phone.includes(searchLower) || regNum.includes(searchLower);
                              })
                              .map((patient) => (
                                <Button
                                  key={patient.id}
                                  variant="ghost"
                                  className="w-full justify-start text-left h-auto py-2 px-3 mb-1"
                                  onClick={() => handlePatientSelect(patient)}
                                  type="button"
                                >
                                  <div>
                                    <div>{`${patient.first_name || ''} ${patient.last_name || ''}`.trim()}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {patient.registration_number && `Reg: ${patient.registration_number}`}
                                      {patient.registration_number && patient.phone && " | "}
                                      {patient.phone && `Ph: ${patient.phone}`}
                                    </div>
                                  </div>
                                </Button>
                              ))
                          ) : (
                            <p className="text-sm text-muted-foreground p-2">No patients found matching "{searchTerm}"</p>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Domain Selection - MOVED UP */}
              {selectedPatientId && ( // Show Domain only after patient is selected
                  <FormField
                    control={form.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain</FormLabel>
                        <Select
                          onValueChange={handleDomainChange}
                          value={field.value || ''}
                          disabled={isLoadingOptions}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isLoadingOptions ? "Loading..." : "Select domain"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingOptions ? (
                              <SelectItem value="loading" disabled>Loading...</SelectItem>
                            ) : (
                            domains.map((domainItem) => (
                              <SelectItem key={domainItem} value={domainItem}>
                                {domainItem.charAt(0).toUpperCase() + domainItem.slice(1)}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              )}

              {/* Select Affected Teeth Button - MOVED AFTER DOMAIN */}
              {selectedPatientId && selectedDomain && ( // Show button only after patient and domain are selected
                <FormItem>
                  <FormLabel>Affected Teeth & Conditions</FormLabel>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={openChartDialog}
                      disabled={!selectedPatientId || !selectedDomain} // Ensure patient and domain are selected
                    >
                      <Smile className="mr-2 h-4 w-4" />
                      Select Teeth & Apply Domain Conditions
                    </Button>
                    {selectedToothIds.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        Selected: {selectedToothIds.join(', ')}
                      </span>
                    )}
                  </div>
                  <FormDescription>
                    Select the patient and domain first, then specify affected teeth and apply conditions from the selected domain.
                  </FormDescription>
                </FormItem>
              )}

              {/* AI Powered Suggestions - Now shown only after patient, domain, teeth, AND a treatment is selected from matrix details */}
              {selectedPatientId && selectedDomain && selectedToothIds.length > 0 && matrixDetails && form.watch('treatment') && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  {/* Title and Description Fields */}
                  <FormField
                    control={form.control}
                    name="symptoms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Symptoms *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter patient symptoms" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Detailed description of the treatment plan"
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Add the simplified AI Suggestion Form */}
                  <div className="mt-4">
                    <AISuggestionForm
                      patientId={selectedPatientId || ''}
                      toothIds={selectedToothIds}
                      domain={form.watch('domain') || ''}
                      condition={form.watch('condition') || ''}
                      matrixDetails={matrixDetails}
                      selectedTreatment={form.watch('treatment') || ''}
                      symptoms={form.watch('symptoms') || ''}
                      description={form.watch('description') || ''}
                      patientRecord={selectedPatientRecord}
                      onSuggestionApply={handleApplySuggestion}
                      disabled={!selectedPatientId || selectedToothIds.length === 0 || !form.watch('treatment') || !selectedPatientRecord || isLoadingPatientDetails || isGeneratingSuggestions}
                    />
                  </div>
                </div>
              )}

              {/* Restored section for displaying Matrix Details (Urgency, Severity, Treatment Options) */}
              {isLoadingDetails && <div className="flex justify-center items-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> <span className="ml-2 text-muted-foreground">Loading details...</span></div>}
              {!isLoadingDetails && matrixDetails && selectedDomain && conditionAppliedInChart && (
                  <div className="my-4 p-4 border rounded-lg bg-secondary/10 space-y-2 text-sm">
                    <h4 className="font-semibold text-base mb-2">Details for {selectedDomain} / {conditionAppliedInChart}</h4>
                      {matrixDetails.urgency && <p><strong>Urgency:</strong> {matrixDetails.urgency}</p>}
                      {matrixDetails.severity && <p><strong>Severity:</strong> {matrixDetails.severity}</p>}
                      {matrixDetails.risk_impact && <p><strong>Risk/Impact:</strong> {matrixDetails.risk_impact}</p>}
                      {matrixDetails.recommended_investigations && matrixDetails.recommended_investigations.length > 0 && (
                        <p><strong>Investigations:</strong> {matrixDetails.recommended_investigations.join(', ')}</p>
                      )}
                      
                      {matrixDetails.treatment_options && matrixDetails.treatment_options.length > 0 && (
                        <div className="mt-3">
                          <p className="font-semibold mb-1">Select Treatment:</p>
                          <FormField
                            control={form.control}
                            name="treatment"
                            render={({ field }) => (
                              <div className="space-y-1 ml-1">
                                {matrixDetails.treatment_options.map((option: string) => (
                                <label key={option} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      value={option}
                                      checked={field.value === option}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          field.onChange(option);
                                        }
                                      }}
                                    className="form-radio h-4 w-4 text-primary focus:ring-primary border-muted-foreground"
                                    />
                                    <span>{option}</span>
                                  </label>
                                ))}
                                <FormMessage />
                              </div>
                            )}
                          />
                        </div>
                      )}
                  </div>
              )}
              {/* End Restored Matrix Details Section */}

              {/* AI Powered Suggestions - Now shown only after patient, domain, teeth, AND a treatment is selected from matrix details */}
              {selectedPatientId && selectedDomain && selectedToothIds.length > 0 && matrixDetails && form.watch('treatment') && (
                <div className="my-4 p-4 border rounded-lg bg-muted/30">
                  <h3 className="text-lg font-semibold mb-2 flex items-center"><BrainCog className="mr-2 h-5 w-5 text-primary"/>AI Powered Suggestions</h3>
                  <Button 
                      type="button" 
                      onClick={handleGetAISuggestions} 
                      disabled={isGeneratingSuggestions || !selectedPatientId || selectedToothIds.length === 0 || !selectedDomain || isLoadingPatientDetails || !form.watch('treatment')}
                      className={`ai-insights-button w-full flex items-center justify-center py-2 px-4 rounded-lg shadow-md font-semibold text-white transition duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 ${isGeneratingSuggestions ? 'opacity-100 cursor-not-allowed' : ''}`}
                      style={isGeneratingSuggestions ? { opacity: 1 } : {}}
                  >
                      {isGeneratingSuggestions ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> AI is thinking... (this may take up to 2 minutes)</>
                      ) : (
                          <><BrainCog className="mr-2 h-5 w-5"/> Generate AI Suggestions</>
                      )}
                  </Button>
                </div>
              )}

              {/* Display AI Suggestions if available - REPLACED WITH ACCORDION */}
              {aiSuggestions.length > 0 && (
                <div className="mt-6 p-4 border rounded-lg bg-slate-50 shadow">
                  <h3 className="text-lg font-semibold mb-3 text-slate-800">AI Suggestions</h3>
                  {/* START of Accordion Rendering based on AISuggestionForm.tsx */}
                  <div className="space-y-4">
                    {aiSuggestions.map((suggestion, index) => (
                      <div
                        key={index} // Using index as key, consider a more stable key if available from suggestion
                        className={cn(
                          "border rounded-lg overflow-hidden bg-card",
                          suggestion.planDetails.isPatientSelected && "border-primary/50 bg-primary/5"
                        )}
                      >
                        <div className="p-4 bg-muted/50">
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-medium text-base">
                                {suggestion.title}{" "}
                                {suggestion.planDetails.isPatientSelected && (
                                  <span className="ml-2 text-xs text-primary font-normal">(Patient Selected Plan)</span>
                                )}
                              </h5>
                              {suggestion.caseOverview && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  <p><strong>Condition:</strong> {suggestion.caseOverview.condition}</p>
                                  <p><strong>Severity:</strong> {suggestion.caseOverview.severity}</p>
                                  <p><strong>Teeth:</strong> {suggestion.caseOverview.teethInvolved}</p>
                                  {suggestion.caseOverview.patientSymptoms && <p><strong>Symptoms:</strong> {suggestion.caseOverview.patientSymptoms}</p>}
                                  {suggestion.caseOverview.patientSelectedTreatment && <p><strong>Patient Preference:</strong> {suggestion.caseOverview.patientSelectedTreatment}</p>}
                                </div>
                              )}
                            </div>
                            {suggestion.planDetails.isPatientSelected && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleApplySuggestion(suggestion)}
                                className="bg-primary text-white hover:bg-primary/90"
                              >
                                Apply Selected Plan
                              </Button>
                            )}
                          </div>
                        </div>

                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value={`clinical-assessment-${index}`}>
                            <AccordionTrigger className="px-4">Overall Clinical Assessment</AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <p className="text-sm text-muted-foreground whitespace-pre-line">
                                {suggestion.description}
                              </p>
                            </AccordionContent>
                          </AccordionItem>

                          {suggestion.patientFactors && (
                            <AccordionItem value={`patient-factors-${index}`}>
                              <AccordionTrigger className="px-4">Patient Factors</AccordionTrigger>
                              <AccordionContent className="px-4 pb-4 text-sm space-y-1">
                                <p><strong>Relevant Medical Conditions:</strong> {suggestion.patientFactors.relevantMedicalConditions}</p>
                                <p><strong>Medication Considerations:</strong> {suggestion.patientFactors.medicationConsiderations}</p>
                                <p><strong>Age-Related Considerations:</strong> {suggestion.patientFactors.ageRelatedConsiderations}</p>
                              </AccordionContent>
                            </AccordionItem>
                          )}

                          {suggestion.recommendedInvestigations && (
                            <AccordionItem value={`recommended-investigations-${index}`}>
                              <AccordionTrigger className="px-4">Recommended Investigations</AccordionTrigger>
                              <AccordionContent className="px-4 pb-4 text-sm">
                                <p>{suggestion.recommendedInvestigations}</p>
                              </AccordionContent>
                            </AccordionItem>
                          )}
                          
                          {suggestion.planDetails && (
                            <AccordionItem value={`plan-details-${index}`}>
                              <AccordionTrigger className="px-4">Details for: {suggestion.planDetails.planName || suggestion.title}</AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <div className="space-y-3 text-sm">
                                  {suggestion.planDetails.clinicalProtocol && <div>
                                    <p className="font-medium">Clinical Protocol:</p>
                                    <p className="text-muted-foreground whitespace-pre-line">
                                      {suggestion.planDetails.clinicalProtocol}
                                    </p>
                                  </div>}
                                  {suggestion.planDetails.keyMaterials && <div>
                                    <p className="font-medium">Key Materials:</p>
                                    <p className="text-muted-foreground">{suggestion.planDetails.keyMaterials}</p>
                                  </div>}
                                  {suggestion.planDetails.clinicalConsiderations && <div>
                                    <p className="font-medium">Clinical Considerations:</p>
                                    <p className="text-muted-foreground whitespace-pre-line">
                                      {suggestion.planDetails.clinicalConsiderations}
                                    </p>
                                  </div>}
                                  {suggestion.planDetails.expectedOutcomes && <div>
                                    <p className="font-medium">Expected Outcomes:</p>
                                    <p className="text-muted-foreground whitespace-pre-line">{suggestion.planDetails.expectedOutcomes}</p>
                                  </div>}
                        </div>
                              </AccordionContent>
                            </AccordionItem>
                          )}

                          {suggestion.planDetails?.appointmentPlan && (
                            <AccordionItem value={`appointment-plan-${index}`}>
                              <AccordionTrigger className="px-4">
                                <span className="flex items-center">
                                  <Calendar className="mr-2 h-4 w-4" />
                                  Appointment Plan
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <div className="space-y-3 text-sm">
                                  <div className="flex items-center gap-4 text-muted-foreground mb-2">
                                    {suggestion.planDetails.appointmentPlan.totalSittings && <div>
                                      <Clock className="h-4 w-4 inline mr-1" />
                                      <span>Total Sittings: {suggestion.planDetails.appointmentPlan.totalSittings}</span>
                                    </div>}
                                    {suggestion.planDetails.appointmentPlan.totalTreatmentTime && <div>
                                      <Calendar className="h-4 w-4 inline mr-1" />
                                      <span>Total Duration: {suggestion.planDetails.appointmentPlan.totalTreatmentTime}</span>
                                    </div>}
                      </div>
                                  {suggestion.planDetails.appointmentPlan.medicalPrecautions && (
                                    <div className="mb-3">
                                      <p className="font-medium">Medical Precautions:</p>
                                      <p className="text-muted-foreground whitespace-pre-line">{suggestion.planDetails.appointmentPlan.medicalPrecautions}</p>
                    </div>
                  )}
                                  {suggestion.planDetails.appointmentPlan.sittingDetails && suggestion.planDetails.appointmentPlan.sittingDetails.length > 0 && (
                                    <div className="space-y-2">
                                      <p className="font-medium text-sm mb-1">Sitting Details:</p>
                                      {suggestion.planDetails.appointmentPlan.sittingDetails.map((sitting, idx) => (
                                        <div key={idx} className="border rounded p-3 bg-background">
                                          <p className="font-medium">{sitting.visit || `Visit ${idx + 1}`}</p>
                                          <p className="text-muted-foreground mt-1">{sitting.procedures}</p>
                                          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-3">
                                            {sitting.estimatedDuration && <p className="flex items-center">
                                              <Clock className="h-3 w-3 mr-1" />
                                              Duration: {sitting.estimatedDuration}
                                            </p>}
                                            {sitting.timeGap && sitting.timeGap !== "N/A" && (
                                              <p className="flex items-center">
                                                <Calendar className="h-3 w-3 mr-1" />
                                                Next visit in: {sitting.timeGap}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )}

                          {suggestion.clinicalRationale && (
                            <AccordionItem value={`clinical-rationale-${index}`}>
                              <AccordionTrigger className="px-4">Clinical Rationale</AccordionTrigger>
                              <AccordionContent className="px-4 pb-4 text-sm">
                                <p className="whitespace-pre-line">{suggestion.clinicalRationale}</p>
                              </AccordionContent>
                            </AccordionItem>
                          )}

                          {suggestion.postTreatmentCare && (
                            <AccordionItem value={`post-care-${index}`}>
                              <AccordionTrigger className="px-4">Post-Treatment Care</AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <p className="text-sm text-muted-foreground whitespace-pre-line">{suggestion.postTreatmentCare}</p>
                              </AccordionContent>
                            </AccordionItem>
                          )}
                        </Accordion>
                      </div>
                    ))}
                  </div>
                  {/* END of Accordion Rendering */}
                </div>
              )}

              {/* Add new form fields after the existing treatment selection */}
              {matrixDetails && (
                <>
                  <FormField
                    control={form.control}
                    name="estimated_duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Duration</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 3-4 weeks" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="total_visits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Visits</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 2" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="materials"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Required Materials</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="List of required materials"
                            className="min-h-[80px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clinical_considerations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Clinical Considerations</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Important clinical considerations"
                            className="min-h-[80px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="post_treatment_care"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Post-Treatment Care</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Post-treatment care instructions"
                            className="min-h-[80px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Create Plan
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dental Chart Dialog */}
      <Dialog open={isChartDialogOpen} onOpenChange={setIsChartDialogOpen}>
         <DialogContent className="max-w-2xl"> {/* Wider dialog for chart */}
           <DialogHeader>
             <DialogTitle>Select Affected Teeth & Apply Conditions</DialogTitle>
             <DialogDescription>
               Click teeth to select/deselect. Use the controls below to apply conditions from the selected domain to the selected teeth.
             </DialogDescription>
           </DialogHeader>

           {/* Pass initial state, handler, and REF, use key to force re-mount */}
           <DentalChart
             ref={dentalChartRef} // Pass the ref here
             key={chartDialogKey} // Force re-mount when dialog opens
             initialState={chartInitialState} 
             onToothSelect={handleDialogChartSelectionChange}
             domain={selectedDomain || undefined}
             domainConditions={filteredConditions} 
           />

           <DialogFooter>
             <Button variant="outline" onClick={() => setIsChartDialogOpen(false)} disabled={isSavingChart}>Cancel</Button>
             <Button onClick={handleConfirmChartSelection} disabled={isSavingChart}>
               {isSavingChart ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
               Confirm & Save Chart
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
    </>
  );
}
