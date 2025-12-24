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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agent_collections: {
        Row: {
          agent_id: number
          booking_id: number
          created_at: string
          due_amount: number
          id: number
          paid_amount: number
          paid_on: string | null
          status: Database["public"]["Enums"]["collection_status"]
        }
        Insert: {
          agent_id: number
          booking_id: number
          created_at?: string
          due_amount: number
          id?: number
          paid_amount?: number
          paid_on?: string | null
          status?: Database["public"]["Enums"]["collection_status"]
        }
        Update: {
          agent_id?: number
          booking_id?: number
          created_at?: string
          due_amount?: number
          id?: number
          paid_amount?: number
          paid_on?: string | null
          status?: Database["public"]["Enums"]["collection_status"]
        }
        Relationships: [
          {
            foreignKeyName: "agent_collections_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_collections_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          active: boolean
          agent_name: string
          created_at: string
          id: number
        }
        Insert: {
          active?: boolean
          agent_name: string
          created_at?: string
          id?: number
        }
        Update: {
          active?: boolean
          agent_name?: string
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      booking_items: {
        Row: {
          age: number | null
          amount: number
          booking_id: number
          created_at: string
          customer_name: string | null
          description: string | null
          destination: string | null
          id: number
          phone: string | null
          qty: number
          seat_no: string | null
          surcharges: number | null
        }
        Insert: {
          age?: number | null
          amount: number
          booking_id: number
          created_at?: string
          customer_name?: string | null
          description?: string | null
          destination?: string | null
          id?: number
          phone?: string | null
          qty?: number
          seat_no?: string | null
          surcharges?: number | null
        }
        Update: {
          age?: number | null
          amount?: number
          booking_id?: number
          created_at?: string
          customer_name?: string | null
          description?: string | null
          destination?: string | null
          id?: number
          phone?: string | null
          qty?: number
          seat_no?: string | null
          surcharges?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          agent_id: number | null
          booking_date: string
          bus_id: number
          created_at: string
          created_by: string
          id: number
          route_id: number
          type: Database["public"]["Enums"]["booking_type"]
        }
        Insert: {
          agent_id?: number | null
          booking_date: string
          bus_id: number
          created_at?: string
          created_by: string
          id?: number
          route_id: number
          type: Database["public"]["Enums"]["booking_type"]
        }
        Update: {
          agent_id?: number | null
          booking_date?: string
          bus_id?: number
          created_at?: string
          created_by?: string
          id?: number
          route_id?: number
          type?: Database["public"]["Enums"]["booking_type"]
        }
        Relationships: [
          {
            foreignKeyName: "bookings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      buses: {
        Row: {
          active: boolean
          bus_no: string
          bus_type: Database["public"]["Enums"]["bus_type"]
          created_at: string
          id: number
          owner_name: string
        }
        Insert: {
          active?: boolean
          bus_no: string
          bus_type?: Database["public"]["Enums"]["bus_type"]
          created_at?: string
          id?: number
          owner_name: string
        }
        Update: {
          active?: boolean
          bus_no?: string
          bus_type?: Database["public"]["Enums"]["bus_type"]
          created_at?: string
          id?: number
          owner_name?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address_line: string | null
          company_name: string
          footer_note: string | null
          id: string
          logo_url: string | null
          phone_numbers: string | null
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          company_name?: string
          footer_note?: string | null
          id?: string
          logo_url?: string | null
          phone_numbers?: string | null
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          company_name?: string
          footer_note?: string | null
          id?: string
          logo_url?: string | null
          phone_numbers?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      destinations: {
        Row: {
          active: boolean
          city_name: string
          created_at: string
          id: number
        }
        Insert: {
          active?: boolean
          city_name: string
          created_at?: string
          id?: number
        }
        Update: {
          active?: boolean
          city_name?: string
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      manual_tickets: {
        Row: {
          address: string | null
          amount: number
          booking_date_time: string
          branch: string | null
          bus_no: string | null
          collection_status: string
          created_at: string
          dep_time: string | null
          id: string
          journey_date: string
          no_of_tourist: number
          notes: string | null
          passenger_name: string
          passenger_phone: string
          pnr_no: string | null
          rep_time: string | null
          seat_no: string | null
          ticket_no: string
          tours_to: string
          with_family_friends: string | null
        }
        Insert: {
          address?: string | null
          amount?: number
          booking_date_time?: string
          branch?: string | null
          bus_no?: string | null
          collection_status?: string
          created_at?: string
          dep_time?: string | null
          id?: string
          journey_date: string
          no_of_tourist?: number
          notes?: string | null
          passenger_name: string
          passenger_phone: string
          pnr_no?: string | null
          rep_time?: string | null
          seat_no?: string | null
          ticket_no: string
          tours_to: string
          with_family_friends?: string | null
        }
        Update: {
          address?: string | null
          amount?: number
          booking_date_time?: string
          branch?: string | null
          bus_no?: string | null
          collection_status?: string
          created_at?: string
          dep_time?: string | null
          id?: string
          journey_date?: string
          no_of_tourist?: number
          notes?: string | null
          passenger_name?: string
          passenger_phone?: string
          pnr_no?: string | null
          rep_time?: string | null
          seat_no?: string | null
          ticket_no?: string
          tours_to?: string
          with_family_friends?: string | null
        }
        Relationships: []
      }
      owner_memos: {
        Row: {
          agent_commission: number
          bus_id: number
          created_at: string
          created_by: string
          id: number
          memo_date: string
          our_profit: number
          owner_payable: number
          remarks: string | null
          route_id: number
          status: Database["public"]["Enums"]["memo_status"]
          total_booking: number
        }
        Insert: {
          agent_commission: number
          bus_id: number
          created_at?: string
          created_by: string
          id?: number
          memo_date: string
          our_profit: number
          owner_payable: number
          remarks?: string | null
          route_id: number
          status?: Database["public"]["Enums"]["memo_status"]
          total_booking: number
        }
        Update: {
          agent_commission?: number
          bus_id?: number
          created_at?: string
          created_by?: string
          id?: number
          memo_date?: string
          our_profit?: number
          owner_payable?: number
          remarks?: string | null
          route_id?: number
          status?: Database["public"]["Enums"]["memo_status"]
          total_booking?: number
        }
        Relationships: [
          {
            foreignKeyName: "owner_memos_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_memos_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      receiver_names: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      route_buses: {
        Row: {
          active: boolean
          bus_id: number
          created_at: string
          id: number
          route_id: number
        }
        Insert: {
          active?: boolean
          bus_id: number
          created_at?: string
          id?: number
          route_id: number
        }
        Update: {
          active?: boolean
          bus_id?: number
          created_at?: string
          id?: number
          route_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "route_buses_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_buses_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          active: boolean
          created_at: string
          from_city: string | null
          id: number
          route_name: string
          to_city: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          from_city?: string | null
          id?: number
          route_name: string
          to_city?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          from_city?: string | null
          id?: number
          route_name?: string
          to_city?: string | null
        }
        Relationships: []
      }
      ticket_payments: {
        Row: {
          created_at: string
          id: string
          paid_amount: number
          paid_at: string
          payment_mode: string
          received_by_name: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          paid_amount: number
          paid_at?: string
          payment_mode?: string
          received_by_name: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          paid_amount?: number
          paid_at?: string
          payment_mode?: string
          received_by_name?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_payments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "manual_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      create_system_user: {
        Args: {
          p_full_name: string
          p_password: string
          p_role: Database["public"]["Enums"]["app_role"]
          p_username: string
        }
        Returns: Json
      }
      generate_ticket_no: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "ADMIN" | "STAFF" | "VIEWER"
      booking_type:
        | "AGENT"
        | "ONLINE"
        | "LUGGAGE"
        | "SELF"
        | "COUNTER"
        | "CUSTOMER"
      bus_type: "SLEEPER" | "SEATING_SLEEPER"
      collection_status: "PENDING" | "PAID"
      memo_status: "PENDING" | "PAID"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["ADMIN", "STAFF", "VIEWER"],
      booking_type: [
        "AGENT",
        "ONLINE",
        "LUGGAGE",
        "SELF",
        "COUNTER",
        "CUSTOMER",
      ],
      bus_type: ["SLEEPER", "SEATING_SLEEPER"],
      collection_status: ["PENDING", "PAID"],
      memo_status: ["PENDING", "PAID"],
    },
  },
} as const
