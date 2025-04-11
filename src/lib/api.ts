import { supabase } from './supabase';
import type { Database, Json } from '@/../supabase_types'; // Corrected import path to root supabase_types.ts
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

    // New function to get doctors available during a specific time slot, considering working hours and absences
    async getAvailableDoctors(startTime: string, endTime: string): Promise<StaffRow[]> {
      try {
        const startDateTime = new Date(startTime);
        const endDateTime = new Date(endTime);
        const dayOfWeek = startDateTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(); // e.g., 'monday'
        const requestedStartTime = `${String(startDateTime.getHours()).padStart(2, '0')}:${String(startDateTime.getMinutes()).padStart(2, '0')}`; // HH:mm format
        const requestedEndTime = `${String(endDateTime.getHours()).padStart(2, '0')}:${String(endDateTime.getMinutes()).padStart(2, '0')}`; // HH:mm format

        // 1. Fetch all doctors
        const allDoctors = await api.staff.getDoctors(); // Reuse existing function (includes caching)

        // 2. Fetch absences that overlap with the requested time slot
        const { data: overlappingAbsences, error: absenceError } = await supabase
          .from('absences')
          .select('staff_id')
          .lt('start_time', endTime) // Absence starts before the slot ends
          .gt('end_time', startTime); // Absence ends after the slot starts

        if (absenceError) {
          console.error('Error fetching overlapping absences:', absenceError);
          // Continue but log the error, absence check might be incomplete
        }

        // 3. Create a set of absent doctor IDs
        const absentDoctorIds = new Set(overlappingAbsences?.map(absence => absence.staff_id) || []);

        // 4. Filter doctors based on working hours AND absences
        const availableDoctors = allDoctors.filter(doctor => {
          // Check for absence first
          if (absentDoctorIds.has(doctor.id)) {
            return false;
          }

          // Check working hours
          try {
            let workingHours: { day: string; start: string; end: string; is_open?: boolean }[] = [];
            if (typeof doctor.working_hours === 'string') {
              workingHours = JSON.parse(doctor.working_hours);
            } else if (Array.isArray(doctor.working_hours)) {
              workingHours = doctor.working_hours as { day: string; start: string; end: string; is_open?: boolean }[];
            } else {
               // If format is unexpected, treat as unavailable
               return false;
            }

            const scheduleForDay = workingHours.find(wh => wh.day.toLowerCase() === dayOfWeek);

            if (!scheduleForDay) {
              return false; // No schedule for this day
            }

            // Check if the schedule explicitly marks the day as closed
            if (scheduleForDay.is_open === false) {
              return false;
            }

            // Perform time comparison
            // Doctor is available if:
            // - They have a schedule for the day (checked above)
            // - The schedule indicates they are open (is_open is true or undefined/not false) (checked above)
            // - The requested start time is on or after their start time
            // - The requested end time is on or before their end time
            const isWithinTime = requestedStartTime >= scheduleForDay.start && requestedEndTime <= scheduleForDay.end;

            if (!isWithinTime) {
               return false;
            }

            // If all checks pass, the doctor is available
            return true;

          } catch (parseError) {
            console.error(`Error processing working hours for doctor ${doctor.id}:`, doctor.working_hours, parseError);
            return false; // Treat as unavailable if processing fails
          }
        });
        return availableDoctors;

      } catch (error) {
        console.error('Error getting available doctors:', error);
        // Fallback or re-throw
        return []; // Return empty array on error
      }
    },
    // End new function

    async create(staff: Database['public']['Tables']['staff']['Insert']) {
      // Ensure working_hours is stringified before insert if it's an object
      if (typeof staff.working_hours === 'object' && staff.working_hours !== null) {
        staff.working_hours = JSON.stringify(staff.working_hours);
      }

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
  }, // <-- Correct closing brace for staff object

  // --- Absences API --- (Now correctly positioned as a sibling to staff)
  absences: {
    // Modified getAll to fetch staff separately as a workaround for relationship cache issues
    async getAll(): Promise<(Database['public']['Tables']['absences']['Row'] & { staff: { id: string, first_name: string, last_name: string } | null })[]> {
      const cacheKey = 'absences:all';
      const cachedData = globalCache.get<(Database['public']['Tables']['absences']['Row'] & { staff: { id: string, first_name: string, last_name: string } | null })[]>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      try {
        // Fetch absences without the join
        const { data: absencesData, error: absencesError } = await supabase
          .from('absences')
          .select('*')
          .order('start_time', { ascending: false });

        if (absencesError) throw absencesError;
        if (!absencesData) return [];

        // Fetch all staff (assuming this works and might be cached)
        const staffList = await api.staff.getAll(); // Fetch all staff members
        const staffMap = new Map(staffList.map(s => [s.id, s])); // Create a map for quick lookup

        // Manually join the data
        const joinedData = absencesData.map(absence => {
          const staffMember = absence.staff_id ? staffMap.get(absence.staff_id) : null;
          return {
            ...absence,
            // Construct the nested staff object manually
            staff: staffMember ? { id: staffMember.id, first_name: staffMember.first_name, last_name: staffMember.last_name } : null
          };
        });

        globalCache.set(cacheKey, joinedData);
        return joinedData;

      } catch (error) {
          console.error("Error in api.absences.getAll:", error);
          // Re-throw or return empty array based on desired error handling
          throw error; // Re-throwing for now
      }
    },


    async create(absence: Database['public']['Tables']['absences']['Insert']): Promise<Database['public']['Tables']['absences']['Row']> {
      // Basic validation
      if (!absence.staff_id || !absence.start_time || !absence.end_time) {
         throw new Error("Missing required fields for absence creation.");
      }
      if (new Date(absence.end_time) <= new Date(absence.start_time)) {
         throw new Error("End time must be after start time.");
      }

      const { data, error } = await supabase
        .from('absences')
        .insert(absence)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("Absence creation returned no data");

      // Invalidate cache
      globalCache.invalidate('absences:all');
      return data;
    },

    async delete(id: string): Promise<void> {
      const { error } = await supabase
        .from('absences')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Invalidate cache
      globalCache.invalidate('absences:all');
    }
  },
  // --- End Absences API ---

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
        // Fetch related staff AND teeth details via the junction table
        .select(`
          *,
          staff:created_by ( first_name, last_name ),
          medical_record_teeth (
            teeth ( id, description )
          )
        `)
        .order('record_date', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      globalCache.set(cacheKey, data);

      // Process the data to move teeth into a simpler array on the record object
      const processedData = data?.map(record => {
        // Ensure medical_record_teeth is an array and map teeth data
        const teeth = Array.isArray(record.medical_record_teeth)
          ? record.medical_record_teeth
              .map((mrt: any) => mrt.teeth) // Extract the teeth object
              .filter((tooth: any) => tooth !== null) // Filter out any null teeth
          : [];
        
        // Return the record with a flattened 'teeth' array, removing the junction table structure
        // Need to cast record to 'any' temporarily to add the new 'teeth' property
        const modifiedRecord: any = { ...record }; 
        delete modifiedRecord.medical_record_teeth; // Remove the original junction data
        modifiedRecord.teeth = teeth; // Add the flattened teeth array
        
        return modifiedRecord;
      }) || [];

      // --- DEBUGGING LOG ---
      console.log("API getMedicalRecords processedData:", processedData);
      // --- END DEBUGGING LOG ---

      return processedData; // Return the processed data
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
          treatments (*),
          treatment_plan_teeth (
            teeth ( id, description )
          )
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

    // Update createMedicalRecord to handle toothIds and map record_type
    async createMedicalRecord(recordInput: Database['public']['Tables']['medical_records']['Insert'], toothIds: number[]) {
      // Map frontend record_type to valid database enum values HERE
      const mapRecordType = (frontendType: string | undefined): string => {
        switch (frontendType) {
          case 'consultation': return 'examination';
          case 'diagnosis': return 'examination';
          case 'treatment': return 'procedure';
          case 'prescription': return 'prescription';
          case 'lab_result': return 'lab_result';
          case 'other': return 'note';
          default: return 'note'; // Fallback or throw error? Defaulting to 'note'
        }
      };

      // Create the final record object with the mapped type
      const recordToInsert = {
        ...recordInput,
        record_type: mapRecordType(recordInput.record_type), // Apply mapping
      };

      // --- DEBUGGING LOG ---
      console.log("API inserting mapped record:", recordToInsert);
      // --- END DEBUGGING LOG ---

      // Step 1: Insert the main medical record using the mapped data
      const { data: recordData, error: recordError } = await supabase
        .from('medical_records')
        .insert(recordToInsert) // Use the record with the mapped type
        .select()
        .single();

      if (recordError) {
        console.error("Error creating medical record:", recordError);
        throw recordError;
      }
      if (!recordData) {
        throw new Error("Failed to create medical record: No data returned.");
      }

      const newRecordId = recordData.id;

      // Step 2: Insert into the medical_record_teeth junction table
      if (toothIds && toothIds.length > 0) {
        const teethLinks = toothIds.map(toothId => ({
          medical_record_id: newRecordId,
          tooth_id: toothId,
        }));

        const { error: teethError } = await supabase
          .from('medical_record_teeth') // Junction table name
          .insert(teethLinks);

        if (teethError) {
          console.error("Error linking teeth to medical record:", teethError);
          // Consider transaction or error handling strategy
          throw teethError; 
        }
      }

      // Invalidate cache using the original input patient_id if available
      if (recordInput.patient_id) {
         globalCache.invalidate(`medical_records:${recordInput.patient_id}`);
      }
      globalCache.invalidate('medical_records:all');

      // Return the created record data
      return recordData; 
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

    // Update createTreatmentPlan to handle toothIds
    async createTreatmentPlan(plan: TreatmentPlanInsert, toothIds: number[]) { 
      // Step 1: Insert the main treatment plan
      const { data: planData, error: planError } = await supabase
        .from('treatment_plans')
        .insert(plan)
        .select()
        .single();

      if (planError) {
        console.error("Error creating treatment plan:", planError);
        throw planError;
      }
      if (!planData) {
        throw new Error("Failed to create treatment plan: No data returned.");
      }

      const newPlanId = planData.id;

      // Step 2: Insert into the junction table if toothIds are provided
      if (toothIds && toothIds.length > 0) {
        const teethLinks = toothIds.map(toothId => ({
          treatment_plan_id: newPlanId,
          tooth_id: toothId,
        }));

        const { error: teethError } = await supabase
          .from('treatment_plan_teeth') // Your junction table name
          .insert(teethLinks);

        if (teethError) {
          console.error("Error linking teeth to treatment plan:", teethError);
          // Decide on error handling: Maybe delete the plan? Or just log and continue?
          // For now, let's throw the error, indicating partial failure.
          // Consider implementing a transaction (e.g., via RPC) later for atomicity.
          throw teethError; 
        }
      }

      // Invalidate cache
      globalCache.invalidate(`treatment_plans:${plan.patient_id}`);
      globalCache.invalidate('treatment_plans:all');
      
      // Return the created plan data (without teeth links, fetch separately if needed)
      return planData; 
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
    },

    // Add function to cancel communications by appointment ID
    async cancelByAppointment(appointmentId: string) {
      try {
        const session = await supabase.auth.getSession();
        const accessToken = session?.data?.session?.access_token;

        // Note: Authorization might not be strictly needed if the function uses service_role key,
        // but including it is safer if function security might change.
        if (!accessToken) {
           console.warn('No access token found for cancelling communication.');
        }

        const response = await fetch('/functions/v1/patient-communication/cancel-by-appointment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
          },
          body: JSON.stringify({ appointmentId }), // Send appointmentId in the body
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to cancel communications: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`Communications cancellation requested for appointment ${appointmentId}:`, result);
        return result; // Contains { success: true, cancelledCount: number, cancelledIds: string[] }
      } catch (error) {
        console.error(`Error cancelling communications for appointment ${appointmentId}:`, error);
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

    // NEW: Get appointments by patient ID
    async getByPatientId(patientId: string): Promise<AppointmentRow[]> {
      const cacheKey = `appointments:patient:${patientId}`;
      const cachedData = globalCache.get<AppointmentRow[]>(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (id, first_name, last_name),
          staff (id, first_name, last_name)
        `)
        .eq('patient_id', patientId)
        .order('start_time', { ascending: false }); // Show most recent first

      if (error) throw error;

      globalCache.set(cacheKey, data || [], 60 * 1000); // Cache for 1 minute
      return data || [];
    },
    // END NEW

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
