export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: "owner" | "admin" | "member";
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: "owner" | "admin" | "member";
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: "owner" | "admin" | "member";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      referral_config: {
        Row: {
          id: string;
          credits_per_referral: number;
          credits_for_referred: number;
          max_referrals_per_user: number | null;
          is_active: boolean;
          require_subscription: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          credits_per_referral?: number;
          credits_for_referred?: number;
          max_referrals_per_user?: number | null;
          is_active?: boolean;
          require_subscription?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          credits_per_referral?: number;
          credits_for_referred?: number;
          max_referrals_per_user?: number | null;
          is_active?: boolean;
          require_subscription?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      referral_codes: {
        Row: {
          id: string;
          user_id: string;
          code: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          code: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          code?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          referral_code_id: string;
          status: "pending" | "completed" | "expired" | "cancelled";
          credits_awarded_referrer: number;
          credits_awarded_referred: number;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_id: string;
          referral_code_id: string;
          status?: "pending" | "completed" | "expired" | "cancelled";
          credits_awarded_referrer?: number;
          credits_awarded_referred?: number;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          referrer_id?: string;
          referred_id?: string;
          referral_code_id?: string;
          status?: "pending" | "completed" | "expired" | "cancelled";
          credits_awarded_referrer?: number;
          credits_awarded_referred?: number;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "referrals_referrer_id_fkey";
            columns: ["referrer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referrals_referred_id_fkey";
            columns: ["referred_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referrals_referral_code_id_fkey";
            columns: ["referral_code_id"];
            isOneToOne: false;
            referencedRelation: "referral_codes";
            referencedColumns: ["id"];
          }
        ];
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          type: "referral_bonus" | "referred_bonus" | "purchase" | "usage" | "adjustment" | "expiry";
          description: string | null;
          referral_id: string | null;
          stripe_payment_intent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          type: "referral_bonus" | "referred_bonus" | "purchase" | "usage" | "adjustment" | "expiry";
          description?: string | null;
          referral_id?: string | null;
          stripe_payment_intent_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          type?: "referral_bonus" | "referred_bonus" | "purchase" | "usage" | "adjustment" | "expiry";
          description?: string | null;
          referral_id?: string | null;
          stripe_payment_intent_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_transactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "credit_transactions_referral_id_fkey";
            columns: ["referral_id"];
            isOneToOne: false;
            referencedRelation: "referrals";
            referencedColumns: ["id"];
          }
        ];
      };
      user_credits: {
        Row: {
          user_id: string;
          balance: number;
          total_earned: number;
          total_spent: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          balance?: number;
          total_earned?: number;
          total_spent?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          balance?: number;
          total_earned?: number;
          total_spent?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_credits_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string | null;
          organization_id: string | null;
          stripe_customer_id: string;
          stripe_price_id: string;
          status:
            | "active"
            | "canceled"
            | "incomplete"
            | "incomplete_expired"
            | "past_due"
            | "trialing"
            | "unpaid"
            | "paused";
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id?: string | null;
          organization_id?: string | null;
          stripe_customer_id: string;
          stripe_price_id: string;
          status:
            | "active"
            | "canceled"
            | "incomplete"
            | "incomplete_expired"
            | "past_due"
            | "trialing"
            | "unpaid"
            | "paused";
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          organization_id?: string | null;
          stripe_customer_id?: string;
          stripe_price_id?: string;
          status?:
            | "active"
            | "canceled"
            | "incomplete"
            | "incomplete_expired"
            | "past_due"
            | "trialing"
            | "unpaid"
            | "paused";
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
