/**
 * Supabase generated types — dashboard-owned copy.
 *
 * PENDING REGENERATION: this file was hand-authored from the committed
 * migrations in `supabase/migrations/` (accurate as of `feature/dashboard`'s
 * base) because no local Supabase stack was running when this app was
 * scaffolded. It must be regenerated for real before this app is trusted as
 * a source of truth:
 *
 *   npx supabase gen types typescript --local --schema public \
 *     > apps/bank-simulator-dashboard/src/server/supabase/database.types.ts
 *
 * Once regenerated, treat it exactly like `apps/mobile/src/core/supabase/database.types.ts`:
 * never hand-edit (AI_AGENT_RULES §16), excluded from lint/format (see
 * eslint.config.mjs / .prettierignore), regenerated + re-committed with every
 * schema change. This is a separate file from mobile's (not imported
 * cross-app — apps never import each other).
 *
 * Only the tables this dashboard reads/writes are included. `demo_*` tables
 * (Phase 4) are added here when their migrations land.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string
          locale: string
          data_mode: string
          created_at: string
          updated_at: string
          full_name: string | null
          phone_number: string | null
          primary_bank: string | null
          reminder_day_of_month: number | null
          user_threshold_amount: number | null
        }
        Insert: {
          user_id: string
          locale: string
          data_mode: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          phone_number?: string | null
          primary_bank?: string | null
          reminder_day_of_month?: number | null
          user_threshold_amount?: number | null
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      obligations: {
        Row: {
          id: string
          user_id: string
          kind: string
          nickname: string
          institution_name: string
          institution_id: string | null
          currency: string
          opened_date: string
          closed_date: string | null
          notes: string | null
          provenance_json: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          kind: string
          nickname: string
          institution_name: string
          institution_id?: string | null
          currency?: string
          opened_date: string
          closed_date?: string | null
          notes?: string | null
          provenance_json: Json
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['obligations']['Insert']>
        Relationships: []
      }
      loan_details: {
        Row: {
          obligation_id: string
          user_id: string
          original_principal: number
          original_principal_prov: Json
          outstanding_balance: number | null
          outstanding_balance_prov: Json | null
          installment: number
          installment_prov: Json
          rate_type: string
          term_months: number
          term_months_prov: Json
          start_date: string
          maturity_date: string
          first_payment_date: string | null
          payment_frequency: string
          purpose: string | null
          contractual_balloon: number | null
          contractual_balloon_prov: Json | null
        }
        Insert: Database['public']['Tables']['loan_details']['Row']
        Update: Partial<Database['public']['Tables']['loan_details']['Row']>
        Relationships: []
      }
      murabaha_details: {
        Row: {
          obligation_id: string
          user_id: string
          asset_cost: number
          asset_cost_prov: Json
          disclosed_profit: number
          disclosed_profit_prov: Json
          total_sale_price: number
          total_sale_price_prov: Json
          installment: number
          installment_prov: Json
          term_months: number
          term_months_prov: Json
          start_date: string
          profit_rate_disclosed: number | null
        }
        Insert: Database['public']['Tables']['murabaha_details']['Row']
        Update: Partial<Database['public']['Tables']['murabaha_details']['Row']>
        Relationships: []
      }
      card_details: {
        Row: {
          obligation_id: string
          user_id: string
          credit_limit: number
          credit_limit_prov: Json
          current_balance: number
          current_balance_prov: Json
          statement_balance: number | null
          statement_balance_prov: Json | null
          statement_date: string | null
          minimum_payment_rule_json: Json | null
          purchase_apr: number | null
          purchase_apr_prov: Json | null
          cash_advance_apr: number | null
          cash_advance_apr_prov: Json | null
          due_date: string | null
          grace_days: number | null
          fees_json: Json | null
        }
        Insert: Database['public']['Tables']['card_details']['Row']
        Update: Partial<Database['public']['Tables']['card_details']['Row']>
        Relationships: []
      }
      rate_periods: {
        Row: {
          id: string
          obligation_id: string
          user_id: string
          annual_rate: number
          effective_from: string
          superseded_by: string | null
          provenance_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          obligation_id: string
          user_id: string
          annual_rate: number
          effective_from: string
          superseded_by?: string | null
          provenance_json: Json
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['rate_periods']['Insert']>
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          obligation_id: string
          user_id: string
          paid_on: string
          amount: number
          alloc_principal: number | null
          alloc_cost: number | null
          alloc_source: string | null
          period_ref: string | null
          provenance_json: Json
          created_at: string
        }
        Insert: {
          id?: string
          obligation_id: string
          user_id: string
          paid_on: string
          amount: number
          alloc_principal?: number | null
          alloc_cost?: number | null
          alloc_source?: string | null
          period_ref?: string | null
          provenance_json: Json
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
        Relationships: []
      }
      calculation_runs: {
        Row: {
          id: string
          user_id: string
          obligation_id: string | null
          formula_id: string
          formula_version: number
          as_of: string
          inputs_json: Json
          inputs_hash: string
          outcome_kind: string
          confidence: string | null
          result_json: Json | null
          missing_fields_json: Json | null
          partial_json: Json | null
          assumptions_json: Json
          calculated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          obligation_id?: string | null
          formula_id: string
          formula_version: number
          as_of: string
          inputs_json: Json
          inputs_hash: string
          outcome_kind: string
          confidence?: string | null
          result_json?: Json | null
          missing_fields_json?: Json | null
          partial_json?: Json | null
          assumptions_json: Json
          calculated_at: string
        }
        Update: Partial<Database['public']['Tables']['calculation_runs']['Insert']>
        Relationships: []
      }
      insights: {
        Row: {
          id: string
          user_id: string
          obligation_id: string | null
          rule_id: string
          severity: string
          title_key: string
          body_key: string
          params_json: Json | null
          trigger_hash: string
          deep_link: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          obligation_id?: string | null
          rule_id: string
          severity: string
          title_key: string
          body_key: string
          params_json?: Json | null
          trigger_hash: string
          deep_link?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['insights']['Insert']>
        Relationships: []
      }
      consent_records: {
        Row: {
          id: string
          user_id: string
          doc_type: string
          version: string
          locale: string
          acknowledged_at: string
        }
        Insert: {
          id?: string
          user_id: string
          doc_type: string
          version: string
          locale: string
          acknowledged_at: string
        }
        Update: Partial<Database['public']['Tables']['consent_records']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
