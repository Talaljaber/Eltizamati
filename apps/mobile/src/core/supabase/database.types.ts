export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      calculation_runs: {
        Row: {
          as_of: string
          assumptions_json: Json
          calculated_at: string
          confidence: string | null
          formula_id: string
          formula_version: number
          id: string
          inputs_hash: string
          inputs_json: Json
          missing_fields_json: Json | null
          obligation_id: string | null
          outcome_kind: string
          partial_json: Json | null
          result_json: Json | null
          user_id: string
        }
        Insert: {
          as_of: string
          assumptions_json: Json
          calculated_at: string
          confidence?: string | null
          formula_id: string
          formula_version: number
          id?: string
          inputs_hash: string
          inputs_json: Json
          missing_fields_json?: Json | null
          obligation_id?: string | null
          outcome_kind: string
          partial_json?: Json | null
          result_json?: Json | null
          user_id: string
        }
        Update: {
          as_of?: string
          assumptions_json?: Json
          calculated_at?: string
          confidence?: string | null
          formula_id?: string
          formula_version?: number
          id?: string
          inputs_hash?: string
          inputs_json?: Json
          missing_fields_json?: Json | null
          obligation_id?: string | null
          outcome_kind?: string
          partial_json?: Json | null
          result_json?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'calculation_runs_obligation_owner_fkey'
            columns: ['obligation_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'obligations'
            referencedColumns: ['id', 'user_id']
          },
        ]
      }
      card_details: {
        Row: {
          cash_advance_apr: number | null
          cash_advance_apr_prov: Json | null
          credit_limit: number
          credit_limit_prov: Json
          current_balance: number
          current_balance_prov: Json
          due_date: string | null
          fees_json: Json | null
          grace_days: number | null
          minimum_payment_rule_json: Json | null
          obligation_id: string
          purchase_apr: number | null
          purchase_apr_prov: Json | null
          statement_balance: number | null
          statement_balance_prov: Json | null
          statement_date: string | null
          user_id: string
        }
        Insert: {
          cash_advance_apr?: number | null
          cash_advance_apr_prov?: Json | null
          credit_limit: number
          credit_limit_prov: Json
          current_balance: number
          current_balance_prov: Json
          due_date?: string | null
          fees_json?: Json | null
          grace_days?: number | null
          minimum_payment_rule_json?: Json | null
          obligation_id: string
          purchase_apr?: number | null
          purchase_apr_prov?: Json | null
          statement_balance?: number | null
          statement_balance_prov?: Json | null
          statement_date?: string | null
          user_id: string
        }
        Update: {
          cash_advance_apr?: number | null
          cash_advance_apr_prov?: Json | null
          credit_limit?: number
          credit_limit_prov?: Json
          current_balance?: number
          current_balance_prov?: Json
          due_date?: string | null
          fees_json?: Json | null
          grace_days?: number | null
          minimum_payment_rule_json?: Json | null
          obligation_id?: string
          purchase_apr?: number | null
          purchase_apr_prov?: Json | null
          statement_balance?: number | null
          statement_balance_prov?: Json | null
          statement_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'card_details_obligation_owner_fkey'
            columns: ['obligation_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'obligations'
            referencedColumns: ['id', 'user_id']
          },
        ]
      }
      consent_records: {
        Row: {
          acknowledged_at: string
          doc_type: string
          id: string
          locale: string
          user_id: string
          version: string
        }
        Insert: {
          acknowledged_at: string
          doc_type: string
          id?: string
          locale: string
          user_id: string
          version: string
        }
        Update: {
          acknowledged_at?: string
          doc_type?: string
          id?: string
          locale?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      insights: {
        Row: {
          body_key: string
          created_at: string
          deep_link: string | null
          id: string
          obligation_id: string | null
          params_json: Json | null
          read_at: string | null
          rule_id: string
          severity: string
          title_key: string
          trigger_hash: string
          user_id: string
        }
        Insert: {
          body_key: string
          created_at?: string
          deep_link?: string | null
          id?: string
          obligation_id?: string | null
          params_json?: Json | null
          read_at?: string | null
          rule_id: string
          severity: string
          title_key: string
          trigger_hash: string
          user_id: string
        }
        Update: {
          body_key?: string
          created_at?: string
          deep_link?: string | null
          id?: string
          obligation_id?: string | null
          params_json?: Json | null
          read_at?: string | null
          rule_id?: string
          severity?: string
          title_key?: string
          trigger_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'insights_obligation_owner_fkey'
            columns: ['obligation_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'obligations'
            referencedColumns: ['id', 'user_id']
          },
        ]
      }
      loan_applications: {
        Row: {
          applicant_note: string | null
          approved_amount: number | null
          approved_annual_rate: number | null
          approved_term_months: number | null
          created_at: string
          decided_at: string | null
          decision_reason: string | null
          id: string
          institution_name: string
          purpose: string
          requested_amount: number
          requested_term_months: number
          resulting_obligation_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applicant_note?: string | null
          approved_amount?: number | null
          approved_annual_rate?: number | null
          approved_term_months?: number | null
          created_at?: string
          decided_at?: string | null
          decision_reason?: string | null
          id?: string
          institution_name: string
          purpose: string
          requested_amount: number
          requested_term_months: number
          resulting_obligation_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applicant_note?: string | null
          approved_amount?: number | null
          approved_annual_rate?: number | null
          approved_term_months?: number | null
          created_at?: string
          decided_at?: string | null
          decision_reason?: string | null
          id?: string
          institution_name?: string
          purpose?: string
          requested_amount?: number
          requested_term_months?: number
          resulting_obligation_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loan_schedule_proposals: {
        Row: {
          as_of: string
          created_at: string
          currency: string
          decided_at: string | null
          decision_reason: string | null
          final_balloon: number
          id: string
          obligation_id: string
          projected_remaining_payable: number
          proposal_kind: string
          proposed_installment: number
          rate_history_snapshot: Json
          schedule_snapshot: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          as_of: string
          created_at?: string
          currency: string
          decided_at?: string | null
          decision_reason?: string | null
          final_balloon?: number
          id?: string
          obligation_id: string
          projected_remaining_payable: number
          proposal_kind: string
          proposed_installment: number
          rate_history_snapshot: Json
          schedule_snapshot: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          as_of?: string
          created_at?: string
          currency?: string
          decided_at?: string | null
          decision_reason?: string | null
          final_balloon?: number
          id?: string
          obligation_id?: string
          projected_remaining_payable?: number
          proposal_kind?: string
          proposed_installment?: number
          rate_history_snapshot?: Json
          schedule_snapshot?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loan_details: {
        Row: {
          contractual_balloon: number | null
          contractual_balloon_prov: Json | null
          first_payment_date: string | null
          installment: number
          installment_prov: Json
          maturity_date: string
          obligation_id: string
          original_principal: number
          original_principal_prov: Json
          outstanding_balance: number | null
          outstanding_balance_prov: Json | null
          payment_frequency: string
          purpose: string | null
          rate_type: string
          start_date: string
          term_months: number
          term_months_prov: Json
          user_id: string
        }
        Insert: {
          contractual_balloon?: number | null
          contractual_balloon_prov?: Json | null
          first_payment_date?: string | null
          installment: number
          installment_prov: Json
          maturity_date: string
          obligation_id: string
          original_principal: number
          original_principal_prov: Json
          outstanding_balance?: number | null
          outstanding_balance_prov?: Json | null
          payment_frequency?: string
          purpose?: string | null
          rate_type: string
          start_date: string
          term_months: number
          term_months_prov: Json
          user_id: string
        }
        Update: {
          contractual_balloon?: number | null
          contractual_balloon_prov?: Json | null
          first_payment_date?: string | null
          installment?: number
          installment_prov?: Json
          maturity_date?: string
          obligation_id?: string
          original_principal?: number
          original_principal_prov?: Json
          outstanding_balance?: number | null
          outstanding_balance_prov?: Json | null
          payment_frequency?: string
          purpose?: string | null
          rate_type?: string
          start_date?: string
          term_months?: number
          term_months_prov?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'loan_details_obligation_owner_fkey'
            columns: ['obligation_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'obligations'
            referencedColumns: ['id', 'user_id']
          },
        ]
      }
      murabaha_details: {
        Row: {
          asset_cost: number
          asset_cost_prov: Json
          disclosed_profit: number
          disclosed_profit_prov: Json
          installment: number
          installment_prov: Json
          obligation_id: string
          profit_rate_disclosed: number | null
          start_date: string
          term_months: number
          term_months_prov: Json
          total_sale_price: number
          total_sale_price_prov: Json
          user_id: string
        }
        Insert: {
          asset_cost: number
          asset_cost_prov: Json
          disclosed_profit: number
          disclosed_profit_prov: Json
          installment: number
          installment_prov: Json
          obligation_id: string
          profit_rate_disclosed?: number | null
          start_date: string
          term_months: number
          term_months_prov: Json
          total_sale_price: number
          total_sale_price_prov: Json
          user_id: string
        }
        Update: {
          asset_cost?: number
          asset_cost_prov?: Json
          disclosed_profit?: number
          disclosed_profit_prov?: Json
          installment?: number
          installment_prov?: Json
          obligation_id?: string
          profit_rate_disclosed?: number | null
          start_date?: string
          term_months?: number
          term_months_prov?: Json
          total_sale_price?: number
          total_sale_price_prov?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'murabaha_details_obligation_owner_fkey'
            columns: ['obligation_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'obligations'
            referencedColumns: ['id', 'user_id']
          },
        ]
      }
      obligations: {
        Row: {
          closed_date: string | null
          created_at: string
          currency: string
          id: string
          institution_id: string | null
          institution_name: string
          kind: string
          nickname: string
          notes: string | null
          opened_date: string
          provenance_json: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_date?: string | null
          created_at?: string
          currency?: string
          id?: string
          institution_id?: string | null
          institution_name: string
          kind: string
          nickname: string
          notes?: string | null
          opened_date: string
          provenance_json: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_date?: string | null
          created_at?: string
          currency?: string
          id?: string
          institution_id?: string | null
          institution_name?: string
          kind?: string
          nickname?: string
          notes?: string | null
          opened_date?: string
          provenance_json?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          alloc_cost: number | null
          alloc_principal: number | null
          alloc_source: string | null
          amount: number
          created_at: string
          id: string
          obligation_id: string
          paid_on: string
          period_ref: string | null
          provenance_json: Json
          user_id: string
        }
        Insert: {
          alloc_cost?: number | null
          alloc_principal?: number | null
          alloc_source?: string | null
          amount: number
          created_at?: string
          id?: string
          obligation_id: string
          paid_on: string
          period_ref?: string | null
          provenance_json: Json
          user_id: string
        }
        Update: {
          alloc_cost?: number | null
          alloc_principal?: number | null
          alloc_source?: string | null
          amount?: number
          created_at?: string
          id?: string
          obligation_id?: string
          paid_on?: string
          period_ref?: string | null
          provenance_json?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payments_obligation_owner_fkey'
            columns: ['obligation_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'obligations'
            referencedColumns: ['id', 'user_id']
          },
          {
            foreignKeyName: 'payments_period_ref_fkey'
            columns: ['period_ref']
            isOneToOne: false
            referencedRelation: 'rate_periods'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          data_mode: string
          full_name: string | null
          locale: string
          phone_number: string | null
          primary_bank: string | null
          reminder_day_of_month: number | null
          updated_at: string
          user_id: string
          user_threshold_amount: number | null
        }
        Insert: {
          created_at?: string
          data_mode: string
          full_name?: string | null
          locale: string
          phone_number?: string | null
          primary_bank?: string | null
          reminder_day_of_month?: number | null
          updated_at?: string
          user_id: string
          user_threshold_amount?: number | null
        }
        Update: {
          created_at?: string
          data_mode?: string
          full_name?: string | null
          locale?: string
          phone_number?: string | null
          primary_bank?: string | null
          reminder_day_of_month?: number | null
          updated_at?: string
          user_id?: string
          user_threshold_amount?: number | null
        }
        Relationships: []
      }
      rate_periods: {
        Row: {
          annual_rate: number
          created_at: string
          effective_from: string
          id: string
          obligation_id: string
          provenance_json: Json
          superseded_by: string | null
          user_id: string
        }
        Insert: {
          annual_rate: number
          created_at?: string
          effective_from: string
          id?: string
          obligation_id: string
          provenance_json: Json
          superseded_by?: string | null
          user_id: string
        }
        Update: {
          annual_rate?: number
          created_at?: string
          effective_from?: string
          id?: string
          obligation_id?: string
          provenance_json?: Json
          superseded_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rate_periods_obligation_owner_fkey'
            columns: ['obligation_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'obligations'
            referencedColumns: ['id', 'user_id']
          },
          {
            foreignKeyName: 'rate_periods_superseded_by_fkey'
            columns: ['superseded_by']
            isOneToOne: false
            referencedRelation: 'rate_periods'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      save_conventional_loan: {
        Args: {
          p_id: string
          p_nickname: string
          p_institution_name: string
          p_institution_id: string | null
          p_opened_date: string
          p_closed_date: string | null
          p_notes: string | null
          p_provenance_json: Json
          p_created_at: string | null
          p_updated_at: string | null
          p_original_principal: number
          p_original_principal_prov: Json
          p_outstanding_balance: number | null
          p_outstanding_balance_prov: Json | null
          p_installment: number
          p_installment_prov: Json
          p_rate_type: string
          p_term_months: number
          p_term_months_prov: Json
          p_start_date: string
          p_maturity_date: string
          p_first_payment_date: string | null
          p_purpose: string | null
          p_contractual_balloon: number | null
          p_contractual_balloon_prov: Json | null
        }
        Returns: Database['public']['Tables']['obligations']['Row']
      }
      save_murabaha: {
        Args: {
          p_id: string
          p_nickname: string
          p_institution_name: string
          p_institution_id: string | null
          p_opened_date: string
          p_closed_date: string | null
          p_notes: string | null
          p_provenance_json: Json
          p_created_at: string | null
          p_updated_at: string | null
          p_asset_cost: number
          p_asset_cost_prov: Json
          p_disclosed_profit: number
          p_disclosed_profit_prov: Json
          p_total_sale_price: number
          p_total_sale_price_prov: Json
          p_installment: number
          p_installment_prov: Json
          p_term_months: number
          p_term_months_prov: Json
          p_start_date: string
          p_profit_rate_disclosed: number | null
        }
        Returns: Database['public']['Tables']['obligations']['Row']
      }
      save_card: {
        Args: {
          p_id: string
          p_nickname: string
          p_institution_name: string
          p_institution_id: string | null
          p_opened_date: string
          p_closed_date: string | null
          p_notes: string | null
          p_provenance_json: Json
          p_created_at: string | null
          p_updated_at: string | null
          p_credit_limit: number
          p_credit_limit_prov: Json
          p_current_balance: number
          p_current_balance_prov: Json
          p_statement_balance: number | null
          p_statement_balance_prov: Json | null
          p_statement_date: string | null
          p_minimum_payment_rule_json: Json | null
          p_purchase_apr: number | null
          p_purchase_apr_prov: Json | null
          p_cash_advance_apr: number | null
          p_cash_advance_apr_prov: Json | null
          p_due_date: string | null
          p_grace_days: number | null
          p_fees_json: Json | null
        }
        Returns: Database['public']['Tables']['obligations']['Row']
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
