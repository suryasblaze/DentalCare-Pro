import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { FileUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { api } from '@/lib/api';
import { useToast } from "@/components/ui/use-toast";
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  Upload, 
  X, 
  ChevronRight, 
  Check, 
  Info,
  MapPin,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  Stethoscope,
  Heart,
  ShieldAlert,
  Building,
  CreditCard,
  CalendarCheck,
  Clock
} from "lucide-react";
import { format } from 'date-fns';

// Define the form schema for patient information
const personalInfoSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  middle_name: z.string().optional(),
  email: z.string().email("Invalid email address").optional().nullable(),
  phone: z.string()
    .min(1, "Phone number is required")
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format. Use E.164 format: +1234567890"),
  age: z.number().min(0).max(120).optional().nullable(),
  gender: z.enum(["male", "female", "other"]),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().default("USA"),
  occupation: z.string().optional(),
  marital_status: z.enum(["single", "married", "divorced", "widowed", "separated", "other"]).optional(),
  preferred_language: z.string().optional(),
  emergency_contact_name: z.string().min(1, "Emergency contact name is required"),
  emergency_contact_phone: z.string()
    .min(1, "Emergency contact phone is required")
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  emergency_contact_relationship: z.string().min(1, "Relationship is required"),
  preferred_communication: z.enum(["phone", "email", "sms", "whatsapp"]).default("phone")
});

const medicalHistorySchema = z.object({
  blood_group: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"]).optional(),
  height: z.number().positive("Height must be positive").optional(),
  weight: z.number().positive("Weight must be positive").optional(),
  allergies: z.array(z.string()).optional(),
  medical_conditions: z.array(z.string()).optional(),
  current_medications: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    reason: z.string().optional()
  })).optional(),
  past_surgeries: z.array(z.object({
    procedure: z.string(),
    date: z.string(),
    notes: z.string().optional()
  })).optional(),
  primary_physician: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    clinic: z.string().optional()
  }).optional(),
  family_history: z.object({
    diabetes: z.boolean().default(false),
    heart_disease: z.boolean().default(false),
    hypertension: z.boolean().default(false),
    cancer: z.boolean().default(false),
    other: z.string().optional()
  }).optional(),
  lifestyle: z.object({
    smoking: z.boolean().default(false),
    alcohol: z.boolean().default(false),
    exercise: z.boolean().default(false)
  }).optional(),
  pregnancy: z.object({
    is_pregnant: z.boolean().default(false),
    due_date: z.string().optional(),
    notes: z.string().optional()
  }).optional()
});

const dentalHistorySchema = z.object({
  last_dental_visit: z.string().optional(),
  reason_for_last_visit: z.string().optional(),
  previous_treatments: z.array(z.string()).optional(),
  current_dental_issues: z.string().optional(),
  brushing_frequency: z.enum(["once_daily", "twice_daily", "thrice_daily", "less_than_daily"]).optional(),
  flossing_frequency: z.enum(["daily", "few_times_week", "weekly", "rarely", "never"]).optional(),
  sensitivity: z.boolean().optional(),
  bleeding_gums: z.boolean().optional(),
  grinding_teeth: z.boolean().optional(),
  dry_mouth: z.boolean().optional(),
  dental_anxiety: z.enum(["none", "mild", "moderate", "severe"]).optional()
});

const insuranceSchema = z.object({
  insurance_provider: z.string().optional(),
  insurance_policy_number: z.string().optional(),
  insurance_group_number: z.string().optional(),
  insurance_holder_name: z.string().optional(),
  insurance_holder_dob: z.string().optional(),
  insurance_holder_relationship: z.enum(["self", "spouse", "child", "other"]).optional(),
  insurance_expiry_date: z.string().optional(),
  secondary_insurance_provider: z.string().optional(),
  secondary_insurance_policy_number: z.string().optional(),
  preferred_payment_method: z.enum(["credit_card", "debit_card", "cash", "check", "insurance_only"]).optional()
});

const consentSchema = z.object({
  hipaa_consent: z.boolean().default(false),
  treatment_consent: z.boolean().default(false),
  financial_agreement: z.boolean().default(false),
  photo_consent: z.boolean().default(false),
  communication_consent: z.boolean().default(false),
  signature: z.any().optional() // Will handle file validation separately
});

type PersonalInfoValues = z.infer<typeof personalInfoSchema>;
type MedicalHistoryValues = z.infer<typeof medicalHistorySchema>;
type DentalHistoryValues = z.infer<typeof dentalHistorySchema>;
type InsuranceValues = z.infer<typeof insuranceSchema>;
type ConsentValues = z.infer<typeof consentSchema>;

