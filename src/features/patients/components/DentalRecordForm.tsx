import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Upload, X, ClipboardList, CheckCircle2, Calendar, DollarSign, Smile, Clock, RefreshCw } from 'lucide-react';
import DentalChart from '@/features/treatment-plans/components/DentalChart';
import { PrescriptionFields } from './PrescriptionFields';
import { TreatmentProcedureFields } from './TreatmentProcedureFields';
import { ImageUploadPreview } from './ImageUploadPreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { patientService } from '../services/patientService';
import { api } from '@/lib/api';

// Define the schema for the dental record form
const dentalRecordSchema = z.object({
  // Clinical Examination
  chief_complaint: z.string().min(1, "Chief complaint is required"),
  clinical_findings: z.string().optional(),
  
  // Vital Signs
  blood_pressure: z.string().optional(),
  pulse_rate: z.string().optional(),
  
  // Examination Details
  extra_oral_exam: z.string().optional(),
  intra_oral_exam: z.string().optional(),
  
  // Diagnosis
  diagnosis_codes: z.array(z.string()).optional(),
  diagnosis_notes: z.string().optional(),
  
  // Treatment Plan
  treatment_phase: z.enum(["emergency", "disease_control", "rehabilitation", "maintenance"]),
  treatment_procedures: z.array(z.object({
    code: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    tooth_number: z.number().optional(),
    estimated_cost: z.number().optional(),
    visit_date: z.string().optional(),
    duration: z.string().optional(),
    next_visit: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
  })).optional(),
  
  // Prescription
  prescriptions: z.array(z.object({
    medication: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
    instructions: z.string()
  })).optional(),
  
  // Patient Instructions
  home_care_instructions: z.string().optional(),
  follow_up_date: z.string().optional(),
  
  // Attachments
  xray_images: z.array(z.any()).optional(),
  clinical_photos: z.array(z.any()).optional(),
  documents: z.array(z.any()).optional(),
  
  // Lab Results
  lab_results: z.array(z.object({
    test_name: z.string().min(1, 'Test name is required'),
    result_value: z.string().min(1, 'Result value is required'),
    units: z.string().optional(),
    reference_range: z.string().optional(),
  })).optional(),
  
  // Add record_date and doctor fields
  record_date: z.string().min(1, 'Record date is required'),
  doctor: z.string().min(1, 'Doctor is required'),
});

type DentalRecordFormValues = z.infer<typeof dentalRecordSchema>;

