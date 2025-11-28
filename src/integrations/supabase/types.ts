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
      achievement_progress: {
        Row: {
          achievements_unlocked: number
          id: string
          learning_phase: string
          player_tag: string
          skill_levels: Json
          total_mastery_points: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievements_unlocked?: number
          id?: string
          learning_phase?: string
          player_tag: string
          skill_levels?: Json
          total_mastery_points?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievements_unlocked?: number
          id?: string
          learning_phase?: string
          player_tag?: string
          skill_levels?: Json
          total_mastery_points?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          category: string
          created_at: string | null
          criteria: Json
          description: string
          icon_name: string
          id: string
          name: string
          points: number
          tier: string
        }
        Insert: {
          category: string
          created_at?: string | null
          criteria: Json
          description: string
          icon_name: string
          id?: string
          name: string
          points?: number
          tier: string
        }
        Update: {
          category?: string
          created_at?: string | null
          criteria?: Json
          description?: string
          icon_name?: string
          id?: string
          name?: string
          points?: number
          tier?: string
        }
        Relationships: []
      }
      analyses: {
        Row: {
          analysis_type: string
          created_at: string | null
          id: string
          input_fingerprint: string
          output: Json
          player_tag: string
        }
        Insert: {
          analysis_type: string
          created_at?: string | null
          id?: string
          input_fingerprint: string
          output: Json
          player_tag: string
        }
        Update: {
          analysis_type?: string
          created_at?: string | null
          id?: string
          input_fingerprint?: string
          output?: Json
          player_tag?: string
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          created_at: string | null
          id: string
          identifier: string
          request_count: number
          window_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          identifier: string
          request_count?: number
          window_start?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          identifier?: string
          request_count?: number
          window_start?: string
        }
        Relationships: []
      }
      card_collection: {
        Row: {
          card_count: number
          card_id: number
          card_level: number
          card_name: string
          created_at: string | null
          elixir_cost: number | null
          evolution_level: number | null
          icon_url: string | null
          id: string
          max_level: number
          player_tag: string
          rarity: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_count?: number
          card_id: number
          card_level: number
          card_name: string
          created_at?: string | null
          elixir_cost?: number | null
          evolution_level?: number | null
          icon_url?: string | null
          id?: string
          max_level: number
          player_tag: string
          rarity: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_count?: number
          card_id?: number
          card_level?: number
          card_name?: string
          created_at?: string | null
          elixir_cost?: number | null
          evolution_level?: number | null
          icon_url?: string | null
          id?: string
          max_level?: number
          player_tag?: string
          rarity?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      card_mastery: {
        Row: {
          ai_tips: string | null
          avg_elixir_decks: number | null
          battles_lost: number | null
          battles_won: number | null
          best_partner_cards: string[] | null
          card_id: number
          card_name: string
          id: string
          last_updated: string | null
          mastery_level: number | null
          mastery_progress: number | null
          player_tag: string
          times_used: number | null
          total_crowns: number | null
          user_id: string
          worst_matchup_cards: string[] | null
        }
        Insert: {
          ai_tips?: string | null
          avg_elixir_decks?: number | null
          battles_lost?: number | null
          battles_won?: number | null
          best_partner_cards?: string[] | null
          card_id: number
          card_name: string
          id?: string
          last_updated?: string | null
          mastery_level?: number | null
          mastery_progress?: number | null
          player_tag: string
          times_used?: number | null
          total_crowns?: number | null
          user_id: string
          worst_matchup_cards?: string[] | null
        }
        Update: {
          ai_tips?: string | null
          avg_elixir_decks?: number | null
          battles_lost?: number | null
          battles_won?: number | null
          best_partner_cards?: string[] | null
          card_id?: number
          card_name?: string
          id?: string
          last_updated?: string | null
          mastery_level?: number | null
          mastery_progress?: number | null
          player_tag?: string
          times_used?: number | null
          total_crowns?: number | null
          user_id?: string
          worst_matchup_cards?: string[] | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          player_tag: string
          role: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          player_tag: string
          role: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          player_tag?: string
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      clan_join_requests: {
        Row: {
          clan_id: string
          created_at: string | null
          id: string
          message: string | null
          player_name: string
          player_tag: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          clan_id: string
          created_at?: string | null
          id?: string
          message?: string | null
          player_name: string
          player_tag: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          clan_id?: string
          created_at?: string | null
          id?: string
          message?: string | null
          player_name?: string
          player_tag?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_join_requests_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      clans: {
        Row: {
          badge_id: number | null
          clan_tag: string
          created_at: string | null
          description: string | null
          id: string
          last_synced_at: string | null
          leader_name: string | null
          leader_tag: string | null
          location: string | null
          member_count: number | null
          name: string
          required_trophies: number | null
          type: string | null
          updated_at: string | null
          war_trophies: number | null
        }
        Insert: {
          badge_id?: number | null
          clan_tag: string
          created_at?: string | null
          description?: string | null
          id?: string
          last_synced_at?: string | null
          leader_name?: string | null
          leader_tag?: string | null
          location?: string | null
          member_count?: number | null
          name: string
          required_trophies?: number | null
          type?: string | null
          updated_at?: string | null
          war_trophies?: number | null
        }
        Update: {
          badge_id?: number | null
          clan_tag?: string
          created_at?: string | null
          description?: string | null
          id?: string
          last_synced_at?: string | null
          leader_name?: string | null
          leader_tag?: string | null
          location?: string | null
          member_count?: number | null
          name?: string
          required_trophies?: number | null
          type?: string | null
          updated_at?: string | null
          war_trophies?: number | null
        }
        Relationships: []
      }
      deck_archetypes: {
        Row: {
          countered_by: string[] | null
          counters: string[] | null
          created_at: string | null
          id: string
          key_cards: string[]
          name: string
          playstyle: string
          tips: string | null
        }
        Insert: {
          countered_by?: string[] | null
          counters?: string[] | null
          created_at?: string | null
          id?: string
          key_cards: string[]
          name: string
          playstyle: string
          tips?: string | null
        }
        Update: {
          countered_by?: string[] | null
          counters?: string[] | null
          created_at?: string | null
          id?: string
          key_cards?: string[]
          name?: string
          playstyle?: string
          tips?: string | null
        }
        Relationships: []
      }
      deck_templates: {
        Row: {
          archetype: string
          avg_elixir: number | null
          cards: Json
          created_at: string | null
          description: string | null
          difficulty: string | null
          id: string
          name: string
          popularity_score: number | null
          updated_at: string | null
        }
        Insert: {
          archetype: string
          avg_elixir?: number | null
          cards: Json
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          name: string
          popularity_score?: number | null
          updated_at?: string | null
        }
        Update: {
          archetype?: string
          avg_elixir?: number | null
          cards?: Json
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          name?: string
          popularity_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      deck_usage_stats: {
        Row: {
          avg_elixir: number | null
          battles_lost: number | null
          battles_played: number | null
          battles_won: number | null
          created_at: string | null
          date: string
          deck_cards: Json
          deck_hash: string
          id: string
          player_tag: string
          total_crowns: number | null
          total_trophy_change: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avg_elixir?: number | null
          battles_lost?: number | null
          battles_played?: number | null
          battles_won?: number | null
          created_at?: string | null
          date?: string
          deck_cards: Json
          deck_hash: string
          id?: string
          player_tag: string
          total_crowns?: number | null
          total_trophy_change?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avg_elixir?: number | null
          battles_lost?: number | null
          battles_played?: number | null
          battles_won?: number | null
          created_at?: string | null
          date?: string
          deck_cards?: Json
          deck_hash?: string
          id?: string
          player_tag?: string
          total_crowns?: number | null
          total_trophy_change?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      leaderboard_entries: {
        Row: {
          arena_name: string | null
          clan_name: string | null
          clan_tag: string | null
          created_at: string | null
          id: string
          last_synced_at: string | null
          player_name: string
          player_tag: string
          trophies: number
          updated_at: string | null
        }
        Insert: {
          arena_name?: string | null
          clan_name?: string | null
          clan_tag?: string | null
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          player_name: string
          player_tag: string
          trophies: number
          updated_at?: string | null
        }
        Update: {
          arena_name?: string | null
          clan_name?: string | null
          clan_tag?: string | null
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          player_name?: string
          player_tag?: string
          trophies?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          icon_name: string | null
          id: string
          message: string
          metadata: Json | null
          player_tag: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icon_name?: string | null
          id?: string
          message: string
          metadata?: Json | null
          player_tag: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          icon_name?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          player_tag?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      operation_progress: {
        Row: {
          completed_at: string | null
          current_step: string | null
          error: string | null
          id: string
          operation_type: string
          player_tag: string
          progress: number
          started_at: string
          status: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_step?: string | null
          error?: string | null
          id?: string
          operation_type: string
          player_tag: string
          progress?: number
          started_at?: string
          status?: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_step?: string | null
          error?: string | null
          id?: string
          operation_type?: string
          player_tag?: string
          progress?: number
          started_at?: string
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      player_cache: {
        Row: {
          battles_data: Json | null
          cached_at: string | null
          player_data: Json
          player_tag: string
          updated_at: string | null
        }
        Insert: {
          battles_data?: Json | null
          cached_at?: string | null
          player_data: Json
          player_tag: string
          updated_at?: string | null
        }
        Update: {
          battles_data?: Json | null
          cached_at?: string | null
          player_data?: Json
          player_tag?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      player_profiles: {
        Row: {
          created_at: string | null
          id: string
          last_seen_at: string | null
          note: string | null
          player_tag: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_seen_at?: string | null
          note?: string | null
          player_tag: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_seen_at?: string | null
          note?: string | null
          player_tag?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          preferred_language: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          preferred_language?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          preferred_language?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_decks: {
        Row: {
          archetype: string | null
          avg_elixir: number | null
          cards: Json
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          meta_score: number | null
          name: string
          synergy_score: number | null
          updated_at: string | null
          usage_count: number | null
          user_id: string
          win_rate: number | null
        }
        Insert: {
          archetype?: string | null
          avg_elixir?: number | null
          cards: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          meta_score?: number | null
          name: string
          synergy_score?: number | null
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
          win_rate?: number | null
        }
        Update: {
          archetype?: string | null
          avg_elixir?: number | null
          cards?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          meta_score?: number | null
          name?: string
          synergy_score?: number | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      tournament_brackets: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          match_number: number
          player1_id: string | null
          player1_score: number | null
          player2_id: string | null
          player2_score: number | null
          round_number: number
          status: string
          tournament_id: string
          winner_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          match_number: number
          player1_id?: string | null
          player1_score?: number | null
          player2_id?: string | null
          player2_score?: number | null
          round_number: number
          status?: string
          tournament_id: string
          winner_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          match_number?: number
          player1_id?: string | null
          player1_score?: number | null
          player2_id?: string | null
          player2_score?: number | null
          round_number?: number
          status?: string
          tournament_id?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_brackets_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_brackets_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_brackets_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_brackets_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "tournament_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          id: string
          is_eliminated: boolean | null
          player_name: string
          player_tag: string
          ranking: number | null
          registered_at: string | null
          tournament_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_eliminated?: boolean | null
          player_name: string
          player_tag: string
          ranking?: number | null
          registered_at?: string | null
          tournament_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_eliminated?: boolean | null
          player_name?: string
          player_tag?: string
          ranking?: number | null
          registered_at?: string | null
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          entry_fee: number
          id: string
          max_participants: number
          name: string
          prize_pool: number
          start_date: string
          status: string
          tournament_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          entry_fee?: number
          id?: string
          max_participants: number
          name: string
          prize_pool?: number
          start_date: string
          status?: string
          tournament_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          entry_fee?: number
          id?: string
          max_participants?: number
          name?: string
          prize_pool?: number
          start_date?: string
          status?: string
          tournament_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          created_at: string | null
          id: string
          player_tag: string
          progress: number
          unlocked_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string | null
          id?: string
          player_tag: string
          progress?: number
          unlocked_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string | null
          id?: string
          player_tag?: string
          progress?: number
          unlocked_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ai_usage: {
        Row: {
          created_at: string
          date: string
          id: string
          request_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          request_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_identifier: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
