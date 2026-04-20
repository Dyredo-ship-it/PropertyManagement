// Minimal hand-written types for the Supabase schema.
// Can be replaced by `supabase gen types typescript` once CLI is set up.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: { id: string; name: string; plan: "starter" | "pro" | "business"; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; plan?: "starter" | "pro" | "business" };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string | null;
          email: string;
          full_name: string | null;
          role: "admin" | "tenant";
          tenant_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id?: string | null;
          email: string;
          full_name?: string | null;
          role?: "admin" | "tenant";
          tenant_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      subscriptions: {
        Row: {
          id: string;
          organization_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: "starter" | "pro" | "business";
          status: string;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: "starter" | "pro" | "business";
          status?: string;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
      };
      buildings: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          address: string;
          units: number;
          occupied_units: number;
          monthly_revenue: number;
          image_url: string | null;
          currency: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["buildings"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["buildings"]["Insert"]>;
      };
      tenants: {
        Row: {
          id: string;
          organization_id: string;
          building_id: string | null;
          building_name: string | null;
          user_id: string | null;
          name: string;
          email: string;
          phone: string | null;
          unit: string | null;
          rent_net: number;
          charges: number;
          lease_start: string | null;
          lease_end: string | null;
          status: "active" | "pending" | "ended";
          gender: "male" | "female" | "unspecified";
          payment_status: "up-to-date" | "late" | "very-late" | null;
          late_payment_months: number | null;
          last_payment_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tenants"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
      };
      maintenance_requests: {
        Row: {
          id: string;
          organization_id: string;
          building_id: string | null;
          building_name: string | null;
          tenant_id: string | null;
          tenant_name: string | null;
          unit: string | null;
          title: string;
          description: string | null;
          status: "pending" | "in-progress" | "completed";
          priority: "low" | "medium" | "high" | "urgent";
          category: string | null;
          request_type: "technical" | "administrative" | "rental" | null;
          date_observed: string | null;
          photos: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["maintenance_requests"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["maintenance_requests"]["Insert"]>;
      };
      rental_applications: {
        Row: {
          id: string;
          organization_id: string;
          building_id: string | null;
          building_name: string | null;
          desired_unit: string | null;
          applicant_name: string;
          applicant_email: string;
          applicant_phone: string | null;
          current_address: string | null;
          desired_move_in: string | null;
          monthly_income: number | null;
          household_size: number | null;
          occupation: string | null;
          employer: string | null;
          message: string | null;
          status: "received" | "under-review" | "accepted" | "rejected";
          documents: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["rental_applications"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["rental_applications"]["Insert"]>;
      };
      notifications: {
        Row: {
          id: string;
          organization_id: string;
          building_id: string | null;
          recipient_id: string | null;
          title: string;
          message: string | null;
          category: "general" | "maintenance" | "payment" | "inspection" | "urgent";
          read: boolean;
          date: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };
      calendar_events: {
        Row: {
          id: string;
          organization_id: string;
          building_id: string | null;
          title: string;
          date: string;
          start_time: string | null;
          end_time: string | null;
          type: "visit" | "inspection" | "signing" | "meeting" | "other";
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["calendar_events"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["calendar_events"]["Insert"]>;
      };
      accounting_transactions: {
        Row: {
          id: string;
          organization_id: string;
          building_id: string;
          date_invoice: string;
          date_payment: string | null;
          unit: string | null;
          description: string | null;
          category: string | null;
          sub_category: string | null;
          account_number: number | null;
          debit: number;
          credit: number;
          status: string | null;
          tenant_name: string | null;
          month: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["accounting_transactions"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["accounting_transactions"]["Insert"]>;
      };
      manual_adjustments: {
        Row: {
          id: string;
          organization_id: string;
          building_id: string;
          account_number: number;
          label: string;
          amount: number;
          type: "debit" | "credit";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["manual_adjustments"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["manual_adjustments"]["Insert"]>;
      };
      accounting_settings: {
        Row: {
          id: string;
          organization_id: string;
          building_id: string;
          units: Json;
          categories: Json;
          sub_categories: Json;
          unit_assignments: Json;
          unit_types: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["accounting_settings"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["accounting_settings"]["Insert"]>;
      };
      renovations: {
        Row: {
          id: string;
          organization_id: string;
          building_id: string;
          unit: string | null;
          category: string | null;
          item: string | null;
          amortization_years: number;
          date_completed: string | null;
          cost: number;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["renovations"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["renovations"]["Insert"]>;
      };
      tenant_notes: {
        Row: {
          id: string;
          organization_id: string;
          tenant_id: string;
          text: string;
          date: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tenant_notes"]["Row"], "id"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["tenant_notes"]["Insert"]>;
      };
      tenant_documents: {
        Row: {
          id: string;
          organization_id: string;
          tenant_id: string;
          type: string;
          file_name: string;
          file_size: number | null;
          mime_type: string | null;
          storage_path: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tenant_documents"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["tenant_documents"]["Insert"]>;
      };
      tenant_absences: {
        Row: {
          id: string;
          organization_id: string;
          tenant_id: string;
          start_date: string;
          end_date: string;
          comment: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tenant_absences"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["tenant_absences"]["Insert"]>;
      };
      building_actions: {
        Row: {
          id: string;
          organization_id: string;
          building_id: string;
          title: string;
          description: string | null;
          priority: "low" | "medium" | "high";
          status: "open" | "done";
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["building_actions"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["building_actions"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
