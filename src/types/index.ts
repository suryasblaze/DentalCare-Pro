export interface User {
  id: string;
  email: string;
  role: 'admin' | 'dentist' | 'staff';
  created_at: string;
}

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  medical_history: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  dentist_id: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
  created_at: string;
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