interface DentalRecordFormProps {
  patientId: string;
  patientName: string;
  onSubmit: (values: DentalRecordFormValues, customNotes: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DentalRecordForm({ 
  patientId, 
  patientName, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: DentalRecordFormProps) {
  const [activeTab, setActiveTab] = useState("examination");
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [completedPlans, setCompletedPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [appliedPlans, setAppliedPlans] = useState<{ id: string | number, title: string, createdDate?: string, treatments: any[] }[]>([]);
  const [customNotes, setCustomNotes] = useState('');
  const [doctors, setDoctors] = useState<{ id: string, first_name: string, last_name: string }[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  const form = useForm<DentalRecordFormValues>({
    resolver: zodResolver(dentalRecordSchema),
    defaultValues: {
      treatment_phase: "disease_control",
      treatment_procedures: [],
      prescriptions: [],
      xray_images: [],
      clinical_photos: [],
      documents: [],
      lab_results: [],
      // record_date and doctor should be set by parent or defaulted if needed
    }
  });

  useEffect(() => {
    setLoadingDoctors(true);
    api.staff.getDoctors()
      .then((data) => {
        setDoctors(data.map(doc => ({ id: doc.id, first_name: doc.first_name, last_name: doc.last_name })));
      })
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDoctors(false));
  }, []);

  const handleFormSubmit = async (values: DentalRecordFormValues) => {
    await onSubmit(values, customNotes);
  };

  const tabOrder = [
    "examination",
    "diagnosis",
    "prescription",
    "labresults",
    "attachments"
  ];
  const isFirstTab = activeTab === tabOrder[0];
  const isLastTab = activeTab === tabOrder[tabOrder.length - 1];
  const goToNextTab = () => {
    const idx = tabOrder.indexOf(activeTab);
    if (idx < tabOrder.length - 1) setActiveTab(tabOrder[idx + 1]);
  };
  const goToPrevTab = () => {
    const idx = tabOrder.indexOf(activeTab);
    if (idx > 0) setActiveTab(tabOrder[idx - 1]);
  };

  const handleShowPlans = async () => {
    setShowPlansModal(true);
    setPlansLoading(true);
    try {
      const allPlans = await patientService.getPatientTreatmentPlans(patientId);
      setCompletedPlans((allPlans || []).filter((plan: any) => plan.status === 'completed'));
    } catch (e) {
      setCompletedPlans([]);
    } finally {
      setPlansLoading(false);
    }
  };

  const handleApplyPlan = (plan: any) => {
    const planId = plan.id || plan._id;
    if (!planId) return;
    if (plan.treatments && Array.isArray(plan.treatments)) {
      setAppliedPlans((prev) => {
        if (prev.some(p => p.id === planId)) return prev;
        return [
          ...prev,
          {
            id: planId,
            title: plan.procedure || plan.name || 'Treatment Plan',
            createdDate: plan.date || plan.created_at,
            treatments: plan.treatments,
          },
        ];
      });
      const mappedProcedures = plan.treatments.map((t: any) => ({
        code: t.code || '',
        title: t.type || t.title || '',
        description: t.description || t.procedures || '',
        tooth_number: t.tooth_number || undefined,
        estimated_cost: t.cost !== undefined ? t.cost : undefined,
        visit_date: t.scheduled_date || t.estimatedVisitDate || '',
        duration: t.estimated_duration || t.duration || '',
        next_visit: t.time_gap || t.next_visit || '',
        status: t.status || '',
        priority: t.priority || '',
      }));
      const prevProcedures = form.getValues('treatment_procedures') || [];
      form.setValue('treatment_procedures', [...prevProcedures, ...mappedProcedures]);
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* Patient Info Header */}
      <Card className="mb-6 max-w-5xl w-full mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Dental Record - {patientName}</CardTitle>
          <p className="text-sm text-muted-foreground">Patient ID: {patientId}</p>
        </CardHeader>
      </Card>

      <Card className="max-w-5xl w-full mx-auto">
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-2">
              <Tabs value={activeTab} onValueChange={() => {}} className="w-full">
                <TabsList className="flex w-full justify-between mb-2">
                  <TabsTrigger value="examination" data-disabled>Clinical Examination</TabsTrigger>
                  <TabsTrigger value="diagnosis" data-disabled>Diagnosis & Treatment</TabsTrigger>
                  <TabsTrigger value="prescription" data-disabled>Prescription & Instructions</TabsTrigger>
                  <TabsTrigger value="labresults" data-disabled>Lab Results</TabsTrigger>
                  <TabsTrigger value="attachments" data-disabled>Attachments</TabsTrigger>
                </TabsList>

                {/* Clinical Examination Tab */}
                <TabsContent value="examination" className="space-y-2">
                  <div>
                    <h2 className="text-xl font-bold mb-2">Chief Complaint & Clinical Findings</h2>
                    <div className="grid grid-cols-1">
                      <FormField
                        control={form.control}
                        name="chief_complaint"
                        render={({ field }) => (
                          <FormItem className="col-span-3">
                            <FormLabel>Chief Complaint</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Patient's main concern or reason for visit"
                                {...field}
                                rows={2}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                      <FormField
                        control={form.control}
                        name="blood_pressure"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Blood Pressure</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 120/80" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pulse_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pulse Rate</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 72 bpm" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="record_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Record Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="doctor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Doctor</FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                disabled={loadingDoctors}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={loadingDoctors ? 'Loading doctors...' : 'Select Doctor'} />
                                </SelectTrigger>
                                <SelectContent>
                                  {doctors.map(doc => (
                                    <SelectItem key={doc.id} value={doc.id}>
                                      {doc.first_name} {doc.last_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold mb-2">Examination Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="extra_oral_exam"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Extra-oral Examination</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Record extra-oral findings..."
                                {...field}
                                rows={2}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="intra_oral_exam"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Intra-oral Examination</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Record intra-oral findings..."
                                {...field}
                                rows={2}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Diagnosis & Treatment Tab */}
                <TabsContent value="diagnosis" className="space-y-3">
                  <div>
                    <h2 className="text-xl font-bold mb-2">Diagnosis</h2>
                    <FormField
                      control={form.control}
                      name="diagnosis_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Diagnosis Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter detailed diagnosis..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="treatment_phase"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Treatment Phase</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select treatment phase" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="emergency">Emergency Care</SelectItem>
                              <SelectItem value="disease_control">Disease Control</SelectItem>
                              <SelectItem value="rehabilitation">Rehabilitation</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold mb-2">Treatment Plan</h2>
                    <div className="flex justify-end mb-2">
                      <Button type="button" variant="secondary" onClick={handleShowPlans}>
                        <ClipboardList className="w-4 h-4 mr-2" /> View Completed Treatment Plans
                      </Button>
                    </div>
                    <div className="mt-2">
                      {appliedPlans.map((plan, pIdx) => (
                        <div key={plan.id || pIdx} className="mb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-base">{plan.title || 'Treatment Plan'}</span>
                            {plan.createdDate && (
                              <span className="text-xs text-muted-foreground ml-2">Created on {new Date(plan.createdDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {plan.treatments.map((proc: any, idx: number) => (
                              <div key={idx} className="border bg-white mb-1 p-2 rounded">
                                <span className="font-semibold">{proc.title || proc.code || `Treatment ${idx + 1}`}</span>
                                {proc.description && <div className="text-xs mb-1"><b>Description:</b> {proc.description}</div>}
                                {proc.tooth_number && <div className="text-xs mb-1"><b>Tooth number:</b> {proc.tooth_number}</div>}
                                {proc.visit_date && <div className="text-xs mb-1"><b>Visit Date:</b> {proc.visit_date}</div>}
                                {proc.duration && <div className="text-xs mb-1"><b>Duration:</b> {proc.duration}</div>}
                                {proc.status && <div className="text-xs mb-1"><b>Status:</b> {proc.status}</div>}
                                {proc.priority && <div className="text-xs mb-1"><b>Priority:</b> {proc.priority}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Prescription & Instructions Tab */}
                <TabsContent value="prescription" className="space-y-3">
                  <div>
                    <h2 className="text-xl font-bold mb-2">Prescription</h2>
                    <ScrollArea className="max-h-[300px] pr-2">
                      {form.watch("prescriptions")?.map((_, index) => (
                        <PrescriptionFields
                          key={index}
                          index={index}
                          form={form}
                          onRemove={() => {
                            const prescriptions = form.getValues("prescriptions") || [];
                            form.setValue(
                              "prescriptions",
                              prescriptions.filter((_, i) => i !== index)
                            );
                          }}
                        />
                      ))}
                    </ScrollArea>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => {
                        const prescriptions = form.getValues("prescriptions") || [];
                        form.setValue("prescriptions", [
                          ...prescriptions,
                          { medication: "", dosage: "", frequency: "", duration: "", instructions: "" }
                        ]);
                      }}
                    >
                      Add Prescription
                    </Button>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold mb-2">Patient Instructions</h2>
                    <FormField
                      control={form.control}
                      name="home_care_instructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Home Care Instructions</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter detailed instructions for the patient..."
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="follow_up_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Follow-up Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Lab Results Tab */}
                <TabsContent value="labresults" className="space-y-3">
                  <div>
                    <h2 className="text-xl font-bold mb-2">Lab Result Details</h2>
                    <ScrollArea className="max-h-[300px] pr-2">
                      {(form.watch('lab_results') || []).map((_, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end mb-2 border-b pb-2">
                          <FormField
                            control={form.control}
                            name={`lab_results.${index}.test_name` as const}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Test Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Complete Blood Count (CBC)" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`lab_results.${index}.result_value` as const}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Result Value</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., 12.5" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`lab_results.${index}.units` as const}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Units</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., g/dL" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`lab_results.${index}.reference_range` as const}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Reference Range</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., 12.0-15.5 g/dL" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </ScrollArea>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const results = form.getValues('lab_results') || [];
                        form.setValue('lab_results', [
                          ...results,
                          { test_name: '', result_value: '', units: '', reference_range: '' }
                        ]);
                      }}
                    >
                      Add Result
                    </Button>
                  </div>
                </TabsContent>

                {/* Attachments Tab */}
                <TabsContent value="attachments" className="space-y-3">
                  <div>
                    <h2 className="text-xl font-bold mb-2">X-ray Images</h2>
                    <ImageUploadPreview
                      id="xray-upload"
                      accept="image/*"
                      label="Upload X-ray Images"
                      files={form.watch("xray_images") || []}
                      onFilesChange={(files) => form.setValue("xray_images", files)}
                      maxFiles={5}
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold mb-2">Clinical Photos</h2>
                    <ImageUploadPreview
                      id="photo-upload"
                      accept="image/*"
                      label="Upload Clinical Photos"
                      files={form.watch("clinical_photos") || []}
                      onFilesChange={(files) => form.setValue("clinical_photos", files)}
                      maxFiles={10}
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold mb-2">Other Documents</h2>
                    <ImageUploadPreview
                      id="document-upload"
                      accept=".pdf,.doc,.docx"
                      label="Upload Documents"
                      files={form.watch("documents") || []}
                      onFilesChange={(files) => form.setValue("documents", files)}
                      maxFiles={5}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Custom Notes (not a FormField) */}
              <div className="mt-2">
                <label className="block text-sm font-medium mb-1">Custom Notes (optional)</label>
                <Textarea
                  value={customNotes}
                  onChange={e => setCustomNotes(e.target.value)}
                  placeholder="Add any extra notes for this medical record..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-4 mt-3">
                {!isFirstTab && (
                  <Button type="button" variant="outline" onClick={goToPrevTab}>
                    Back
                  </Button>
                )}
                {!isLastTab && (
                  <Button type="button" onClick={goToNextTab}>
                    Next
                  </Button>
                )}
                {isLastTab && (
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Record
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Completed Treatment Plans Modal */}
      <Dialog open={showPlansModal} onOpenChange={setShowPlansModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Completed Treatment Plans</DialogTitle>
          </DialogHeader>
          {plansLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
            </div>
          ) : completedPlans.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No completed treatment plans found.</div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {completedPlans.map((plan, idx) => {
                const planId = plan.id || plan._id;
                const isApplied = appliedPlans.some(p => p.id === planId);
                return (
                  <Card key={plan.id || idx} className="border shadow-sm mb-4">
                    <CardHeader className="flex flex-col gap-1 items-start">
                      <div className="flex flex-row items-center gap-2 w-full">
                        <Smile className="w-5 h-5 text-primary" />
                        <span className="font-semibold text-base">{plan.procedure || plan.name || 'Treatment Plan'}</span>
                        <Badge variant="outline" className="ml-auto">{plan.status}</Badge>
                      </div>
                      {/* Show created date if available */}
                      {(plan.date || plan.created_at) && (
                        <div className="text-xs text-muted-foreground mt-1">Created on {plan.date ? new Date(plan.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : new Date(plan.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {plan.teeth && plan.teeth.length > 0 && (
                        <div className="text-xs flex items-center gap-1"><Smile className="w-4 h-4" />Teeth: {plan.teeth.map((t: any) => t.tooth_id).join(', ')}</div>
                      )}
                      {plan.description && <div className="text-xs mb-2">{plan.description}</div>}
                      {/* Show treatments/visits details if available */}
                      {plan.treatments && plan.treatments.length > 0 && (
                        <div className="mt-2">
                          <div className="font-semibold text-xs mb-1">Treatments/Visits:</div>
                          <div className="space-y-1">
                            {plan.treatments.map((t: any, i: number) => (
                              <div key={i} className="border rounded p-2 bg-muted/20 mb-1">
                                <div className="font-bold text-sm mb-1">{i + 1}. {t.name || t.title}</div>
                                {t.scheduled_date && <div className="text-xs text-muted-foreground mb-1">Date: {t.scheduled_date}</div>}
                                {t.description && <div className="text-xs mb-1">{t.description}</div>}
                                {t.cost !== undefined && <div className="text-xs flex items-center gap-1 mb-1"><span className="font-bold text-green-700">₹</span>Cost: {t.cost}</div>}
                                {t.status && <Badge className="ml-2" variant="outline">{t.status}</Badge>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="text-xs flex items-center gap-1 mt-2"><CheckCircle2 className="w-4 h-4 text-green-500" />Completed</div>
                      <div className="flex justify-end mt-2">
                        {isApplied ? (
                          <Badge variant="secondary">Applied</Badge>
                        ) : (
                          <Button size="sm" variant="default" onClick={() => handleApplyPlan(plan)}>
                            Apply to Medical Record
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 