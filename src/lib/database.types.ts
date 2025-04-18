export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      absences: {
        Row: {
          created_at: string
          end_time: string
          id: string
          reason: string | null
          staff_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          reason?: string | null
          staff_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          reason?: string | null
          staff_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "absences_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_treatment_planning_matrix: {
        Row: {
          condition: string | null
          created_at: string
          domain: string | null
          id: string
          recommended_investigations: string[] | null
          risk_impact: string | null
          severity: string | null
          treatment_options: string[] | null
          urgency: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          recommended_investigations?: string[] | null
          risk_impact?: string | null
          severity?: string | null
          treatment_options?: string[] | null
          urgency?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          recommended_investigations?: string[] | null
          risk_impact?: string | null
          severity?: string | null
          treatment_options?: string[] | null
          urgency?: string | null
        }
        Relationships: []
      }
      ai_treatment_plans: {
        Row: {
          approved_by: string | null
          content: Json
          created_at: string | null
          description: string
          id: string
          patient_id: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          content: Json
          created_at?: string | null
          description: string
          id?: string
          patient_id?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          content?: Json
          created_at?: string | null
          description?: string
          id?: string
          patient_id?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_treatment_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_treatment_plans_teeth: {
        Row: {
          ai_treatment_plan_id: string
          created_at: string
          tooth_id: number
        }
        Insert: {
          ai_treatment_plan_id: string
          created_at?: string
          tooth_id: number
        }
        Update: {
          ai_treatment_plan_id?: string
          created_at?: string
          tooth_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_ai_treatment_plans_teeth_plan"
            columns: ["ai_treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "ai_treatment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ai_treatment_plans_teeth_tooth"
            columns: ["tooth_id"]
            isOneToOne: false
            referencedRelation: "teeth"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          color: string | null
          created_at: string | null
          end_time: string
          id: string
          notes: string | null
          patient_id: string | null
          reason_for_visit: string | null
          staff_id: string | null
          start_time: string
          status: string
          title: string
          type: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          end_time: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          reason_for_visit?: string | null
          staff_id?: string | null
          start_time: string
          status?: string
          title: string
          type: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          reason_for_visit?: string | null
          staff_id?: string | null
          start_time?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_settings: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notification_preferences: Json | null
          phone: string | null
          updated_at: string | null
          website: string | null
          working_hours: Json | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notification_preferences?: Json | null
          phone?: string | null
          updated_at?: string | null
          website?: string | null
          working_hours?: Json | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notification_preferences?: Json | null
          phone?: string | null
          updated_at?: string | null
          website?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      medical_record_teeth: {
        Row: {
          created_at: string
          medical_record_id: string
          tooth_id: number
        }
        Insert: {
          created_at?: string
          medical_record_id: string
          tooth_id: number
        }
        Update: {
          created_at?: string
          medical_record_id?: string
          tooth_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_medical_record_teeth_record"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_medical_record_teeth_tooth"
            columns: ["tooth_id"]
            isOneToOne: false
            referencedRelation: "teeth"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          attachments: Json | null
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          patient_id: string | null
          record_date: string
          record_type: string
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          patient_id?: string | null
          record_date?: string
          record_type: string
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          patient_id?: string | null
          record_date?: string
          record_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link_url: string | null
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_communications: {
        Row: {
          appointment_id: string | null
          channel: string
          content: string
          created_at: string | null
          error_message: string | null
          id: string
          patient_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          treatment_plan_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          channel: string
          content: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          patient_id?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string
          treatment_plan_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          channel?: string
          content?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          patient_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          treatment_plan_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_communications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_communications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_communications_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          age: number | null
          allergies: string[] | null
          audit_trail: Json | null
          blood_group: string | null
          city: string | null
          consent_date: string | null
          consent_given: boolean | null
          country: string | null
          created_at: string | null
          current_medications: Json | null
          dental_history: Json | null
          detailed_medical_info: Json | null
          documents: Json | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          family_medical_history: Json | null
          first_name: string
          gender: string | null
          height: number | null
          id: string
          insurance_coverage_details: Json | null
          insurance_expiry_date: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          last_modified_by: string | null
          last_name: string
          lifestyle_habits: Json | null
          marital_status: string | null
          medical_conditions: string[] | null
          middle_name: string | null
          notes: string | null
          occupation: string | null
          phone: string
          postal_code: string | null
          previous_surgeries: Json | null
          profile_photo_url: string | null
          registration_number: string
          signature_url: string | null
          state: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          version: string | null
          weight: number | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          allergies?: string[] | null
          audit_trail?: Json | null
          blood_group?: string | null
          city?: string | null
          consent_date?: string | null
          consent_given?: boolean | null
          country?: string | null
          created_at?: string | null
          current_medications?: Json | null
          dental_history?: Json | null
          detailed_medical_info?: Json | null
          documents?: Json | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          family_medical_history?: Json | null
          first_name: string
          gender?: string | null
          height?: number | null
          id?: string
          insurance_coverage_details?: Json | null
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_modified_by?: string | null
          last_name: string
          lifestyle_habits?: Json | null
          marital_status?: string | null
          medical_conditions?: string[] | null
          middle_name?: string | null
          notes?: string | null
          occupation?: string | null
          phone: string
          postal_code?: string | null
          previous_surgeries?: Json | null
          profile_photo_url?: string | null
          registration_number?: string
          signature_url?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: string | null
          weight?: number | null
        }
        Update: {
          address?: string | null
          age?: number | null
          allergies?: string[] | null
          audit_trail?: Json | null
          blood_group?: string | null
          city?: string | null
          consent_date?: string | null
          consent_given?: boolean | null
          country?: string | null
          created_at?: string | null
          current_medications?: Json | null
          dental_history?: Json | null
          detailed_medical_info?: Json | null
          documents?: Json | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          family_medical_history?: Json | null
          first_name?: string
          gender?: string | null
          height?: number | null
          id?: string
          insurance_coverage_details?: Json | null
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_modified_by?: string | null
          last_name?: string
          lifestyle_habits?: Json | null
          marital_status?: string | null
          medical_conditions?: string[] | null
          middle_name?: string | null
          notes?: string | null
          occupation?: string | null
          phone?: string
          postal_code?: string | null
          previous_surgeries?: Json | null
          profile_photo_url?: string | null
          registration_number?: string
          signature_url?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          version?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          date_of_birth: string | null
          first_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          mobile_number: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          gender?: string | null
          id: string
          last_name?: string | null
          mobile_number?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          mobile_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          role: string
          specialization: string | null
          updated_at: string | null
          user_id: string | null
          working_hours: Json | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          role: string
          specialization?: string | null
          updated_at?: string | null
          user_id?: string | null
          working_hours?: Json | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          role?: string
          specialization?: string | null
          updated_at?: string | null
          user_id?: string | null
          working_hours?: Json | null
        }
        Relationships: []
      }
      teeth: {
        Row: {
          description: string
          id: number
          notation_type: string
          quadrant: number
        }
        Insert: {
          description: string
          id: number
          notation_type?: string
          quadrant: number
        }
        Update: {
          description?: string
          id?: number
          notation_type?: string
          quadrant?: number
        }
        Relationships: []
      }
      treatment_consents: {
        Row: {
          consent_document: Json
          created_at: string | null
          id: string
          patient_id: string | null
          signature_url: string | null
          signed_at: string | null
          status: string
          treatment_plan_id: string | null
          updated_at: string | null
          witness_id: string | null
        }
        Insert: {
          consent_document?: Json
          created_at?: string | null
          id?: string
          patient_id?: string | null
          signature_url?: string | null
          signed_at?: string | null
          status?: string
          treatment_plan_id?: string | null
          updated_at?: string | null
          witness_id?: string | null
        }
        Update: {
          consent_document?: Json
          created_at?: string | null
          id?: string
          patient_id?: string | null
          signature_url?: string | null
          signed_at?: string | null
          status?: string
          treatment_plan_id?: string | null
          updated_at?: string | null
          witness_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_consents_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_consents_witness_id_fkey"
            columns: ["witness_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plan_teeth: {
        Row: {
          created_at: string
          tooth_id: number
          treatment_plan_id: string
        }
        Insert: {
          created_at?: string
          tooth_id: number
          treatment_plan_id: string
        }
        Update: {
          created_at?: string
          tooth_id?: number
          treatment_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_treatment_plan_teeth_plan"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_treatment_plan_teeth_tooth"
            columns: ["tooth_id"]
            isOneToOne: false
            referencedRelation: "teeth"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          ai_generated: boolean | null
          ai_plan_id: string | null
          communication_preferences: Json | null
          consent_date: string | null
          consent_required: boolean | null
          consent_status: string | null
          created_at: string | null
          description: string
          end_date: string | null
          estimated_cost: number | null
          id: string
          last_notification_sent: string | null
          next_communication_date: string | null
          notification_count: number | null
          patient_id: string | null
          priority: string | null
          start_date: string
          status: string
          title: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          ai_plan_id?: string | null
          communication_preferences?: Json | null
          consent_date?: string | null
          consent_required?: boolean | null
          consent_status?: string | null
          created_at?: string | null
          description: string
          end_date?: string | null
          estimated_cost?: number | null
          id?: string
          last_notification_sent?: string | null
          next_communication_date?: string | null
          notification_count?: number | null
          patient_id?: string | null
          priority?: string | null
          start_date: string
          status: string
          title: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          ai_plan_id?: string | null
          communication_preferences?: Json | null
          consent_date?: string | null
          consent_required?: boolean | null
          consent_status?: string | null
          created_at?: string | null
          description?: string
          end_date?: string | null
          estimated_cost?: number | null
          id?: string
          last_notification_sent?: string | null
          next_communication_date?: string | null
          notification_count?: number | null
          patient_id?: string | null
          priority?: string | null
          start_date?: string
          status?: string
          title?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_ai_plan_id_fkey"
            columns: ["ai_plan_id"]
            isOneToOne: false
            referencedRelation: "ai_treatment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          alternative_options: Json | null
          benefits: string[] | null
          completion_date: string | null
          completion_notes: string | null
          cost: number
          created_at: string | null
          description: string
          estimated_duration: unknown | null
          id: string
          next_review_date: string | null
          plan_id: string | null
          priority: string | null
          risks: string[] | null
          status: string
          type: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          alternative_options?: Json | null
          benefits?: string[] | null
          completion_date?: string | null
          completion_notes?: string | null
          cost: number
          created_at?: string | null
          description: string
          estimated_duration?: unknown | null
          id?: string
          next_review_date?: string | null
          plan_id?: string | null
          priority?: string | null
          risks?: string[] | null
          status: string
          type: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          alternative_options?: Json | null
          benefits?: string[] | null
          completion_date?: string | null
          completion_notes?: string | null
          cost?: number
          created_at?: string | null
          description?: string
          estimated_duration?: unknown | null
          id?: string
          next_review_date?: string | null
          plan_id?: string | null
          priority?: string | null
          risks?: string[] | null
          status?: string
          type?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      begin_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      commit_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_update_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      rollback_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      communication_status: "scheduled" | "sent" | "failed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      communication_status: ["scheduled", "sent", "failed", "cancelled"],
    },
  },
} as const
