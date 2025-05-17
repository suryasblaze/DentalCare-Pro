import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; // Import Input
import { Textarea } from '@/components/ui/textarea';
import { Loader2, BrainCog, Bot } from 'lucide-react'; // Added Bot icon
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';
// Remove Select imports
// Add imports for Form components and MultiSelectCheckbox
import { FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
// Remove MultiSelectCheckbox import
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from "@/components/ui/scroll-area"; // Keep ScrollArea
import type { Database } from '@/../supabase_types'; // Corrected import path to root supabase_types.ts
import { supabase } from '@/lib/supabase'; // Import supabase client
// Import ToothSelector instead of DentalChart
import ToothSelector, { type ToothConditionsMap } from '@/features/treatment-plans/components/ToothSelector';
// Remove DentalChart import if no longer needed elsewhere in this file
// import DentalChart, { type InitialToothState } from '@/features/treatment-plans/components/DentalChart';

// Remove Tooth type definition

// Define Suggestion type
interface Suggestion {
  label: string;
  condition: string;
  question: string;
}

// Use the full Patient type from Supabase schema
type PatientDetails = Database['public']['Tables']['patients']['Row'];

// Define Patient type based on database schema (assuming it exists)
// type Patient = Database['public']['Tables']['patients']['Row']; // Assuming this structure

// Define Patient type for the prop, including necessary fields for search
interface PatientSummary {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone?: string | null; // Optional phone
  registration_number?: string | null; // Optional registration number
}

interface AITreatmentGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: PatientSummary[]; // Use the updated type
  // Removed patientDetails prop
}