export function PatientOnboarding() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [progress, setProgress] = useState(0);
  const [isNew, setIsNew] = useState(!id);
  const [fromQuickAppointment, setFromQuickAppointment] = useState(false);
  const [governmentIdFile, setGovernmentIdFile] = useState<File | null>(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [governmentIdPreview, setGovernmentIdPreview] = useState<string | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [allergiesList, setAllergiesList] = useState<string[]>([]);
  const [newAllergy, setNewAllergy] = useState("");
  const [medicalConditionsList, setMedicalConditionsList] = useState<string[]>([]);
  const [newMedicalCondition, setNewMedicalCondition] = useState("");
  const [medicationsList, setMedicationsList] = useState<any[]>([]);
  const [newMedication, setNewMedication] = useState({
    name: "",
    dosage: "",
    frequency: "",
    reason: ""
  });
  const [surgeriesList, setSurgeriesList] = useState<any[]>([]);
  const [newSurgery, setNewSurgery] = useState({
    procedure: "",
    date: "",
    notes: ""
  });
  const [previousTreatmentsList, setPreviousTreatmentsList] = useState<string[]>([]);
  const [newPreviousTreatment, setNewPreviousTreatment] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [newDocument, setNewDocument] = useState<File | null>(null);
  const [newDocumentType, setNewDocumentType] = useState<string>("medical_record");
  const [appointmentDetails, setAppointmentDetails] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    reason: '',
    doctor: '',
    duration: '30',
    notes: ''
  });
  const [doctors, setDoctors] = useState<any[]>([]);
  
  const personalInfoForm = useForm<PersonalInfoValues>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      country: "USA",
      gender: "male",
      marital_status: "single",
      preferred_communication: "phone"
    }
  });

  const medicalHistoryForm = useForm<MedicalHistoryValues>({
    resolver: zodResolver(medicalHistorySchema),
    defaultValues: {
      blood_group: "unknown",
      lifestyle: {
        smoking: false,
        alcohol: false,
        exercise: false
      },
      family_history: {
        diabetes: false,
        heart_disease: false,
        hypertension: false,
        cancer: false
      },
      pregnancy: {
        is_pregnant: false
      }
    }
  });

  const dentalHistoryForm = useForm<DentalHistoryValues>({
    resolver: zodResolver(dentalHistorySchema),
    defaultValues: {
      brushing_frequency: "twice_daily",
      flossing_frequency: "daily",
      sensitivity: false,
      bleeding_gums: false,
      grinding_teeth: false,
      dry_mouth: false,
      dental_anxiety: "none"
    }
  });

  const insuranceForm = useForm<InsuranceValues>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: {
      insurance_holder_relationship: "self",
      preferred_payment_method: "credit_card"
    }
  });

  const consentForm = useForm<ConsentValues>({
    resolver: zodResolver(consentSchema),
    defaultValues: {
      hipaa_consent: false,
      treatment_consent: false,
      financial_agreement: false,
      photo_consent: false,
      communication_consent: false
    }
  });

  useEffect(() => {
    if (location.state?.fromQuickAppointment) {
      setFromQuickAppointment(true);
      // Pre-fill with data from quick appointment if available
      if (location.state.patientData) {
        personalInfoForm.reset(location.state.patientData);
      }
    }

    if (id) {
      fetchPatient();
    }
    
    fetchDoctors();
  }, [id, location]);

  const fetchDoctors = async () => {
    try {
      const data = await api.staff.getDoctors();
      setDoctors(data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchPatient = async () => {
    try {
      setLoading(true);
      const data = await api.patients.getById(id);
      if (data) {
        setPatient(data);
        
        // Set profile photo preview if available
        if (data.profile_photo_url) {
          setProfilePhotoPreview(data.profile_photo_url);
        }
        
        // Set signature preview if available
        if (data.signature_url) {
          setSignaturePreview(data.signature_url);
        }
        
        // Set government ID preview if available in documents
        if (data.documents && Array.isArray(data.documents)) {
          setDocuments(data.documents);
          const governmentId = data.documents.find((doc: any) => doc.docType === 'government_id');
          if (governmentId) {
            setGovernmentIdPreview(governmentId.url);
          }
        }
        
        // Set medical history lists
        if (data.allergies && Array.isArray(data.allergies)) {
          setAllergiesList(data.allergies);
        }
        
        if (data.medical_conditions && Array.isArray(data.medical_conditions)) {
          setMedicalConditionsList(data.medical_conditions);
        }
        
        if (data.current_medications && Array.isArray(data.current_medications)) {
          setMedicationsList(data.current_medications);
        }
        
        if (data.previous_surgeries && Array.isArray(data.previous_surgeries)) {
          setSurgeriesList(data.previous_surgeries);
        }
        
        // Reset forms with patient data
        personalInfoForm.reset({
          first_name: data.first_name,
          last_name: data.last_name,
          middle_name: data.middle_name || '',
          email: data.email,
          phone: data.phone,
          age: data.age,
          gender: data.gender as any,
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          postal_code: data.postal_code || '',
          country: data.country || 'USA',
          occupation: data.occupation || '',
          marital_status: data.marital_status as any || 'single',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
          emergency_contact_relationship: data.emergency_contact_relationship || '',
          preferred_communication: 'phone'
        });
        
        if (data.blood_group || data.lifestyle) {
          medicalHistoryForm.reset({
            blood_group: data.blood_group as any || 'unknown',
            height: data.height,
            weight: data.weight,
            lifestyle: data.lifestyle || {
              smoking: false,
              alcohol: false,
              exercise: false
            },
            family_history: data.family_medical_history || {
              diabetes: false,
              heart_disease: false,
              hypertension: false,
              cancer: false
            }
          });
        }
        
        if (data.insurance_provider) {
          insuranceForm.reset({
            insurance_provider: data.insurance_provider,
            insurance_policy_number: data.insurance_policy_number,
            insurance_expiry_date: data.insurance_expiry_date ? format(new Date(data.insurance_expiry_date), 'yyyy-MM-dd') : '',
            insurance_holder_relationship: 'self'
          });
        }
        
        // Calculate progress based on filled fields
        calculateProgress(data);
      }
    } catch (error) {
      console.error('Error fetching patient:', error);
      toast({
        title: "Error",
        description: "Failed to load patient information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (data: any) => {
    const sections = [
      { name: 'personal', fields: ['first_name', 'last_name', 'phone', 'email', 'age', 'gender', 'address', 'emergency_contact_name'], weight: 0.3 },
      { name: 'medical', fields: ['blood_group', 'height', 'weight', 'allergies', 'medical_conditions', 'current_medications'], weight: 0.3 },
      { name: 'insurance', fields: ['insurance_provider', 'insurance_policy_number', 'insurance_expiry_date'], weight: 0.2 },
      { name: 'consent', fields: ['consent_given', 'signature_url'], weight: 0.2 }
    ];
    
    let totalProgress = 0;
    
    sections.forEach(section => {
      const filledFields = section.fields.filter(field => {
        const value = data[field];
        return value !== null && value !== undefined && value !== '' && 
               (typeof value !== 'object' || 
                (Array.isArray(value) && value.length > 0) ||
                (!Array.isArray(value) && Object.keys(value).length > 0));
      }).length;
      
      const sectionProgress = (filledFields / section.fields.length) * section.weight;
      totalProgress += sectionProgress;
    });
    
    setProgress(Math.round(totalProgress * 100));
  };

  const onSubmitPersonalInfo = async (values: PersonalInfoValues) => {
    try {
      setLoading(true);
      
      if (id) {
        // Update existing patient
        await api.patients.update(id, values);
        
        // Upload profile photo if selected
        if (profilePhotoFile) {
          await api.patients.uploadProfilePhoto(profilePhotoFile, id);
        }
        
        toast({
          title: "Success",
          description: "Personal information updated successfully"
        });
        
        // Refresh patient data
        await fetchPatient();
        
        // Move to next tab
        setActiveTab("medical");
      } else {
        // Create new patient
        const patient = await api.patients.create(values);
        
        // Upload profile photo if selected
        if (profilePhotoFile && patient.id) {
          await api.patients.uploadProfilePhoto(profilePhotoFile, patient.id);
        }
        
        toast({
          title: "Success",
          description: "Patient created successfully"
        });
        
        // Navigate to the patient's page with the new ID
        navigate(`/patient-onboarding/${patient.id}`, { replace: true });
        
        // Move to next tab
        setActiveTab("medical");
      }
    } catch (error) {
      console.error('Error saving personal information:', error);
      toast({
        title: "Error",
        description: "Failed to save personal information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmitMedicalHistory = async (values: MedicalHistoryValues) => {
    try {
      setLoading(true);
      
      if (!id) {
        toast({
          title: "Error",
          description: "Please save personal information first",
          variant: "destructive"
        });
        setActiveTab("personal");
        return;
      }
      
      // Combine form values with lists
      const medicalData = {
        ...values,
        allergies: allergiesList,
        medical_conditions: medicalConditionsList,
        current_medications: medicationsList,
        previous_surgeries: surgeriesList
      };
      
      await api.patients.update(id, medicalData);
      
      toast({
        title: "Success",
        description: "Medical history updated successfully"
      });
      
      // Refresh patient data
      await fetchPatient();
      
      // Move to next tab
      setActiveTab("dental");
    } catch (error) {
      console.error('Error saving medical history:', error);
      toast({
        title: "Error",
        description: "Failed to save medical history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmitDentalHistory = async (values: DentalHistoryValues) => {
    try {
      setLoading(true);
      
      if (!id) {
        toast({
          title: "Error",
          description: "Please save personal information first",
          variant: "destructive"
        });
        setActiveTab("personal");
        return;
      }
      
      // Combine form values with previous treatments list
      const dentalData = {
        ...values,
        previous_treatments: previousTreatmentsList
      };
      
      // Create a medical record for dental history
      await api.patients.createMedicalRecord({
        patient_id: id,
        record_type: 'examination',
        description: 'Initial dental history assessment',
        record_date: new Date().toISOString(),
        attachments: [],
        notes: JSON.stringify(dentalData)
      });
      
      toast({
        title: "Success",
        description: "Dental history saved successfully"
      });
      
      // Move to next tab
      setActiveTab("insurance");
    } catch (error) {
      console.error('Error saving dental history:', error);
      toast({
        title: "Error",
        description: "Failed to save dental history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmitInsurance = async (values: InsuranceValues) => {
    try {
      setLoading(true);
      
      if (!id) {
        toast({
          title: "Error",
          description: "Please save personal information first",
          variant: "destructive"
        });
        setActiveTab("personal");
        return;
      }
      
      // Format insurance coverage details
      const insuranceData = {
        insurance_provider: values.insurance_provider,
        insurance_policy_number: values.insurance_policy_number,
        insurance_expiry_date: values.insurance_expiry_date,
        insurance_coverage_details: {
          group_number: values.insurance_group_number,
          holder_name: values.insurance_holder_name,
          holder_dob: values.insurance_holder_dob,
          holder_relationship: values.insurance_holder_relationship,
          secondary_provider: values.secondary_insurance_provider,
          secondary_policy: values.secondary_insurance_policy_number,
          preferred_payment: values.preferred_payment_method
        }
      };
      
      await api.patients.update(id, insuranceData);
      
      toast({
        title: "Success",
        description: "Insurance information saved successfully"
      });
      
      // Refresh patient data
      await fetchPatient();
      
      // Move to next tab
      setActiveTab("documents");
    } catch (error) {
      console.error('Error saving insurance information:', error);
      toast({
        title: "Error",
        description: "Failed to save insurance information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmitConsent = async (values: ConsentValues) => {
    try {
      setLoading(true);
      
      if (!id) {
        toast({
          title: "Error",
          description: "Please save personal information first",
          variant: "destructive"
        });
        setActiveTab("personal");
        return;
      }
      
      // Upload government ID if provided
      if (governmentIdFile) {
        await api.patients.addDocument(governmentIdFile, id, 'government_id', 'Government ID document');
      }
      
      // Upload signature if provided
      if (signatureFile) {
        await api.patients.uploadSignature(signatureFile, id);
      }
      
      // Update consent information
      const consentData = {
        consent_given: values.hipaa_consent && values.treatment_consent && values.financial_agreement,
        consent_date: new Date().toISOString(),
        notes: JSON.stringify({
          hipaa_consent: values.hipaa_consent,
          treatment_consent: values.treatment_consent,
          financial_agreement: values.financial_agreement,
          photo_consent: values.photo_consent,
          communication_consent: values.communication_consent
        })
      };
      
      await api.patients.update(id, consentData);
      
      toast({
        title: "Success",
        description: "Consent forms submitted successfully"
      });
      
      // Refresh patient data
      await fetchPatient();
      
      // If from quick appointment, move to appointment tab
      if (fromQuickAppointment) {
        setActiveTab("appointment");
      } else {
        // Navigate to patients list
        navigate('/patients');
      }
    } catch (error) {
      console.error('Error saving consent information:', error);
      toast({
        title: "Error",
        description: "Failed to save consent information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = async () => {
    try {
      setLoading(true);
      
      if (!id) {
        toast({
          title: "Error",
          description: "Patient information must be saved first",
          variant: "destructive"
        });
        return;
      }
      
      if (!appointmentDetails.doctor) {
        toast({
          title: "Error",
          description: "Please select a doctor",
          variant: "destructive"
        });
        return;
      }
      
      // Create appointment datetime
      const appointmentDate = new Date(`${appointmentDetails.date}T${appointmentDetails.time}`);
      
      // Calculate end time based on duration
      const endDate = new Date(appointmentDate);
      endDate.setMinutes(endDate.getMinutes() + parseInt(appointmentDetails.duration));
      
      const appointmentData = {
        patient_id: id,
        staff_id: appointmentDetails.doctor,
        title: appointmentDetails.reason || 'Initial Consultation',
        start_time: appointmentDate.toISOString(),
        end_time: endDate.toISOString(),
        type: appointmentDetails.reason || 'checkup',
        notes: appointmentDetails.notes,
        status: 'scheduled'
      };
      
      await api.appointments.create(appointmentData);
      
      toast({
        title: "Success",
        description: "Appointment scheduled successfully"
      });
      
      // Navigate to appointments page
      navigate('/appointments');
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      toast({
        title: "Error",
        description: "Failed to schedule appointment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addAllergy = () => {
    if (newAllergy.trim() !== '' && !allergiesList.includes(newAllergy.trim())) {
      setAllergiesList([...allergiesList, newAllergy.trim()]);
      setNewAllergy('');
    }
  };

  const removeAllergy = (index: number) => {
    const updatedList = [...allergiesList];
    updatedList.splice(index, 1);
    setAllergiesList(updatedList);
  };

  const addMedicalCondition = () => {
    if (newMedicalCondition.trim() !== '' && !medicalConditionsList.includes(newMedicalCondition.trim())) {
      setMedicalConditionsList([...medicalConditionsList, newMedicalCondition.trim()]);
      setNewMedicalCondition('');
    }
  };

  const removeMedicalCondition = (index: number) => {
    const updatedList = [...medicalConditionsList];
    updatedList.splice(index, 1);
    setMedicalConditionsList(updatedList);
  };

  const addMedication = () => {
    if (newMedication.name.trim() !== '' && newMedication.dosage.trim() !== '' && newMedication.frequency.trim() !== '') {
      setMedicationsList([...medicationsList, { ...newMedication }]);
      setNewMedication({
        name: "",
        dosage: "",
        frequency: "",
        reason: ""
      });
    }
  };

  const removeMedication = (index: number) => {
    const updatedList = [...medicationsList];
    updatedList.splice(index, 1);
    setMedicationsList(updatedList);
  };

  const addSurgery = () => {
    if (newSurgery.procedure.trim() !== '' && newSurgery.date.trim() !== '') {
      setSurgeriesList([...surgeriesList, { ...newSurgery }]);
      setNewSurgery({
        procedure: "",
        date: "",
        notes: ""
      });
    }
  };

  const removeSurgery = (index: number) => {
    const updatedList = [...surgeriesList];
    updatedList.splice(index, 1);
    setSurgeriesList(updatedList);
  };

  const addPreviousTreatment = () => {
    if (newPreviousTreatment.trim() !== '' && !previousTreatmentsList.includes(newPreviousTreatment.trim())) {
      setPreviousTreatmentsList([...previousTreatmentsList, newPreviousTreatment.trim()]);
      setNewPreviousTreatment('');
    }
  };

  const removePreviousTreatment = (index: number) => {
    const updatedList = [...previousTreatmentsList];
    updatedList.splice(index, 1);
    setPreviousTreatmentsList(updatedList);
  };

  const handleUploadDocument = async () => {
    try {
      setLoading(true);
      
      if (!id) {
        toast({
          title: "Error",
          description: "Patient information must be saved first",
          variant: "destructive"
        });
        return;
      }
      
      if (!newDocument) {
        toast({
          title: "Error",
          description: "Please select a document to upload",
          variant: "destructive"
        });
        return;
      }
      
      // Upload document
      await api.patients.addDocument(newDocument, id, newDocumentType, 'Patient uploaded document');
      
      toast({
        title: "Success",
        description: "Document uploaded successfully"
      });
      
      // Reset form
      setNewDocument(null);
      setNewDocumentType("medical_record");
      
      // Refresh patient data
      await fetchPatient();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const removeDocument = async (documentPath: string) => {
    try {
      setLoading(true);
      
      if (!id) {
        toast({
          title: "Error",
          description: "Patient information must be saved first",
          variant: "destructive"
        });
        return;
      }
      
      // Remove document
      await api.patients.removeDocument(id, documentPath);
      
      toast({
        title: "Success",
        description: "Document removed successfully"
      });
      
      // Refresh patient data
      await fetchPatient();
    } catch (error) {
      console.error('Error removing document:', error);
      toast({
        title: "Error",
        description: "Failed to remove document",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {id ? 'Patient Onboarding: Update Information' : 'New Patient Registration'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {id ? 'Update the patient\'s profile information' : 'Register a new patient in the system'}
            </p>
          </div>
          {id && progress > 0 && (
            <div className="flex items-center gap-2">
              <Progress value={progress} className="w-[100px]" />
              <span className="text-sm font-medium">{progress}%</span>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="medical">Medical</TabsTrigger>
            <TabsTrigger value="dental">Dental</TabsTrigger>
            <TabsTrigger value="insurance">Insurance</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            {fromQuickAppointment && (
              <TabsTrigger value="appointment">Appointment</TabsTrigger>
            )}
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Form {...personalInfoForm}>
              <form onSubmit={personalInfoForm.handleSubmit(onSubmitPersonalInfo)} className="space-y-6">
                <Card className="pt-6">
                  <CardContent className="space-y-8">
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <User className="h-5 w-5 mr-2" />
                        Basic Information
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Enter the patient's basic personal information.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <FormField
                        control={personalInfoForm.control}
                        name="first_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalInfoForm.control}
                        name="middle_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Middle Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Michael" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalInfoForm.control}
                        name="last_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalInfoForm.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalInfoForm.control}
                        name="age"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Age</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="25"
                                {...field}
                                onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalInfoForm.control}
                        name="marital_status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Marital Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="single">Single</SelectItem>
                                <SelectItem value="married">Married</SelectItem>
                                <SelectItem value="divorced">Divorced</SelectItem>
                                <SelectItem value="widowed">Widowed</SelectItem>
                                <SelectItem value="separated">Separated</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalInfoForm.control}
                        name="occupation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Occupation</FormLabel>
                            <FormControl>
                              <Input placeholder="Software Developer" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalInfoForm.control}
                        name="preferred_language"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferred Language</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || "english"}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="english">English</SelectItem>
                                <SelectItem value="spanish">Spanish</SelectItem>
                                <SelectItem value="french">French</SelectItem>
                                <SelectItem value="german">German</SelectItem>
                                <SelectItem value="chinese">Chinese</SelectItem>
                                <SelectItem value="japanese">Japanese</SelectItem>
                                <SelectItem value="korean">Korean</SelectItem>
                                <SelectItem value="arabic">Arabic</SelectItem>
                                <SelectItem value="hindi">Hindi</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="md:col-span-2 lg:col-span-3">
                        <div className="space-y-2">
                          <h4 className="font-medium">Profile Photo</h4>
                          <FileUpload
                            accept="image/jpeg,image/png,image/gif"
                            maxSize={5}
                            onFileChange={setProfilePhotoFile}
                            preview={profilePhotoPreview}
                            onRemove={() => {
                              setProfilePhotoFile(null);
                              setProfilePhotoPreview(null);
                            }}
                          />
                          <p className="text-sm text-muted-foreground">Upload a profile photo for identification (optional)</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <Phone className="h-5 w-5 mr-2" />
                        Contact Information
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Provide contact details for communication.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={personalInfoForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="+1234567890" {...field} />
                            </FormControl>
                            <FormDescription>Format: +[country code][number], e.g., +1234567890</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalInfoForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalInfoForm.control}
                        name="preferred_communication"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferred Communication Method</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select method" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="phone">Phone Call</SelectItem>
                                <SelectItem value="sms">SMS Text</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <MapPin className="h-5 w-5 mr-2" />
                        Address Information
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Enter the patient's residential address.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={personalInfoForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Street Address</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main St" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalInfoForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="New York" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalInfoForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State/Province</FormLabel>
                            <FormControl>
                              <Input placeholder="NY" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalInfoForm.control}
                        name="postal_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal/ZIP Code</FormLabel>
                            <FormControl>
                              <Input placeholder="10001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalInfoForm.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input placeholder="USA" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        Emergency Contact
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Provide emergency contact information.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={personalInfoForm.control}
                        name="emergency_contact_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Jane Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalInfoForm.control}
                        name="emergency_contact_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Phone *</FormLabel>
                            <FormControl>
                              <Input placeholder="+1234567890" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={personalInfoForm.control}
                        name="emergency_contact_relationship"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Relationship *</FormLabel>
                            <FormControl>
                              <Input placeholder="Spouse" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                  <Button type="submit" disabled={loading} className="min-w-[120px]">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {id ? 'Update & Continue' : 'Create & Continue'}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Medical History Tab */}
          <TabsContent value="medical" className="space-y-6">
            <Form {...medicalHistoryForm}>
              <form onSubmit={medicalHistoryForm.handleSubmit(onSubmitMedicalHistory)} className="space-y-6">
                <Card className="pt-6">
                  <CardContent className="space-y-8">
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <Heart className="h-5 w-5 mr-2" />
                        Basic Medical Information
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Enter the patient's basic medical details.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <FormField
                        control={medicalHistoryForm.control}
                        name="blood_group"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Blood Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || "unknown"}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select blood type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="A+">A+</SelectItem>
                                <SelectItem value="A-">A-</SelectItem>
                                <SelectItem value="B+">B+</SelectItem>
                                <SelectItem value="B-">B-</SelectItem>
                                <SelectItem value="AB+">AB+</SelectItem>
                                <SelectItem value="AB-">AB-</SelectItem>
                                <SelectItem value="O+">O+</SelectItem>
                                <SelectItem value="O-">O-</SelectItem>
                                <SelectItem value="unknown">Unknown</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={medicalHistoryForm.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Height (cm)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="170"
                                {...field}
                                onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={medicalHistoryForm.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weight (kg)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="70"
                                {...field}
                                onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h4 className="font-medium">Allergies</h4>
                        <p className="text-sm text-muted-foreground">List patient allergies (medications, foods, etc.)</p>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Add an allergy..." 
                            value={newAllergy} 
                            onChange={(e) => setNewAllergy(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                          />
                          <Button type="button" onClick={addAllergy} size="sm">Add</Button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          {allergiesList.map((allergy, index) => (
                            <div key={index} className="flex items-center bg-red-100 text-red-800 rounded-full px-3 py-1">
                              <span>{allergy}</span>
                              <button
                                type="button"
                                onClick={() => removeAllergy(index)}
                                className="ml-2 text-red-800 hover:text-red-900"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {allergiesList.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">No allergies added</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">Medical Conditions</h4>
                        <p className="text-sm text-muted-foreground">List current and past medical conditions</p>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Add a medical condition..." 
                            value={newMedicalCondition} 
                            onChange={(e) => setNewMedicalCondition(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMedicalCondition())}
                          />
                          <Button type="button" onClick={addMedicalCondition} size="sm">Add</Button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          {medicalConditionsList.map((condition, index) => (
                            <div key={index} className="flex items-center bg-yellow-100 text-yellow-800 rounded-full px-3 py-1">
                              <span>{condition}</span>
                              <button
                                type="button"
                                onClick={() => removeMedicalCondition(index)}
                                className="ml-2 text-yellow-800 hover:text-yellow-900"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {medicalConditionsList.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">No medical conditions added</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">Current Medications</h4>
                        <p className="text-sm text-muted-foreground">List current medications with dosage and frequency</p>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Medication Name</Label>
                              <Input 
                                placeholder="Medication name" 
                                value={newMedication.name} 
                                onChange={(e) => setNewMedication({...newMedication, name: e.target.value})}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Dosage</Label>
                              <Input 
                                placeholder="e.g., 10mg" 
                                value={newMedication.dosage} 
                                onChange={(e) => setNewMedication({...newMedication, dosage: e.target.value})}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Frequency</Label>
                              <Input 
                                placeholder="e.g., Twice daily" 
                                value={newMedication.frequency} 
                                onChange={(e) => setNewMedication({...newMedication, frequency: e.target.value})}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Reason</Label>
                              <Input 
                                placeholder="What is it for?" 
                                value={newMedication.reason} 
                                onChange={(e) => setNewMedication({...newMedication, reason: e.target.value})}
                              />
                            </div>
                          </div>
                          
                          <Button type="button" onClick={addMedication} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Medication
                          </Button>
                        </div>
                        
                        <div className="space-y-2 mt-4">
                          {medicationsList.map((medication, index) => (
                            <div key={index} className="flex items-center justify-between bg-blue-50 rounded-md p-3">
                              <div>
                                <div className="font-medium">{medication.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {medication.dosage} - {medication.frequency}
                                  {medication.reason && ` - ${medication.reason}`}
                                </div>
                              </div>
                              <Button 
                                type="button" 
                                variant="destructive" 
                                size="sm"
                                onClick={() => removeMedication(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {medicationsList.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">No medications added</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">Previous Surgeries/Procedures</h4>
                        <p className="text-sm text-muted-foreground">List previous surgical procedures with dates</p>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Procedure Name</Label>
                              <Input 
                                placeholder="e.g., Appendectomy" 
                                value={newSurgery.procedure} 
                                onChange={(e) => setNewSurgery({...newSurgery, procedure: e.target.value})}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Date</Label>
                              <Input 
                                type="date" 
                                value={newSurgery.date} 
                                onChange={(e) => setNewSurgery({...newSurgery, date: e.target.value})}
                              />
                            </div>
                            
                            <div className="md:col-span-2 space-y-2">
                              <Label>Notes</Label>
                              <Textarea 
                                placeholder="Additional details" 
                                value={newSurgery.notes} 
                                onChange={(e) => setNewSurgery({...newSurgery, notes: e.target.value})}
                              />
                            </div>
                          </div>
                          
                          <Button type="button" onClick={addSurgery} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Surgery/Procedure
                          </Button>
                        </div>
                        
                        <div className="space-y-2 mt-4">
                          {surgeriesList.map((surgery, index) => (
                            <div key={index} className="flex items-center justify-between bg-purple-50 rounded-md p-3">
                              <div>
                                <div className="font-medium">{surgery.procedure}</div>
                                <div className="text-sm text-muted-foreground">
                                  Date: {surgery.date}
                                  {surgery.notes && <div>{surgery.notes}</div>}
                                </div>
                              </div>
                              <Button 
                                type="button" 
                                variant="destructive" 
                                size="sm"
                                onClick={() => removeSurgery(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          {surgeriesList.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">No surgeries/procedures added</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <User className="h-5 w-5 mr-2" />
                        Primary Physician
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={medicalHistoryForm.control}
                        name="primary_physician.name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Physician Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Dr. Smith" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={medicalHistoryForm.control}
                        name="primary_physician.phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Physician Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="+1234567890" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={medicalHistoryForm.control}
                        name="primary_physician.clinic"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Clinic/Hospital</FormLabel>
                            <FormControl>
                              <Input placeholder="City Medical Center" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <ShieldAlert className="h-5 w-5 mr-2" />
                        Family Medical History
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={medicalHistoryForm.control}
                        name="family_history.diabetes"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Diabetes</FormLabel>
                              <FormDescription>
                                Family history of diabetes
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={medicalHistoryForm.control}
                        name="family_history.heart_disease"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Heart Disease</FormLabel>
                              <FormDescription>
                                Family history of heart disease
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={medicalHistoryForm.control}
                        name="family_history.hypertension"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Hypertension</FormLabel>
                              <FormDescription>
                                Family history of high blood pressure
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={medicalHistoryForm.control}
                        name="family_history.cancer"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Cancer</FormLabel>
                              <FormDescription>
                                Family history of cancer
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={medicalHistoryForm.control}
                        name="family_history.other"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Other Family Medical History</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Please specify any other relevant family medical history"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <User className="h-5 w-5 mr-2" />
                        Lifestyle
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={medicalHistoryForm.control}
                        name="lifestyle.smoking"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Smoking</FormLabel>
                              <FormDescription>
                                Does the patient smoke tobacco products?
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={medicalHistoryForm.control}
                        name="lifestyle.alcohol"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Alcohol</FormLabel>
                              <FormDescription>
                                Does the patient consume alcohol?
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={medicalHistoryForm.control}
                        name="lifestyle.exercise"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Regular Exercise</FormLabel>
                              <FormDescription>
                                Does the patient exercise regularly?
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <User className="h-5 w-5 mr-2" />
                        Pregnancy Status (if applicable)
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={medicalHistoryForm.control}
                        name="pregnancy.is_pregnant"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Currently Pregnant</FormLabel>
                              <FormDescription>
                                Is the patient currently pregnant?
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      {medicalHistoryForm.watch("pregnancy.is_pregnant") && (
                        <>
                          <FormField
                            control={medicalHistoryForm.control}
                            name="pregnancy.due_date"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Due Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={medicalHistoryForm.control}
                            name="pregnancy.notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pregnancy Notes</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Additional notes about pregnancy"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("personal")}>
                    Back
                  </Button>
                  <Button type="submit" disabled={loading} className="min-w-[120px]">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save & Continue
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Dental History Tab */}
          <TabsContent value="dental" className="space-y-6">
            <Form {...dentalHistoryForm}>
              <form onSubmit={dentalHistoryForm.handleSubmit(onSubmitDentalHistory)} className="space-y-6">
                <Card className="pt-6">
                  <CardContent className="space-y-8">
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <Stethoscope className="h-5 w-5 mr-2" />
                        Dental History
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Enter the patient's dental history and habits.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={dentalHistoryForm.control}
                        name="last_dental_visit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Dental Visit</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={dentalHistoryForm.control}
                        name="reason_for_last_visit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reason for Last Visit</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Cleaning, Filling, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={dentalHistoryForm.control}
                        name="current_dental_issues"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Current Dental Issues</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe any current dental problems or concerns"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Previous Dental Treatments</h4>
                      <p className="text-sm text-muted-foreground">List previous dental treatments and procedures</p>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Add a treatment..." 
                          value={newPreviousTreatment} 
                          onChange={(e) => setNewPreviousTreatment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPreviousTreatment())}
                        />
                        <Button type="button" onClick={addPreviousTreatment} size="sm">Add</Button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        {previousTreatmentsList.map((treatment, index) => (
                          <div key={index} className="flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1">
                            <span>{treatment}</span>
                            <button
                              type="button"
                              onClick={() => removePreviousTreatment(index)}
                              className="ml-2 text-blue-800 hover:text-blue-900"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {previousTreatmentsList.length === 0 && (
                          <p className="text-sm text-muted-foreground italic">No previous treatments added</p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <User className="h-5 w-5 mr-2" />
                        Dental Hygiene
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={dentalHistoryForm.control}
                        name="brushing_frequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Brushing Frequency</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="once_daily">Once a day</SelectItem>
                                <SelectItem value="twice_daily">Twice a day</SelectItem>
                                <SelectItem value="thrice_daily">Three times a day</SelectItem>
                                <SelectItem value="less_than_daily">Less than once a day</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={dentalHistoryForm.control}
                        name="flossing_frequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Flossing Frequency</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="few_times_week">Few times a week</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="rarely">Rarely</SelectItem>
                                <SelectItem value="never">Never</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        Dental Symptoms
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Check all symptoms that apply to the patient.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={dentalHistoryForm.control}
                        name="sensitivity"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Tooth Sensitivity</FormLabel>
                              <FormDescription>
                                Sensitivity to hot, cold, sweet, or acidic foods/drinks
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={dentalHistoryForm.control}
                        name="bleeding_gums"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Bleeding Gums</FormLabel>
                              <FormDescription>
                                Gums bleed during brushing or flossing
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={dentalHistoryForm.control}
                        name="grinding_teeth"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Grinding/Clenching Teeth</FormLabel>
                              <FormDescription>
                                Grinds or clenches teeth during day or night
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={dentalHistoryForm.control}
                        name="dry_mouth"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Dry Mouth</FormLabel>
                              <FormDescription>
                                Experiences dry mouth regularly
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={dentalHistoryForm.control}
                      name="dental_anxiety"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dental Anxiety Level</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="none" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  None - Comfortable with dental visits
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="mild" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Mild - Slightly nervous but manageable
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="moderate" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Moderate - Definitely anxious about visits
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="severe" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Severe - Very anxious, may avoid dental care
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("medical")}>
                    Back
                  </Button>
                  <Button type="submit" disabled={loading} className="min-w-[120px]">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save & Continue
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Insurance Tab */}
          <TabsContent value="insurance" className="space-y-6">
            <Form {...insuranceForm}>
              <form onSubmit={insuranceForm.handleSubmit(onSubmitInsurance)} className="space-y-6">
                <Card className="pt-6">
                  <CardContent className="space-y-8">
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <Building className="h-5 w-5 mr-2" />
                        Primary Insurance
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Enter the patient's dental insurance information.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={insuranceForm.control}
                        name="insurance_provider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Insurance Provider</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Delta Dental, MetLife" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={insuranceForm.control}
                        name="insurance_policy_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Policy Number</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., ABC123456789" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={insuranceForm.control}
                        name="insurance_group_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Group Number</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 12345" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={insuranceForm.control}
                        name="insurance_expiry_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expiration Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <User className="h-5 w-5 mr-2" />
                        Policy Holder Information
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        If the patient is not the policy holder, enter the policy holder details.
                      </p>
                    </div>

                    <FormField
                      control={insuranceForm.control}
                      name="insurance_holder_relationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship to Patient</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select relationship" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="self">Self</SelectItem>
                              <SelectItem value="spouse">Spouse</SelectItem>
                              <SelectItem value="child">Child</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {insuranceForm.watch("insurance_holder_relationship") !== "self" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={insuranceForm.control}
                          name="insurance_holder_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Policy Holder Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Full name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={insuranceForm.control}
                          name="insurance_holder_dob"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Policy Holder Date of Birth</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <Building className="h-5 w-5 mr-2" />
                        Secondary Insurance (Optional)
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={insuranceForm.control}
                        name="secondary_insurance_provider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secondary Insurance Provider</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Cigna, Aetna" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={insuranceForm.control}
                        name="secondary_insurance_policy_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secondary Policy Number</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., XYZ987654321" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <CreditCard className="h-5 w-5 mr-2" />
                        Payment Information
                      </h3>
                    </div>

                    <FormField
                      control={insuranceForm.control}
                      name="preferred_payment_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="credit_card">Credit Card</SelectItem>
                              <SelectItem value="debit_card">Debit Card</SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="check">Check</SelectItem>
                              <SelectItem value="insurance_only">Insurance Only</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("dental")}>
                    Back
                  </Button>
                  <Button type="submit" disabled={loading} className="min-w-[120px]">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save & Continue
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Form {...consentForm}>
              <form onSubmit={consentForm.handleSubmit(onSubmitConsent)} className="space-y-6">
                <Card className="pt-6">
                  <CardContent className="space-y-8">
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        Required Documents
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Upload required identification and documents.
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label>Government ID</Label>
                        <FileUpload
                          accept="image/jpeg,image/png,image/gif,application/pdf"
                          maxSize={5}
                          onFileChange={setGovernmentIdFile}
                          preview={governmentIdPreview}
                          onRemove={() => {
                            setGovernmentIdFile(null);
                            setGovernmentIdPreview(null);
                          }}
                        />
                        <p className="text-sm text-muted-foreground">Upload a government-issued ID for identification verification</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Patient Signature</Label>
                        <FileUpload
                          accept="image/jpeg,image/png,image/gif"
                          maxSize={2}
                          onFileChange={setSignatureFile}
                          preview={signaturePreview}
                          onRemove={() => {
                            setSignatureFile(null);
                            setSignaturePreview(null);
                          }}
                        />
                        <p className="text-sm text-muted-foreground">Upload a signature image or sign using a touchscreen</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <Upload className="h-5 w-5 mr-2" />
                        Additional Documents
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Upload additional medical records, previous dental records, or other relevant documents.
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Document Type</Label>
                            <Select
                              value={newDocumentType}
                              onValueChange={setNewDocumentType}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select document type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="medical_record">Medical Record</SelectItem>
                                <SelectItem value="dental_record">Previous Dental Record</SelectItem>
                                <SelectItem value="insurance_card">Insurance Card</SelectItem>
                                <SelectItem value="referral">Referral Letter</SelectItem>
                                <SelectItem value="other">Other Document</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Upload Document</Label>
                            <FileUpload
                              accept="image/jpeg,image/png,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              maxSize={10}
                              onFileChange={setNewDocument}
                              onRemove={() => setNewDocument(null)}
                            />
                          </div>
                        </div>
                        
                        <Button 
                          type="button" 
                          onClick={handleUploadDocument} 
                          disabled={!newDocument || loading}
                          size="sm"
                        >
                          {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Upload Document
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Uploaded Documents</h4>
                        {documents.length > 0 ? (
                          <div className="grid gap-2">
                            {documents.map((doc, index) => (
                              <div key={index} className="flex items-center justify-between bg-muted p-3 rounded-md">
                                <div className="flex items-center">
                                  <FileText className="h-5 w-5 mr-3 text-blue-600" />
                                  <div>
                                    <p className="font-medium">{doc.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {doc.type} • {new Date(doc.dateAdded || doc.date_added).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    View
                                  </a>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => removeDocument(doc.path)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No documents uploaded yet</p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h3 className="text-lg font-medium flex items-center">
                        <Check className="h-5 w-5 mr-2" />
                        Consent Forms
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Please read and acknowledge the following consent forms.
                      </p>
                    </div>

                    <div className="space-y-6">
                      <FormField
                        control={consentForm.control}
                        name="hipaa_consent"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>HIPAA Privacy Practices</FormLabel>
                              <FormDescription>
                                I acknowledge that I have been offered or received a copy of the Notice of Privacy Practices, which explains how my medical information will be used and disclosed.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={consentForm.control}
                        name="treatment_consent"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Treatment Consent</FormLabel>
                              <FormDescription>
                                I give consent for dental treatment deemed necessary or advisable by the dental professionals at this practice. I understand that dental treatment has inherent risks and I may be given additional information about specific procedures.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={consentForm.control}
                        name="financial_agreement"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Financial Agreement</FormLabel>
                              <FormDescription>
                                I understand and agree that I am financially responsible for all charges for services provided to me, regardless of insurance coverage. I authorize my insurance benefits to be paid directly to the dental practice.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={consentForm.control}
                        name="photo_consent"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Photo Consent (Optional)</FormLabel>
                              <FormDescription>
                                I authorize the practice to take photographs of me for diagnostic purposes and to document treatment. I understand that these images may be used for treatment planning, educational purposes, and/or dental records.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={consentForm.control}
                        name="communication_consent"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Communication Consent</FormLabel>
                              <FormDescription>
                                I consent to receive communications from the practice including appointment reminders, treatment follow-ups, and practice updates via the contact methods I've provided (email, phone, SMS).
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("insurance")}>
                    Back
                  </Button>
                  <Button type="submit" disabled={loading} className="min-w-[120px]">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {fromQuickAppointment ? 'Save & Schedule' : 'Complete Registration'}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* Appointment Tab (only shown if coming from quick appointment) */}
          {fromQuickAppointment && (
            <TabsContent value="appointment" className="space-y-6">
              <Card className="pt-6">
                <CardHeader>
                  <CardTitle>Schedule Appointment</CardTitle>
                  <CardDescription>
                    Schedule an appointment for the patient
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Doctor</Label>
                      <Select 
                        value={appointmentDetails.doctor} 
                        onValueChange={(value) => setAppointmentDetails({...appointmentDetails, doctor: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a doctor" />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.map(doctor => (
                            <SelectItem key={doctor.id} value={doctor.id}>
                              Dr. {doctor.first_name} {doctor.last_name} 
                              {doctor.specialization ? ` (${doctor.specialization})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Reason for Visit</Label>
                      <Select 
                        value={appointmentDetails.reason} 
                        onValueChange={(value) => setAppointmentDetails({...appointmentDetails, reason: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checkup">Regular Checkup</SelectItem>
                          <SelectItem value="cleaning">Teeth Cleaning</SelectItem>
                          <SelectItem value="emergency">Dental Emergency</SelectItem>
                          <SelectItem value="filling">Filling</SelectItem>
                          <SelectItem value="extraction">Tooth Extraction</SelectItem>
                          <SelectItem value="root_canal">Root Canal</SelectItem>
                          <SelectItem value="crown">Crown/Cap</SelectItem>
                          <SelectItem value="whitening">Teeth Whitening</SelectItem>
                          <SelectItem value="consultation">Consultation</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input 
                        type="date" 
                        value={appointmentDetails.date}
                        onChange={(e) => setAppointmentDetails({...appointmentDetails, date: e.target.value})}
                        min={format(new Date(), 'yyyy-MM-dd')}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input 
                        type="time" 
                        value={appointmentDetails.time}
                        onChange={(e) => setAppointmentDetails({...appointmentDetails, time: e.target.value})}
                        min="08:00"
                        max="18:00"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <Select
                        value={appointmentDetails.duration}
                        onValueChange={(value) => setAppointmentDetails({...appointmentDetails, duration: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="90">1.5 hours</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Additional notes or instructions"
                      value={appointmentDetails.notes}
                      onChange={(e) => setAppointmentDetails({...appointmentDetails, notes: e.target.value})}
                      rows={4}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab("documents")}
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleCreateAppointment}
                    disabled={loading || !appointmentDetails.doctor}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CalendarCheck className="mr-2 h-4 w-4" />
                    )}
                    Schedule Appointment
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}