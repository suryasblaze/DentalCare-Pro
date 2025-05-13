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
}

interface AISuggestionFormProps {
  patientId: string;
  toothIds: number[];
  domain: string;
  condition: string;
  matrixDetails: any;
  selectedTreatment: string;
  title: string;
  description: string;
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
  };
  caseOverview?: {
    condition: string;
    severity: string;
    teethInvolved: string;
    patientSymptoms: string;
  };
  postTreatmentCare: string;
}

export function AISuggestionForm({
  patientId,
  toothIds,
  domain,
  condition,
  matrixDetails,
  selectedTreatment,
  title,
  description,
  onSuggestionApply,
  disabled = false,
}: AISuggestionFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const { toast } = useToast();

  const handleGenerateClick = async () => {
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

    try {
      const response = await fetch('https://n8n1.kol.tel/webhook/2169736a-368b-49b5-b93f-ffc215203d99', {
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
          userInput: {
            title,
            description,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`AI suggestion failed: ${response.status}`);
      }

      const raw = await response.json();
      const output = raw[0]?.output?.response;

      if (!output || !output.treatmentPlans) {
        throw new Error('Invalid AI response structure.');
      }

      const parsedSuggestions: AISuggestion[] = output.treatmentPlans.map((plan: any) => ({
        title: plan.planName,
        description: output.clinicalAssessment,
        planDetails: {
          planName: plan.planName,
          clinicalProtocol: plan.clinicalProtocol,
          keyMaterials: plan.keyMaterials,
          clinicalConsiderations: plan.clinicalConsiderations,
          expectedOutcomes: plan.expectedOutcomes,
          appointmentPlan: plan.appointmentPlan,
        },
        caseOverview: output.caseOverview,
        postTreatmentCare: output.postTreatmentCare,
      }));

      setSuggestions(parsedSuggestions);

      toast({
        title: 'Suggestions Generated',
        description: `Generated ${parsedSuggestions.length} treatment plan suggestions`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate suggestions',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDescription = (suggestion: AISuggestion): string => {
    const parts = [
      `Case Overview:`,
      suggestion.description,
      `\nClinical Protocol:`,
      suggestion.planDetails.clinicalProtocol,
      `\nKey Materials:`,
      suggestion.planDetails.keyMaterials,
      `\nClinical Considerations:`,
      suggestion.planDetails.clinicalConsiderations,
      `\nExpected Outcomes:`,
      suggestion.planDetails.expectedOutcomes,
    ];

    if (suggestion.planDetails.appointmentPlan) {
      parts.push(
        `\nAppointment Plan:`,
        `Total Sittings: ${suggestion.planDetails.appointmentPlan.totalSittings}`,
        `Total Treatment Time: ${suggestion.planDetails.appointmentPlan.totalTreatmentTime}`,
        `\nSitting Details:`,
        suggestion.planDetails.appointmentPlan.sittingDetails
          .map(sitting => 
            `Visit ${sitting.visit}:\n` +
            `- Procedures: ${sitting.procedures}\n` +
            `- Duration: ${sitting.estimatedDuration}\n` +
            `- Time Gap: ${sitting.timeGap}`
          )
          .join('\n\n')
      );
    }

    parts.push(`\nPost-Treatment Care:`, suggestion.postTreatmentCare);

    return parts.join('\n');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Button
          type="button"
          onClick={handleGenerateClick}
          disabled={disabled || isGenerating || !selectedTreatment}
          variant="secondary"
          size="sm"
        >
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <BrainCog className="mr-2 h-4 w-4" />
          )}
          Generate AI Suggestions
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-4 space-y-4">
          <h4 className="font-semibold text-sm">Generated Treatment Plans</h4>
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="border rounded-lg overflow-hidden bg-card"
              >
                <div className="p-4 bg-muted/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-medium text-base">{suggestion.title}</h5>
                      {suggestion.caseOverview && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          <p>Condition: {suggestion.caseOverview.condition}</p>
                          <p>Severity: {suggestion.caseOverview.severity}</p>
                          {suggestion.caseOverview.patientSymptoms && (
                            <p>Symptoms: {suggestion.caseOverview.patientSymptoms}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onSuggestionApply({
                          title: suggestion.title,
                          description: formatDescription(suggestion),
                          planDetails: suggestion.planDetails,
                          caseOverview: suggestion.caseOverview,
                          postTreatmentCare: suggestion.postTreatmentCare,
                        });
                      }}
                    >
                      Apply This Plan
                    </Button>
                  </div>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="clinical-details">
                    <AccordionTrigger className="px-4">Clinical Details</AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="font-medium">Clinical Protocol:</p>
                          <p className="text-muted-foreground whitespace-pre-line">{suggestion.planDetails.clinicalProtocol}</p>
                        </div>
                        <div>
                          <p className="font-medium">Key Materials:</p>
                          <p className="text-muted-foreground">{suggestion.planDetails.keyMaterials}</p>
                        </div>
                        <div>
                          <p className="font-medium">Clinical Considerations:</p>
                          <p className="text-muted-foreground">{suggestion.planDetails.clinicalConsiderations}</p>
                        </div>
                        <div>
                          <p className="font-medium">Expected Outcomes:</p>
                          <p className="text-muted-foreground">{suggestion.planDetails.expectedOutcomes}</p>
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
                          <div className="flex items-center gap-4 text-muted-foreground">
                            <div>
                              <Clock className="h-4 w-4 mb-1" />
                              <p>Total Sittings: {suggestion.planDetails.appointmentPlan.totalSittings}</p>
                            </div>
                            <div>
                              <Calendar className="h-4 w-4 mb-1" />
                              <p>Duration: {suggestion.planDetails.appointmentPlan.totalTreatmentTime}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {suggestion.planDetails.appointmentPlan.sittingDetails.map((sitting, idx) => (
                              <div key={idx} className="border rounded p-2">
                                <p className="font-medium">Visit {sitting.visit}</p>
                                <p className="text-muted-foreground">{sitting.procedures}</p>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  <p>Duration: {sitting.estimatedDuration}</p>
                                  {sitting.timeGap !== "N/A" && <p>Gap until next visit: {sitting.timeGap}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
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
