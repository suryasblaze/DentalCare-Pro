import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, BrainCog, Bot } from 'lucide-react'; // Added Bot icon
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogFooter, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea
import type { Database } from '@/../supabase_types'; // Corrected import path to root supabase_types.ts
import { supabase } from '@/lib/supabase'; // Import supabase client

// Define Suggestion type
interface Suggestion {
  label: string;
  condition: string;
  question: string;
}

// Use the full Patient type from Supabase schema
type PatientDetails = Database['public']['Tables']['patients']['Row'];

// Suggestion Pool (templates to be used)
const suggestionPool: Suggestion[] = [
  {
    label: "Pulp Involvement Check",
    condition: "Patient has persistent, throbbing tooth pain in the lower right molar, with sensitivity to temperature and pain worsening at night. There is slight swelling in the gums. Previous filling was done two years ago on the same tooth.", // Example condition
    question: "Is this a sign of irreversible pulpitis or possible abscess? What diagnostic tests should I run to confirm the cause, and what treatment would be best?" // Example question
  },
  {
    label: "Gum Health & Clicking Jaw",
    condition: "Patient reports mild jaw clicking in the mornings and visible gum recession near the lower front teeth. There is no severe pain, but concern over gum health and possible TMJ issues.", // Example condition
    question: "Could this be early TMJ or bruxism-related? What steps should I take to assess jaw function and prevent further gum deterioration?" // Example question
  },
  {
    label: "Pain Management & Treatment",
    condition: "Severe tooth pain in the lower right molar, with past filling history. Patient only gets temporary relief from OTC meds. Pain increases while chewing and during nighttime. Gum around the molar appears swollen.", // Example condition
    question: "What pain management options should I recommend while diagnostics are being conducted? Should I consider root canal therapy immediately or explore less invasive treatments first?" // Example question
  }
  // Add more potential suggestions to the pool if needed
];


// Define Patient type based on database schema (assuming it exists)
// type Patient = Database['public']['Tables']['patients']['Row']; // Assuming this structure

interface AITreatmentGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: { id: string; first_name: string; last_name: string }[];
  // Removed patientDetails prop
}

