import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, BrainCog, Clock, Calendar } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from '@/lib/utils';

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

interface AISuggestionFormProps {
  patientId: string;
  toothIds: number[];
  domain: string;
  condition: string;
  matrixDetails: any;
  selectedTreatment: string;
  symptoms: string;
  description: string;
  patientRecord: any;
  onSuggestionApply: (suggestion: AISuggestion) => void;
  disabled?: boolean;
}

export interface AISuggestion {
  title: string;
  description: string;
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
    condition: string;
    severity: string;
    teethInvolved: string;
    patientSymptoms?: string;
    patientSelectedTreatment?: string;
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

export function AISuggestionForm({
  patientId,
  toothIds,
  domain,
  condition,
  matrixDetails,
  selectedTreatment,
  symptoms,
  description,
  patientRecord,
  onSuggestionApply,
  disabled = false,
}: AISuggestionFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const { toast } = useToast();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);

  const handleGenerateClick = async () => {
    if (isGenerating) return; // Prevent re-clicks while already generating

    if (!selectedTreatment) {
      toast({
        title: 'Missing Information',
        description: 'Please select a treatment option first.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setSuggestions([]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds

    try {
      const signal = controller.signal;
      signal.throwIfAborted(); // Check before the call

      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL_AI_SUGGESTION;
      if (!webhookUrl) {
        throw new Error("VITE_N8N_WEBHOOK_URL_AI_SUGGESTION environment variable is not set.");
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          toothIds,
          domain,
          condition,
          treatment: selectedTreatment,
          details: matrixDetails,
          patientRecord: patientRecord,
          userInput: {
            symptoms,
            description,
          },
        }),
        // signal: controller.signal, // Removed signal from fetch options
      });

      signal.throwIfAborted(); // Check after the call
      clearTimeout(timeoutId); // Clear the timeout if the request completes in time

      if (!response.ok) {
        throw new Error(`AI suggestion failed: ${response.status}`);
      }

      const raw = await response.json();
      const output = raw[0]?.output?.response;

      if (!output || !output.treatmentPlans || !Array.isArray(output.treatmentPlans)) {
        throw new Error('Invalid AI response structure: treatmentPlans missing or not an array.');
      }

      const parsedSuggestions: AISuggestion[] = output.treatmentPlans.map((plan: any) => {
        const planNameOriginal = plan.planName;
        const planNameLower = planNameOriginal?.toLowerCase();
        const patientSelectedTreatmentLower = output.caseOverview?.patientSelectedTreatment?.toLowerCase();

        const c1 = planNameLower?.includes('(patient-selected)');
        const c2 = planNameLower?.includes('(patient selected)');
        const c3 = patientSelectedTreatmentLower && planNameLower?.startsWith(patientSelectedTreatmentLower);
        const isPatientSelected = c1 || c2 || c3;

        console.log(
          `[AISuggestionForm] Plan: ${planNameOriginal} | Lower: ${planNameLower} | C1: ${c1} | C2: ${c2} | patientSelectedTreatmentLower: ${patientSelectedTreatmentLower} | C3 (startsWith): ${c3} | FINAL isPatientSelected: ${isPatientSelected}`
        );

        console.log(`[AISuggestionForm] Raw AI plan object for: ${planNameOriginal}`, plan);

        console.log(`[AISuggestionForm] Metadata source fields for: ${planNameOriginal}`, {
          aiPlanClinicalConsiderations: plan.clinicalConsiderations,
          aiPlanKeyMaterials: plan.keyMaterials,
          aiOutputPostTreatmentCare: output.postTreatmentCare
        });

        return {
          title: plan.planName,
          description: output.clinicalAssessment || "",
          planDetails: {
            planName: plan.planName,
            clinicalProtocol: plan.clinicalProtocol,
            keyMaterials: plan.keyMaterials,
            clinicalConsiderations: plan.clinicalConsiderations,
            expectedOutcomes: plan.expectedOutcomes,
            appointmentPlan: plan.appointmentPlan || plan.planDetails?.appointmentPlan,
            isPatientSelected: isPatientSelected, 
          },
          caseOverview: output.caseOverview,
          patientFactors: output.patientFactors,
          recommendedInvestigations: output.recommendedInvestigations,
          clinicalRationale: output.clinicalRationale,
          postTreatmentCare: output.postTreatmentCare || "",
        };
      });

      setSuggestions(parsedSuggestions);

    } catch (error) {
      clearTimeout(timeoutId); // Ensure timeout is cleared on error as well
      console.error('Error generating suggestions:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        toast({
          title: 'Request Timed Out',
          description: 'The AI suggestion service took too long to respond (120 seconds).',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Generation Failed',
          description: error instanceof Error ? error.message : 'Failed to generate suggestions',
          variant: 'destructive',
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDescription = (suggestion: AISuggestion): string => {
    const parts: string[] = [];

    parts.push(
      `Case Overview:`,
      `  Condition: ${suggestion.caseOverview?.condition || 'N/A'}`,
      `  Severity: ${suggestion.caseOverview?.severity || 'N/A'}`,
      `  Teeth Involved: ${suggestion.caseOverview?.teethInvolved || 'N/A'}`
    );
    if (suggestion.caseOverview?.patientSymptoms) {
      parts.push(`  Patient Symptoms: ${suggestion.caseOverview.patientSymptoms}`);
    }
    if (suggestion.caseOverview?.patientSelectedTreatment) {
      parts.push(`  Patient Selected Treatment: ${suggestion.caseOverview.patientSelectedTreatment}`);
    }

    parts.push(`
Clinical Assessment:`, suggestion.description);

    if (suggestion.patientFactors) {
      parts.push(
        `
Patient Factors:`,
        `  Relevant Medical Conditions: ${suggestion.patientFactors.relevantMedicalConditions}`,
        `  Medication Considerations: ${suggestion.patientFactors.medicationConsiderations}`,
        `  Age-Related Considerations: ${suggestion.patientFactors.ageRelatedConsiderations}`
      );
    }

    if (suggestion.recommendedInvestigations) {
      parts.push(`
Recommended Investigations:`, `  ${suggestion.recommendedInvestigations}`);
    }

    parts.push(
      `
Details for Plan: ${suggestion.title}`,
      `  Clinical Protocol:`,
      `    ${suggestion.planDetails.clinicalProtocol}`,
      `  Key Materials:`,
      `    ${suggestion.planDetails.keyMaterials}`,
      `  Clinical Considerations:`,
      `    ${suggestion.planDetails.clinicalConsiderations}`,
      `  Expected Outcomes:`,
      `    ${suggestion.planDetails.expectedOutcomes}`
    );

    if (suggestion.planDetails.appointmentPlan) {
      parts.push(
        `
  Appointment Plan:`,
        `    Total Sittings: ${suggestion.planDetails.appointmentPlan.totalSittings}`,
        `    Total Treatment Time: ${suggestion.planDetails.appointmentPlan.totalTreatmentTime}`
      );
      if (suggestion.planDetails.appointmentPlan.medicalPrecautions) {
        parts.push(`    Medical Precautions: ${suggestion.planDetails.appointmentPlan.medicalPrecautions}`);
      }
      parts.push(`
    Sitting Details:`);
      suggestion.planDetails.appointmentPlan.sittingDetails.forEach(sitting => {
        parts.push(
          `      Visit ${sitting.visit}:`,
          `        Procedures: ${sitting.procedures}`,
          `        Duration: ${sitting.estimatedDuration}`,
          `        Time Gap: ${sitting.timeGap}`
        );
      });
    }

    if (suggestion.clinicalRationale) {
      parts.push(`
Clinical Rationale:`, `  ${suggestion.clinicalRationale}`);
    }

    parts.push(`
Post-Treatment Care:`, `  ${suggestion.postTreatmentCare}`);

    return parts.filter(Boolean).join('\n');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Button
          type="button"
          onClick={handleGenerateClick}
          disabled={disabled || !selectedTreatment}
          className={`ai-insights-button w-full flex items-center justify-center py-2 px-4 rounded-lg bg-[#1B56FD] text-white hover:bg-[#0118D8] ${isGenerating ? 'opacity-100 cursor-not-allowed' : ''}`}
          style={isGenerating ? { opacity: 1 } : {}}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {"AI is thinking... (this may take up to 2 minutes)"}
            </>
          ) : (
            <>
              <BrainCog className="mr-2 h-4 w-4" />
              {"Generate AI Suggestions"}
            </>
          )}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-4 space-y-4">
          <h4 className="font-semibold text-sm">Generated Treatment Plans</h4>
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
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
                    {(suggestion.planDetails.isPatientSelected || 
                      suggestion.title.toLowerCase().includes('patient selected') ||
                      suggestion.title.toLowerCase().includes('patient-selected')) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onSuggestionApply(suggestion)}
                        className="bg-primary text-white hover:bg-primary/90"
                      >
                        Apply Selected Plan
                      </Button>
                    )}
                  </div>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="clinical-assessment">
                    <AccordionTrigger className="px-4">Overall Clinical Assessment</AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {suggestion.description}
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  {suggestion.patientFactors && (
                    <AccordionItem value="patient-factors">
                      <AccordionTrigger className="px-4">Patient Factors</AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 text-sm space-y-1">
                        <p><strong>Relevant Medical Conditions:</strong> {suggestion.patientFactors.relevantMedicalConditions}</p>
                        <p><strong>Medication Considerations:</strong> {suggestion.patientFactors.medicationConsiderations}</p>
                        <p><strong>Age-Related Considerations:</strong> {suggestion.patientFactors.ageRelatedConsiderations}</p>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {suggestion.recommendedInvestigations && (
                    <AccordionItem value="recommended-investigations">
                      <AccordionTrigger className="px-4">Recommended Investigations</AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 text-sm">
                        <p>{suggestion.recommendedInvestigations}</p>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  
                  <AccordionItem value="plan-details">
                    <AccordionTrigger className="px-4">Details for: {suggestion.planDetails.planName}</AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="font-medium">Clinical Protocol:</p>
                          <p className="text-muted-foreground whitespace-pre-line">
                            {suggestion.planDetails.clinicalProtocol}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Key Materials:</p>
                          <p className="text-muted-foreground">{suggestion.planDetails.keyMaterials}</p>
                        </div>
                        <div>
                          <p className="font-medium">Clinical Considerations:</p>
                          <p className="text-muted-foreground whitespace-pre-line">
                            {suggestion.planDetails.clinicalConsiderations}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Expected Outcomes:</p>
                          <p className="text-muted-foreground whitespace-pre-line">{suggestion.planDetails.expectedOutcomes}</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {suggestion.planDetails.appointmentPlan && (
                    <AccordionItem value="appointment-plan">
                      <AccordionTrigger className="px-4">
                        <span className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4" />
                          Appointment Plan
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center gap-4 text-muted-foreground mb-2">
                            <div>
                              <Clock className="h-4 w-4 inline mr-1" />
                              <span>Total Sittings: {suggestion.planDetails.appointmentPlan.totalSittings}</span>
                            </div>
                            <div>
                              <Calendar className="h-4 w-4 inline mr-1" />
                              <span>Total Duration: {suggestion.planDetails.appointmentPlan.totalTreatmentTime}</span>
                            </div>
                          </div>
                          {suggestion.planDetails.appointmentPlan.medicalPrecautions && (
                            <div className="mb-3">
                              <p className="font-medium">Medical Precautions:</p>
                              <p className="text-muted-foreground whitespace-pre-line">{suggestion.planDetails.appointmentPlan.medicalPrecautions}</p>
                            </div>
                          )}
                          <div className="space-y-2">
                            {suggestion.planDetails.appointmentPlan.sittingDetails.map((sitting, idx) => (
                              <div key={idx} className="border rounded p-3 bg-background">
                                <p className="font-medium">Visit {sitting.visit}</p>
                                <p className="text-muted-foreground mt-1">{sitting.procedures}</p>
                                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-3">
                                  <p className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Duration: {sitting.estimatedDuration}
                                  </p>
                                  {sitting.timeGap !== "N/A" && (
                                    <p className="flex items-center">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      Next visit in: {sitting.timeGap}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {suggestion.clinicalRationale && (
                    <AccordionItem value="clinical-rationale">
                      <AccordionTrigger className="px-4">Clinical Rationale</AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 text-sm">
                        <p className="whitespace-pre-line">{suggestion.clinicalRationale}</p>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  <AccordionItem value="post-care">
                    <AccordionTrigger className="px-4">Post-Treatment Care</AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <p className="text-sm text-muted-foreground">{suggestion.postTreatmentCare}</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

