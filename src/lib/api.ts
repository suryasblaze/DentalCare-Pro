import { supabase } from './supabase';
import type { Database, Json } from './database.types'; // Import Json type
// Removed unused TreatmentPlan import
import { executeTransaction, TransactionResult } from './utils/db-transaction';
import { globalCache } from './utils/cache-manager';

// Define specific types based on generated types from database.types.ts
type PatientRow = Database['public']['Tables']['patients']['Row'];
type PatientInsert = Database['public']['Tables']['patients']['Insert'];
type PatientUpdate = Database['public']['Tables']['patients']['Update'];
type AppointmentRow = Database['public']['Tables']['appointments']['Row'];
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
type AppointmentUpdate = Database['public']['Tables']['appointments']['Update'];
// Use actual table names from the generated types
type TreatmentPlanRow = Database['public']['Tables']['treatment_plans']['Row'];
type TreatmentPlanInsert = Database['public']['Tables']['treatment_plans']['Insert'];
type TreatmentRow = Database['public']['Tables']['treatments']['Row'];
type TreatmentInsert = Database['public']['Tables']['treatments']['Insert'];
type StaffRow = Database['public']['Tables']['staff']['Row']; // Uncommenting StaffRow

// Re-adding placeholder types as they are referenced in generateTreatmentPlan
type PatientAssessmentRow = any;
type DiagnosticImageRow = any;
// Add missing placeholders based on errors
type PatientAssessmentInsert = any;
type DiagnosticImageInsert = any;
type FinancialPlanRow = any;
type FinancialPlanInsert = any;


/**
 * Subscribe to real-time changes for a specific table
 * @param table Table name to subscribe to
 * @param callback Callback function to handle updates
 * @returns Subscription object that can be used to unsubscribe
 */
