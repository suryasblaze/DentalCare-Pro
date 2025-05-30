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
          treatment_id: string | null
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
          treatment_id?: string | null
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
          treatment_id?: string | null
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
          {
            foreignKeyName: "fk_appointment_treatment"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_disposal_log: {
        Row: {
          asset_id: string
          created_at: string
          disposal_date: string
          disposal_notes: string | null
          disposal_reason: string
          disposal_recorded_at: string
          disposed_by_user_id: string | null
          id: string
          salvage_value: number | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          disposal_date: string
          disposal_notes?: string | null
          disposal_reason: string
          disposal_recorded_at?: string
          disposed_by_user_id?: string | null
          id?: string
          salvage_value?: number | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          disposal_date?: string
          disposal_notes?: string | null
          disposal_reason?: string
          disposal_recorded_at?: string
          disposed_by_user_id?: string | null
          id?: string
          salvage_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_disposal_log_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_disposal_log_disposed_by_user_id_fkey"
            columns: ["disposed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_documents: {
        Row: {
          asset_id: string
          description: string | null
          file_name: string
          file_size_bytes: number | null
          file_type: string | null
          file_url: string
          id: string
          uploaded_at: string
          uploaded_by_user_id: string | null
        }
        Insert: {
          asset_id: string
          description?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_at?: string
          uploaded_by_user_id?: string | null
        }
        Update: {
          asset_id?: string
          description?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_at?: string
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_documents_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_tags: {
        Row: {
          asset_id: string
          assigned_at: string
          assigned_by_user_id: string | null
          tag_id: string
        }
        Insert: {
          asset_id: string
          assigned_at?: string
          assigned_by_user_id?: string | null
          tag_id: string
        }
        Update: {
          asset_id?: string
          assigned_at?: string
          assigned_by_user_id?: string | null
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_tags_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_tags_assigned_by_user_id_fkey"
            columns: ["assigned_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
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
          disposal_date: string | null
          disposal_notes: string | null
          disposal_reason: string | null
          id: string
          last_serviced_date: string | null
          location: string | null
          maintenance_interval_unit: string | null
          maintenance_interval_value: number | null
          next_maintenance_due_date: string | null
          notes: string | null
          photo_url: string | null
          purchase_date: string | null
          purchase_order_number: string | null
          purchase_price: number | null
          requires_maintenance: boolean | null
          responsible_user_id: string | null
          salvage_value: number | null
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
          disposal_date?: string | null
          disposal_notes?: string | null
          disposal_reason?: string | null
          id?: string
          last_serviced_date?: string | null
          location?: string | null
          maintenance_interval_unit?: string | null
          maintenance_interval_value?: number | null
          next_maintenance_due_date?: string | null
          notes?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          purchase_order_number?: string | null
          purchase_price?: number | null
          requires_maintenance?: boolean | null
          responsible_user_id?: string | null
          salvage_value?: number | null
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
          disposal_date?: string | null
          disposal_notes?: string | null
          disposal_reason?: string | null
          id?: string
          last_serviced_date?: string | null
          location?: string | null
          maintenance_interval_unit?: string | null
          maintenance_interval_value?: number | null
          next_maintenance_due_date?: string | null
          notes?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          purchase_order_number?: string | null
          purchase_price?: number | null
          requires_maintenance?: boolean | null
          responsible_user_id?: string | null
          salvage_value?: number | null
          serial_number?: string | null
          service_document_url?: string | null
          status?: string
          supplier_contact?: string | null
          supplier_info?: string | null
          warranty_expiry_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      inventory_adjustment_requests: {
        Row: {
          approval_token: string | null
          approval_token_expires_at: string | null
          approver_role_target: string | null
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
          approver_role_target?: string | null
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
          approver_role_target?: string | null
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
          last_maintenance_date: string | null
          low_stock_threshold: number
          maintenance_interval: Json | null
          maintenance_interval_set_at: string | null
          maintenance_interval_set_by: string | null
          next_maintenance_due_date: string | null
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
          last_maintenance_date?: string | null
          low_stock_threshold?: number
          maintenance_interval?: Json | null
          maintenance_interval_set_at?: string | null
          maintenance_interval_set_by?: string | null
          next_maintenance_due_date?: string | null
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
          last_maintenance_date?: string | null
          low_stock_threshold?: number
          maintenance_interval?: Json | null
          maintenance_interval_set_at?: string | null
          maintenance_interval_set_by?: string | null
          next_maintenance_due_date?: string | null
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
      maintenance_log: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          new_last_serviced_date: string
          new_next_maintenance_due_date: string
          notes: string | null
          previous_last_serviced_date: string | null
          previous_next_maintenance_due_date: string | null
          serviced_at: string
          serviced_by_user_id: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          new_last_serviced_date: string
          new_next_maintenance_due_date: string
          notes?: string | null
          previous_last_serviced_date?: string | null
          previous_next_maintenance_due_date?: string | null
          serviced_at?: string
          serviced_by_user_id?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          new_last_serviced_date?: string
          new_next_maintenance_due_date?: string
          notes?: string | null
          previous_last_serviced_date?: string | null
          previous_next_maintenance_due_date?: string | null
          serviced_at?: string
          serviced_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_log_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_log_serviced_by_user_id_fkey"
            columns: ["serviced_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_logs: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          maintenance_date: string
          notes: string | null
          performed_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          maintenance_date?: string
          notes?: string | null
          performed_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          maintenance_date?: string
          notes?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
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
            referencedRelation: "treatment_plan_details"
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
      tags: {
        Row: {
          color: string | null
          created_at: string
          created_by_user_id: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "treatment_plan_details"
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
      treatment_plan_metadata: {
        Row: {
          clinical_considerations: string | null
          completed_visits: number | null
          created_at: string
          id: string
          key_materials: string | null
          post_treatment_care: string | null
          total_visits: number | null
          treatment_plan_id: string
          updated_at: string
        }
        Insert: {
          clinical_considerations?: string | null
          completed_visits?: number | null
          created_at?: string
          id?: string
          key_materials?: string | null
          post_treatment_care?: string | null
          total_visits?: number | null
          treatment_plan_id: string
          updated_at?: string
        }
        Update: {
          clinical_considerations?: string | null
          completed_visits?: number | null
          created_at?: string
          id?: string
          key_materials?: string | null
          post_treatment_care?: string | null
          total_visits?: number | null
          treatment_plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plan_metadata_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plan_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_metadata_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
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
            referencedRelation: "treatment_plan_details"
            referencedColumns: ["id"]
          },
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
      treatment_visits: {
        Row: {
          completed_date: string | null
          created_at: string | null
          estimated_duration: string | null
          id: string
          procedures: string
          scheduled_date: string | null
          status: string | null
          time_gap: string | null
          treatment_plan_id: string | null
          updated_at: string | null
          visit_number: number
        }
        Insert: {
          completed_date?: string | null
          created_at?: string | null
          estimated_duration?: string | null
          id?: string
          procedures: string
          scheduled_date?: string | null
          status?: string | null
          time_gap?: string | null
          treatment_plan_id?: string | null
          updated_at?: string | null
          visit_number: number
        }
        Update: {
          completed_date?: string | null
          created_at?: string | null
          estimated_duration?: string | null
          id?: string
          procedures?: string
          scheduled_date?: string | null
          status?: string | null
          time_gap?: string | null
          treatment_plan_id?: string | null
          updated_at?: string | null
          visit_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "treatment_visits_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plan_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_visits_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
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
          scheduled_date: string | null
          status: string
          time_gap: string | null
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
          scheduled_date?: string | null
          status: string
          time_gap?: string | null
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
          scheduled_date?: string | null
          status?: string
          time_gap?: string | null
          type?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plan_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      urgent_purchase_items: {
        Row: {
          batch_number: string | null
          created_at: string
          expiry_date: string | null
          id: string
          inventory_item_id: string
          matched_item_name: string
          quantity: number
          slip_text: string | null
          updated_at: string
          urgent_purchase_id: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          inventory_item_id: string
          matched_item_name: string
          quantity: number
          slip_text?: string | null
          updated_at?: string
          urgent_purchase_id: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          inventory_item_id?: string
          matched_item_name?: string
          quantity?: number
          slip_text?: string | null
          updated_at?: string
          urgent_purchase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "urgent_purchase_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "urgent_purchase_items_urgent_purchase_id_fkey"
            columns: ["urgent_purchase_id"]
            isOneToOne: false
            referencedRelation: "urgent_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      urgent_purchases: {
        Row: {
          approver_role_target: string | null
          confidence_score: number | null
          created_at: string
          created_by: string | null
          id: string
          invoice_delivery_date: string | null
          notes: string | null
          requested_at: string | null
          requested_by_user_id: string | null
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          reviewer_notes: string | null
          slip_filename: string | null
          slip_image_path: string | null
          status: string
          status_new_enum:
            | Database["public"]["Enums"]["urgent_purchase_request_status"]
            | null
          status_temp_enum:
            | Database["public"]["Enums"]["urgent_purchase_request_status"]
            | null
          target_approval_role: string | null
          updated_at: string
        }
        Insert: {
          approver_role_target?: string | null
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_delivery_date?: string | null
          notes?: string | null
          requested_at?: string | null
          requested_by_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          reviewer_notes?: string | null
          slip_filename?: string | null
          slip_image_path?: string | null
          status: string
          status_new_enum?:
            | Database["public"]["Enums"]["urgent_purchase_request_status"]
            | null
          status_temp_enum?:
            | Database["public"]["Enums"]["urgent_purchase_request_status"]
            | null
          target_approval_role?: string | null
          updated_at?: string
        }
        Update: {
          approver_role_target?: string | null
          confidence_score?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_delivery_date?: string | null
          notes?: string | null
          requested_at?: string | null
          requested_by_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          reviewer_notes?: string | null
          slip_filename?: string | null
          slip_image_path?: string | null
          status?: string
          status_new_enum?:
            | Database["public"]["Enums"]["urgent_purchase_request_status"]
            | null
          status_temp_enum?:
            | Database["public"]["Enums"]["urgent_purchase_request_status"]
            | null
          target_approval_role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "urgent_purchases_requested_by_user_id_fkey"
            columns: ["requested_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "urgent_purchases_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      treatment_plan_details: {
        Row: {
          ai_generated: boolean | null
          ai_plan_id: string | null
          clinical_considerations: string | null
          communication_preferences: Json | null
          completed_visits: number | null
          consent_date: string | null
          consent_required: boolean | null
          consent_status: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          estimated_cost: number | null
          id: string | null
          key_materials: string | null
          last_notification_sent: string | null
          next_communication_date: string | null
          notification_count: number | null
          patient_id: string | null
          post_treatment_care: string | null
          priority: string | null
          start_date: string | null
          status: string | null
          title: string | null
          total_visits: number | null
          updated_at: string | null
          version: string | null
          visits: Json | null
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
      create_treatment_plan_with_visits: {
        Args: { plan_data: Json; metadata_data: Json; visits_data: Json }
        Returns: Json
      }
      dispose_asset: {
        Args: {
          p_asset_id: string
          p_disposed_by_user_id: string
          p_disposal_date: string
          p_disposal_reason: string
          p_salvage_value?: number
          p_disposal_notes?: string
        }
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
      get_treatment_plan_details: {
        Args: { p_plan_id: string }
        Returns: {
          plan_id: string
          patient_id: string
          title: string
          description: string
          status: Database["public"]["Enums"]["treatment_plan_status"]
          priority: Database["public"]["Enums"]["treatment_plan_priority"]
          start_date: string
          estimated_cost: number
          total_visits: number
          completed_visits: number
          teeth: number[]
          visits: Json[]
        }[]
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
      is_claims_admin_or_owner: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      mark_asset_as_serviced: {
        Args:
          | {
              p_asset_id: string
              p_serviced_by_user_id: string
              p_service_notes?: string
            }
          | {
              p_asset_id: string
              p_serviced_by_user_id: string
              p_service_notes?: string
              p_maintenance_cost?: number
              p_invoice_document_id?: string
            }
        Returns: undefined
      }
      process_approved_adjustment: {
        Args: {
          p_request_id: string
          p_reviewer_user_id: string
          p_reviewer_notes?: string
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
        | "Used"
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
        | "BATCH_STOCK_OUT"
        | "BATCH_ADJUSTMENT"
        | "EXPIRED"
      treatment_plan_priority: "low" | "medium" | "high"
      treatment_plan_status:
        | "planned"
        | "in_progress"
        | "completed"
        | "cancelled"
      treatment_status:
        | "pending"
        | "in_progress"
        | "appointment_scheduled"
        | "completed"
        | "cancelled"
      urgent_purchase_request_status:
        | "pending_approval"
        | "approved"
        | "rejected"
        | "draft"
      visit_status: "pending" | "completed" | "cancelled"
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
        "Used",
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
        "BATCH_STOCK_OUT",
        "BATCH_ADJUSTMENT",
        "EXPIRED",
      ],
      treatment_plan_priority: ["low", "medium", "high"],
      treatment_plan_status: [
        "planned",
        "in_progress",
        "completed",
        "cancelled",
      ],
      treatment_status: [
        "pending",
        "in_progress",
        "appointment_scheduled",
        "completed",
        "cancelled",
      ],
      urgent_purchase_request_status: [
        "pending_approval",
        "approved",
        "rejected",
        "draft",
      ],
      visit_status: ["pending", "completed", "cancelled"],
    },
  },
} as const
