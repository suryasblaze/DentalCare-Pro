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
      assets: {
        Row: {
          asset_name: string
          barcode_value: string | null
          category: string
          created_at: string
          id: string
          last_serviced_date: string | null
          location: string | null
          next_maintenance_due_date: string | null
          notes: string | null
          photo_url: string | null
          purchase_date: string | null
          purchase_order_number: string | null
          purchase_price: number | null
          requires_maintenance: boolean | null
          serial_number: string | null
          service_document_url: string | null
          status: string
          supplier_contact: string | null
          supplier_info: string | null
          warranty_expiry_date: string | null
        }
        Insert: {
          asset_name: string
          barcode_value?: string | null
          category: string
          created_at?: string
          id?: string
          last_serviced_date?: string | null
          location?: string | null
          next_maintenance_due_date?: string | null
          notes?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          purchase_order_number?: string | null
          purchase_price?: number | null
          requires_maintenance?: boolean | null
          serial_number?: string | null
          service_document_url?: string | null
          status: string
          supplier_contact?: string | null
          supplier_info?: string | null
          warranty_expiry_date?: string | null
        }
        Update: {
          asset_name?: string
          barcode_value?: string | null
          category?: string
          created_at?: string
          id?: string
          last_serviced_date?: string | null
          location?: string | null
          next_maintenance_due_date?: string | null
          notes?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          purchase_order_number?: string | null
          purchase_price?: number | null
          requires_maintenance?: boolean | null
          serial_number?: string | null
          service_document_url?: string | null
          status?: string
          supplier_contact?: string | null
          supplier_info?: string | null
          warranty_expiry_date?: string | null
        }
        Relationships: []
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
      inventory_adjustment_requests: {
        Row: {
          approval_token: string | null
          approval_token_expires_at: string | null
          created_at: string
          custom_approver_emails: string[] | null
          id: string
          inventory_item_batch_id: string | null
          inventory_item_id: string
          notes: string
          photo_url: string | null
          quantity_to_decrease: number
          reason: Database["public"]["Enums"]["inventory_adjustment_request_reason"]
          requested_at: string
          requested_by_user_id: string
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["inventory_adjustment_request_status"]
          updated_at: string
        }
        Insert: {
          approval_token?: string | null
          approval_token_expires_at?: string | null
          created_at?: string
          custom_approver_emails?: string[] | null
          id?: string
          inventory_item_batch_id?: string | null
          inventory_item_id: string
          notes: string
          photo_url?: string | null
          quantity_to_decrease: number
          reason: Database["public"]["Enums"]["inventory_adjustment_request_reason"]
          requested_at?: string
          requested_by_user_id: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["inventory_adjustment_request_status"]
          updated_at?: string
        }
        Update: {
          approval_token?: string | null
          approval_token_expires_at?: string | null
          created_at?: string
          custom_approver_emails?: string[] | null
          id?: string
          inventory_item_batch_id?: string | null
          inventory_item_id?: string
          notes?: string
          photo_url?: string | null
          quantity_to_decrease?: number
          reason?: Database["public"]["Enums"]["inventory_adjustment_request_reason"]
          requested_at?: string
          requested_by_user_id?: string
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["inventory_adjustment_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustment_requests_inventory_item_batch_id_fkey"
            columns: ["inventory_item_batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_item_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustment_requests_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustment_requests_requested_by_user_id_fkey"
            columns: ["requested_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustment_requests_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_item_batches: {
        Row: {
          batch_number: string | null
          created_at: string
          expiry_date: string | null
          id: string
          inventory_item_id: string
          purchase_order_item_id: string | null
          purchase_price_at_receipt: number
          quantity_on_hand: number
          received_date: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          inventory_item_id: string
          purchase_order_item_id?: string | null
          purchase_price_at_receipt: number
          quantity_on_hand?: number
          received_date?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          inventory_item_id?: string
          purchase_order_item_id?: string | null
          purchase_price_at_receipt?: number
          quantity_on_hand?: number
          received_date?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_item_batches_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_item_batches_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_item_batches_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string
          created_at: string
          id: string
          is_batched: boolean
          item_code: string | null
          item_name: string
          low_stock_threshold: number
          photo_url: string | null
          quantity: number
          supplier_info: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_batched?: boolean
          item_code?: string | null
          item_name: string
          low_stock_threshold?: number
          photo_url?: string | null
          quantity?: number
          supplier_info?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_batched?: boolean
          item_code?: string | null
          item_name?: string
          low_stock_threshold?: number
          photo_url?: string | null
          quantity?: number
          supplier_info?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_log: {
        Row: {
          change_type: Database["public"]["Enums"]["inventory_change_type"]
          created_at: string
          id: string
          inventory_item_batch_id: string | null
          inventory_item_id: string | null
          item_id: string | null
          notes: string | null
          purchase_order_item_id: string | null
          quantity_change: number
          user_id: string | null
        }
        Insert: {
          change_type: Database["public"]["Enums"]["inventory_change_type"]
          created_at?: string
          id?: string
          inventory_item_batch_id?: string | null
          inventory_item_id?: string | null
          item_id?: string | null
          notes?: string | null
          purchase_order_item_id?: string | null
          quantity_change: number
          user_id?: string | null
        }
        Update: {
          change_type?: Database["public"]["Enums"]["inventory_change_type"]
          created_at?: string
          id?: string
          inventory_item_batch_id?: string | null
          inventory_item_id?: string | null
          item_id?: string | null
          notes?: string | null
          purchase_order_item_id?: string | null
          quantity_change?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_log_inventory_item_batch_id_fkey"
            columns: ["inventory_item_batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_item_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_log_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link_url: string | null
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link_url?: string | null
          message: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link_url?: string | null
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          file_name: string
          id: string
          inventory_item_id: string | null
          purchase_order_id: string | null
          storage_path: string
          updated_at: string
          uploaded_at: string
          uploaded_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          inventory_item_id?: string | null
          purchase_order_id?: string | null
          storage_path: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          inventory_item_id?: string | null
          purchase_order_id?: string | null
          storage_path?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      item_invoices: {
        Row: {
          id: string
          invoice_url: string
          item_id: string
          uploaded_at: string | null
          uploaded_by: string
        }
        Insert: {
          id?: string
          invoice_url: string
          item_id: string
          uploaded_at?: string | null
          uploaded_by: string
        }
        Update: {
          id?: string
          invoice_url?: string
          item_id?: string
          uploaded_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_invoices_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_invoices_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          item_id: string | null
          item_type: string | null
          link_url: string | null
          message: string
          notification_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          item_id?: string | null
          item_type?: string | null
          link_url?: string | null
          message: string
          notification_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          item_id?: string | null
          item_type?: string | null
          link_url?: string | null
          message?: string
          notification_type?: string | null
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
      patient_dental_history_teeth: {
        Row: {
          conditions: string[]
          created_at: string
          patient_id: string
          tooth_id: number
        }
        Insert: {
          conditions?: string[]
          created_at?: string
          patient_id: string
          tooth_id: number
        }
        Update: {
          conditions?: string[]
          created_at?: string
          patient_id?: string
          tooth_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "patient_dental_history_teeth_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_dental_history_teeth_tooth_id_fkey"
            columns: ["tooth_id"]
            isOneToOne: false
            referencedRelation: "teeth"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_tooth_conditions: {
        Row: {
          conditions: string[]
          id: string
          last_updated_at: string
          patient_id: string
          tooth_id: number
        }
        Insert: {
          conditions?: string[]
          id?: string
          last_updated_at?: string
          patient_id: string
          tooth_id: number
        }
        Update: {
          conditions?: string[]
          id?: string
          last_updated_at?: string
          patient_id?: string
          tooth_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "patient_tooth_conditions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_tooth_conditions_tooth_id_fkey"
            columns: ["tooth_id"]
            isOneToOne: false
            referencedRelation: "teeth"
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
          role: string | null
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
          role?: string | null
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
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          inventory_item_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number | null
          subtotal: number | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          inventory_item_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received?: number | null
          subtotal?: number | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          inventory_item_id?: string
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number | null
          subtotal?: number | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          status: string
          supplier_id: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number: string
          status?: string
          supplier_id: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          status?: string
          supplier_id?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          message: string
          recurrence_config: Json | null
          reminder_datetime: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          message: string
          recurrence_config?: Json | null
          reminder_datetime: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          message?: string
          recurrence_config?: Json | null
          reminder_datetime?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      stock_takes: {
        Row: {
          counted_at: string
          counted_by_user_id: string | null
          created_at: string
          id: string
          inventory_item_id: string
          is_variance_resolved: boolean
          notes: string | null
          physical_counted_quantity: number
          system_quantity_at_count: number
          updated_at: string
          variance: number | null
        }
        Insert: {
          counted_at?: string
          counted_by_user_id?: string | null
          created_at?: string
          id?: string
          inventory_item_id: string
          is_variance_resolved?: boolean
          notes?: string | null
          physical_counted_quantity: number
          system_quantity_at_count: number
          updated_at?: string
          variance?: number | null
        }
        Update: {
          counted_at?: string
          counted_by_user_id?: string | null
          created_at?: string
          id?: string
          inventory_item_id?: string
          is_variance_resolved?: boolean
          notes?: string | null
          physical_counted_quantity?: number
          system_quantity_at_count?: number
          updated_at?: string
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_takes_counted_by_user_id_fkey"
            columns: ["counted_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_takes_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
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
          actual_end_time: string | null
          actual_start_time: string | null
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
          actual_end_time?: string | null
          actual_start_time?: string | null
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
          actual_end_time?: string | null
          actual_start_time?: string | null
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
      adjust_inventory_item_quantity: {
        Args: {
          p_inventory_item_id: string
          p_quantity_change: number
          p_change_type: Database["public"]["Enums"]["inventory_change_type"]
          p_user_id: string
          p_notes?: string
          p_inventory_item_batch_id?: string
        }
        Returns: number
      }
      begin_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      commit_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_po_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_update_version: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      handle_receive_po_item_batch: {
        Args: {
          p_po_item_id: string
          p_quantity_received: number
          p_batch_number: string
          p_expiry_date: string
          p_purchase_price: number
          p_received_by_user_id: string
        }
        Returns: string
      }
      process_approved_adjustment: {
        Args: {
          p_request_id: string
          p_reviewer_user_id: string
          p_reviewer_notes?: string | null
        }
        Returns: undefined
      }
      rollback_transaction: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      verify_adjustment_approval_token: {
        Args: { p_request_id: string; p_raw_token: string }
        Returns: {
          id: string
          inventory_item_id: string
          inventory_item_batch_id: string
          quantity_to_decrease: number
          reason: Database["public"]["Enums"]["inventory_adjustment_request_reason"]
          notes: string
          photo_url: string
          status: Database["public"]["Enums"]["inventory_adjustment_request_status"]
          requested_by_user_id: string
          requested_at: string
          item_name: string
          requester_name: string
        }[]
      }
    }
    Enums: {
      communication_status: "scheduled" | "sent" | "failed" | "cancelled"
      inventory_adjustment_request_reason:
        | "Expired"
        | "Damaged"
        | "Lost"
        | "Stock Count Correction"
        | "Other"
      inventory_adjustment_request_status: "pending" | "approved" | "rejected"
      inventory_change_type:
        | "add"
        | "use"
        | "dispose_expired"
        | "dispose_other"
        | "initial_stock"
        | "adjustment"
        | "BATCH_STOCK_IN"
        | "STOCK_IN"
      treatment_status: "pending" | "in_progress" | "completed" | "cancelled"
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
      inventory_adjustment_request_reason: [
        "Expired",
        "Damaged",
        "Lost",
        "Stock Count Correction",
        "Other",
      ],
      inventory_adjustment_request_status: ["pending", "approved", "rejected"],
      inventory_change_type: [
        "add",
        "use",
        "dispose_expired",
        "dispose_other",
        "initial_stock",
        "adjustment",
        "BATCH_STOCK_IN",
        "STOCK_IN",
      ],
      treatment_status: ["pending", "in_progress", "completed", "cancelled"],
    },
  },
} as const
