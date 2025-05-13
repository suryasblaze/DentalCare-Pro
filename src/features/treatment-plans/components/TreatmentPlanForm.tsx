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
import { format } from 'date-fns';
// Import DentalChart, InitialToothState, ToothCondition, and DentalChartHandle
import DentalChart, { InitialToothState, ToothCondition, DentalChartHandle } from './DentalChart';
import { api } from '@/lib/api'; // Import the api object
import { useToast } from '@/components/ui/use-toast'; // Import useToast
import { AISuggestionForm, AISuggestion } from './AISuggestionForm';

// Define schema for treatment plan form
export const treatmentPlanSchema = z.object({
  title: z.string().min(1, "Title is required"),
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
});

export type TreatmentPlanFormValues = z.infer<typeof treatmentPlanSchema>;

interface TreatmentPlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TreatmentPlanFormValues, toothIds: number[]) => Promise<void>;
  patients: any[];
  loading?: boolean;
}

interface ToothConditionData {
  tooth_id: number;
  conditions: ToothCondition[];
  patient_id: string;
  id?: string;
  last_updated_at?: string;
}

export function TreatmentPlanForm({
  open,
  onOpenChange,
  onSubmit,
  patients,
  loading = false,
}: TreatmentPlanFormProps) {
  // State for patient search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState<string | null>(null);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [errorPatients, setErrorPatients] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

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
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]); // Store AI suggestions (use a more specific type if known)
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isSavingChart, setIsSavingChart] = useState(false); // State for saving indicator

  const { toast } = useToast(); // Initialize toast
  const dentalChartRef = useRef<DentalChartHandle>(null); // Ref for DentalChart component

  const form = useForm<TreatmentPlanFormValues>({
    resolver: zodResolver(treatmentPlanSchema),
    defaultValues: {
      title: '',
      description: '',
      patient_id: '',
      domain: '',
      condition: '',
      treatment: '',
    },
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
      form.reset();
      setIsChartDialogOpen(false); // Ensure chart dialog is closed too
      setDialogSelectedToothIds([]); // Reset temporary selection
    } else {
       form.reset({
         title: '', description: '', patient_id: selectedPatientId || '',
         domain: '', condition: '', treatment: '',
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
  const selectedCondition = form.watch('condition');

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
      // Reset condition field if the current condition is not valid for the new domain
      // Ensure selectedCondition is a valid string before checking includes
      if (selectedCondition && !relatedConditions.includes(selectedCondition)) {
         form.setValue('condition', ''); // Reset condition selection
         setMatrixDetails(null); // Also clear details
      }
    } else {
      setFilteredConditions([]); // Clear conditions if no domain selected
      form.setValue('condition', ''); // Reset condition selection
      setMatrixDetails(null); // Also clear details
      setAiSuggestions([]); // Clear suggestions if domain changes
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDomain, matrixOptions]); // Rerun when domain or the base options change

  // Fetch matrix details when domain and condition change
  useEffect(() => {
    // Reset details if either domain or condition is cleared
    if (!selectedDomain || !selectedCondition) {
      setMatrixDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setIsLoadingDetails(true);
      setMatrixDetails(null); // Clear previous details
      try {
        const details = await api.getMatrixDetails(selectedDomain, selectedCondition);
        setMatrixDetails(details);
      } catch (error) {
        console.error(`Failed to fetch matrix details for ${selectedDomain}/${selectedCondition}:`, error);
      setMatrixDetails(null); // Ensure details are null on error
      setAiSuggestions([]); // Clear suggestions if details fetch fails or changes
      } finally {
        setIsLoadingDetails(false);
      }
    };

    // Debounce or check if values are valid before fetching? For now, fetch directly.
    fetchDetails();

  }, [selectedDomain, selectedCondition]); // Dependencies: selected domain and condition

  // Handler for patient selection from search results - Fetch conditions and set initial selection
  const handlePatientSelect = async (patient: any) => {
    setSelectedPatientId(patient.id);
    setSelectedPatientName(`${patient.first_name || ''} ${patient.last_name || ''}`.trim());
    form.setValue('patient_id', patient.id, { shouldValidate: true });
    setSearchTerm('');
    setChartInitialState({}); // Clear previous patient's chart state immediately
    setSelectedToothIds([]); // Clear selected teeth for the new patient

    // Fetch existing tooth conditions for the selected patient
    try {
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
      console.error("Failed to fetch patient tooth conditions:", error);
      toast({
        title: "Error Loading Chart",
        description: "Could not load existing tooth conditions.",
        variant: "destructive",
      });
      setChartInitialState({}); // Reset to empty on error
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
      const currentChartState = dentalChartRef.current.getTeethData(); // e.g., { 1: { conditions: ['decay'], isSelected: true }, ... }
      console.log("Data from chart ref:", currentChartState);

      // 2. Transform the data into the format expected by the API
      // ONLY include teeth that are selected AND have conditions other than just ['healthy']
      const conditionsToSave: ToothConditionData[] = Object.entries(currentChartState)
        .filter(([, toothData]) => {
          const isSelected = toothData.isSelected;
          const isOnlyHealthy = Array.isArray(toothData.conditions) &&
                                toothData.conditions.length === 1 &&
                                toothData.conditions[0] === 'healthy';
          return isSelected && !isOnlyHealthy;
        })
        .map(([toothIdStr, toothData]) => ({
          tooth_id: parseInt(toothIdStr, 10),
          conditions: toothData.conditions as ToothCondition[],
          patient_id: selectedPatientId,
        }));
      console.log("Filtered and transformed data to save (only selected & non-healthy):", conditionsToSave);


      // 3. Call the correct API function to save the data (API function also needs modification)
      // Assuming savePatientToothConditionsDetailed is the correct function in api.ts
      await api.patients.savePatientToothConditionsDetailed(selectedPatientId, conditionsToSave);

      // 4. Update the local state (selectedToothIds and potentially chartInitialState for consistency)
      // Use the original currentChartState for updating local UI state
      const currentSelectedIds = Object.entries(currentChartState)
        .filter(([, data]) => data.isSelected)
        .map(([id]) => parseInt(id, 10));
      setSelectedToothIds(currentSelectedIds); // Update the main form's selected IDs display

      // Update chartInitialState to reflect the saved state, so reopening shows the saved data
      const formattedSavedState: InitialToothState = {};
      Object.entries(currentChartState).forEach(([id, data]) => {
         // Ensure data.conditions is treated as ToothCondition[] if possible,
         // We know data.conditions contains valid ToothCondition strings from the chart,
         // so we can safely assert the type here after the deep copy.
         formattedSavedState[parseInt(id, 10)] = {
           conditions: data.conditions as ToothCondition[], // Re-add type assertion here
           isSelected: data.isSelected
         };
      });
      setChartInitialState(formattedSavedState);

      toast({
        title: "Chart Saved",
        description: "Patient's tooth conditions have been updated.",
        variant: "default", // Use default variant for success
      });
      setIsChartDialogOpen(false); // Close dialog on success

    } catch (error) {
      console.error("Failed to save tooth conditions:", error);
      toast({
        title: "Save Failed",
        description: "Could not save tooth conditions to the database.",
        variant: "destructive",
      });
      // Keep dialog open on error? Or close? Closing for now.
      // setIsChartDialogOpen(false);
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
    await onSubmit(values, selectedToothIds); // Pass form data and confirmed teeth IDs
    // Reset confirmed teeth selection after successful submission
    setSelectedToothIds([]);
    setAiSuggestions([]); // Clear suggestions on successful submit
    form.reset(); // Reset form fields
   };

  // Function to fetch AI suggestions from n8n
  const handleGetAISuggestions = useCallback(async () => {
    if (!selectedPatientId || selectedToothIds.length === 0 || !selectedDomain || !selectedCondition) {
      toast({
        title: "Missing Information",
        description: "Please select patient, teeth, domain, and condition first.",
        variant: "default", // Changed from "warning" to "default"
        duration: 3000,
      });
      return;
    }

    setIsGeneratingSuggestions(true);
    setAiSuggestions([]); // Clear previous suggestions

    try {
      const webhookUrl = 'https://n8n1.kol.tel/webhook/2169736a-368b-49b5-b93f-ffc215203d99';
      const payload = {
        patientId: selectedPatientId,
        toothIds: selectedToothIds,
        domain: selectedDomain,
        condition: selectedCondition,
        details: matrixDetails, // Send fetched matrix details
        treatment: form.getValues('treatment'), // Single treatment instead of array
        // Add any other relevant patient info if needed by n8n
      };
      console.log("Sending payload to n8n:", payload); // Log payload

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

      // --- Adjust parsing based on actual n8n response structure ---
      // Assuming n8n returns an array of suggestions directly, or nested within a known key
      // Example: If response is { "suggestions": [...] }
      // const suggestions = responseData.suggestions;
      // Example: If response is [{...}, {...}]
      const suggestions = responseData; // Adjust this line based on actual structure

      if (Array.isArray(suggestions) && suggestions.length > 0) {
        // Assuming each suggestion has at least 'title' and 'description'
        // Filter out any potentially invalid suggestions if needed
        const validSuggestions = suggestions.filter(s => s && typeof s === 'object' && s.title && s.description);
        setAiSuggestions(validSuggestions);
        toast({
          title: "AI Suggestions Ready",
          description: `Received ${validSuggestions.length} suggestions.`,
          variant: "default",
          duration: 3000,
        });
      } else {
         console.warn("Received empty or invalid suggestions array from n8n:", responseData);
         setAiSuggestions([]); // Ensure it's an empty array
         toast({
           title: "No Suggestions",
           description: "The AI did not return any suggestions for this case.",
           variant: "default",
           duration: 3000,
         });
      }
      // --- End parsing adjustment ---

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
  }, [selectedPatientId, selectedToothIds, selectedDomain, selectedCondition, matrixDetails, form, toast]); // Add dependencies

  // Function to apply a selected AI suggestion to the form
  const handleApplySuggestion = (suggestion: any) => {
    if (suggestion && suggestion.title && suggestion.description) {
      form.setValue('title', suggestion.title, { shouldValidate: true });
      form.setValue('description', suggestion.description, { shouldValidate: true });
      toast({
        title: "Suggestion Applied",
        description: `"${suggestion.title}" pre-filled. Please review and add cost.`,
        variant: "default",
        duration: 3000,
      });
      // Optionally clear suggestions after applying one? Or allow applying others?
      // setAiSuggestions([]);
    } else {
       console.warn("Attempted to apply invalid suggestion:", suggestion);
    }
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

              {/* Button to Open Dental Chart Dialog */}
              <FormItem>
                <FormLabel>Affected Teeth & Conditions</FormLabel>
                <div className="flex items-center gap-4">
                  <Button type="button" variant="outline" onClick={openChartDialog}>
                    <Smile className="mr-2 h-4 w-4" /> {/* Use Smile icon */}
                    Select Teeth...
                  </Button>
                  {/* Display Confirmed Selected Teeth */}
                  <div className="text-sm text-muted-foreground flex-grow min-w-0">
                    {selectedToothIds.length > 0 ? (
                      <span className="truncate">
                        Selected: {selectedToothIds.sort((a, b) => a - b).join(', ')}
                      </span>
                    ) : (
                      "No teeth selected"
                    )}
                  </div>
                </div>
                 <FormMessage />
              </FormItem>

              {/* Conditionally render Domain and Condition if teeth ARE selected */}
              {selectedToothIds.length > 0 && (
                <>
                  <FormField
                    control={form.control}
                    name="domain" // Make sure 'domain' is in your form schema and defaultValues
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain</FormLabel>
                        <Select
                          onValueChange={field.onChange}
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
                              // Map over unique domains derived from matrixOptions
                              domains.map((domain) => (
                                <SelectItem key={domain} value={domain}>
                                  {/* Simple capitalization for display */}
                                  {domain.charAt(0).toUpperCase() + domain.slice(1)}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="condition" // Make sure 'condition' is in your form schema and defaultValues
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condition</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ''}
                          disabled={isLoadingOptions}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isLoadingOptions ? "Loading..." : "Select condition"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                             {isLoadingOptions ? (
                              <SelectItem value="loading" disabled>Loading...</SelectItem>
                            ) : (
                              // Map over filtered conditions based on selected domain
                              filteredConditions.map((condition) => (
                                <SelectItem key={condition} value={condition}>
                                  {/* Simple capitalization for display */}
                                  {condition.charAt(0).toUpperCase() + condition.slice(1)}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Display Fetched Matrix Details */}
                  {isLoadingDetails && (
                    <div className="text-sm text-muted-foreground p-2 border rounded-md">Loading details...</div>
                  )}
                  {!isLoadingDetails && matrixDetails && (
                    <div className="mt-4 p-3 border rounded-md bg-secondary/10 space-y-2 text-sm">
                      <h4 className="font-semibold text-base mb-2">Details for {selectedDomain} / {selectedCondition}</h4>
                      {matrixDetails.urgency && <p><strong>Urgency:</strong> {matrixDetails.urgency}</p>}
                      {matrixDetails.severity && <p><strong>Severity:</strong> {matrixDetails.severity}</p>}
                      {matrixDetails.risk_impact && <p><strong>Risk/Impact:</strong> {matrixDetails.risk_impact}</p>}
                      {matrixDetails.recommended_investigations && matrixDetails.recommended_investigations.length > 0 && (
                        <p><strong>Investigations:</strong> {matrixDetails.recommended_investigations.join(', ')}</p>
                      )}
                      
                      {/* Treatment options as radio buttons directly in the details box */}
                      {matrixDetails.treatment_options && matrixDetails.treatment_options.length > 0 && (
                        <div className="mt-3">
                          <p className="font-semibold mb-1">Select Treatment:</p>
                          <FormField
                            control={form.control}
                            name="treatment"
                            render={({ field }) => (
                              <div className="space-y-1 ml-1">
                                {matrixDetails.treatment_options.map((option: string) => (
                                  <label key={option} className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      value={option}
                                      checked={field.value === option}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          field.onChange(option);
                                        }
                                      }}
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

                      {/* Title and Description Fields */}
                      <div className="mt-4 pt-4 border-t space-y-4">
                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title *</FormLabel>
                              <FormControl>
                                <Input placeholder="Treatment plan title" {...field} />
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
                            domain={selectedDomain || ''}
                            condition={String(selectedCondition || '')}
                            matrixDetails={matrixDetails}
                            selectedTreatment={form.watch('treatment') || ''}
                            title={form.watch('title') || ''}
                            description={form.watch('description') || ''}
                            onSuggestionApply={(suggestion) => {
                              // Update all form fields with the suggestion data
                              form.setValue('title', suggestion.title, { shouldValidate: true });
                              form.setValue('description', suggestion.description, { shouldValidate: true });
                              
                              // Update additional fields if they exist in the suggestion
                              if (suggestion.planDetails.appointmentPlan) {
                                form.setValue('total_visits', suggestion.planDetails.appointmentPlan.totalSittings, { shouldValidate: true });
                                form.setValue('estimated_duration', suggestion.planDetails.appointmentPlan.totalTreatmentTime, { shouldValidate: true });
                              }
                              
                              form.setValue('materials', suggestion.planDetails.keyMaterials, { shouldValidate: true });
                              form.setValue('clinical_considerations', suggestion.planDetails.clinicalConsiderations, { shouldValidate: true });
                              form.setValue('post_treatment_care', suggestion.postTreatmentCare, { shouldValidate: true });

                              toast({
                                title: "Treatment Plan Applied",
                                description: "AI suggestion has been applied to all fields.",
                                variant: "default"
                              });
                            }}
                            disabled={!selectedPatientId || selectedToothIds.length === 0 || !form.watch('treatment')}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                   {!isLoadingDetails && selectedDomain && selectedCondition && !matrixDetails && (
                     <div className="text-sm text-muted-foreground p-2 border rounded-md border-dashed">No details found for this combination.</div>
                   )}
                </>
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
               Click teeth to select/deselect. Use buttons below to apply conditions to selected teeth.
             </DialogDescription>
           </DialogHeader>

           {/* Pass initial state, handler, and REF, use key to force re-mount */}
           <DentalChart
             ref={dentalChartRef} // Pass the ref here
             key={chartDialogKey} // Force re-mount when dialog opens
             initialState={chartInitialState} // Pass the state prepared on open
             onToothSelect={handleDialogChartSelectionChange}
             // readOnly={false} // Default is false, ensure it's interactive
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
