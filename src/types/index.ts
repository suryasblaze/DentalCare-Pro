import type { Database } from '@/../supabase_types'; // Ensure path is correct

// --- Core Table Row Types ---
export type Patient = Database['public']['Tables']['patients']['Row'];
export type Appointment = Database['public']['Tables']['appointments']['Row'] & {
  // Add potential nested types if needed from joins
  patients?: Pick<Patient, 'id' | 'first_name' | 'last_name' | 'email' | 'phone'> | null;
  staff?: Pick<Staff, 'id' | 'first_name' | 'last_name' | 'role' | 'specialization'> | null;
};
export type MedicalRecord = Database['public']['Tables']['medical_records']['Row'] & {
  staff?: Pick<Staff, 'first_name' | 'last_name'> | null;
  // Add teeth if joined
  teeth?: Tooth[] | null;
};
export type TreatmentPlan = Database['public']['Tables']['treatment_plans']['Row'] & {
  treatments?: Treatment[] | null; // Assuming treatments are nested
  // Add teeth if joined
  teeth?: Tooth[] | null;
};
export type Treatment = Database['public']['Tables']['treatments']['Row'];
export type Staff = Database['public']['Tables']['staff']['Row'];
export type Tooth = Database['public']['Tables']['teeth']['Row'];
export type PatientToothCondition = Database['public']['Tables']['patient_tooth_conditions']['Row'];
export type Absence = Database['public']['Tables']['absences']['Row'] & {
  staff?: Pick<Staff, 'id' | 'first_name' | 'last_name'> | null;
};
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ClinicSetting = Database['public']['Tables']['clinic_settings']['Row'];
export type AiTreatmentMatrix = Database['public']['Tables']['ai_treatment_planning_matrix']['Row'];
export type PatientCommunication = Database['public']['Tables']['patient_communications']['Row'];

// --- Insert Types (for creating new records) ---
export type PatientInsert = Database['public']['Tables']['patients']['Insert'];
export type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
export type MedicalRecordInsert = Database['public']['Tables']['medical_records']['Insert'];
export type TreatmentPlanInsert = Database['public']['Tables']['treatment_plans']['Insert'];
export type TreatmentInsert = Database['public']['Tables']['treatments']['Insert'];
export type StaffInsert = Database['public']['Tables']['staff']['Insert'];
export type PatientToothConditionInsert = Database['public']['Tables']['patient_tooth_conditions']['Insert'];
export type AbsenceInsert = Database['public']['Tables']['absences']['Insert'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ClinicSettingInsert = Database['public']['Tables']['clinic_settings']['Insert'];
export type AiTreatmentMatrixInsert = Database['public']['Tables']['ai_treatment_planning_matrix']['Insert'];
export type PatientCommunicationInsert = Database['public']['Tables']['patient_communications']['Insert'];

// --- Update Types (for updating existing records) ---
export type PatientUpdate = Database['public']['Tables']['patients']['Update'];
export type AppointmentUpdate = Database['public']['Tables']['appointments']['Update'];
export type MedicalRecordUpdate = Database['public']['Tables']['medical_records']['Update'];
export type TreatmentPlanUpdate = Database['public']['Tables']['treatment_plans']['Update'];
export type TreatmentUpdate = Database['public']['Tables']['treatments']['Update'];
export type StaffUpdate = Database['public']['Tables']['staff']['Update'];
export type PatientToothConditionUpdate = Database['public']['Tables']['patient_tooth_conditions']['Update'];
export type AbsenceUpdate = Database['public']['Tables']['absences']['Update'];
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type ClinicSettingUpdate = Database['public']['Tables']['clinic_settings']['Update'];
export type AiTreatmentMatrixUpdate = Database['public']['Tables']['ai_treatment_planning_matrix']['Update'];
export type PatientCommunicationUpdate = Database['public']['Tables']['patient_communications']['Update'];


// --- Enum Types (Extract enums if defined in your DB types) ---
// Example: Assuming Gender is defined in PatientRow
export type Gender = Database['public']['Tables']['patients']['Row']['gender'];
export type MaritalStatus = Database['public']['Tables']['patients']['Row']['marital_status'];
export type BloodGroup = Database['public']['Tables']['patients']['Row']['blood_group'];
export type AppointmentStatus = Database['public']['Tables']['appointments']['Row']['status'];
export type AppointmentType = Database['public']['Tables']['appointments']['Row']['type'];
export type MedicalRecordType = Database['public']['Tables']['medical_records']['Row']['record_type'];
export type TreatmentStatus = Database['public']['Tables']['treatment_plans']['Row']['status'];
export type StaffRole = Database['public']['Tables']['staff']['Row']['role'];
// Removed NotificationType and NotificationStatus as columns don't exist on the table
export type CommunicationType = Database['public']['Tables']['patient_communications']['Row']['type'];
export type CommunicationChannel = Database['public']['Tables']['patient_communications']['Row']['channel'];
export type CommunicationStatus = Database['public']['Tables']['patient_communications']['Row']['status'];
export type AbsenceReason = Database['public']['Tables']['absences']['Row']['reason'];

import type { Database } from '@/lib/database.types';

// Add inventory_notifications type
export type InventoryNotification = Database['public']['Tables']['inventory_notifications']['Row'];
export type InventoryNotificationInsert = Database['public']['Tables']['inventory_notifications']['Insert'];
export type InventoryNotificationUpdate = Database['public']['Tables']['inventory_notifications']['Update'];



// --- JSON Types ---
// Define a generic Json type or specific structures if known
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// Specific structure for medication if known
export interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
}

// Specific structure for surgery if known
export interface Surgery {
  type: string;
  date?: string; // Consider using string for flexibility or Date if parsed
  notes?: string;
}

// Specific structure for documents array in Patient table
export interface PatientDocument {
  path: string;
  url: string;
  name: string;
  type: string; // e.g., 'profile_photo', 'signature', 'id_document', 'xray', 'other'
  size?: number;
  uploaded_at: string; // ISO date string
}

// Specific structure for working hours
export interface WorkingHour {
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    start: string; // HH:mm format
    end: string;   // HH:mm format
    is_open?: boolean; // Optional flag to mark day as closed
}

// --- Utility Types ---
// Example: Make certain fields optional
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Example: A type for API responses that might include pagination
export interface PaginatedResponse<T> {
  data: T[];
  count: number | null;
  totalPages?: number;
  currentPage?: number;
}
