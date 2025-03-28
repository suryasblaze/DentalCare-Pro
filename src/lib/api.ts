import { supabase } from './supabase';
import type { Database } from './database.types';
import type { TreatmentPlan } from '../types';
import { executeTransaction, TransactionResult } from './utils/db-transaction';
import { globalCache } from './utils/cache-manager';

type Patient = Database['public']['Tables']['patients']['Row'];
type Appointment = Database['public']['Tables']['appointments']['Row'];

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
  
  staff: {
    async getAll() {
      // Try to get from cache first
      const cachedData = globalCache.get<any[]>('staff:all');
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
      return data;
    },

    async getDoctors() {
      // Try to get from cache first
      const cachedData = globalCache.get<any[]>('staff:doctors');
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
      return data;
    },

    async create(staff: any) {
      const { data, error } = await supabase
        .from('staff')
        .insert(staff)
        .select()
        .single();
      
      if (error) throw error;
      
      // Invalidate cache
      globalCache.invalidatePattern(/^staff/);
      return data;
    },

    async update(id: string, staff: any) {
      const { data, error } = await supabase
        .from('staff')
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
  
  patients: {
    async createAssessment(assessment: any) {
      const { data, error } = await supabase
        .from('patient_assessments')
        .insert(assessment)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async getAssessments(patientId: string) {
      const cacheKey = `patient_assessments:${patientId}`;
      const cachedData = globalCache.get<any[]>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const { data, error } = await supabase
        .from('patient_assessments')
        .select('*')
        .eq('patient_id', patientId)
        .order('assessment_date', { ascending: false });
      
      if (error) throw error;
      
      globalCache.set(cacheKey, data);
      return data;
    },

    async uploadDiagnosticImage(imageData: any) {
      const { data, error } = await supabase
        .from('diagnostic_images')
        .insert(imageData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Invalidate cache
      globalCache.invalidate(`diagnostic_images:${imageData.patient_id}`);
      return data;
    },

    async getDiagnosticImages(patientId: string) {
      const cacheKey = `diagnostic_images:${patientId}`;
      const cachedData = globalCache.get<any[]>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const { data, error } = await supabase
        .from('diagnostic_images')
        .select('*')
        .eq('patient_id', patientId)
        .order('capture_date', { ascending: false });
      
      if (error) throw error;
      
      globalCache.set(cacheKey, data);
      return data;
    },

    async createFinancialPlan(planData: any) {
      const { data, error } = await supabase
        .from('financial_plans')
        .insert(planData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Invalidate cache
      globalCache.invalidate(`financial_plans:${planData.treatment_plan_id}`);
      return data;
    },

    async getFinancialPlans(treatmentPlanId: string) {
      const cacheKey = `financial_plans:${treatmentPlanId}`;
      const cachedData = globalCache.get<any>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const { data, error } = await supabase
        .from('financial_plans')
        .select('*')
        .eq('treatment_plan_id', treatmentPlanId)
        .single();
      
      if (error) throw error;
      
      globalCache.set(cacheKey, data);
      return data;
    },

    async schedulePatientCommunication(communicationData: any) {
      const { data, error } = await supabase
        .from('patient_communications')
        .insert(communicationData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Invalidate cache
      globalCache.invalidate(`patient_communications:${communicationData.patient_id}`);
      return data;
    },

    async getPatientCommunications(patientId: string) {
      const cacheKey = `patient_communications:${patientId}`;
      const cachedData = globalCache.get<any[]>(cacheKey);
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
      return data;
    },

    async generateTreatmentPlan(patientId: string, currentIssue: string) {
      try {
        // Fetch comprehensive patient data
        const [
          medicalHistory,
          previousTreatments,
          assessments,
          diagnosticImages
        ] = await Promise.all([
          api.patients.getMedicalRecords(patientId),
          api.patients.getTreatmentPlans(patientId),
          api.patients.getAssessments(patientId),
          api.patients.getDiagnosticImages(patientId)
        ]);

        const response = await fetch('/functions/v1/treatment-ai', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabase.supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            patientId,
            currentIssue,
            medicalHistory,
            previousTreatments,
            assessments,
            diagnosticImages
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
      const cachedData = globalCache.get<any[]>(cacheKey);
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
      const cachedData = globalCache.get<any>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        globalCache.set(cacheKey, data);
      }
      return data;
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

    async create(patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) {
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

    async update(id: string, patient: Partial<Patient>) {
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
      const cachedData = globalCache.get<any[]>(cacheKey);
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
      return data;
    },

    async getTreatmentPlans(patientId: string | null) {
      const cacheKey = patientId ? `treatment_plans:${patientId}` : 'treatment_plans:all';
      const cachedData = globalCache.get<any[]>(cacheKey);
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
      return data;
    },

    async createMedicalRecord(record: any) {
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

    async updateMedicalRecord(id: string, record: any) {
      const { data, error } = await supabase
        .from('medical_records')
        .update(record)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Invalidate cache
      globalCache.invalidate(`medical_records:${record.patient_id}`);
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

    async createTreatmentPlan(plan: any) {
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

    async updateTreatmentPlan(id: string, plan: any) {
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
     * @returns Transaction result
     */
    async createTreatmentPlanWithTreatments(planData: any, treatments: any[]): Promise<TransactionResult<any>> {
      // Define operations
      const operations = [
        // Operation 1: Create treatment plan
        async () => {
          const { data, error } = await supabase
            .from('treatment_plans')
            .insert(planData)
            .select()
            .single();
            
          if (error) throw error;
          return data;
        },
        
        // Operation 2: Create treatments
        async () => {
          const planResult = await operations[0]();
          
          const treatmentsWithPlanId = treatments.map(treatment => ({
            ...treatment,
            plan_id: planResult.id
          }));
          
          const { data, error } = await supabase
            .from('treatments')
            .insert(treatmentsWithPlanId)
            .select();
            
          if (error) throw error;
          return data;
        }
      ];
      
      // Execute transaction
      const result = await executeTransaction(operations);
      
      // Invalidate cache if successful
      if (result.success) {
        globalCache.invalidate(`treatment_plans:${planData.patient_id}`);
        globalCache.invalidate('treatment_plans:all');
      }
      
      return result;
    },

    async createTreatment(treatment: any) {
      const { data, error } = await supabase
        .from('treatments')
        .insert(treatment)
        .select()
        .single();
      
      if (error) throw error;
      
      // Invalidate cache
      globalCache.invalidatePattern(/^treatment_plans/);
      return data;
    },

    async updateTreatment(id: string, treatment: any) {
      const { data, error } = await supabase
        .from('treatments')
        .update(treatment)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Invalidate cache
      globalCache.invalidatePattern(/^treatment_plans/);
      return data;
    },

    async deleteTreatment(id: string) {
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
        await api.patients.update(patientId, {
          profile_photo_url: fileData.url
        });
        
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
        await api.patients.update(patientId, {
          signature_url: fileData.url
        });
        
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
        const documents = patient.documents || [];
        documents.push({
          ...fileData,
          docType,
          notes,
          dateAdded: new Date().toISOString()
        });
        
        // Update the patient record
        await api.patients.update(patientId, { documents });
        
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
        const documents = (patient.documents || []).filter(
          (doc: any) => doc.path !== documentPath
        );
        
        // Update the patient record
        await api.patients.update(patientId, { documents });
        
        // Delete the file from storage
        await api.storage.deleteFile(documentPath);
        
        return true;
      } catch (error) {
        console.error('Error removing document:', error);
        throw error;
      }
    }
  },

  appointments: {
    async getAll() {
      const cacheKey = 'appointments:all';
      const cachedData = globalCache.get<any[]>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const { data, error } = await supabase
        .from('appointments')
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
      return data;
    },

    async getByDateRange(startDate: string, endDate: string) {
      const cacheKey = `appointments:range:${startDate}:${endDate}`;
      const cachedData = globalCache.get<any[]>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const { data, error } = await supabase
        .from('appointments')
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
        .gte('start_time', startDate)
        .lte('end_time', endDate)
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      
      globalCache.set(cacheKey, data, 60 * 1000); // Short TTL for appointments
      return data;
    },

    async create(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) {
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

    async update(id: string, appointment: Partial<Appointment>) {
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
      const cachedData = globalCache.get<any>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const { data, error } = await supabase
        .from('clinic_settings')
        .select()
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Return default settings if no settings exist
      const result = data?.[0] || {
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
        }
      };
      
      globalCache.set(cacheKey, result);
      return result;
    },

    async update(settings: any) {
      // If no ID, create new settings
      if (!settings.id) {
        const { data, error } = await supabase
          .from('clinic_settings')
          .insert(settings)
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
        .update(updateData)
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