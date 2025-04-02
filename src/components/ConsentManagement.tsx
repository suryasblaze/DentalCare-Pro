import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileSignature, Check, X, Download, Lock, FileText } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface ConsentManagementProps {
  patientId: string;
  treatmentPlanId: string;
  onConsentUpdate?: (status: string) => void;
}

export function ConsentManagement({ patientId, treatmentPlanId, onConsentUpdate }: ConsentManagementProps) {
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [consentDocument, setConsentDocument] = useState<any>(null);
  const [consentDetails, setConsentDetails] = useState<any>(null);
  const [isViewingConsent, setIsViewingConsent] = useState(false);
  const [isGatheringConsent, setIsGatheringConsent] = useState(false);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [acknowledgedList, setAcknowledgedList] = useState<string[]>([]);
  const [witness, setWitness] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchConsentDocument();
  }, [treatmentPlanId, patientId]);

  const fetchConsentDocument = async () => {
    setLoading(true);
    try {
      // First, check if consent already exists
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-consent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ treatmentPlanId, patientId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.consentDocument) {
          setConsentDocument(data.consentDocument);
          setConsentDetails(data);
        }
      }
    } catch (error) {
      console.error('Error fetching consent document:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateConsentDocument = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/consent-generator`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ treatmentPlanId, patientId }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate consent document');
      }

      const data = await response.json();
      setConsentDocument(data.consentDocument);
      setConsentDetails(data);
      setIsViewingConsent(true);

      toast({
        title: "Consent Document Generated",
        description: "The consent document has been created successfully.",
      });
    } catch (error) {
      console.error('Error generating consent document:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate consent document. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcknowledgementChange = (text: string, checked: boolean) => {
    if (checked) {
      setAcknowledgedList([...acknowledgedList, text]);
    } else {
      setAcknowledgedList(acknowledgedList.filter(item => item !== text));
    }
  };

  const handleSignConsent = async () => {
    if (!signatureFile) {
      toast({
        title: "Signature Required",
        description: "Please provide a signature to continue",
        variant: "destructive"
      });
      return;
    }

    if (acknowledgedList.length < (consentDocument?.disclaimers?.length || 0)) {
      toast({
        title: "Acknowledgement Required",
        description: "Please acknowledge all consent statements",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Upload signature file to storage
      const formData = new FormData();
      formData.append('file', signatureFile);
      formData.append('patientId', patientId);
      formData.append('treatmentPlanId', treatmentPlanId);
      formData.append('consentId', consentDetails.consentId);
      formData.append('witness', witness);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-consent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process consent');
      }

      toast({
        title: "Consent Signed",
        description: "Treatment consent has been recorded successfully.",
      });

      if (onConsentUpdate) {
        onConsentUpdate('signed');
      }

      setIsGatheringConsent(false);
      fetchConsentDocument(); // Refresh the consent details
    } catch (error) {
      console.error('Error signing consent:', error);
      toast({
        title: "Signature Failed",
        description: "Could not process the consent signature. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadConsentDocument = () => {
    if (!consentDocument) return;

    // Create a downloadable version of the consent document
    const consentText = `
    ${consentDocument.title}
    
    Patient: ${consentDocument.patientName}
    Dentist: ${consentDocument.dentistName}
    Date: ${format(new Date(), 'PPP')}
    
    PROCEDURE DETAILS:
    ${consentDocument.procedureDetails}
    
    RISKS:
    ${consentDocument.risks.map((risk: string) => `- ${risk}`).join('\n')}
    
    BENEFITS:
    ${consentDocument.benefits.map((benefit: string) => `- ${benefit}`).join('\n')}
    
    ALTERNATIVES:
    ${consentDocument.alternatives.map((alt: string) => `- ${alt}`).join('\n')}
    
    QUESTIONS TO ASK YOUR DENTIST:
    ${consentDocument.questions.map((q: string) => `- ${q}`).join('\n')}
    
    DISCLAIMERS:
    ${consentDocument.disclaimers.map((d: string) => `- ${d}`).join('\n')}
    `;

    const blob = new Blob([consentText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Dental_Consent_${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderBadgeForStatus = (status: string) => {
    switch (status) {
      case 'signed':
        return <Badge className="bg-green-100 text-green-800">Signed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'declined':
        return <Badge className="bg-red-100 text-red-800">Declined</Badge>;
      case 'expired':
        return <Badge className="bg-gray-100 text-gray-800">Expired</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800">{status}</Badge>;
    }
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5" />
                Informed Consent Management
              </CardTitle>
              <CardDescription>
                Create, view, and manage patient consent documents
              </CardDescription>
            </div>
            {consentDetails && renderBadgeForStatus(consentDetails.status || 'pending')}
          </div>
        </CardHeader>
        <CardContent>
          {consentDocument ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{consentDocument.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Created: {format(new Date(consentDocument.createdAt), 'PPP')}
                  </p>
                </div>
                <div>
                  {consentDetails?.status === 'signed' && (
                    <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Signed on {format(new Date(consentDetails.signedAt), 'PP')}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsViewingConsent(true)}
                  className="flex-1"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={downloadConsentDocument}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                
                {consentDetails?.status !== 'signed' && (
                  <Button 
                    onClick={() => setIsGatheringConsent(true)}
                    className="flex-1"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Gather Consent
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <FileSignature className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Consent Document</h3>
              <p className="text-muted-foreground mb-6">
                Generate an informed consent document for this treatment plan
              </p>
              <Button 
                onClick={generateConsentDocument}
                disabled={isGenerating || loading}
              >
                {isGenerating ? "Generating..." : "Generate Consent Document"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isViewingConsent} onOpenChange={setIsViewingConsent}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{consentDocument?.title}</DialogTitle>
            <DialogDescription>
              Created: {consentDocument?.createdAt && format(new Date(consentDocument.createdAt), 'PPP')}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="risks">Risks & Benefits</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-medium">Patient Information</h3>
                  <p className="text-sm">{consentDocument?.patientName}</p>
                </div>
                
                <div>
                  <h3 className="text-base font-medium">Provider</h3>
                  <p className="text-sm">{consentDocument?.dentistName}</p>
                </div>
                
                <div>
                  <h3 className="text-base font-medium">Procedure Details</h3>
                  <p className="text-sm whitespace-pre-line">{consentDocument?.procedureDetails}</p>
                </div>
                
                <div>
                  <h3 className="text-base font-medium">Important Questions to Ask</h3>
                  <ul className="list-disc ml-5 space-y-1 mt-2">
                    {consentDocument?.questions.map((question: string, i: number) => (
                      <li key={i} className="text-sm">{question}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-base font-medium">Disclaimers</h3>
                  <ul className="list-disc ml-5 space-y-1 mt-2">
                    {consentDocument?.disclaimers.map((disclaimer: string, i: number) => (
                      <li key={i} className="text-sm">{disclaimer}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="risks" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-base font-medium text-red-600">Risks</h3>
                  <ul className="list-disc ml-5 space-y-1 mt-2">
                    {consentDocument?.risks.map((risk: string, i: number) => (
                      <li key={i} className="text-sm">{risk}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-base font-medium text-green-600">Benefits</h3>
                  <ul className="list-disc ml-5 space-y-1 mt-2">
                    {consentDocument?.benefits.map((benefit: string, i: number) => (
                      <li key={i} className="text-sm">{benefit}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div>
                <h3 className="text-base font-medium">Alternative Treatments</h3>
                <ul className="list-disc ml-5 space-y-1 mt-2">
                  {consentDocument?.alternatives.map((alt: string, i: number) => (
                    <li key={i} className="text-sm">{alt}</li>
                  ))}
                </ul>
              </div>
            </TabsContent>
            
            <TabsContent value="status">
              {consentDetails?.status === 'signed' ? (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg flex items-start">
                    <Check className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-green-800">Consent Signed</h3>
                      <p className="text-sm text-green-700">
                        This consent form was signed by {consentDocument?.patientName} on {consentDetails.signedAt && format(new Date(consentDetails.signedAt), 'PPP')}
                      </p>
                      {consentDetails.witness && (
                        <p className="text-sm text-green-700 mt-1">
                          Witnessed by: {consentDetails.witness}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {consentDetails.signatureUrl && (
                    <div>
                      <h3 className="text-base font-medium">Signature on File</h3>
                      <div className="mt-2 border rounded p-4">
                        <img 
                          src={consentDetails.signatureUrl} 
                          alt="Patient Signature" 
                          className="max-h-20"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-yellow-50 p-4 rounded-lg flex items-start">
                    <FileSignature className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-yellow-800">Consent Required</h3>
                      <p className="text-sm text-yellow-700">
                        This consent form needs to be signed by the patient before proceeding with treatment.
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setIsGatheringConsent(true)}
                    className="w-full"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Gather Patient Consent
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsViewingConsent(false)}
            >
              Close
            </Button>
            
            <Button onClick={downloadConsentDocument}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isGatheringConsent} onOpenChange={setIsGatheringConsent}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Patient Consent Form</DialogTitle>
            <DialogDescription>
              Please review the information and provide consent
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">{consentDocument?.title}</h3>
              <p className="text-sm text-muted-foreground">For: {consentDocument?.patientName}</p>
            </div>
            
            <div>
              <h3 className="text-base font-medium">Procedure Details</h3>
              <p className="text-sm whitespace-pre-line mt-2">{consentDocument?.procedureDetails}</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-base font-medium text-red-600">Risks</h3>
                <ul className="list-disc ml-5 space-y-1 mt-2">
                  {consentDocument?.risks.map((risk: string, i: number) => (
                    <li key={i} className="text-sm">{risk}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="text-base font-medium text-green-600">Benefits</h3>
                <ul className="list-disc ml-5 space-y-1 mt-2">
                  {consentDocument?.benefits.map((benefit: string, i: number) => (
                    <li key={i} className="text-sm">{benefit}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div>
              <h3 className="text-base font-medium">Alternative Treatments</h3>
              <ul className="list-disc ml-5 space-y-1 mt-2">
                {consentDocument?.alternatives.map((alt: string, i: number) => (
                  <li key={i} className="text-sm">{alt}</li>
                ))}
              </ul>
            </div>
            
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-base font-medium">Acknowledgment and Consent</h3>
              
              {consentDocument?.disclaimers.map((disclaimer: string, i: number) => (
                <div key={i} className="flex items-start space-x-2">
                  <Switch
                    checked={acknowledgedList.includes(disclaimer)}
                    onCheckedChange={(checked) => handleAcknowledgementChange(disclaimer, checked)}
                  />
                  <Label className="text-sm">{disclaimer}</Label>
                </div>
              ))}
            </div>
            
            <div className="space-y-3 border-t pt-4">
              <Label>Witness Name (if applicable)</Label>
              <Input
                placeholder="Enter witness name"
                value={witness}
                onChange={(e) => setWitness(e.target.value)}
              />
            </div>
            
            <div className="space-y-3 border-t pt-4">
              <Label>Patient Signature</Label>
              <FileUpload
                accept="image/png,image/jpeg,image/jpg"
                maxSize={5}
                onFileChange={setSignatureFile}
                value={signatureFile}
              />
              <p className="text-xs text-muted-foreground">
                Please sign on a piece of paper and upload a photo of your signature, or use a digital signature app.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsGatheringConsent(false)}
            >
              Cancel
            </Button>
            
            <Button 
              variant="destructive" 
              onClick={() => {
                if (onConsentUpdate) {
                  onConsentUpdate('declined');
                }
                setIsGatheringConsent(false);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Decline
            </Button>
            
            <Button 
              onClick={handleSignConsent}
              disabled={loading || acknowledgedList.length < (consentDocument?.disclaimers?.length || 0) || !signatureFile}
            >
              {loading ? (
                <>Loading...</>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  I Consent
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
