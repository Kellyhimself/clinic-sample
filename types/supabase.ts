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
      admins: {
        Row: {
          created_at: string | null
          department: string | null
          id: string
          permissions: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          id?: string
          permissions?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          id?: string
          permissions?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          }
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
        }
        Insert: {
          action: string
          created_at?: string | null
          created_by: string
          details?: Json
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          created_at?: string | null
          created_by?: string
          details?: Json
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      doctors: {
        Row: {
          created_at: string | null
          id: string
          license_number: string
          specialty: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          license_number: string
          specialty: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
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
          }
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
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
      medication_batches: {
        Row: {
          batch_number: string
          created_at: string | null
          expiry_date: string
          id: string
          medication_id: string
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
          }
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
          unit_price: number
          updated_at: string | null
          manufacturer: string | null
          barcode: string | null
          shelf_location: string | null
          last_restocked_at: string | null
          last_sold_at: string | null
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
          unit_price: number
          updated_at?: string | null
          manufacturer?: string | null
          barcode?: string | null
          shelf_location?: string | null
          last_restocked_at?: string | null
          last_sold_at?: string | null
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
          unit_price?: number
          updated_at?: string | null
          manufacturer?: string | null
          barcode?: string | null
          shelf_location?: string | null
          last_restocked_at?: string | null
          last_sold_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
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
      patients: {
        Row: {
          address: string | null
          created_at: string | null
          date_of_birth: string | null
          full_name: string
          gender: string | null
          id: string
          phone_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          full_name: string
          gender?: string | null
          id: string
          phone_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      pharmacists: {
        Row: {
          created_at: string | null
          id: string
          license_number: string
          specialization: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          license_number: string
          specialization?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          license_number?: string
          specialization?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
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
          }
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
          }
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
          }
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
          }
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
          }
        ]
      }
      sales: {
        Row: {
          created_at: string | null
          created_by: string
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
          id?: string
          patient_id?: string | null
          payment_method?: string | null
          payment_status: string
          tenant_id?: string | null
          total_amount: number
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
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
            foreignKeyName: "sales_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
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
          }
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
          }
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
          }
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
          phone_number: string
          tenant_id: string | null
          updated_at: string | null
          patient_type: 'guest' | 'quick_sale'
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
          phone_number: string
          tenant_id?: string | null
          updated_at?: string | null
          patient_type: 'guest' | 'quick_sale'
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
          phone_number?: string
          tenant_id?: string | null
          updated_at?: string | null
          patient_type?: 'guest' | 'quick_sale'
        }
        Relationships: []
      },
      admin_roles: {
        Row: {
          admin_type: "system" | "tenant"
          created_at: string | null
          id: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_type: "system" | "tenant"
          created_at?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_type?: "system" | "tenant"
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
          }
        ]
      },
      tenants: {
        Row: {
          billing_address: string | null
          billing_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          max_users: number | null
          name: string
          plan_type: string
          subscription_id: string | null
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
          max_users?: number | null
          name: string
          plan_type?: string
          subscription_id?: string | null
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
          max_users?: number | null
          name?: string
          plan_type?: string
          subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      },
      subscription_limits: {
        Row: {
          id: string
          tenant_id: string
          plan_type: string
          max_patients: number
          max_appointments_per_month: number
          max_inventory_items: number
          max_users: number
          max_transactions_per_month: number | null
          features: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          plan_type: string
          max_patients: number
          max_appointments_per_month: number
          max_inventory_items: number
          max_users: number
          max_transactions_per_month?: number | null
          features: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          plan_type?: string
          max_patients?: number
          max_appointments_per_month?: number
          max_inventory_items?: number
          max_users?: number
          max_transactions_per_month?: number | null
          features?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      },
      pesapal_transactions: {
        Row: {
          id: string;
          tracking_id: string;
          tenant_id: string | null;
          plan_id: string | null;
          amount: number;
          phone_number: string | null;
          status: string;
          description: string | null;
          payment_method: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          tracking_id: string;
          tenant_id?: string | null;
          plan_id?: string | null;
          amount: number;
          phone_number?: string | null;
          status?: string;
          description?: string | null;
          payment_method?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          tracking_id?: string;
          tenant_id?: string | null;
          plan_id?: string | null;
          amount?: number;
          phone_number?: string | null;
          status?: string;
          description?: string | null;
          payment_method?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pesapal_transactions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pesapal_transactions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      },
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
          }
        ]
      },
      staff_invitations: {
        Row: {
          id: string
          email: string
          role: string
          tenant_id: string
          status: string
          expires_at: string
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          email: string
          role: string
          tenant_id: string
          status?: string
          expires_at: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          role?: string
          tenant_id?: string
          status?: string
          expires_at?: string
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      all_patients: {
        Row: {
          id: string
          full_name: string
          phone_number: string | null
          email: string | null
          date_of_birth: string | null
          gender: string | null
          address: string | null
          created_at: string | null
          updated_at: string | null
          patient_type: 'registered' | 'guest'
          reference_id: string
          user_id: string | null
        }
        Relationships: []
      },
      patient_summary: {
        Row: {
          full_name: string | null
          id: string | null
          medical_records_count: number | null
          phone_number: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_profit_and_reorders: {
        Args: Record<PropertyKey, never>
        Returns: {
          medication_id: string
          name: string
          total_sales: number
          total_cost: number
          profit_margin: number
          reorder_suggested: boolean
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
      decrement_batch_quantity: {
        Args: { p_batch_id: string; p_quantity: number }
        Returns: undefined
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
      get_top_selling_medications: {
        Args: { p_tenant_id: string }
        Returns: {
          medication_id: string
          medication_name: string
          total_quantity: number
        }[]
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
      update_user_role: {
        Args: {
          p_user_id: string
          p_new_role: string
          p_full_name: string
          p_phone_number: string
          p_license_number?: string
          p_specialty?: string
          p_date_of_birth?: string
          p_gender?: string
          p_address?: string
          p_specialization?: string
          p_department?: string
          p_permissions?: string[]
        }
        Returns: undefined
      }
      register_guest_patient: {
        Args: { 
          p_full_name: string
          p_phone_number: string
          p_email?: string | null
          p_date_of_birth?: string | null
          p_gender?: string | null
          p_address?: string | null
          p_notes?: string | null 
        }
        Returns: Patient
      }
      get_patient_by_id: {
        Args: { p_id: string }
        Returns: Patient
      }
    }
    Enums: {
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
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never;

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
      appointment_status: ["pending", "confirmed", "cancelled"],
      stock_transaction_type: ["restock", "deduction", "adjustment"],
    },
  },
} as const

// Enhanced Patient type that handles both regular and guest patients
export interface PatientBase {
  id: string;
  full_name: string;
  phone_number: string | null;
  email?: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_registered_user?: boolean;
  patient_type?: 'registered' | 'guest';
  reference_id?: string;
  user_id: string | null;
}

// Guest Patient type specifically for patients from guest_patients table
export interface GuestPatient extends Omit<PatientBase, 'user_id'> {
  id: string; // Format will be 'guest_{uuid}'
  patient_type: 'guest';
  reference_id: string; // The actual UUID in guest_patients table
  user_id: null;
}

// Patient type is a union type that can be either a regular patient or guest patient
export type Patient = PatientBase | GuestPatient;

export type Medication = Omit<Database['public']['Tables']['medications']['Row'], 'manufacturer' | 'barcode' | 'shelf_location'> & {
  manufacturer?: string | null;
  barcode?: string | null;
  shelf_location?: string | null;
  batches: Array<{
    id: string;
    batch_number: string;
    expiry_date: string;
    quantity: number;
    unit_price: number;
    supplier_id?: string;
  }>;
  total_stock?: number;
};

export type Supplier = Database['public']['Tables']['suppliers']['Row'];

export type PatientSummaryData = {
  id: string;
  full_name: string;
  phone_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  prescriptions: Array<{
    id: string;
    medication_name: string;
    dosage: string;
    quantity: number;
    prescription_date: string;
  }>;
  purchases: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    sale_date: string;
    medication: {
      name: string;
    };
  }>;
  medical_records: Array<{
    id: string;
    diagnosis: string;
    treatment: string;
    record_date: string;
    doctor: {
      full_name: string;
    };
  }>;
};

export interface Profile {
  id: string;
  role: "admin" | "staff" | "patient" | "doctor" | "pharmacist";
  full_name: string;
  phone_number?: string;
  email?: string;
  license_number?: string;
  specialty?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  specialization?: string;
  department?: string;
  permissions?: string;
  created_at?: string;
  updated_at?: string;
}

export type Appointment = {
  id: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string;
  services: { name: string; price: number; duration: number } | null;
  profiles: { full_name: string } | null;
  payment_status?: 'unpaid' | 'paid' | 'refunded';
  payment_method?: 'mpesa' | 'cash' | 'bank';
  transaction_id?: string | null;
  doctor?: { full_name: string } | null;
  patient_id?: string;
};

export type AppointmentWithDetails = Appointment & {
  service: {
    id: string;
    name: string;
    price: number;
    duration: number;
  };
  doctor: {
    id: string;
    full_name: string;
  };
};

export type SaleItem = {
  id: string;
  batch_id: string;
  medication_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sale_id: string;
  created_at: string | null;
  medication: {
    id: string;
    name: string;
    dosage_form: string;
    strength: string;
  };
  batch: {
    batch_number: string;
    expiry_date: string;
  };
};

export type Sale = Database['public']['Tables']['sales']['Row'] & {
  patient?: {
    full_name: string;
    phone_number: string | null;
  };
  items: SaleItem[];
};

export type UnpaidAppointment = {
  id: string;
  date: string;
  time: string;
  services: {
    name: string;
    price: number;
  } | null;
  payment_status: 'unpaid' | 'paid' | 'refunded' | null;
};

export type InventoryItem = {
  medication_id?: string;
  name: string;
  category: string;
  dosage_form: string;
  strength: string;
  unit_price: number;
  description?: string | null;
  is_active?: boolean | null;
  batch_number?: string;
  expiry_date?: string;
  quantity?: number;
  purchase_price: number;
};

export interface ReceiptData {
  id: string;
  receipt_number: string;
  created_at: string;
  amount: number;
  payment_method: string;
  patient?: {
    id: string;
    full_name: string;
    email: string;
    phone_number: string | null;
  };
  items?: Array<{
    medication: {
      name: string;
      dosage_form: string;
      strength: string;
    };
    quantity: number;
    unit_price: number;
    total_price: number;
    batch: {
      batch_number: string;
      expiry_date: string;
    };
  }>;
  appointments?: Array<{
    services: {
      name: string;
      price: number;
    } | null;
  }>;
  medication_total?: number;
  appointment_total?: number;
  total_amount?: number;
}