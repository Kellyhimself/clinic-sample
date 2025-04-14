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
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          id: string
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          created_at: string | null
          id: string
          license_number: string
          specialty: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          license_number: string
          specialty: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          license_number?: string
          specialty?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
        ]
      }
      medications: {
        Row: {
          batch_no: string | null
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          name: string
          quantity_in_stock: number
          reorder_level: number
          supplier_id: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          batch_no?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          quantity_in_stock: number
          reorder_level: number
          supplier_id?: string | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          batch_no?: string | null
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          quantity_in_stock?: number
          reorder_level?: number
          supplier_id?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          full_name: string
          gender?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string | null
          user_id?: string | null
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
          user_id?: string | null
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
            foreignKeyName: "prescriptions_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
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
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id: string
          phone_number?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone_number?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          delivery_date: string | null
          id: string
          medication_id: string | null
          order_date: string | null
          quantity: number
          status: string | null
          supplier_id: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          id?: string
          medication_id?: string | null
          order_date?: string | null
          quantity: number
          status?: string | null
          supplier_id?: string | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string | null
          id?: string
          medication_id?: string | null
          order_date?: string | null
          quantity?: number
          status?: string | null
          supplier_id?: string | null
          unit_price?: number
          updated_at?: string | null
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
            foreignKeyName: "purchase_orders_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
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
      receipts: {
        Row: {
          appointment_cost: number | null
          appointment_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          medication_cost: number | null
          receipt_text: string
          sale_id: string | null
          total_cost: number | null
        }
        Insert: {
          appointment_cost?: number | null
          appointment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          medication_cost?: number | null
          receipt_text: string
          sale_id?: string | null
          total_cost?: number | null
        }
        Update: {
          appointment_cost?: number | null
          appointment_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          medication_cost?: number | null
          receipt_text?: string
          sale_id?: string | null
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
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
      sales: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          medication_id: string | null
          patient_id: string | null
          prescription_id: string | null
          quantity: number
          sale_date: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          medication_id?: string | null
          patient_id?: string | null
          prescription_id?: string | null
          quantity: number
          sale_date?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          medication_id?: string | null
          patient_id?: string | null
          prescription_id?: string | null
          quantity?: number
          sale_date?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "sales_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
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
          updated_at?: string | null
        }
        Relationships: []
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
            foreignKeyName: "stock_transactions_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
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
        Relationships: [
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      patient_summary: {
        Row: {
          date_of_birth: string | null
          full_name: string | null
          id: string | null
          medical_record_count: number | null
          phone_number: string | null
          prescription_count: number | null
          purchase_count: number | null
          user_id: string | null
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
      get_auth_users_by_email: {
        Args: { email_input: string };
        Returns: { id: string; email: string }[];
      };
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
      get_top_selling_medications: {
        Args: Record<PropertyKey, never>
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
    }
    Enums: {
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
      stock_transaction_type: ["restock", "deduction", "adjustment"],
    },
  },
} as const
