export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_code: string
          center_id: string
          created_at: string
          crop: string
          farmer_id: string
          id: string
          notes: string | null
          quantity_kg: number
          recorded_weight_kg: number | null
          slot_id: string
          status: Database["public"]["Enums"]["booking_status"]
          token_number: number
          updated_at: string
        }
        Insert: {
          booking_code: string
          center_id: string
          created_at?: string
          crop: string
          farmer_id: string
          id?: string
          notes?: string | null
          quantity_kg: number
          recorded_weight_kg?: number | null
          slot_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          token_number?: number
          updated_at?: string
        }
        Update: {
          booking_code?: string
          center_id?: string
          created_at?: string
          crop?: string
          farmer_id?: string
          id?: string
          notes?: string | null
          quantity_kg?: number
          recorded_weight_kg?: number | null
          slot_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          token_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
        ]
      }
      centers: {
        Row: {
          address: string
          avg_minutes_per_farmer: number
          closes_at: string
          code: string
          created_at: string
          crops: string[]
          district: string
          id: string
          is_active: boolean
          name: string
          opens_at: string
          slot_capacity: number
          slot_minutes: number
        }
        Insert: {
          address?: string
          avg_minutes_per_farmer?: number
          closes_at?: string
          code: string
          created_at?: string
          crops?: string[]
          district: string
          id?: string
          is_active?: boolean
          name: string
          opens_at?: string
          slot_capacity?: number
          slot_minutes?: number
        }
        Update: {
          address?: string
          avg_minutes_per_farmer?: number
          closes_at?: string
          code?: string
          created_at?: string
          crops?: string[]
          district?: string
          id?: string
          is_active?: boolean
          name?: string
          opens_at?: string
          slot_capacity?: number
          slot_minutes?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          district: string
          full_name: string
          id: string
          phone: string
          updated_at: string
          village: string
        }
        Insert: {
          created_at?: string
          district?: string
          full_name?: string
          id: string
          phone?: string
          updated_at?: string
          village?: string
        }
        Update: {
          created_at?: string
          district?: string
          full_name?: string
          id?: string
          phone?: string
          updated_at?: string
          village?: string
        }
        Relationships: []
      }
      slots: {
        Row: {
          booked_count: number
          capacity: number
          center_id: string
          end_time: string
          id: string
          slot_date: string
          start_time: string
        }
        Insert: {
          booked_count?: number
          capacity?: number
          center_id: string
          end_time: string
          id?: string
          slot_date: string
          start_time: string
        }
        Update: {
          booked_count?: number
          capacity?: number
          center_id?: string
          end_time?: string
          id?: string
          slot_date?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "slots_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_slot: {
        Args: { _crop: string; _quantity_kg: number; _slot_id: string }
        Returns: {
          booking_code: string
          center_id: string
          created_at: string
          crop: string
          farmer_id: string
          id: string
          notes: string | null
          quantity_kg: number
          recorded_weight_kg: number | null
          slot_id: string
          status: Database["public"]["Enums"]["booking_status"]
          token_number: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_booking: { Args: { _booking_id: string }; Returns: undefined }
      list_slots: {
        Args: { _center_id: string; _date: string }
        Returns: {
          booked_count: number
          capacity: number
          center_id: string
          end_time: string
          id: string
          slot_date: string
          start_time: string
        }[]
        SetofOptions: {
          from: "*"
          to: "slots"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      queue_info: {
        Args: { _booking_id: string }
        Returns: {
          ahead: number
          est_minutes: number
        }[]
      }
    }
    Enums: {
      app_role: "farmer" | "staff" | "admin"
      booking_status:
        | "booked"
        | "verified"
        | "in_queue"
        | "weighing"
        | "completed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["farmer", "staff", "admin"],
      booking_status: [
        "booked",
        "verified",
        "in_queue",
        "weighing",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