export function subscribeToChanges(
  table: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`public:${table}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table },
      payload => {
        // Invalidate cache for this table
        globalCache.invalidatePattern(new RegExp(`^${table}`));
        callback(payload);
      }
    )
    .subscribe();
}

export const api = {
  storage: {
    // Upload file to Supabase Storage
    async uploadFile(file: File, patientId: string) {
      try {
        // Create a unique filename by combining original name, timestamp and patient ID
        const fileExt = file.name.split('.').pop();
        const fileName = `${patientId}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;

        // Upload the file to the 'medical-records' bucket
        const { data, error } = await supabase.storage
          .from('medical-records')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // Get public URL for the file
        const { data: { publicUrl } } = supabase.storage
          .from('medical-records')
          .getPublicUrl(data.path);

        return {
          path: data.path,
          url: publicUrl,
          name: file.name,
          size: file.size,
          type: file.type
        };
      } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
      }
    },

    // Delete file from Supabase Storage
    async deleteFile(filePath: string) {
      try {
        const { error } = await supabase.storage
          .from('medical-records')
          .remove([filePath]);

        if (error) throw error;

        return true;
      } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
      }
    }
  },

  // Uncommenting staff API
  staff: {
    async getAll(): Promise<StaffRow[]> { // Add return type
      // Try to get from cache first
      const cachedData = globalCache.get<StaffRow[]>('staff:all');
      if (cachedData) {
        return cachedData;
      }

      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cache the result
      globalCache.set('staff:all', data);
      return data || []; // Return empty array if null
    },

    async getDoctors(): Promise<StaffRow[]> { // Add return type
      // Try to get from cache first
      const cachedData = globalCache.get<StaffRow[]>('staff:doctors');
      if (cachedData) {
        return cachedData;
      }

      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('role', 'doctor')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cache the result
      globalCache.set('staff:doctors', data);
      return data || []; // Return empty array if null
    },

    async create(staff: Database['public']['Tables']['staff']['Insert']) {
      const { data, error } = await supabase
        .from('staff') // This causes errors if 'staff' is not in types
        .insert(staff)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      globalCache.invalidatePattern(/^staff/);
      return data;
    },

    async update(id: string, staff: Database['public']['Tables']['staff']['Update']) {
      const { data, error } = await supabase
        .from('staff') // This causes errors if 'staff' is not in types
        .update(staff)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      globalCache.invalidatePattern(/^staff/);
      return data;
    }
  },
  // End uncommenting staff API

  patients: {
    /* // Commenting out functions related to non-existent tables
    // Using placeholder type PatientAssessmentInsert
    async createAssessment(assessment: PatientAssessmentInsert) {
      const { data, error } = await supabase
        .from('patient_assessments') // This table does not exist
        .insert(assessment)
        .select()
        .single();

      if (error) throw error;
      // Should return PatientAssessmentRow but using any due to potential missing type
      return data as PatientAssessmentRow;
    },

    // Using placeholder type PatientAssessmentRow[]
    async getAssessments(patientId: string): Promise<PatientAssessmentRow[]> {
      console.warn("Attempted to call getAssessments for non-existent table 'patient_assessments'");
      return []; // Return empty array as table doesn't exist
      // const cacheKey = `patient_assessments:${patientId}`;
      // const cachedData = globalCache.get<PatientAssessmentRow[]>(cacheKey); // Use type
      // if (cachedData) {
      //   return cachedData;
      // }

      // const { data, error } = await supabase
      //   .from('patient_assessments') // This table does not exist
      //   .select('*')
      //   .eq('patient_id', patientId)
      //   .order('assessment_date', { ascending: false });

      // if (error) throw error;

      // globalCache.set(cacheKey, data);
      // return data as PatientAssessmentRow[]; // Use type
    },

    // Using placeholder type DiagnosticImageInsert
    async uploadDiagnosticImage(imageData: DiagnosticImageInsert) {
      const { data, error } = await supabase
        .from('diagnostic_images') // This table does not exist
        .insert(imageData)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      globalCache.invalidate(`diagnostic_images:${imageData.patient_id}`);
      // Should return DiagnosticImageRow but using any due to potential missing type
      return data as DiagnosticImageRow;
    },

    // Using placeholder type DiagnosticImageRow[]
    async getDiagnosticImages(patientId: string): Promise<DiagnosticImageRow[]> {
      console.warn("Attempted to call getDiagnosticImages for non-existent table 'diagnostic_images'");
      return []; // Return empty array as table doesn't exist
      // const cacheKey = `diagnostic_images:${patientId}`;
      // const cachedData = globalCache.get<DiagnosticImageRow[]>(cacheKey); // Use type
      // if (cachedData) {
      //   return cachedData;
      // }

      // const { data, error } = await supabase
      //   .from('diagnostic_images') // This table does not exist
      //   .select('*')
      //   .eq('patient_id', patientId)
      //   .order('capture_date', { ascending: false });

      // if (error) throw error;

      // globalCache.set(cacheKey, data);
      // return data as DiagnosticImageRow[]; // Use type
    },

    // Using placeholder type FinancialPlanInsert
    async createFinancialPlan(planData: FinancialPlanInsert) {
      const { data, error } = await supabase
        .from('financial_plans') // This table does not exist
        .insert(planData)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      globalCache.invalidate(`financial_plans:${planData.treatment_plan_id}`);
      // Should return FinancialPlanRow but using any due to potential missing type
      return data as FinancialPlanRow;
    },

    // Using placeholder type FinancialPlanRow
    async getFinancialPlans(treatmentPlanId: string): Promise<FinancialPlanRow | null> {
       console.warn("Attempted to call getFinancialPlans for non-existent table 'financial_plans'");
       return null; // Return null as table doesn't exist
      // const cacheKey = `financial_plans:${treatmentPlanId}`;
      // const cachedData = globalCache.get<FinancialPlanRow>(cacheKey); // Use type
      // if (cachedData) {
      //   return cachedData;
      // }

      // const { data, error } = await supabase
      //   .from('financial_plans') // This table does not exist
      //   .select('*')
      //   .eq('treatment_plan_id', treatmentPlanId)
      //   .single();

      // if (error) throw error;

      // globalCache.set(cacheKey, data);
      // // Use type, handle potential null if single() doesn't find a match
      // return data as FinancialPlanRow | null;
    },
    */ // End commenting out functions related to non-existent tables

    // Assuming patient_communications type exists in database.types.ts
    async schedulePatientCommunication(communicationData: Database['public']['Tables']['patient_communications']['Insert']) {
      const { data, error } = await supabase
        .from('patient_communications')
        .insert(communicationData)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      globalCache.invalidate(`patient_communications:${communicationData.patient_id}`);
      return data; // Return type inferred from select().single()
    },

    // Assuming patient_communications type exists
    async getPatientCommunications(patientId: string): Promise<Database['public']['Tables']['patient_communications']['Row'][]> {
      const cacheKey = `patient_communications:${patientId}`;
      // Use specific type for cache
      const cachedData = globalCache.get<Database['public']['Tables']['patient_communications']['Row'][]>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const { data, error } = await supabase
        .from('patient_communications')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      globalCache.set(cacheKey, data);
      return data || []; // Return empty array if data is null
    },

    // Return type is likely custom based on the function's logic
    async generateTreatmentPlan(patientId: string, currentIssue: string): Promise<any> {
      try {
        // Fetch comprehensive patient data
        const [
          medicalHistory,
          previousTreatments,
          // Comment out calls for non-existent tables
          // assessments,
          // diagnosticImages
        ] = await Promise.all([
          api.patients.getMedicalRecords(patientId),
          api.patients.getTreatmentPlans(patientId),
          // Promise.resolve([]), // Placeholder for assessments
          // Promise.resolve([]), // Placeholder for diagnosticImages
        ]);

        // Define placeholder data if needed by the function body
        const assessments: PatientAssessmentRow[] = [];
        const diagnosticImages: DiagnosticImageRow[] = [];


        // Get session for access token
        const session = await supabase.auth.getSession();
        const accessToken = session?.data?.session?.access_token;

        if (!accessToken) {
          throw new Error('User not authenticated');
        }

        const response = await fetch('/functions/v1/treatment-ai', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`, // Use session access token
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            patientId,
            currentIssue,
            medicalHistory,
            previousTreatments,
            assessments, // Pass empty array
            diagnosticImages // Pass empty array
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate treatment plan');
        }

        return await response.json();
      } catch (error) {
        console.error('Error generating treatment plan:', error);
        throw error;
      }
    },

    async getAll() {
      const cacheKey = 'patients:all';
      const cachedData = globalCache.get<PatientRow[]>('patients:all'); // Use PatientRow
      if (cachedData) {
        return cachedData;
      }

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      globalCache.set(cacheKey, data);
      return data;
    },

    async getById(id: string) {
      const cacheKey = `patients:${id}`;
      const cachedData = globalCache.get<PatientRow>(cacheKey); // Use PatientRow
      if (cachedData) {
        return cachedData;
      }

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: Row not found is okay
        throw error;
      }

      if (data) {
        globalCache.set(cacheKey, data);
      }
      return data; // Can be null if not found
    },

    async search(query: string) {
      const { data, error } = await supabase
        .from('patients')
        .select()
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%,registration_number.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },

    async create(patient: PatientInsert) { // Use generated Insert type
      const { data, error } = await supabase
        .from('patients')
        .insert(patient)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      globalCache.invalidatePattern(/^patients/);
      return data;
    },

    async update(id: string, patient: PatientUpdate) { // Use generated Update type
      const { data, error } = await supabase
        .from('patients')
        .update(patient)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      globalCache.invalidate(`patients:${id}`);
      globalCache.invalidate('patients:all');
      return data;
    },

    async getMedicalRecords(patientId: string | null) {
      const cacheKey = patientId ? `medical_records:${patientId}` : 'medical_records:all';
      const cachedData = globalCache.get<Database['public']['Tables']['medical_records']['Row'][]>(cacheKey); // Use specific type
      if (cachedData) {
        return cachedData;
      }

      let query = supabase
        .from('medical_records')
        .select('*')
        .order('record_date', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      globalCache.set(cacheKey, data);
      return data || []; // Return empty array if null
    },

    async getTreatmentPlans(patientId: string | null) {
      const cacheKey = patientId ? `treatment_plans:${patientId}` : 'treatment_plans:all';
      const cachedData = globalCache.get<TreatmentPlanRow[]>(cacheKey); // Use specific type
      if (cachedData) {
        return cachedData;
      }

      let query = supabase
        .from('treatment_plans')
        .select(`
          *,
          treatments (*)
        `)
        .order('start_date', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      globalCache.set(cacheKey, data);
      return data || []; // Return empty array if null
    },

    async createMedicalRecord(record: Database['public']['Tables']['medical_records']['Insert']) { // Use Insert type
      const { data, error } = await supabase
        .from('medical_records')
        .insert(record)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      globalCache.invalidate(`medical_records:${record.patient_id}`);
      globalCache.invalidate('medical_records:all');
      return data;
    },

    async updateMedicalRecord(id: string, record: Database['public']['Tables']['medical_records']['Update']) { // Use Update type
      const { data, error } = await supabase
        .from('medical_records')
        .update(record)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      globalCache.invalidate(`medical_records:${record.patient_id}`); // Assuming patient_id is part of update
      globalCache.invalidate('medical_records:all');
      return data;
    },

    async deleteMedicalRecord(id: string) {
      // Get the record first to know which caches to invalidate
      const { data: record } = await supabase
        .from('medical_records')
        .select('patient_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('medical_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Invalidate cache
      if (record) {
        globalCache.invalidate(`medical_records:${record.patient_id}`);
      }
      globalCache.invalidate('medical_records:all');
    },

    async createTreatmentPlan(plan: TreatmentPlanInsert) { // Use Insert type
      const { data, error } = await supabase
        .from('treatment_plans')
        .insert(plan)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      globalCache.invalidate(`treatment_plans:${plan.patient_id}`);
      globalCache.invalidate('treatment_plans:all');
      return data;
    },

    async updateTreatmentPlan(id: string, plan: Database['public']['Tables']['treatment_plans']['Update']) { // Use Update type
      const { data, error } = await supabase
        .from('treatment_plans')
        .update(plan)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      globalCache.invalidatePattern(/^treatment_plans/);
      return data;
    },

    async deleteTreatmentPlan(id: string) {
      // Get the plan first to know which caches to invalidate
      const { data: plan } = await supabase
        .from('treatment_plans')
        .select('patient_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('treatment_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Invalidate cache
      if (plan) {
        globalCache.invalidate(`treatment_plans:${plan.patient_id}`);
      }
      globalCache.invalidate('treatment_plans:all');
    },

    /**
     * Creates a treatment plan with treatments in a single transaction
     * @param planData Treatment plan data
     * @param treatments Array of treatments to create
     * @returns Transaction result containing an array [plan, treatments] on success
     */
    async createTreatmentPlanWithTreatments(
      planData: TreatmentPlanInsert,
      treatments: TreatmentInsert[]
      // The data returned by executeTransaction will be [planResult, treatmentsResult]
    ): Promise<TransactionResult<[TreatmentPlanRow, TreatmentRow[]]>> {
      // Define operations with explicit return types
      const operations: [() => Promise<TreatmentPlanRow>, (createdPlan: TreatmentPlanRow) => Promise<TreatmentRow[]>] = [
        // Operation 1: Create treatment plan
        async (): Promise<TreatmentPlanRow> => {
          // Explicitly type data and error
          const { data, error }: { data: TreatmentPlanRow | null; error: any } = await supabase
            .from('treatment_plans')
            .insert(planData)
            .select()
            .single();

          if (error) throw error;
          // Removed duplicate error check
          if (!data) throw new Error("Treatment plan creation returned no data");
          return data;
        },

        // Operation 2: Create treatments, accepting the created plan as input
        async (planResult: TreatmentPlanRow): Promise<TreatmentRow[]> => {
          // Ensure planResult has an id
          if (!planResult || !planResult.id) {
             throw new Error("Failed to get ID from created treatment plan");
          }

          // Explicitly type treatmentsWithPlanId
          const treatmentsWithPlanId: TreatmentInsert[] = treatments.map((treatment: TreatmentInsert): TreatmentInsert => ({ // Add return type for map
            ...treatment,
            plan_id: planResult.id // Assuming plan_id exists on TreatmentInsert
          }));

          // Avoid inserting empty array
          if (treatmentsWithPlanId.length === 0) {
             return [];
          }

          // Explicitly type data and error
          const { data, error }: { data: TreatmentRow[] | null; error: any } = await supabase
            .from('treatments')
            .insert(treatmentsWithPlanId)
            .select();

          if (error) throw error;
          // Removed duplicate error check
          if (!data) throw new Error("Treatment creation returned no data");
          return data;
        }
      ];

      // Execute transaction - Wrap both operations in functions to match the expected type signature.
      // NOTE: This still assumes executeTransaction doesn't handle passing results between steps.
      const result = await executeTransaction<[TreatmentPlanRow, TreatmentRow[]]>([
        () => operations[0](), // Wrap the first operation
        () => operations[1]({} as TreatmentPlanRow) // Wrap the second, calling with dummy value
      ]);

      // Invalidate cache if successful
      if (result.success && result.data) { // Check if data exists on success
        const plan = result.data[0]; // First element is the plan
        if (plan && plan.patient_id) {
          globalCache.invalidate(`treatment_plans:${plan.patient_id}`);
          globalCache.invalidate('treatment_plans:all');
        }
      }

      // The result already matches the return type Promise<TransactionResult<[TreatmentPlanRow, TreatmentRow[]]>>
      return result;
    },

    async createTreatment(treatment: TreatmentInsert) { // Use generated type
      const { data, error } = await supabase
        .from('treatments')
        .insert(treatment)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      globalCache.invalidatePattern(/^treatment_plans/); // Invalidate plans as treatments are nested
      return data; // Return type inferred
    },

    async updateTreatment(id: string, treatment: Database['public']['Tables']['treatments']['Update']) { // Use generated type
      const { data, error } = await supabase
        .from('treatments')
        .update(treatment)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      globalCache.invalidatePattern(/^treatment_plans/);
      return data; // Return type inferred
    },

    async deleteTreatment(id: string): Promise<void> { // Explicit return type
      const { error } = await supabase
        .from('treatments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Invalidate cache
      globalCache.invalidatePattern(/^treatment_plans/);
    },

    // New API to upload profile photo
    async uploadProfilePhoto(file: File, patientId: string) {
      try {
        const fileData = await api.storage.uploadFile(file, patientId);

        // Update the patient record with the new profile photo URL
        // Cast to any as a workaround for persistent type error
        await api.patients.update(patientId, {
          profile_photo_url: fileData.url
        } as any); 

        return fileData;
      } catch (error) {
        console.error('Error uploading profile photo:', error);
        throw error;
      }
    },

    // New API to upload patient signature
    async uploadSignature(file: File, patientId: string) {
      try {
        const fileData = await api.storage.uploadFile(file, patientId);

        // Update the patient record with the new signature URL
         // Cast to any as a workaround for persistent type error
        await api.patients.update(patientId, {
          signature_url: fileData.url
        } as any);

        return fileData;
      } catch (error) {
        console.error('Error uploading signature:', error);
        throw error;
      }
    },

    // New API to add a document to the patient's documents array
    async addDocument(file: File, patientId: string, docType: string, notes: string = '') {
      try {
        const fileData = await api.storage.uploadFile(file, patientId);

        // Get the current patient data
        const patient = await api.patients.getById(patientId);

        if (!patient) {
          throw new Error('Patient not found');
        }

        // Add the new document to the documents array
        // Ensure patient.documents is treated as an array
        const documents: any[] = Array.isArray(patient.documents) ? patient.documents : [];
        documents.push({
          ...fileData,
          docType,
          notes,
          dateAdded: new Date().toISOString()
        });

        // Update the patient record
         // Cast to any as a workaround for persistent type error
        await api.patients.update(patientId, { documents: documents } as any);

        return fileData;
      } catch (error) {
        console.error('Error adding document:', error);
        throw error;
      }
    },

    // New API to remove a document from the patient's documents array
    async removeDocument(patientId: string, documentPath: string) {
      try {
        // Get the current patient data
        const patient = await api.patients.getById(patientId);

        if (!patient) {
          throw new Error('Patient not found');
        }

        // Remove the document from the documents array
        // Ensure patient.documents is treated as an array before filtering
        const documents = (Array.isArray(patient.documents) ? patient.documents : []).filter(
          (doc: any) => doc.path !== documentPath
        );

        // Update the patient record
         // Cast to any as a workaround for persistent type error
        await api.patients.update(patientId, { documents: documents } as any);

        // Delete the file from storage
        await api.storage.deleteFile(documentPath);

        return true;
      } catch (error) {
        console.error('Error removing document:', error);
        throw error;
      }
    }
  },

  // Add a new section for communication functions
  communications: {
    async schedule(communicationData: {
      patientId: string;
      type: 'appointment_reminder' | 'treatment_info' | 'post_treatment' | 'education' | 'follow_up';
      treatmentPlanId?: string;
      appointmentId?: string;
      channel: 'email' | 'sms' | 'app';
      scheduledFor: string; // ISO string
      customMessage?: string;
    }) {
      try {
        // Get session for access token (needed if function requires auth)
        const session = await supabase.auth.getSession();
        const accessToken = session?.data?.session?.access_token;

        if (!accessToken) {
          // Handle case where user might not be authenticated, depending on function security
          // For now, let's assume the function might allow service_role key access if called server-side
          // or requires user auth if called client-side directly.
          // If called from another function, service_role key is used implicitly.
          // If called from client like here, Authorization header is needed.
           console.warn('No access token found for scheduling communication.');
           // Depending on function security, this might still work or fail.
        }

        const response = await fetch('/functions/v1/patient-communication', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Include Authorization header if function security requires it
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
          },
          body: JSON.stringify(communicationData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to schedule communication: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Communication scheduled successfully:', result);
        return result;
      } catch (error) {
        console.error('Error scheduling communication:', error);
        // Optionally re-throw or handle the error (e.g., show a toast notification)
        throw error; 
      }
    }
  },
  // End communications section

  appointments: {
    async getAll() {
      const cacheKey = 'appointments:all';
      const cachedData = globalCache.get<AppointmentRow[]>('appointments:all'); // Use specific type
      if (cachedData) {
        return cachedData;
      }

      const { data, error } = await supabase
        .from('appointments')
        // Corrected select based on generated types and relationships
        .select(`
          *,
          patients (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          staff (
            id,
            first_name,
            last_name,
            role,
            specialization
          )
        `)
        .order('start_time', { ascending: true });

      if (error) throw error;

      globalCache.set(cacheKey, data);
      return data || []; // Return empty array if null
    },

    async getByDateRange(startDate: string, endDate: string) {
      const cacheKey = `appointments:range:${startDate}:${endDate}`;
      const cachedData = globalCache.get<AppointmentRow[]>('appointments:range'); // Use specific type
      if (cachedData) {
        return cachedData;
      }

      const { data, error } = await supabase
        .from('appointments')
       // Corrected select based on generated types and relationships
       .select(`
          *,
          patients (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          staff (
            id,
            first_name,
            last_name,
            role,
            specialization
          )
         `)
       // Apply filters *after* select again - Fetch appointments STARTING within the range
       .gte('start_time', startDate)
       .lte('start_time', endDate) // Filter by start_time being within the range
       .order('start_time', { ascending: true });

      if (error) throw error;

      globalCache.set(cacheKey, data, 60 * 1000); // Short TTL for appointments
      return data || []; // Return empty array if null
    },

    async create(appointment: AppointmentInsert) { // Use generated Insert type
      const { data, error } = await supabase
        .from('appointments')
        .insert(appointment)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      globalCache.invalidatePattern(/^appointments/);
      return data;
    },

    async update(id: string, appointment: AppointmentUpdate) { // Use generated Update type
      const { data, error } = await supabase
        .from('appointments')
        .update(appointment)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      globalCache.invalidatePattern(/^appointments/);
      return data;
    },

    async cancel(id: string) {
      const { data, error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      globalCache.invalidatePattern(/^appointments/);
      return data;
    }
  },

  settings: {
    async get() {
      const cacheKey = 'clinic_settings';
      const cachedData = globalCache.get<Database['public']['Tables']['clinic_settings']['Row']>(cacheKey); // Use specific type
      if (cachedData) {
        return cachedData;
      }

      const { data, error } = await supabase
        .from('clinic_settings')
        .select()
        .order('created_at', { ascending: false })
        .limit(1)

      if (error && error.code !== 'PGRST116') { // Allow row not found
        throw error;
      }

      // Return default settings if no settings exist
      const result = data?.[0] || {
        // Provide default structure matching the Row type if possible
        id: '', // Assuming id is string and required for default
        name: 'DentalCare Pro',
        address: '123 Healthcare Avenue',
        phone: '+1234567890',
        email: 'info@dentalcarepro.com',
        website: 'https://dentalcarepro.com',
        working_hours: [
          { day: 'monday', start: '09:00', end: '17:00', is_open: true },
          { day: 'tuesday', start: '09:00', end: '17:00', is_open: true },
          { day: 'wednesday', start: '09:00', end: '17:00', is_open: true },
          { day: 'thursday', start: '09:00', end: '17:00', is_open: true },
          { day: 'friday', start: '09:00', end: '17:00', is_open: true },
          { day: 'saturday', start: '10:00', end: '14:00', is_open: false },
          { day: 'sunday', start: '10:00', end: '14:00', is_open: false }
        ],
        notification_preferences: {
          reminder_time: '24h',
          system_updates: true,
          sms_notifications: true,
          email_notifications: true,
          appointment_reminders: true
        },
        created_at: new Date().toISOString(), // Add defaults for missing fields if needed
        updated_at: new Date().toISOString(),
      };

      globalCache.set(cacheKey, result);
      // Ensure the returned default matches the Row type
      return result as Database['public']['Tables']['clinic_settings']['Row'];
    },

    async update(settings: Database['public']['Tables']['clinic_settings']['Update'] & { id?: string }) { // Use Update type
      // If no ID, create new settings
      if (!settings.id) {
         // Ensure the object matches Insert type
         const insertData: Database['public']['Tables']['clinic_settings']['Insert'] = {
             ...settings,
             // Add any required fields for Insert not present in Update
             name: settings.name || 'Default Clinic Name', // Example: ensure name is present
         };
        const { data, error } = await supabase
          .from('clinic_settings')
          .insert(insertData) // Use Insert type compatible data
          .select()
          .single();

        if (error) throw error;

        // Invalidate cache
        globalCache.invalidate('clinic_settings');
        return data;
      }

      // Otherwise update existing settings
      const { id, ...updateData } = settings;
      const { data, error } = await supabase
        .from('clinic_settings')
        .update(updateData) // updateData should match Update type
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Invalidate cache
      globalCache.invalidate('clinic_settings');
      return data;
    }
  }
};
