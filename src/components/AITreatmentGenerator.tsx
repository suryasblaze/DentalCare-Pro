import React, { useState } from 'react';
import { z } from "zod";
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
import { formatCurrency } from '@/lib/utils/validation';

interface AITreatmentGeneratorProps {
  patientId: string;
  onTreatmentGenerated?: (treatmentPlan: any) => void;
  onImplementPlan?: (treatmentPlan: any) => void;
}

export function AITreatmentGenerator({ patientId, onTreatmentGenerated, onImplementPlan }: AITreatmentGeneratorProps) {
  const [currentIssue, setCurrentIssue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleGenerateTreatmentPlan = async () => {
    if (!currentIssue.trim()) {
      toast({
        title: "Input Required",
        description: "Please describe the current dental issue",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/treatment-ai`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          currentIssue,
          medicalHistory: [],
          previousTreatments: [],
          assessments: [],
          diagnosticImages: []
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate treatment plan');
      }

      const plan = await response.json();
      setGeneratedPlan(plan);
      
      if (onTreatmentGenerated) {
        onTreatmentGenerated(plan);
      }

      toast({
        title: "Treatment Plan Generated",
        description: "AI has successfully created a personalized treatment plan",
      });
    } catch (error) {
      console.error('Error generating treatment plan:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate treatment plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderTreatmentOption = (option: any, isAlternative = false) => {
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

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCog className="h-5 w-5" />
            AI Treatment Plan Generator
          </CardTitle>
          <CardDescription>
            Use AI to create evidence-based dental treatment options based on patient data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-issue">Describe the Current Dental Issue</Label>
              <Textarea
                id="current-issue"
                placeholder="Provide details about symptoms, observations, patient complaints, and relevant history..."
                rows={5}
                value={currentIssue}
                onChange={(e) => setCurrentIssue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The AI will analyze this along with patient records to generate appropriate treatment options.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setIsDetailDialogOpen(true)}
            disabled={!generatedPlan}
          >
            {generatedPlan ? 'View Full Plan' : 'No Plan Generated'}
          </Button>
          <Button 
            onClick={handleGenerateTreatmentPlan}
            disabled={isGenerating || !currentIssue.trim()}
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
        </CardFooter>
      </Card>

      {generatedPlan && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{generatedPlan.title}</CardTitle>
            <CardDescription>{generatedPlan.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium">Recommended Primary Treatment</h3>
                {renderTreatmentOption(generatedPlan.primaryOption)}
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Alternative Options</h3>
                {generatedPlan.alternativeOptions.slice(0, 1).map((option: any, index: number) => (
                  <div key={index}>
                    {renderTreatmentOption(option, true)}
                  </div>
                ))}
                {generatedPlan.alternativeOptions.length > 1 && (
                  <Button variant="link" onClick={() => setIsDetailDialogOpen(true)}>
                    See {generatedPlan.alternativeOptions.length - 1} more options...
                  </Button>
                )}
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium flex items-center gap-2 text-blue-800">
                  <FileCheck className="h-4 w-4" />
                  Patient-Friendly Explanation
                </h3>
                <p className="mt-1 text-sm text-blue-800">
                  {generatedPlan.patientFriendlyExplanation || generatedPlan.summary}
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={() => onImplementPlan && onImplementPlan(generatedPlan)}
            >
              Implement This Treatment Plan
            </Button>
          </CardFooter>
        </Card>
      )}

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{generatedPlan?.title}</DialogTitle>
            <DialogDescription>{generatedPlan?.description}</DialogDescription>
          </DialogHeader>
          
          {generatedPlan && (
            <Tabs defaultValue="summary">
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="options">Treatment Options</TabsTrigger>
                <TabsTrigger value="care">Care Instructions</TabsTrigger>
                <TabsTrigger value="consent">Consent Information</TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Treatment Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{generatedPlan.summary}</p>
                    <div className="mt-4">
                      <h4 className="font-medium">Data Analysis</h4>
                      <p className="text-sm mt-1 text-muted-foreground">{generatedPlan.dataAnalysisSummary}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <h4 className="font-medium">Estimated Total Cost</h4>
                        <p className="text-lg font-bold">{formatCurrency(generatedPlan.estimatedTotalCost)}</p>
                      </div>
                      <div>
                        <h4 className="font-medium">Expected Outcome</h4>
                        <p className="text-sm">{generatedPlan.expectedOutcome}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Financial Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Total Treatment Cost:</span>
                        <span className="font-bold">{formatCurrency(generatedPlan.estimatedTotalCost)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Estimated Insurance Coverage:</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(generatedPlan.estimatedInsuranceCoverage)}
                        </span>
                      </div>
                      <div className="h-px bg-muted"></div>
                      <div className="flex justify-between items-center">
                        <span>Estimated Out-of-Pocket:</span>
                        <span className="font-bold">{formatCurrency(generatedPlan.estimatedOutOfPocket)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="options" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recommended Primary Treatment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderTreatmentOption(generatedPlan.primaryOption)}
                    
                    <div className="mt-4">
                      <h4 className="font-medium">Recommended Materials</h4>
                      <ul className="mt-1 list-disc ml-5 text-sm">
                        {generatedPlan.primaryOption.recommendedMaterials.map((material: string, i: number) => (
                          <li key={i}>{material}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="font-medium">Follow-Up Plan</h4>
                      <p className="text-sm mt-1">{generatedPlan.primaryOption.followUpPlan}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <h3 className="text-lg font-medium mt-6 mb-2">Alternative Treatment Options</h3>
                {generatedPlan.alternativeOptions.map((option: any, index: number) => (
                  <div key={index}>
                    {renderTreatmentOption(option, true)}
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="care" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Preventive Measures</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc ml-5 space-y-1">
                      {generatedPlan.preventiveMeasures.map((measure: string, i: number) => (
                        <li key={i}>{measure}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Post-Treatment Care</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc ml-5 space-y-1">
                      {generatedPlan.postTreatmentCare.map((instruction: string, i: number) => (
                        <li key={i}>{instruction}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Follow-Up Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc ml-5 space-y-1">
                      {generatedPlan.followUpSchedule.map((item: string, i: number) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Educational Resources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc ml-5 space-y-1">
                      {generatedPlan.educationalResources.map((resource: string, i: number) => (
                        <li key={i}>{resource}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="consent" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Consent Requirements
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="font-medium">
                          Consent Required: {generatedPlan.consentRequirements.required ? 'Yes' : 'No'}
                        </p>
                      </div>
                      
                      {generatedPlan.consentRequirements.required && (
                        <>
                          <div>
                            <h4 className="font-medium">Details</h4>
                            <ul className="list-disc ml-5 space-y-1 mt-1">
                              {generatedPlan.consentRequirements.details.map((detail: string, i: number) => (
                                <li key={i} className="text-sm">{detail}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-red-600">Risks to Disclose</h4>
                            <ul className="list-disc ml-5 space-y-1 mt-1">
                              {generatedPlan.consentRequirements.risks.map((risk: string, i: number) => (
                                <li key={i} className="text-sm">{risk}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h4 className="font-medium">Alternative Options to Discuss</h4>
                            <ul className="list-disc ml-5 space-y-1 mt-1">
                              {generatedPlan.consentRequirements.alternatives.map((alt: string, i: number) => (
                                <li key={i} className="text-sm">{alt}</li>
                              ))}
                            </ul>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-800">Patient Responsibilities</h3>
                  <ul className="list-disc ml-5 space-y-1 mt-1">
                    {generatedPlan.patientResponsibilities.map((responsibility: string, i: number) => (
                      <li key={i} className="text-sm text-blue-800">{responsibility}</li>
                    ))}
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDetailDialogOpen(false)}
            >
              Close
            </Button>
            <Button onClick={() => onImplementPlan && onImplementPlan(generatedPlan)}>
              Implement This Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}