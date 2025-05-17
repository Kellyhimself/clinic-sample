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
      admin_roles: {
        Row: {
          admin_type: Database["public"]["Enums"]["admin_type"]
          created_at: string | null
          id: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_type: Database["public"]["Enums"]["admin_type"]
          created_at?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_type?: Database["public"]["Enums"]["admin_type"]
          created_at?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
        Row: {
          created_at: string | null
          department: string | null
          id: string
          permissions: string[] | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          id?: string
          permissions?: string[] | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          id?: string
          permissions?: string[] | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          amount_paid: number | null
          date: string
          doctor_id: string
          id: string
          notes: string | null
          patient_id: string
          payment_date: string | null
          payment_method: string | null
          payment_status: string | null
          service_id: string
          status: string | null
          tenant_id: string | null
          time: string
          transaction_id: string | null
        }
        Insert: {
          amount_paid?: number | null
          date: string
          doctor_id: string
          id?: string
          notes?: string | null
          patient_id: string
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          service_id: string
          status?: string | null
          tenant_id?: string | null
          time: string
          transaction_id?: string | null
        }
        Update: {
          amount_paid?: number | null
          date?: string
          doctor_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string | null
          service_id?: string
          status?: string | null
          tenant_id?: string | null
          time?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          created_by: string
          details: Json
          entity_id: string
          entity_type: string
          id: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          created_by: string
          details?: Json
          entity_id: string
          entity_type: string
          id?: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          created_by?: string
          details?: Json
          entity_id?: string
          entity_type?: string
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cashiers: {
        Row: {
          created_at: string | null
          department: string | null
          id: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cashiers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          created_at: string | null
          department: string | null
          id: string
          license_number: string
          specialty: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          id?: string
          license_number: string
          specialty: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          id?: string
          license_number?: string
          specialty?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_patients: {
        Row: {
          address: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          last_access: string | null
          notes: string | null
          patient_type: string
          phone_number: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          last_access?: string | null
          notes?: string | null
          patient_type: string
          phone_number?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          last_access?: string | null
          notes?: string | null
          patient_type?: string
          phone_number?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_patients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invitation_id: string | null
          token: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          invitation_id?: string | null
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invitation_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitation_tokens_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "staff_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          created_at: string | null
          diagnosis: string
          doctor_id: string
          id: string
          patient_id: string | null
          record_date: string | null
          tenant_id: string | null
          treatment: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          diagnosis: string
          doctor_id: string
          id?: string
          patient_id?: string | null
          record_date?: string | null
          tenant_id?: string | null
          treatment: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          diagnosis?: string
          doctor_id?: string
          id?: string
          patient_id?: string | null
          record_date?: string | null
          tenant_id?: string | null
          treatment?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_batches: {
        Row: {
          batch_number: string
          created_at: string | null
          expiry_date: string
          id: string
          medication_id: string
          purchase_price: number
          quantity: number
          tenant_id: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          batch_number: string
          created_at?: string | null
          expiry_date: string
          id?: string
          medication_id: string
          purchase_price?: number
          quantity?: number
          tenant_id?: string | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          batch_number?: string
          created_at?: string | null
          expiry_date?: string
          id?: string
          medication_id?: string
          purchase_price?: number
          quantity?: number
          tenant_id?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_batches_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          dosage_form: string
          id: string
          is_active: boolean | null
          name: string
          strength: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          dosage_form: string
          id?: string
          is_active?: boolean | null
          name: string
          strength: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          dosage_form?: string
          id?: string
          is_active?: boolean | null
          name?: string
          strength?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          message: string
          read: boolean | null
          recipient_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          message: string
          read?: boolean | null
          recipient_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          message?: string
          read?: boolean | null
          recipient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patients_backup: {
        Row: {
          address: string | null
          created_at: string | null
          date_of_birth: string | null
          full_name: string | null
          gender: string | null
          id: string | null
          phone_number: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string | null
          phone_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string | null
          phone_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pesapal_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          payment_method: string | null
          phone_number: string | null
          plan_id: string | null
          status: string
          tenant_id: string | null
          tracking_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          phone_number?: string | null
          plan_id?: string | null
          status?: string
          tenant_id?: string | null
          tracking_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          phone_number?: string | null
          plan_id?: string | null
          status?: string
          tenant_id?: string | null
          tracking_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pesapal_transactions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesapal_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacists: {
        Row: {
          created_at: string | null
          department: string | null
          full_name: string
          id: string
          license_number: string
          specialization: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          full_name: string
          id?: string
          license_number: string
          specialization?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          full_name?: string
          id?: string
          license_number?: string
          specialization?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string | null
          doctor_id: string | null
          dosage: string | null
          id: string
          instructions: string | null
          medication_id: string | null
          patient_id: string | null
          prescription_date: string | null
          quantity: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id?: string | null
          dosage?: string | null
          id?: string
          instructions?: string | null
          medication_id?: string | null
          patient_id?: string | null
          prescription_date?: string | null
          quantity?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string | null
          dosage?: string | null
          id?: string
          instructions?: string | null
          medication_id?: string | null
          patient_id?: string | null
          prescription_date?: string | null
          quantity?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone_number: string | null
          role: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id: string
          phone_number?: string | null
          role?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone_number?: string | null
          role?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          id: string
          medication_id: string
          purchase_order_id: string
          quantity: number
          tenant_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          medication_id: string
          purchase_order_id: string
          quantity: number
          tenant_id?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          medication_id?: string
          purchase_order_id?: string
          quantity?: number
          tenant_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          status: string
          supplier_id: string
          tenant_id: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          status?: string
          supplier_id: string
          tenant_id?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          status?: string
          supplier_id?: string
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          appointment_total: number | null
          created_at: string | null
          id: string
          medication_total: number | null
          payment_method: string
          receipt_number: string
          sale_id: string
          tenant_id: string | null
        }
        Insert: {
          amount: number
          appointment_total?: number | null
          created_at?: string | null
          id?: string
          medication_total?: number | null
          payment_method: string
          receipt_number: string
          sale_id: string
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          appointment_total?: number | null
          created_at?: string | null
          id?: string
          medication_total?: number | null
          payment_method?: string
          receipt_number?: string
          sale_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: number
          role_name: string
        }
        Insert: {
          id?: number
          role_name: string
        }
        Update: {
          id?: number
          role_name?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          batch_id: string
          created_at: string | null
          id: string
          medication_id: string
          quantity: number
          sale_id: string
          tenant_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          id?: string
          medication_id: string
          quantity: number
          sale_id: string
          tenant_id?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          id?: string
          medication_id?: string
          quantity?: number
          sale_id?: string
          tenant_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "medication_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string | null
          created_by: string
          guest_patient_id: string | null
          id: string
          patient_id: string | null
          payment_method: string | null
          payment_status: string
          tenant_id: string | null
          total_amount: number
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          guest_patient_id?: string | null
          id?: string
          patient_id?: string | null
          payment_method?: string | null
          payment_status?: string
          tenant_id?: string | null
          total_amount: number
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          guest_patient_id?: string | null
          id?: string
          patient_id?: string | null
          payment_method?: string | null
          payment_status?: string
          tenant_id?: string | null
          total_amount?: number
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sales_patient_id"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "guest_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          duration: number
          id: string
          is_active: boolean | null
          name: string
          price: number
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          duration: number
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          duration?: number
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_at: string
          metadata: Json | null
          role: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_at?: string
          metadata?: Json | null
          role: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_at?: string
          metadata?: Json | null
          role?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          batch_id: string
          created_at: string | null
          created_by: string
          id: string
          medication_id: string
          movement_type: string
          quantity: number
          reference_id: string | null
          tenant_id: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string | null
          created_by: string
          id?: string
          medication_id: string
          movement_type: string
          quantity: number
          reference_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          medication_id?: string
          movement_type?: string
          quantity?: number
          reference_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "medication_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          medication_id: string | null
          prescription_id: string | null
          quantity: number
          reason: string | null
          transaction_type: Database["public"]["Enums"]["stock_transaction_type"]
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          medication_id?: string | null
          prescription_id?: string | null
          quantity: number
          reason?: string | null
          transaction_type: Database["public"]["Enums"]["stock_transaction_type"]
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          medication_id?: string | null
          prescription_id?: string | null
          quantity?: number
          reason?: string | null
          transaction_type?: Database["public"]["Enums"]["stock_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          due_date: string | null
          external_invoice_id: string | null
          id: string
          invoice_date: string | null
          invoice_number: string
          metadata: Json | null
          payment_date: string | null
          payment_method: string | null
          paystack_payment_id: string | null
          paystack_subscription_id: string | null
          period_end: string | null
          period_start: string | null
          status: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          external_invoice_id?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number: string
          metadata?: Json | null
          payment_date?: string | null
          payment_method?: string | null
          paystack_payment_id?: string | null
          paystack_subscription_id?: string | null
          period_end?: string | null
          period_start?: string | null
          status: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          external_invoice_id?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          metadata?: Json | null
          payment_date?: string | null
          payment_method?: string | null
          paystack_payment_id?: string | null
          paystack_subscription_id?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_limits: {
        Row: {
          created_at: string | null
          features: Json | null
          id: number
          max_appointments_per_month: number | null
          max_inventory_items: number | null
          max_patients: number | null
          max_transactions_per_month: number | null
          max_users: number | null
          plan_type: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          id?: number
          max_appointments_per_month?: number | null
          max_inventory_items?: number | null
          max_patients?: number | null
          max_transactions_per_month?: number | null
          max_users?: number | null
          plan_type: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          id?: number
          max_appointments_per_month?: number | null
          max_inventory_items?: number | null
          max_patients?: number | null
          max_transactions_per_month?: number | null
          max_users?: number | null
          plan_type?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          currency: string
          description: string | null
          duration_days: number
          features: Json
          id: string
          is_active: boolean | null
          name: string
          paystack_plan_id: string | null
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string
          description?: string | null
          duration_days?: number
          features?: Json
          id: string
          is_active?: boolean | null
          name: string
          paystack_plan_id?: string | null
          price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          description?: string | null
          duration_days?: number
          features?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          paystack_plan_id?: string | null
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          name: string
          phone_number: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          phone_number?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          phone_number?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          billing_address: string | null
          billing_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_payment_date: string | null
          max_users: number | null
          mpesa_consumer_key: string | null
          mpesa_consumer_secret: string | null
          mpesa_passkey: string | null
          mpesa_shortcode: string | null
          name: string
          payment_failures: number | null
          payment_method: string | null
          paystack_customer_id: string | null
          paystack_subscription_id: string | null
          plan_type: string
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          updated_at: string | null
        }
        Insert: {
          billing_address?: string | null
          billing_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_payment_date?: string | null
          max_users?: number | null
          mpesa_consumer_key?: string | null
          mpesa_consumer_secret?: string | null
          mpesa_passkey?: string | null
          mpesa_shortcode?: string | null
          name: string
          payment_failures?: number | null
          payment_method?: string | null
          paystack_customer_id?: string | null
          paystack_subscription_id?: string | null
          plan_type?: string
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_address?: string | null
          billing_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_payment_date?: string | null
          max_users?: number | null
          mpesa_consumer_key?: string | null
          mpesa_consumer_secret?: string | null
          mpesa_passkey?: string | null
          mpesa_shortcode?: string | null
          name?: string
          payment_failures?: number | null
          payment_method?: string | null
          paystack_customer_id?: string | null
          paystack_subscription_id?: string | null
          plan_type?: string
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      usage_stats: {
        Row: {
          appointment_count: number | null
          created_at: string | null
          inventory_count: number | null
          month: string
          patient_count: number | null
          tenant_id: string
          updated_at: string | null
          user_count: number | null
        }
        Insert: {
          appointment_count?: number | null
          created_at?: string | null
          inventory_count?: number | null
          month: string
          patient_count?: number | null
          tenant_id: string
          updated_at?: string | null
          user_count?: number | null
        }
        Update: {
          appointment_count?: number | null
          created_at?: string | null
          inventory_count?: number | null
          month?: string
          patient_count?: number | null
          tenant_id?: string
          updated_at?: string | null
          user_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_stats_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          role_id: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          role_id?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role_id?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_system_admin: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      add_system_admin_by_email: {
        Args: { p_email: string }
        Returns: undefined
      }
      calculate_profit_and_reorders: {
        Args: { p_tenant_id: string }
        Returns: {
          medication_id: string
          name: string
          total_sales: number
          total_cost: number
          profit_margin: number
          reorder_suggested: boolean
          debug_info: Json
        }[]
      }
      check_expiry: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          batch_no: string
          expiry_date: string
          days_until_expiry: number
        }[]
      }
      check_patient_id: {
        Args: { patient_id: string }
        Returns: boolean
      }
      create_guest_patient: {
        Args: {
          p_full_name: string
          p_phone_number: string
          p_email?: string
          p_date_of_birth?: string
          p_gender?: string
          p_address?: string
        }
        Returns: Json
      }
      create_subscription_limit: {
        Args: {
          p_tenant_id: string
          p_plan_type: string
          p_max_patients: number
          p_max_appointments_per_month: number
          p_max_inventory_items: number
          p_max_users: number
          p_features: string
        }
        Returns: undefined
      }
      decrement_batch_quantity: {
        Args: { p_batch_id: string; p_quantity: number }
        Returns: undefined
      }
      generate_invitation_token: {
        Args: { invitation_id: string }
        Returns: string
      }
      get_auth_users_by_email: {
        Args: { email_input: string }
        Returns: {
          id: string
          email: string
        }[]
      }
      get_medication_profit_margins: {
        Args: { p_tenant_id: string }
        Returns: {
          medication_id: string
          medication_name: string
          batch_id: string
          batch_number: string
          quantity: number
          total_price: number
          purchase_price: number
          unit_price: number
          effective_cost: number
          total_cost: number
          profit: number
          profit_margin: number
          created_at: string
        }[]
      }
      get_patient_by_id: {
        Args: { p_id: string }
        Returns: Json
      }
      get_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_tenant_sales: {
        Args: {
          p_search_term?: string
          p_timeframe?: string
          p_page?: number
          p_page_size?: number
        }
        Returns: {
          id: string
          created_at: string
          payment_method: string
          payment_status: string
          total_amount: number
          transaction_id: string
          patient: Json
          items: Json
        }[]
      }
      get_top_selling_medications: {
        Args: { p_tenant_id: string }
        Returns: {
          medication_id: string
          medication_name: string
          total_quantity: number
        }[]
      }
      is_system_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_tenant_admin: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      register_guest_patient: {
        Args: {
          p_full_name: string
          p_phone_number: string
          p_email?: string
          p_date_of_birth?: string
          p_gender?: string
          p_address?: string
          p_notes?: string
        }
        Returns: Json
      }
      restock_medication: {
        Args: {
          p_medication_id: string
          p_quantity: number
          p_reason: string
          p_user_id: string
        }
        Returns: undefined
      }
      send_reorder_reminders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      set_tenant_context: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      update_tenant_subscription: {
        Args: {
          p_tenant_id: string
          p_subscription_id: string
          p_plan_type: string
          p_subscription_status: string
          p_payment_method: string
          p_customer_id: string
          p_subscription_start_date: string
          p_subscription_end_date: string
        }
        Returns: undefined
      }
      update_user_role: {
        Args: {
          p_address: string
          p_date_of_birth: string
          p_department: string
          p_full_name: string
          p_gender: string
          p_license_number: string
          p_new_role: string
          p_permissions: string[]
          p_phone_number: string
          p_specialization: string
          p_specialty: string
          p_user_id: string
        }
        Returns: undefined
      }
      user_belongs_to_tenant: {
        Args: { user_id: string; tenant_id: string }
        Returns: boolean
      }
      verify_invitation_token: {
        Args: { token_input: string }
        Returns: {
          id: string
          email: string
          role: string
          tenant_id: string
        }[]
      }
    }
    Enums: {
      admin_type: "system" | "tenant"
      appointment_status: "pending" | "confirmed" | "cancelled"
      stock_transaction_type: "restock" | "deduction" | "adjustment"
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
      admin_type: ["system", "tenant"],
      appointment_status: ["pending", "confirmed", "cancelled"],
      stock_transaction_type: ["restock", "deduction", "adjustment"],
    },
  },
} as const