export function AITreatmentGenerator({
  open,
  onOpenChange,
  patients,
}: AITreatmentGeneratorProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  // State now holds the full patient record or null
  const [fetchedPatientDetails, setFetchedPatientDetails] = useState<PatientDetails | null>(null);
  const [currentCondition, setCurrentCondition] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [dynamicSuggestions, setDynamicSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestionLabel, setSelectedSuggestionLabel] = useState<string | null>(null); // State for clicked suggestion
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null); // State to store the AI response
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
      // Use optional chaining and nullish coalescing
      const lifestyleConcerns = (details.lifestyle_habits as any)?.additional_concerns?.toLowerCase() || '';

      console.log("[generateSuggestions] Parsed medicalConditions array:", medicalConditions);
      console.log("[generateSuggestions] Parsed lifestyleConcerns string:", lifestyleConcerns);


      const pulpKeywords = ['pain', 'throbbing', 'sensitivity', 'swelling', 'abscess', 'molar', 'filling', 'root canal', 'severe tooth pain'];
      const tmjKeywords = ['jaw', 'clicking', 'tmj', 'bruxism', 'grinding', 'gum', 'recession', 'periodontal', 'bleeding', 'gum recession'];

      // Log keyword matching checks
      const hasPulpKeywords = pulpKeywords.some(keyword => {
          const medicalMatch = medicalConditions.includes(keyword);
          const lifestyleMatch = lifestyleConcerns.includes(keyword);
          const match = medicalMatch || lifestyleMatch;
          if (match) console.log(`[generateSuggestions] Pulp keyword '${keyword}' match: medical=${medicalMatch}, lifestyle=${lifestyleMatch}`);
          return match;
      });
      console.log("[generateSuggestions] Result hasPulpKeywords:", hasPulpKeywords); // Log keyword match result


      if (hasPulpKeywords) {
          const pulpSuggestion = suggestionPool.find(s => s.label === "Pulp Involvement Check");
          if (pulpSuggestion && !suggestions.includes(pulpSuggestion)) suggestions.push(pulpSuggestion);
          const painSuggestion = suggestionPool.find(s => s.label === "Pain Management & Treatment");
          if (painSuggestion && !suggestions.includes(painSuggestion)) suggestions.push(painSuggestion);
      }

      const hasTmjKeywords = tmjKeywords.some(keyword => {
          const medicalMatch = medicalConditions.includes(keyword);
          const lifestyleMatch = lifestyleConcerns.includes(keyword);
          const match = medicalMatch || lifestyleMatch;
          if (match) console.log(`[generateSuggestions] TMJ keyword '${keyword}' match: medical=${medicalMatch}, lifestyle=${lifestyleMatch}`);
          return match;
      });
      console.log("[generateSuggestions] Result hasTmjKeywords:", hasTmjKeywords); // Log keyword match result


      if (hasTmjKeywords) {
          const tmjSuggestion = suggestionPool.find(s => s.label === "Gum Health & Clicking Jaw");
          if (tmjSuggestion && !suggestions.includes(tmjSuggestion)) suggestions.push(tmjSuggestion);
      }

      console.log("[generateSuggestions] Final generated suggestions:", suggestions);
      return suggestions;
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
  }, [selectedPatientId]); // Run only when selectedPatientId changes

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
  }, [selectedPatientId]);

  // Handler for applying a suggestion (uses default pool)
  const handleSuggestionClick = (suggestion: Suggestion) => {
    setCurrentCondition(suggestion.condition);
    setCurrentQuestion(suggestion.question);
    setSelectedSuggestionLabel(suggestion.label); // Set the clicked suggestion label
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

    try {
      // n8n webhook URL
      const webhookUrl = 'https://n8n1.kol.tel/webhook/33d4fdab-98eb-4cc4-8a69-2ab835e76511';

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send patient ID and the issue description to the webhook
        body: JSON.stringify({
          patientId: selectedPatientId,
          condition: currentCondition,
          question: currentQuestion,
          // Include the entire fetched patient record
          patientRecord: fetchedPatientDetails, // Send the full object or null
        }),
      });

      if (!response.ok) {
        // Log the response body for more detailed error information
        const errorBody = await response.text();
        console.error('Error response from webhook:', response.status, errorBody);
        throw new Error(`Webhook call failed with status: ${response.status}`);
      }

      // Parse the JSON response from the webhook
      const responseData = await response.json();
      console.log("Webhook response data:", responseData);

      // Extract the plan text based on the provided structure
      const planText = responseData?.[0]?.output?.response;

      if (planText && typeof planText === 'string') {
        setGeneratedPlan(planText);
        toast({
          title: "Treatment Plan Generated",
          description: "The AI-generated plan is now available below.",
          variant: "default",
          duration: 5000
        });

        // --- Save the generated plan to Supabase ---
        const { error: insertError } = await supabase
          .from('ai_treatment_plans')
          .insert({
            patient_id: selectedPatientId,
            title: currentCondition,        // Map condition to title
            description: currentQuestion,   // Map question to description
            content: planText,              // Map generated plan to content
            created_at: new Date().toISOString(), // Add current timestamp
            // Assuming 'status', 'approved_by', 'updated_at' have defaults or are nullable
          });

        if (insertError) {
          console.error("Error saving treatment plan to database:", insertError);
          toast({
            title: "Save Failed",
            description: "The generated plan was displayed, but failed to save to the database. Check console.",
            variant: "destructive",
            duration: 5000
          });
        } else {
          // Optionally add a specific "Saved" toast, or modify the "Generated" one
          console.log("AI treatment plan saved successfully.");
          // Example: Modify the previous toast or add a new one
          // toast({ title: "Plan Saved", description: "The generated plan was saved successfully.", variant: "default" });
        }
        // --- End Save Logic ---

      } else {
        console.error("Could not extract plan text from webhook response:", responseData);
        throw new Error("Received invalid response format from AI generator.");
      }

    } catch (error: unknown) { // Explicitly type error as unknown
      console.error('Error generating treatment plan:', error);
      let errorMessage = 'Please check console for details.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Generation Failed",
        description: `Could not trigger treatment plan generation. ${errorMessage}`,
        variant: "destructive",
        duration: 5000 // Show longer for error
      });
    } finally {
      setIsGenerating(false); // Ensure loading state is reset
    }
  };

  // Reset state when dialog closes (or when triggered externally)
  const handleDialogClose = () => {
    // Resetting state is handled by the parent component managing the 'open' prop
    // and potentially resetting selectedPatientId/currentIssue when closing.
    // No specific action needed here unless we want to clear fields on cancel explicitly.
    // Let's keep it simple for now. If needed, we can add:
    // setSelectedPatientId('');
    // setCurrentIssue('');
    setGeneratedPlan(null); // Clear generated plan on dialog close
    onOpenChange(false); // Notify parent that the dialog should close
  };

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
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label htmlFor="patient-select">Select Patient</Label>
            {/* Assuming patients prop is passed down correctly */}
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
              <SelectTrigger id="patient-select" className="w-full">
                 {/* Display selected patient name or placeholder */}
                 <SelectValue placeholder="Select a patient...">
                   {selectedPatientId ? patients.find(p => p.id === selectedPatientId)?.first_name + ' ' + patients.find(p => p.id === selectedPatientId)?.last_name : "Select a patient..."}
                 </SelectValue>
              </SelectTrigger>
              <SelectContent>
                 {/* Render patient options */}
                 {patients && patients.length > 0 ? (
                    patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name} (ID: {patient.id.substring(0, 6)})
                      </SelectItem>
                    ))
                 ) : (
                   <SelectItem value="loading" disabled>Loading patients...</SelectItem> // Or handle empty state
                 )}
              </SelectContent>
            </Select>
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
              <Label>Query Suggestions (Patient-Specific)</Label>
              {/* Changed layout to horizontal wrap, removed ScrollArea */}
              <div className="flex flex-wrap gap-2 pt-1"> {/* Use flex-wrap and gap */}
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
              <p className="text-xs text-muted-foreground pt-1">Click a suggestion to populate the fields above.</p>
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
                  {/* Bubble with ScrollArea - Removed fixed max-h from ScrollArea, let DialogContent handle scroll */}
                  {/* Added prose classes for markdown formatting */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    {/* Removed max-h from ScrollArea */}
                    <ScrollArea className="h-auto pr-4">
                      {/* Added prose classes */}
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-gray-700">
                        {generatedPlan}
                      </div>
                    </ScrollArea>
                  </div>
                  {/* Placeholder for Action Icons */}
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
            disabled={isGenerating || !currentCondition.trim() || !currentQuestion.trim() || !selectedPatientId} // Reverted: Check both fields
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <BrainCog className="mr-2 h-4 w-4" /> {/* Using BrainCog icon */}
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
