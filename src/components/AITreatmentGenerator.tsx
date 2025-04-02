import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, BrainCog, FileCheck, Stethoscope, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Added Select import
import { formatCurrency } from '@/lib/utils/validation';
import { Database } from '@/lib/database.types'; // Import the main Database type

// Define Patient type based on database schema
type Patient = Database['public']['Tables']['patients']['Row'];

interface TreatmentOption {
  type: string;
  priority: string;
  description: string;
  estimatedCost: number;
  successRate: number;
  benefits: string[];
  risks: string[];
  timelineEstimate: string;
  recommendedMaterials?: string[];
  followUpPlan?: string;
}

interface TreatmentPlan {
  title: string;
  description: string;
  primaryOption: TreatmentOption;
  alternativeOptions: TreatmentOption[];
  patientFriendlyExplanation?: string;
  summary: string;
  dataAnalysisSummary: string;
  estimatedTotalCost: number;
  expectedOutcome: string;
  estimatedInsuranceCoverage: number;
  estimatedOutOfPocket: number;
  preventiveMeasures: string[];
  postTreatmentCare: string[];
  followUpSchedule: string[];
  educationalResources: string[];
  consentRequirements: {
    required: boolean;
    details: string[];
    risks: string[];
    alternatives: string[];
  };
  patientResponsibilities: string[];
}

interface AITreatmentGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (treatmentPlan: TreatmentPlan & { patient_id: string }) => void; // Modified onSubmit
  patients: Patient[]; // Added patients prop
  loading?: boolean; // Added optional loading prop from parent
}

export function AITreatmentGenerator({
  open,
  onOpenChange,
  onSubmit,
  patients,
}: AITreatmentGeneratorProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [currentIssue, setCurrentIssue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<TreatmentPlan | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false); // Keep this for the inner details dialog
  const { toast } = useToast();

  // Reset state when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedPatientId('');
      setCurrentIssue('');
      setGeneratedPlan(null);
      setIsGenerating(false);
      setIsDetailDialogOpen(false); // Also close inner dialog if open
    }
    onOpenChange(isOpen);
  };

  const handleGenerateTreatmentPlan = async () => {
    if (!selectedPatientId) {
      toast({
        title: "Patient Required",
        description: "Please select a patient",
        variant: "destructive"
      });
      return;
    }
    if (!currentIssue.trim()) {
      toast({
        title: "Input Required",
        description: "Please describe the current dental issue",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedPlan(null); // Clear previous plan before generating new one
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/treatment-ai`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: selectedPatientId, // Use selected patient ID
          currentIssue,
          // TODO: Ideally fetch these details for the selected patient
          medicalHistory: [],
          previousTreatments: [],
          assessments: [],
          diagnosticImages: []
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate treatment plan');
      }

      const plan: TreatmentPlan = await response.json();
      setGeneratedPlan(plan);

      // Call the parent's onSubmit, adding the patient_id
      onSubmit({ ...plan, patient_id: selectedPatientId });

      // Close the main generator dialog after successful submission
      handleOpenChange(false);

      // Toast is now handled by the parent page upon successful creation
      // toast({
      //   title: "Treatment Plan Generated",
      //   description: "AI has successfully created a personalized treatment plan",
      // });
    } catch (error) {
      console.error('Error generating treatment plan:', error);
      toast({ // Corrected toast call syntax
        title: "Generation Failed",
        description: "Could not generate treatment plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Find selected patient name for display
  const selectedPatientName = patients.find(p => p.id === selectedPatientId)
    ? `${patients.find(p => p.id === selectedPatientId)?.first_name} ${patients.find(p => p.id === selectedPatientId)?.last_name}`
    : 'Select Patient';

  const renderTreatmentOption = (option: TreatmentOption, isAlternative = false) => {
    // This function remains the same as before
    return (
      <Card className={`${isAlternative ? 'border-dashed' : 'border-solid'} mb-4`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-base">{option.type}</CardTitle>
            <Badge variant={isAlternative ? "outline" : "default"}>
              {option.priority} priority
            </Badge>
          </div>
          <CardDescription>{option.description}</CardDescription>
        </CardHeader>
        <CardContent className="pb-2 pt-0">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Estimated Cost</p>
              <p className="text-lg font-bold">{formatCurrency(option.estimatedCost)}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium">Success Rate</p>
              <div className="flex items-center gap-2">
                <Progress value={option.successRate} className="h-2" />
                <span className="text-sm">{option.successRate}%</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm font-medium text-green-600">Benefits</p>
                <ul className="text-sm list-disc ml-4">
                  {option.benefits.slice(0, 3).map((benefit: string, i: number) => (
                    <li key={i}>{benefit}</li>
                  ))}
                  {option.benefits.length > 3 && <li>...</li>}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium text-red-600">Risks</p>
                <ul className="text-sm list-disc ml-4">
                  {option.risks.slice(0, 3).map((risk: string, i: number) => (
                    <li key={i}>{risk}</li>
                  ))}
                  {option.risks.length > 3 && <li>...</li>}
                </ul>
              </div>
            </div>
            
            <p className="text-sm">
              <span className="font-medium">Timeline: </span>
              {option.timelineEstimate}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Note: The inner details dialog logic remains largely the same,
  // but the main component is now wrapped in the Dialog component.

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
             <BrainCog className="h-5 w-5" />
             AI Treatment Plan Generator
          </DialogTitle>
          <DialogDescription>
             Use AI to create evidence-based dental treatment options based on patient data.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Patient Selection */}
          <div className="space-y-2">
            <Label htmlFor="patient-select">Select Patient</Label>
            <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
              <SelectTrigger id="patient-select" className="w-full">
                <SelectValue placeholder="Select a patient..." />
              </SelectTrigger>
              <SelectContent>
                {patients.length === 0 && <SelectItem value="loading" disabled>Loading patients...</SelectItem>}
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.first_name} {patient.last_name} (ID: {patient.id.substring(0, 6)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current Issue Input */}
          <div className="space-y-2">
            <Label htmlFor="current-issue">Describe the Current Dental Issue</Label>
            <Textarea
              id="current-issue"
              placeholder="Provide details about symptoms, observations, patient complaints, and relevant history..."
              rows={5}
              value={currentIssue}
              onChange={(e) => setCurrentIssue(e.target.value)}
              disabled={!selectedPatientId} // Disable if no patient selected
            />
            <p className="text-xs text-muted-foreground">
              The AI will analyze this along with patient records for '{selectedPatientName}' to generate appropriate treatment options.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleGenerateTreatmentPlan}
            disabled={isGenerating || !currentIssue.trim() || !selectedPatientId}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Stethoscope className="mr-2 h-4 w-4" />
                Generate Treatment Plan
              </>
            )}
          </Button>
        </DialogFooter>

        {/* The generated plan preview and details dialog are removed from here
            as the parent page now handles the plan after generation via onSubmit */}

      </DialogContent>
      {/* The inner Dialog for showing full plan details is removed for simplicity.
          The parent page shows details after creation. If needed later, it can be added back. */}
      {/* The renderTreatmentOption function and the inner Dialog related to isDetailDialogOpen are kept
          in case they are needed later, but they are not currently rendered by the main return statement. */}
      {/* <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}> ... </Dialog> */}
    </Dialog>
  );
}