export function AITreatmentGenerator({
  open,
  onOpenChange,
  patients, // Assuming patients are pre-loaded and passed as prop
}: AITreatmentGeneratorProps) {
  const [searchTerm, setSearchTerm] = useState(''); // State for search input
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedPatientName, setSelectedPatientName] = useState<string>(''); // State for selected patient's name
  // State now holds the full patient record or null
  const [fetchedPatientDetails, setFetchedPatientDetails] = useState<PatientDetails | null>(null);
  const [currentCondition, setCurrentCondition] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [dynamicSuggestions, setDynamicSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestionLabel, setSelectedSuggestionLabel] = useState<string | null>(null); // State for clicked suggestion
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null); // State to store the AI response
  // Remove teeth and fetchError state
  const [selectedTeethData, setSelectedTeethData] = useState<ToothConditionsMap>({}); // Changed state for selected teeth
  const { toast } = useToast();

  // generateSuggestions function targeting correct fields (with logging)
  const generateSuggestions = (details: PatientDetails | null): Suggestion[] => {
      if (!details) {
          console.log("[generateSuggestions] No details provided.");
          return [];
      }
      // Log the raw details object received by the function
      console.log("[generateSuggestions] Processing details object:", details);
      // Log the stringified version for easier inspection of nested props
      console.log("[generateSuggestions] Processing details (stringified):", JSON.stringify(details));


      const suggestions: Suggestion[] = [];
      // Handle potential null from DB before mapping
      // Ensure medical_conditions exists and is an array before mapping
      const medicalConditions = Array.isArray(details.medical_conditions)
        ? details.medical_conditions.map((c: string) => String(c).toLowerCase()) // Added explicit type (string) for 'c'
        : [];

      // Access additional_concerns from lifestyle_habits JSONB field
      // Use optional chaining and nullish coalescing for various text fields
      const lifestyleConcerns = String((details.lifestyle_habits as any)?.additional_concerns || '').toLowerCase();
      // Cast dental_history to any to access nested properties safely
      const dentalHistory = details.dental_history as any;
      const chiefComplaint = String(dentalHistory?.chief_complaint || '').toLowerCase();
      const painDescription = String(dentalHistory?.pain_description || '').toLowerCase();
      const functionalConcerns = String(dentalHistory?.functional_concerns || '').toLowerCase(); // Added functional concerns

      console.log("[generateSuggestions] Parsed medicalConditions array:", medicalConditions);
      console.log("[generateSuggestions] Parsed lifestyleConcerns string:", lifestyleConcerns);
      console.log("[generateSuggestions] Parsed chiefComplaint string:", chiefComplaint);
      console.log("[generateSuggestions] Parsed painDescription string:", painDescription);
      console.log("[generateSuggestions] Parsed functionalConcerns string:", functionalConcerns); // Log functional concerns


      // Define more specific keyword categories
      const painKeywords = ['pain', 'throbbing', 'sensitivity', 'sensitive', 'hot food', 'severe tooth pain', 'ache'];
      const restorativeKeywords = ['filling', 'root canal', 'lodgement', 'molar', 'cavity', 'broken', 'chipped', 'missing'];
      const perioKeywords = ['gum', 'recession', 'periodontal', 'bleeding', 'swelling', 'pocketing', 'mobile'];
      const tmjKeywords = ['jaw', 'clicking', 'tmj', 'bruxism', 'grinding', 'headache', 'lock'];
      const estheticKeywords = ['stain', 'deposits', 'white teeth', 'cosmetic', 'discolored', 'yellow'];

      // Combine relevant text fields for keyword searching
      const searchableText = `${chiefComplaint} ${painDescription} ${functionalConcerns} ${lifestyleConcerns}`;
      console.log("[generateSuggestions] Combined searchable text:", searchableText);

      // Helper function to check keywords
      const checkKeywords = (keywords: string[]): boolean => {
          return keywords.some(keyword => {
              const textMatch = searchableText.includes(keyword);
              const medicalMatch = medicalConditions.includes(keyword);
              const match = textMatch || medicalMatch;
              // if (match) console.log(`[generateSuggestions] Keyword '${keyword}' match: text=${textMatch}, medical=${medicalMatch}`);
              return match;
          });
      };

      // Generate potential suggestions based on keyword categories, limiting to 3
      const potentialSuggestions: Suggestion[] = [];
      const addedLabels = new Set<string>(); // Use Set to track added labels for uniqueness
      let suggestionCount = 0;

      // Helper to create a more descriptive label based on found keywords/details
      const createExactLabel = (base: string, keywordsFound: string[], primaryDetail: string): string => {
          let detailPart = primaryDetail.split(' ')[0]; // Default to first word
          const teethMatch = primaryDetail.match(/\b(\d{2}(?:,\s*\d{2})*)\b/);
          if (teethMatch) {
              detailPart = `Teeth ${teethMatch[0]}`;
          } else if (keywordsFound.length > 0) {
              // Use the first matching keyword if no teeth numbers found
              detailPart = keywordsFound[0].charAt(0).toUpperCase() + keywordsFound[0].slice(1);
          }
          return `${base}: ${detailPart}`;
      };

      // Prioritize Pain
      const painKeywordsFound = painKeywords.filter(k => searchableText.includes(k) || medicalConditions.includes(k));
      if (painKeywordsFound.length > 0 && suggestionCount < 3) {
          const specificLabel = createExactLabel("Assess Pain", painKeywordsFound, painDescription || chiefComplaint);
          if (!addedLabels.has(specificLabel)) {
              const condition = `Patient reports pain/sensitivity related to: "${painDescription || chiefComplaint || 'N/A'}". Relevant Medical Conditions: ${medicalConditions.join(', ') || 'None'}.`;
              const question = `Regarding the reported pain/sensitivity (${painDescription || chiefComplaint || 'see condition'}), what are the likely causes? What diagnostic steps (tests, imaging) and initial pain management strategies are recommended?`;
              potentialSuggestions.push({ label: specificLabel, condition, question });
              addedLabels.add(specificLabel);
              suggestionCount++;
          }
      }

      // Then Restorative
      const restorativeKeywordsFound = restorativeKeywords.filter(k => searchableText.includes(k));
      if (restorativeKeywordsFound.length > 0 && suggestionCount < 3) {
          const specificLabel = createExactLabel("Evaluate Restorative", restorativeKeywordsFound, chiefComplaint || functionalConcerns);
           if (!addedLabels.has(specificLabel)) {
              const condition = `Patient presents with potential restorative needs (${restorativeKeywordsFound.join(', ')}). Chief Complaint: "${chiefComplaint || 'N/A'}". Functional Concerns: "${functionalConcerns || 'N/A'}".`;
              const question = `Given the potential restorative issues (${chiefComplaint || functionalConcerns || restorativeKeywordsFound.join(', ') || 'see condition'}), what diagnostic evaluations are needed? What are the primary restorative treatment options to consider?`;
              potentialSuggestions.push({ label: specificLabel, condition, question });
              addedLabels.add(specificLabel);
              suggestionCount++;
          }
      }

      // Then Periodontal
      const perioKeywordsFound = perioKeywords.filter(k => searchableText.includes(k));
      if (perioKeywordsFound.length > 0 && suggestionCount < 3) {
          const specificLabel = createExactLabel("Check Perio", perioKeywordsFound, functionalConcerns || chiefComplaint);
           if (!addedLabels.has(specificLabel)) {
              const condition = `Patient shows signs potentially related to periodontal health (${perioKeywordsFound.join(', ')}). Chief Complaint: "${chiefComplaint || 'N/A'}". Functional Concerns: "${functionalConcerns || 'N/A'}". Relevant Medical Conditions: ${medicalConditions.join(', ') || 'None'}.`;
              const question = `Based on potential periodontal indicators (${functionalConcerns || chiefComplaint || perioKeywordsFound.join(', ') || 'see condition'}), what periodontal assessment (probing, bleeding index) is necessary? What initial hygiene or treatment steps should be considered?`;
              potentialSuggestions.push({ label: specificLabel, condition, question });
              addedLabels.add(specificLabel);
              suggestionCount++;
           }
      }

      // Then Esthetics
      const estheticKeywordsFound = estheticKeywords.filter(k => searchableText.includes(k));
       if (estheticKeywordsFound.length > 0 && suggestionCount < 3) {
          const specificLabel = createExactLabel("Review Esthetics", estheticKeywordsFound, functionalConcerns || chiefComplaint);
           if (!addedLabels.has(specificLabel)) {
              const condition = `Patient has expressed concerns or shows signs related to dental esthetics (${estheticKeywordsFound.join(', ')}). Chief Complaint: "${chiefComplaint || 'N/A'}". Functional Concerns: "${functionalConcerns || 'N/A'}".`;
              const question = `Regarding the esthetic concerns (${chiefComplaint || functionalConcerns || estheticKeywordsFound.join(', ') || 'see condition'}), what options are available (e.g., whitening, veneers, cleaning)? What factors should be considered in treatment planning?`;
              potentialSuggestions.push({ label: specificLabel, condition, question });
              addedLabels.add(specificLabel);
              suggestionCount++;
           }
      }

      // Then TMJ (often less common or overlaps)
      const tmjKeywordsFound = tmjKeywords.filter(k => searchableText.includes(k));
       if (tmjKeywordsFound.length > 0 && suggestionCount < 3) {
          const specificLabel = createExactLabel("Assess TMJ", tmjKeywordsFound, chiefComplaint || painDescription || functionalConcerns);
           if (!addedLabels.has(specificLabel)) {
              const condition = `Patient reports symptoms potentially related to TMJ dysfunction (${tmjKeywordsFound.join(', ')}). Chief Complaint: "${chiefComplaint || 'N/A'}". Pain Description: "${painDescription || 'N/A'}". Functional Concerns: "${functionalConcerns || 'N/A'}".`;
              const question = `Considering the potential TMJ symptoms (${chiefComplaint || painDescription || functionalConcerns || tmjKeywordsFound.join(', ') || 'see condition'}), how should TMJ function be assessed? What are the initial management options for potential TMJ disorders or bruxism?`;
              potentialSuggestions.push({ label: specificLabel, condition, question });
              addedLabels.add(specificLabel);
              suggestionCount++;
           }
      }

      // Use the collected suggestions (already limited to 3 by suggestionCount)
      const finalSuggestions = potentialSuggestions;

      console.log("[generateSuggestions] Final generated suggestions (more exact labels):", JSON.stringify(finalSuggestions, null, 2)); // Enhanced logging
      return finalSuggestions; // Return the selected suggestions
    };

  // useEffect hook to fetch patient details when selectedPatientId changes
  useEffect(() => {
    const fetchDetails = async () => {
      if (!selectedPatientId) {
        setFetchedPatientDetails(null);
        console.log("[fetchDetails] No patient selected, clearing details.");
        return;
      }
      console.log("[fetchDetails] Fetching details for patient ID:", selectedPatientId);
      try {
        const { data, error } = await supabase
          .from('patients')
          // Select all columns to get the full patient record
          .select('*')
          .eq('id', selectedPatientId)
          .single();

        if (error) {
          console.error("[fetchDetails] Error fetching patient details:", error);
          setFetchedPatientDetails(null);
          // Optionally show a toast error
        } else if (data) {
          console.log("[fetchDetails] Raw data received:", data);
          // Set the full patient record directly
          console.log("[fetchDetails] Setting fetchedPatientDetails with full record:", data);
          setFetchedPatientDetails(data as PatientDetails); // Cast to ensure type safety
        } else {
          console.log("[fetchDetails] No data received for patient ID:", selectedPatientId);
          setFetchedPatientDetails(null);
        }
      } catch (err) {
         console.error("[fetchDetails] Exception fetching patient details:", err);
         setFetchedPatientDetails(null);
      }
    };

    fetchDetails();

    // Remove fetchTeeth logic
    // Reset selected teeth when dialog closes or patient changes
    if (!open || !selectedPatientId) {
        setSelectedTeethData({}); // Changed
    }

  }, [selectedPatientId, open]); // Run when selectedPatientId or open state changes

  // useEffect hook for generating suggestions based on fetchedPatientDetails
  useEffect(() => {
    console.log("[suggestionEffect] Suggestion useEffect triggered. Patient ID:", selectedPatientId);
    console.log("[suggestionEffect] Using fetchedPatientDetails:", fetchedPatientDetails);

    let generatedSuggestions: Suggestion[] = [];
    // Ensure fetchedPatientDetails is not null and matches the selected ID
    if (selectedPatientId && fetchedPatientDetails && fetchedPatientDetails.id === selectedPatientId) {
      generatedSuggestions = generateSuggestions(fetchedPatientDetails);
      console.log("[suggestionEffect] Generated specific suggestions:", generatedSuggestions);
    } else {
      console.log("[suggestionEffect] Conditions not met for generating specific suggestions.");
    }
    // Set suggestions (no fallback needed as per last requirement)
    setDynamicSuggestions(generatedSuggestions);
    console.log("[suggestionEffect] Set dynamicSuggestions to:", generatedSuggestions);

  }, [selectedPatientId, fetchedPatientDetails]); // Run when ID or fetched details change

  // Effect to clear Condition/Question fields when patient changes
  useEffect(() => {
    console.log("[clearFieldsEffect] Clearing fields due to patient change:", selectedPatientId);
    setCurrentCondition('');
    setCurrentQuestion('');
    setSelectedSuggestionLabel(null); // Clear selected suggestion on patient change
    setGeneratedPlan(null); // Clear generated plan on patient change
    setSelectedTeethData({}); // Changed: Clear selected teeth on patient change
    // Do NOT clear searchTerm here, only when selecting
  }, [selectedPatientId]);

  // Handler for selecting a patient from search results
  const handlePatientSelect = (patient: PatientSummary) => { // Use PatientSummary type
    setSelectedPatientId(patient.id);
    setSelectedPatientName(`${patient.first_name || ''} ${patient.last_name || ''}`.trim());
    setSearchTerm(''); // Clear search term after selection
  };

  // Handler for applying a suggestion (uses default pool)
  const handleSuggestionClick = (suggestion: Suggestion) => {
    setCurrentCondition(suggestion.condition);
    setCurrentQuestion(suggestion.question);
    setSelectedSuggestionLabel(suggestion.label); // Set the clicked suggestion label
  };

  // Handler for the fixed suggestion button
  const handleFixedSuggestionClick = () => {
    setCurrentQuestion("I want three treatment plans");
    // Optionally clear the selected dynamic suggestion label if one was active
    setSelectedSuggestionLabel(null);
    // We don't set currentCondition here
  };

  const handleGenerateTreatmentPlan = async () => {
    if (!selectedPatientId) {
      toast({
        title: "Patient Required",
        description: "Please select a patient",
        variant: "destructive",
        duration: 3000 // Show toast for 3 seconds
      });
      return;
    }
    // Add validation for tooth selection
    if (Object.keys(selectedTeethData).length === 0) { // Changed
      toast({
        title: "Teeth Required",
        description: "Please select at least one tooth.",
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    if (!currentCondition.trim()) { // Reverted: Validate condition
      toast({
        title: "Input Required",
        description: "Please describe the patient's current condition.",
        variant: "destructive", // Corrected syntax
        duration: 3000        // Corrected syntax
      });
      return;
    }
    if (!currentQuestion.trim()) { // Reverted: Validate question
      toast({
        title: "Input Required",
        description: "Please enter the specific question for the AI.",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedPlan(null); // Clear previous plan before generating new one

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log("Fetch request timed out after 120 seconds");
    }, 120000); // 120 seconds

    try {
      // n8n webhook URL
      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL_TREATMENT_GENERATOR;
      if (!webhookUrl) {
        throw new Error("VITE_N8N_WEBHOOK_URL_TREATMENT_GENERATOR environment variable is not set.");
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send patient ID and the issue description to the webhook
        body: JSON.stringify({
          patientId: selectedPatientId,
          toothIds: Object.keys(selectedTeethData).map(Number), // Changed: Extract IDs for webhook
          condition: currentCondition,
          question: currentQuestion,
          // Include the entire fetched patient record
          patientRecord: fetchedPatientDetails, // Send the full object or null
        }),
        signal: controller.signal, // Add the abort signal
      });

      clearTimeout(timeoutId); // Clear the timeout if the request completes

      const responseText = await response.text(); // Read the entire response as text first

      if (!response.ok) {
        // Log the response body for more detailed error information
        console.error('Error response from webhook (not ok):', response.status, responseText);
        throw new Error(`Webhook call failed with status: ${response.status}. Response: ${responseText.substring(0, 200)}...`);
      }

      // Parse the JSON response from the webhook
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError: any) {
        console.error("Failed to parse JSON response from webhook:", parseError);
        console.error("Raw response text was:", responseText);
        throw new Error(`Invalid JSON response from AI generator. Content: ${responseText.substring(0, 200)}...`);
      }

      // Extract the 'output' object first
      // console.log("Webhook response data:", responseData); // Original console.log
      console.log("Successfully parsed webhook response data:", responseData); // More descriptive log

      const outputObject = responseData?.[0]?.output;

      // Check if the 'output' object exists
      if (outputObject) {
        // Store the stringified version of the *output* object for display parsing
        const planStringForDisplay = JSON.stringify(outputObject);
        setGeneratedPlan(planStringForDisplay);

        // Extract the 'response' object for saving
        const responseObjectForSave = outputObject.response;
        const planStringForSave = JSON.stringify(responseObjectForSave || {}); // Ensure we save at least an empty object string

        toast({
          title: "Treatment Plan Generated",
            description: "The AI-generated plan is now available below.",
            variant: "default",
            duration: 5000
        });

        // --- Save the generated plan and link teeth ---
        // Step 1: Insert the main AI plan record and select its ID
        const { data: aiPlanData, error: insertError } = await supabase
          .from('ai_treatment_plans')
          .insert({
            patient_id: selectedPatientId,
            title: currentCondition,        // Map condition to title
            description: currentQuestion,   // Map question to description
            content: planStringForSave,     // Map stringified 'response' object to content
            created_at: new Date().toISOString(), // Add current timestamp
            // Assuming 'status', 'approved_by', 'updated_at' have defaults or are nullable
          })
          .select('id') // Select the ID of the newly created record
          .single(); // Expect only one record

        if (insertError) {
          console.error("Error saving AI treatment plan to database:", insertError);
          toast({
            title: "Save Failed",
            description: "Failed to save the main AI plan details. Check console.",
            variant: "destructive",
            duration: 5000
          });
        } else if (aiPlanData) {
          console.log("AI treatment plan saved successfully with ID:", aiPlanData.id);
          const newAiPlanId = aiPlanData.id;

          // Step 2: Insert into the ai_treatment_plans_teeth junction table
          const currentSelectedToothIds = Object.keys(selectedTeethData).map(Number); // Changed
          if (currentSelectedToothIds && currentSelectedToothIds.length > 0) { // Changed
            const teethLinks = currentSelectedToothIds.map(toothId => ({ // Changed
              ai_treatment_plan_id: newAiPlanId,
              tooth_id: toothId,
            }));

            const { error: teethLinkError } = await supabase
              .from('ai_treatment_plans_teeth') // Junction table name
              .insert(teethLinks);

            if (teethLinkError) {
              console.error("Error linking teeth to AI treatment plan:", teethLinkError);
              // Notify user about partial success
              toast({
                title: "Partial Save",
                description: "AI plan saved, but failed to link selected teeth. Check console.",
                variant: "default", // Changed from "warning" to "default"
                duration: 5000
              });
            } else {
              console.log("Teeth linked to AI treatment plan successfully.");
              // Optionally update the success toast
              // toast({ title: "Plan Saved", description: "AI plan and associated teeth saved.", variant: "default" });
            }
          }
        }
        // --- End Save Logic ---

      } else {
        console.error("Could not extract output object from webhook response:", responseData);
        throw new Error("Received invalid response format from AI generator (missing output).");
      }

    } catch (error: unknown) { // Explicitly type error as unknown
      console.error('Error generating treatment plan:', error);
      let errorMessage = 'Please check console for details.';
      if (error instanceof Error) {
        errorMessage = error.message;
        if ((error as any).name === 'AbortError') {
          errorMessage = 'The request timed out after 120 seconds.';
        }
      }
      toast({
        title: "Generation Failed",
        description: `Could not trigger treatment plan generation. ${errorMessage}`,
        variant: "destructive",
        duration: 5000 // Show longer for error
      });
    } finally {
      clearTimeout(timeoutId); // Also clear timeout in finally block in case of early exit
      setIsGenerating(false); // Ensure loading state is reset
    }
  };

  // Reset state when dialog closes (or when triggered externally)
  const handleDialogClose = () => {
    setGeneratedPlan(null); // Clear generated plan on dialog close
    setSelectedTeethData({}); // Clear selected teeth on dialog close
    setSelectedPatientId(''); // Clear selected patient ID
    setSelectedPatientName(''); // Clear selected patient name
    setSearchTerm(''); // Clear search term
    setCurrentCondition(''); // Clear condition
    setCurrentQuestion(''); // Clear question
    setFetchedPatientDetails(null); // Clear fetched details
    setDynamicSuggestions([]); // Clear suggestions
    setSelectedSuggestionLabel(null); // Clear selected suggestion label
    onOpenChange(false); // Notify parent that the dialog should close
  };

  // Filter patients based on search term
  const filteredPatients = patients.filter(patient => {
    const name = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase();
    const phone = patient.phone?.toLowerCase() || '';
    const regNum = patient.registration_number?.toLowerCase() || '';
    const searchLower = searchTerm.toLowerCase();
    return name.includes(searchLower) || phone.includes(searchLower) || regNum.includes(searchLower);
  });

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      {/* Added max-height and overflow to DialogContent */}
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCog className="h-5 w-5" />
            AI Treatment Plan Generator
          </DialogTitle>
          <DialogDescription>
            Select a patient and describe the current issue to generate a treatment plan using AI.
          </DialogDescription>
        </DialogHeader>
        {/* Reduced vertical spacing from space-y-4 to space-y-3 */}
        <div className="space-y-3 py-4">
          {/* Patient Selection - Replaced with Search Input */}
          <div className="space-y-2 relative"> {/* Added relative positioning */}
            <Label htmlFor="patient-search">Select Patient</Label>
            <Input
              type="search"
              id="patient-search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                // Clear selection when user starts typing again
                if (selectedPatientId) {
                  setSelectedPatientId('');
                  setSelectedPatientName('');
                  setFetchedPatientDetails(null); // Clear details if selection is cleared
                }
              }}
              placeholder={selectedPatientName || "Search by name, phone, or registration..."} // Updated placeholder
              className="w-full"
              // Optionally disable if patients are loading (if applicable)
              // disabled={isLoadingPatients}
            />

            {/* Search Results Dropdown */}
            {searchTerm && ( // Only show dropdown if there's a search term
              <ScrollArea className="absolute z-10 w-full bg-background border rounded-md shadow-lg mt-1 max-h-60"> {/* Dropdown styling */}
                <div className="p-2">
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((patient) => (
                      <Button
                        key={patient.id}
                        variant="ghost" // Use ghost variant for list items
                        className="w-full justify-start text-left h-auto py-2 px-3 mb-1" // Adjust padding/margin
                        onClick={() => handlePatientSelect(patient)}
                      >
                        <div>
                          <div>{`${patient.first_name || ''} ${patient.last_name || ''}`.trim()}</div>
                          <div className="text-xs text-muted-foreground">
                            {patient.registration_number && `Reg: ${patient.registration_number}`}
                            {patient.registration_number && patient.phone && " | "}
                            {patient.phone && `Ph: ${patient.phone}`}
                            {/* Show ID if neither Reg nor Phone is available */}
                            {!patient.registration_number && !patient.phone && `ID: ${patient.id.substring(0, 6)}...`}
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
             {/* Optional: Add loading/error indicators if patients are fetched dynamically */}
             {/* {isLoadingPatients && <p className="text-sm text-muted-foreground mt-1">Loading patients...</p>} */}
             {/* {errorPatients && <p className="text-sm text-destructive mt-1">{errorPatients}</p>} */}
          </div>

          {/* Tooth Selection Field - Using ToothSelector */}
          <div className="space-y-2">
            <Label>Teeth *</Label>
            {selectedPatientId ? (
              <ToothSelector
                value={selectedTeethData} // Use the existing state for selected IDs - Changed
                onChange={setSelectedTeethData} // Use the existing state setter - Changed
                placeholder="Select Affected Teeth..."
                disabled={!selectedPatientId} // Disable if no patient selected
              />
            ) : (
              // Display placeholder text when no patient is selected
              <div className="flex items-center justify-center h-10 px-3 border rounded-md bg-gray-50 text-sm text-muted-foreground">
                Select a patient to enable teeth selection.
              </div>
            )}
          </div>

          {/* Current Condition Input */}
          {/* Condition Input */}
          <div className="space-y-2">
            <Label htmlFor="condition-input">Condition</Label>
            <Textarea
              id="condition-input"
              placeholder="Describe symptoms, observations, relevant history..."
              rows={5}
              value={currentCondition} // Still using currentCondition state variable
              onChange={(e) => setCurrentCondition(e.target.value)}
              disabled={!selectedPatientId} // Disable if no patient selected
            />
          </div>

          {/* Question Input */}
          <div className="space-y-2">
            <Label htmlFor="question-input">Question</Label>
            <Textarea
              id="question-input"
              placeholder="What specific question do you have based on the condition?"
              rows={3}
              value={currentQuestion} // Still using currentQuestion state variable
              onChange={(e) => setCurrentQuestion(e.target.value)}
              disabled={!selectedPatientId} // Disable if no patient selected
            />
          </div>

          {/* Query Suggestions (Simplified - Always show default pool if patient selected) */}
          {/* Show suggestions *only* if patient-specific ones were generated */}
          {selectedPatientId && dynamicSuggestions.length > 0 && (
            <div className="space-y-2 pt-2"> {/* Keep pt-2 for spacing above label */}
              <Label>Query Suggestions</Label> {/* Updated Label */}
              {/* Changed layout to horizontal wrap, removed ScrollArea */}
              <div className="flex flex-wrap gap-2 pt-1"> {/* Use flex-wrap and gap */}
                {/* Fixed Suggestion Button */}
                <Button
                  key="fixed-suggestion"
                  disabled={!selectedPatientId}
                  variant="ghost"
                  size="sm"
                  // Using similar styling but maybe a slightly different color scheme if needed
                  // For now, using the unselected style
                  className={`
                    h-auto px-2.5 py-0.5 rounded-full border-none
                    transition-colors duration-150 ease-in-out
                    focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0118D8]
                    disabled:opacity-60 disabled:cursor-not-allowed
                    bg-[#e8eefd] text-[#1B56FD] hover:bg-[#d1dffd]
                    disabled:bg-blue-50 disabled:text-blue-300
                  `}
                  onClick={handleFixedSuggestionClick} // Use the new handler
                >
                  I want three treatment plans
                </Button>

                {/* Dynamic Patient-Specific Suggestions */}
                {dynamicSuggestions.map((suggestion, index) => {
                  const isSelected = suggestion.label === selectedSuggestionLabel;
                  const baseClasses = `
                    h-auto px-2.5 py-0.5
                    rounded-full
                    border-none
                    transition-colors duration-150 ease-in-out
                    focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0118D8]
                    disabled:opacity-60 disabled:cursor-not-allowed
                  `;
                  const selectedClasses = `
                    bg-[#1B56FD] /* Main blue background */
                    text-white /* White text */
                    hover:bg-[#0118D8] /* Darker blue hover */
                    disabled:bg-blue-300 disabled:text-gray-100
                  `;
                  const unselectedClasses = `
                    bg-[#e8eefd] /* Light blue background */
                    text-[#1B56FD] /* Main blue text */
                    hover:bg-[#d1dffd] /* Slightly darker light blue hover */
                    disabled:bg-blue-50 disabled:text-blue-300
                  `;

                  return (
                    <Button
                      key={index}
                      disabled={!selectedPatientId}
                      variant="ghost"
                      size="sm"
                      className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion.label}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground pt-1">Click a suggestion to populate the fields above. The fixed suggestion only populates the question.</p> {/* Updated description */}
            </div>
          )}
          {/* Render suggestions section even if only the fixed one is available */}
          {selectedPatientId && dynamicSuggestions.length === 0 && (
             <div className="space-y-2 pt-2">
              <Label>Query Suggestions</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                 <Button
                  key="fixed-suggestion-only"
                  disabled={!selectedPatientId}
                  variant="ghost"
                  size="sm"
                  className={`
                    h-auto px-2.5 py-0.5 rounded-full border-none
                    transition-colors duration-150 ease-in-out
                    focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0118D8]
                    disabled:opacity-60 disabled:cursor-not-allowed
                    bg-[#e8eefd] text-[#1B56FD] hover:bg-[#d1dffd]
                    disabled:bg-blue-50 disabled:text-blue-300
                  `}
                  onClick={handleFixedSuggestionClick}
                >
                  I want three treatment plans
                </Button>
              </div>
               <p className="text-xs text-muted-foreground pt-1">Click the suggestion to populate the question field.</p>
            </div>
          )}

          {/* Display Generated Plan - Design Refresh v2 */}
          {generatedPlan && (
            <div className="pt-6 mt-6 border-t border-gray-200">
              <Label className="text-base font-medium mb-3 block text-gray-700">
                AI Generated Plan
              </Label>
              <div className="flex items-start space-x-3">
                {/* Icon */}
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200 shadow-sm">
                  <Bot className="w-5 h-5 text-indigo-600" />
                </div>
                {/* Bubble Container - Added overflow-hidden */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  {/* Bubble with ScrollArea - Enhanced Rendering */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    {/* Removed max-h-96 to prevent truncation */}
                    <ScrollArea className="h-auto pr-4">
                      <div className="space-y-4 text-sm text-gray-800"> {/* Use space-y for structure */}
                        {(() => {
                          // Define helpers inside the IIFE scope
                          const renderSection = (title: string, content: string | undefined, className: string = "mb-4") => {
                            if (!content) return null;
                            return (
                              <div className={className}>
                                <strong className="block font-semibold text-gray-800 mb-1">{title}:</strong>
                                <p className="text-gray-700 whitespace-pre-wrap">{content}</p>
                              </div>
                            );
                          };

                          const renderSteps = (steps: string | undefined) => {
                            if (!steps || typeof steps !== 'string') return null;
                            if (steps.match(/^\s*\d+\.\s+/m)) {
                              return (
                                <ol className="list-decimal list-inside pl-4 mt-1 space-y-1 text-gray-700">
                                  {steps.split(/\n?\s*\d+\.\s+/).filter(Boolean).map((item: string, i: number) => (
                                    <li key={i}>{item.trim()}</li>
                                  ))}
                                </ol>
                              );
                            }
                            return <p className="text-gray-700 whitespace-pre-wrap mt-1">{steps}</p>;
                          };

                          try {
                            // Parse the stringified 'output' object stored in generatedPlan
                            const outputData = JSON.parse(generatedPlan);
                            // Extract the 'response' object which contains the actual plan data
                            const planData = outputData.response;

                            // Check if planData (the response object) is valid
                            if (typeof planData !== 'object' || planData === null) {
                              console.warn("Extracted response data is not an object:", planData);
                              // Display the raw generatedPlan (stringified output) if response is invalid
                              return <pre className="whitespace-pre-wrap text-xs">{generatedPlan}</pre>;
                            }

                            // Render the sections based on the extracted planData
                            return (
                              <div className="space-y-6">
                                {renderSection("Clinical Assessment", planData.clinicalAssessment)}
                                {renderSection("Evidence & Rationale", planData.evidenceAndRationale)}

                                {/* Conditionally render Treatment Plans section */}
                                {planData.treatmentPlans && Array.isArray(planData.treatmentPlans) && planData.treatmentPlans.length > 0 && (
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Treatment Plans</h3>
                                    <div className="space-y-6">
                                      {planData.treatmentPlans.map((plan: any, index: number) => (
                                        <div key={index} className="pl-2 border-l-4 border-indigo-200">
                                          {plan.planName && <h4 className="text-base font-semibold text-indigo-700 mb-2">{plan.planName}</h4>}
                                          {renderSection("Recommendation", plan.recommendation, "mb-2")}
                                          {renderSection("Approach", plan.approach, "mb-2")}
                                          {renderSection("Benefits", plan.benefits, "mb-2")}
                                          {renderSection("Considerations", plan.considerations, "mb-2")}
                                          {plan.procedureSteps && (
                                            <div className="mb-2">
                                              <strong className="block font-semibold text-gray-800 mb-1">Procedure Steps:</strong>
                                              {renderSteps(plan.procedureSteps)}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {renderSection("Follow Up", planData.followUp)}
                                {renderSection("Patient Instructions", planData.patientInstructions)}
                              </div>
                            );
                          } catch (error) {
                            console.warn("Failed to parse generatedPlan (output object) as JSON, displaying raw:", error);
                            return <pre className="whitespace-pre-wrap text-xs">{generatedPlan}</pre>;
                          }
                        })()}
                      </div>
                    </ScrollArea>
                  </div>
                  {/* Placeholder for Action Icons - Kept for potential future use */}
                  {/* <div className="flex items-center space-x-2 mt-2 text-gray-400">
                    <button className="hover:text-indigo-600"><Copy className="w-4 h-4" /></button>
                    <button className="hover:text-indigo-600"><Share2 className="w-4 h-4" /></button>
                    <button className="hover:text-indigo-600"><ThumbsUp className="w-4 h-4" /></button>
                    <button className="hover:text-indigo-600"><ThumbsDown className="w-4 h-4" /></button>
                  </div> */}
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleDialogClose}>Cancel</Button>
          <Button
            onClick={handleGenerateTreatmentPlan}
            disabled={
              !selectedPatientId ||
              Object.keys(selectedTeethData).length === 0 || // Changed
              !currentCondition.trim() ||
              !currentQuestion.trim()
            }
            className={`ai-insights-button ${isGenerating ? 'opacity-100 cursor-not-allowed' : ''}`}
            style={isGenerating ? { opacity: 1 } : {}}
          >
            {isGenerating ? (
              <>
                <BrainCog className="mr-2 h-4 w-4 animate-spin" />
                {"AI is thinking... (this may take up to 2 minutes)"}
              </>
            ) : (
              <>
                <BrainCog className="mr-2 h-4 w-4" /> 
                Generate Plan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Make sure to update the import paths if your project structure differs
// e.g. import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Ensure you have installed and configured any necessary libraries (e.g., for icons if using Lucide).

// Note:
// 1. The n8n webhook URL is now set to the one you provided.
// 2. Ensure the parent component that uses AITreatmentGenerator provides the 'patients' prop correctly.
// 3. The parent component should manage the 'open' state of the dialog.
// 4. Error handling for the fetch call is included, logging errors to the console.
// 5. UI elements like Loaders and Icons are assumed to be correctly imported from a library like lucide-react or similar. Adjust imports based on your project setup.
