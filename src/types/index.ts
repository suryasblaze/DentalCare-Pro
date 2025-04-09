export interface User {
  id: string;
  email: string;
  role: 'admin' | 'dentist' | 'staff';
  created_at: string;
  // Add other user fields if needed, e.g., name, avatar_url
}

// Define common reusable types
export type Gender = "male" | "female" | "other";
export type MaritalStatus = "single" | "married" | "divorced" | "widowed" | "separated" | "other";
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "unknown";
// Define a basic Json type (adjust if a more specific structure is known)
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];


export interface Patient {
  id: string;
  user_id?: string | null; // Link to the user who created/owns the record
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  email?: string | null; // Optional based on usage
  phone: string;
  date_of_birth?: string | null; // Optional/nullable
  gender?: Gender | null;
  age?: number | null; // Often calculated, but might be stored
  marital_status?: MaritalStatus | null;
  occupation?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  blood_group?: BloodGroup | null;
  height?: number | null; // Store as number if possible
  weight?: number | null; // Store as number if possible
  allergies?: string[] | null; // Store as array
  medical_conditions?: string[] | null; // Store as array
  medical_history?: string | null; // General medical history notes (if used) - Consider deprecating if detailed_medical_info covers everything
  detailed_medical_info?: Json | null; // Added for structured medical details (implants, health changes etc.)
  dental_history?: Json | null; // Added for structured dental history
  family_medical_history?: Json | null; // Added for structured family history
  lifestyle_habits?: Json | null; // Added for structured lifestyle habits
  current_medications?: Json | null; // Changed to expect structured JSON array
  previous_surgeries?: Json | null; // Changed to expect structured JSON array
  notes?: string | null; // General notes
  consent_given?: boolean | null;
  consent_date?: string | null; // Date when consent was given
  consent_notes?: string | null; // Add missing consent_notes field
  profile_photo_url?: string | null; // URL to stored photo
  signature_url?: string | null; // URL to stored signature
  documents?: Json | null; // Changed back to Json | null to match API expectation
  // audit_trail?: Json | null; // For tracking changes, if implemented
  created_at: string;
  updated_at?: string; // Track last update time
}

// Define PatientDocument interface here as well for consistency
export interface PatientDocument {
  path: string;
  url: string;
  name: string;
  type: string;
  size?: number;
  uploaded_at: string;
}

// Updated Appointment interface to match AppointmentRow from database.types.ts
// and include related data often fetched by the API
export interface Appointment {
  id: string;
  patient_id: string | null;
  staff_id: string | null; // Renamed from dentist_id to match DB
  start_time: string;
  end_time: string;
  title: string; // Reason for visit
  notes?: string | null;
  // Allow known statuses plus any string from DB
  status: 'scheduled' | 'completed' | 'cancelled' | 'confirmed' | string;
  type: string;
  color?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  version?: string | null;

  // Optional related data often included in API responses
  patients?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  staff?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    role?: string | null;
    specialization?: string | null;
  } | null;
}


export interface TreatmentPlan {
  title: string;
  description: string;
  suggestedTreatments: {
    type: string;
    description: string;
    estimatedCost: number;
    priority: 'high' | 'medium' | 'low';
    risks: string[];
    benefits: string[];
  }[];
  precautions: string[];
  expectedOutcome: string;
  alternativeTreatments: string[];
  consentRequired: boolean;
  estimatedDuration: string;
}
