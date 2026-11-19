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
      acquisition_events: {
        Row: {
          created_at: string
          step: string
          user_id: string
        }
        Insert: {
          created_at?: string
          step: string
          user_id: string
        }
        Update: {
          created_at?: string
          step?: string
          user_id?: string
        }
        Relationships: []
      }
      acquisition_settings: {
        Row: {
          measured_since: string
          singleton: boolean
        }
        Insert: {
          measured_since?: string
          singleton?: boolean
        }
        Update: {
          measured_since?: string
          singleton?: boolean
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: []
      }
      ai_feedback: {
        Row: {
          comment: string | null
          context: Json | null
          created_at: string
          feedback_type: string
          helpful: boolean | null
          id: string
          player_tag: string
          rating: number | null
          reference_id: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          context?: Json | null
          created_at?: string
          feedback_type: string
          helpful?: boolean | null
          id?: string
          player_tag: string
          rating?: number | null
          reference_id?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          context?: Json | null
          created_at?: string
          feedback_type?: string
          helpful?: boolean | null
          id?: string
          player_tag?: string
          rating?: number | null
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_trial_reservations: {
        Row: {
          completed_at: string | null
          created_at: string
          feature: string
          id: string
          request_key: string
          response_data: Json | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          feature: string
          id?: string
          request_key: string
          response_data?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          feature?: string
          id?: string
          request_key?: string
          response_data?: Json | null
          status?: string
          user_id?: string
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
      api_request_logs: {
        Row: {
          cache_hit: boolean | null
          created_at: string
          duration_ms: number | null
          endpoint: string
          id: string
          metadata: Json | null
          method: string
          query_key: string | null
          user_id: string | null
        }
        Insert: {
          cache_hit?: boolean | null
          created_at?: string
          duration_ms?: number | null
          endpoint: string
          id?: string
          metadata?: Json | null
          method?: string
          query_key?: string | null
          user_id?: string | null
        }
        Update: {
          cache_hit?: boolean | null
          created_at?: string
          duration_ms?: number | null
          endpoint?: string
          id?: string
          metadata?: Json | null
          method?: string
          query_key?: string | null
          user_id?: string | null
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
          ai_tips_language: string | null
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
          ai_tips_language?: string | null
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
          ai_tips_language?: string | null
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
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          player_tag: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          player_tag?: string
          role?: string
          user_id?: string
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
      coaching_tasks: {
        Row: {
          ai_calls: number
          battle_result: Json | null
          battles_fetched_at: string | null
          completion_tokens: number
          created_at: string
          follow_up_answer: string | null
          follow_up_question: string | null
          follow_up_started_at: string | null
          generation_started_at: string | null
          id: string
          language: string
          last_checked_at: string | null
          matched_battle_key: string | null
          player_tag: string
          previous_match: Json | null
          prompt_tokens: number
          recommendation: Json | null
          recommended_deck: Json | null
          shown_at: string | null
          source_deck: Json | null
          status: string
          user_id: string
        }
        Insert: {
          ai_calls?: number
          battle_result?: Json | null
          battles_fetched_at?: string | null
          completion_tokens?: number
          created_at?: string
          follow_up_answer?: string | null
          follow_up_question?: string | null
          follow_up_started_at?: string | null
          generation_started_at?: string | null
          id?: string
          language?: string
          last_checked_at?: string | null
          matched_battle_key?: string | null
          player_tag: string
          previous_match?: Json | null
          prompt_tokens?: number
          recommendation?: Json | null
          recommended_deck?: Json | null
          shown_at?: string | null
          source_deck?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          ai_calls?: number
          battle_result?: Json | null
          battles_fetched_at?: string | null
          completion_tokens?: number
          created_at?: string
          follow_up_answer?: string | null
          follow_up_question?: string | null
          follow_up_started_at?: string | null
          generation_started_at?: string | null
          id?: string
          language?: string
          last_checked_at?: string | null
          matched_battle_key?: string | null
          player_tag?: string
          previous_match?: Json | null
          prompt_tokens?: number
          recommendation?: Json | null
          recommended_deck?: Json | null
          shown_at?: string | null
          source_deck?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      coaching_translations: {
        Row: {
          language: string
          source_hash: string
          task_id: string
          translation: Json
        }
        Insert: {
          language: string
          source_hash: string
          task_id: string
          translation: Json
        }
        Update: {
          language?: string
          source_hash?: string
          task_id?: string
          translation?: Json
        }
        Relationships: [
          {
            foreignKeyName: "coaching_translations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "coaching_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_translations_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "current_trial_coaching"
            referencedColumns: ["task_id"]
          },
        ]
      }
      confirmed_welcome: {
        Row: {
          accepted_at: string | null
          confirmed_at: string
          email: string
          language: string
          payload: Json | null
          queued_at: string | null
          resend_id: string | null
          started_at: string | null
          ticket: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          confirmed_at: string
          email: string
          language: string
          payload?: Json | null
          queued_at?: string | null
          resend_id?: string | null
          started_at?: string | null
          ticket?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          confirmed_at?: string
          email?: string
          language?: string
          payload?: Json | null
          queued_at?: string | null
          resend_id?: string | null
          started_at?: string | null
          ticket?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_usage_logs: {
        Row: {
          feature_name: string
          id: string
          metadata: Json | null
          player_tag: string
          used_at: string
          user_id: string
        }
        Insert: {
          feature_name: string
          id?: string
          metadata?: Json | null
          player_tag: string
          used_at?: string
          user_id: string
        }
        Update: {
          feature_name?: string
          id?: string
          metadata?: Json | null
          player_tag?: string
          used_at?: string
          user_id?: string
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
          archetype: string | null
          avg_elixir: number | null
          battles_lost: number | null
          battles_played: number | null
          battles_won: number | null
          created_at: string | null
          date: string
          deck_cards: Json
          deck_hash: string
          id: string
          losses_by_opponent_archetype: Json | null
          opponent_archetypes: Json | null
          player_tag: string
          total_crowns: number | null
          total_trophy_change: number | null
          updated_at: string | null
          user_id: string
          wins_by_opponent_archetype: Json | null
        }
        Insert: {
          archetype?: string | null
          avg_elixir?: number | null
          battles_lost?: number | null
          battles_played?: number | null
          battles_won?: number | null
          created_at?: string | null
          date?: string
          deck_cards: Json
          deck_hash: string
          id?: string
          losses_by_opponent_archetype?: Json | null
          opponent_archetypes?: Json | null
          player_tag: string
          total_crowns?: number | null
          total_trophy_change?: number | null
          updated_at?: string | null
          user_id: string
          wins_by_opponent_archetype?: Json | null
        }
        Update: {
          archetype?: string | null
          avg_elixir?: number | null
          battles_lost?: number | null
          battles_played?: number | null
          battles_won?: number | null
          created_at?: string | null
          date?: string
          deck_cards?: Json
          deck_hash?: string
          id?: string
          losses_by_opponent_archetype?: Json | null
          opponent_archetypes?: Json | null
          player_tag?: string
          total_crowns?: number | null
          total_trophy_change?: number | null
          updated_at?: string | null
          user_id?: string
          wins_by_opponent_archetype?: Json | null
        }
        Relationships: []
      }
      device_fingerprints: {
        Row: {
          fingerprint_hash: string
          first_seen_at: string
          id: string
          language: string | null
          last_seen_at: string
          screen_resolution: string | null
          seen_count: number | null
          timezone: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          fingerprint_hash: string
          first_seen_at?: string
          id?: string
          language?: string | null
          last_seen_at?: string
          screen_resolution?: string | null
          seen_count?: number | null
          timezone?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          fingerprint_hash?: string
          first_seen_at?: string
          id?: string
          language?: string | null
          last_seen_at?: string
          screen_resolution?: string | null
          seen_count?: number | null
          timezone?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      first_value_accounts: {
        Row: {
          anchor_at: string
          cohort: string
          feedback: string | null
          feedback_prompted_at: string | null
          first_seen_at: string
          player_tag: string | null
          task_id: string | null
          user_id: string
        }
        Insert: {
          anchor_at: string
          cohort: string
          feedback?: string | null
          feedback_prompted_at?: string | null
          first_seen_at?: string
          player_tag?: string | null
          task_id?: string | null
          user_id: string
        }
        Update: {
          anchor_at?: string
          cohort?: string
          feedback?: string | null
          feedback_prompted_at?: string | null
          first_seen_at?: string
          player_tag?: string | null
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "first_value_accounts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "coaching_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_value_accounts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "current_trial_coaching"
            referencedColumns: ["task_id"]
          },
        ]
      }
      first_value_calls: {
        Row: {
          completed_at: string | null
          cost_usd: number | null
          duration_ms: number | null
          error_code: string | null
          id: string
          input_tokens: number | null
          kind: string
          language: string
          model: string
          output_tokens: number | null
          run_id: string | null
          source_hash: string
          started_at: string
          status: string
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          cost_usd?: number | null
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          input_tokens?: number | null
          kind: string
          language: string
          model: string
          output_tokens?: number | null
          run_id?: string | null
          source_hash?: string
          started_at?: string
          status?: string
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          cost_usd?: number | null
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          input_tokens?: number | null
          kind?: string
          language?: string
          model?: string
          output_tokens?: number | null
          run_id?: string | null
          source_hash?: string
          started_at?: string
          status?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "first_value_calls_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "coaching_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "first_value_calls_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "current_trial_coaching"
            referencedColumns: ["task_id"]
          },
        ]
      }
      first_value_errors: {
        Row: {
          action: string
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      first_value_events: {
        Row: {
          created_at: string
          step: string
          user_id: string
        }
        Insert: {
          created_at?: string
          step: string
          user_id: string
        }
        Update: {
          created_at?: string
          step?: string
          user_id?: string
        }
        Relationships: []
      }
      first_value_rate_limits: {
        Row: {
          requests: number
          user_id: string
          window_started_at: string
        }
        Insert: {
          requests?: number
          user_id: string
          window_started_at?: string
        }
        Update: {
          requests?: number
          user_id?: string
          window_started_at?: string
        }
        Relationships: []
      }
      first_value_settings: {
        Row: {
          enabled: boolean
          launched_at: string | null
          singleton: boolean
        }
        Insert: {
          enabled?: boolean
          launched_at?: string | null
          singleton?: boolean
        }
        Update: {
          enabled?: boolean
          launched_at?: string | null
          singleton?: boolean
        }
        Relationships: []
      }
      fraud_signals: {
        Row: {
          created_at: string
          details: Json
          fingerprint_hash: string | null
          id: string
          ip_address: string | null
          player_tag: string | null
          severity: string
          signal_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          fingerprint_hash?: string | null
          id?: string
          ip_address?: string | null
          player_tag?: string | null
          severity?: string
          signal_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          fingerprint_hash?: string | null
          id?: string
          ip_address?: string | null
          player_tag?: string | null
          severity?: string
          signal_type?: string
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
      marketing_account_ages: {
        Row: {
          adult: boolean
          set_at: string
          source: string
          user_id: string
        }
        Insert: {
          adult: boolean
          set_at?: string
          source: string
          user_id: string
        }
        Update: {
          adult?: boolean
          set_at?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      marketing_account_markets: {
        Row: {
          market: string
          set_at: string
          source: string
          user_id: string
        }
        Insert: {
          market: string
          set_at?: string
          source: string
          user_id: string
        }
        Update: {
          market?: string
          set_at?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      marketing_consent_events: {
        Row: {
          brand: string
          channel: string
          created_at: string
          email: string
          event: string
          id: number
          language: string | null
          purpose: string
          request_key: string | null
          source: string
          text_version: string | null
          user_id: string | null
        }
        Insert: {
          brand?: string
          channel?: string
          created_at?: string
          email: string
          event: string
          id?: never
          language?: string | null
          purpose?: string
          request_key?: string | null
          source: string
          text_version?: string | null
          user_id?: string | null
        }
        Update: {
          brand?: string
          channel?: string
          created_at?: string
          email?: string
          event?: string
          id?: never
          language?: string | null
          purpose?: string
          request_key?: string | null
          source?: string
          text_version?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_consent_events_text_version_language_fkey"
            columns: ["text_version", "language"]
            isOneToOne: false
            referencedRelation: "marketing_consent_texts"
            referencedColumns: ["version", "language"]
          },
        ]
      }
      marketing_consent_texts: {
        Row: {
          body: string
          created_at: string
          language: string
          sha256: string
          version: string
        }
        Insert: {
          body: string
          created_at?: string
          language: string
          sha256: string
          version: string
        }
        Update: {
          body?: string
          created_at?: string
          language?: string
          sha256?: string
          version?: string
        }
        Relationships: []
      }
      marketing_deliveries: {
        Row: {
          accepted_at: string | null
          accepted_at_verified: boolean | null
          campaign_key: string
          created_at: string
          email: string
          idempotency_key: string | null
          payload: Json | null
          provider_message_id: string | null
          reason: string | null
          status: string
          uncertain_since: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_at_verified?: boolean | null
          campaign_key: string
          created_at?: string
          email: string
          idempotency_key?: string | null
          payload?: Json | null
          provider_message_id?: string | null
          reason?: string | null
          status: string
          uncertain_since?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_at_verified?: boolean | null
          campaign_key?: string
          created_at?: string
          email?: string
          idempotency_key?: string | null
          payload?: Json | null
          provider_message_id?: string | null
          reason?: string | null
          status?: string
          uncertain_since?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marketing_iys_registrations: {
        Row: {
          event_id: number
          registered_at: string
        }
        Insert: {
          event_id: number
          registered_at?: string
        }
        Update: {
          event_id?: number
          registered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_iys_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "marketing_consent_events"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_prompts: {
        Row: {
          dismissed_at: string | null
          shown_at: string | null
          user_id: string
        }
        Insert: {
          dismissed_at?: string | null
          shown_at?: string | null
          user_id: string
        }
        Update: {
          dismissed_at?: string | null
          shown_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      marketing_provider_events: {
        Row: {
          blocked: boolean
          email: string
          event_type: string
          provider_event_id: string
          received_at: string
        }
        Insert: {
          blocked: boolean
          email: string
          event_type: string
          provider_event_id: string
          received_at?: string
        }
        Update: {
          blocked?: boolean
          email?: string
          event_type?: string
          provider_event_id?: string
          received_at?: string
        }
        Relationships: []
      }
      marketing_settings: {
        Row: {
          age_rule_approved: boolean
          age_rule_markets: string[]
          approved_markets: string[]
          collection_markets: string[]
          installed_at: string
          iys_markets: string[]
          iys_ready: boolean
          require_iys: boolean
          sending_enabled: boolean
          singleton: boolean
        }
        Insert: {
          age_rule_approved?: boolean
          age_rule_markets?: string[]
          approved_markets?: string[]
          collection_markets?: string[]
          installed_at?: string
          iys_markets?: string[]
          iys_ready?: boolean
          require_iys?: boolean
          sending_enabled?: boolean
          singleton?: boolean
        }
        Update: {
          age_rule_approved?: boolean
          age_rule_markets?: string[]
          approved_markets?: string[]
          collection_markets?: string[]
          installed_at?: string
          iys_markets?: string[]
          iys_ready?: boolean
          require_iys?: boolean
          sending_enabled?: boolean
          singleton?: boolean
        }
        Relationships: []
      }
      marketing_suppressions: {
        Row: {
          created_at: string
          email: string
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          reason?: string
        }
        Relationships: []
      }
      matchup_predictions: {
        Row: {
          actual_battles_total: number | null
          actual_losses_deck_a: number | null
          actual_wins_deck_a: number | null
          confidence: string
          created_at: string | null
          deck_a_cards: Json
          deck_b_cards: Json
          deck_hash: string
          explanation: string | null
          id: string
          key_matchups: Json | null
          language: string | null
          last_battle_at: string | null
          player_tag: string
          predicted_win_rate_a: number
          predicted_win_rate_b: number
          prediction_error: number | null
          tips: Json | null
          user_id: string
        }
        Insert: {
          actual_battles_total?: number | null
          actual_losses_deck_a?: number | null
          actual_wins_deck_a?: number | null
          confidence: string
          created_at?: string | null
          deck_a_cards: Json
          deck_b_cards: Json
          deck_hash: string
          explanation?: string | null
          id?: string
          key_matchups?: Json | null
          language?: string | null
          last_battle_at?: string | null
          player_tag: string
          predicted_win_rate_a: number
          predicted_win_rate_b: number
          prediction_error?: number | null
          tips?: Json | null
          user_id: string
        }
        Update: {
          actual_battles_total?: number | null
          actual_losses_deck_a?: number | null
          actual_wins_deck_a?: number | null
          confidence?: string
          created_at?: string | null
          deck_a_cards?: Json
          deck_b_cards?: Json
          deck_hash?: string
          explanation?: string | null
          id?: string
          key_matchups?: Json | null
          language?: string | null
          last_battle_at?: string | null
          player_tag?: string
          predicted_win_rate_a?: number
          predicted_win_rate_b?: number
          prediction_error?: number | null
          tips?: Json | null
          user_id?: string
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
          battles_fetched_at: string | null
          cached_at: string | null
          player_data: Json
          player_fetched_at: string | null
          player_tag: string
          updated_at: string | null
        }
        Insert: {
          battles_data?: Json | null
          battles_fetched_at?: string | null
          cached_at?: string | null
          player_data: Json
          player_fetched_at?: string | null
          player_tag: string
          updated_at?: string | null
        }
        Update: {
          battles_data?: Json | null
          battles_fetched_at?: string | null
          cached_at?: string | null
          player_data?: Json
          player_fetched_at?: string | null
          player_tag?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      player_profiles: {
        Row: {
          ai_enabled: boolean | null
          created_at: string | null
          id: string
          last_seen_at: string | null
          note: string | null
          player_tag: string
          user_id: string
        }
        Insert: {
          ai_enabled?: boolean | null
          created_at?: string | null
          id?: string
          last_seen_at?: string | null
          note?: string | null
          player_tag: string
          user_id: string
        }
        Update: {
          ai_enabled?: boolean | null
          created_at?: string | null
          id?: string
          last_seen_at?: string | null
          note?: string | null
          player_tag?: string
          user_id?: string
        }
        Relationships: []
      }
      player_tag_claims: {
        Row: {
          claimed_at: string
          claimed_by_user_id: string
          player_tag: string
        }
        Insert: {
          claimed_at?: string
          claimed_by_user_id: string
          player_tag: string
        }
        Update: {
          claimed_at?: string
          claimed_by_user_id?: string
          player_tag?: string
        }
        Relationships: []
      }
      polar_order_sync: {
        Row: {
          claimed_at: string | null
          last_completed_at: string | null
          next_page: number
          queued_at: string | null
          singleton: boolean
          ticket: string | null
        }
        Insert: {
          claimed_at?: string | null
          last_completed_at?: string | null
          next_page?: number
          queued_at?: string | null
          singleton?: boolean
          ticket?: string | null
        }
        Update: {
          claimed_at?: string | null
          last_completed_at?: string | null
          next_page?: number
          queued_at?: string | null
          singleton?: boolean
          ticket?: string | null
        }
        Relationships: []
      }
      polar_orders: {
        Row: {
          amount: number
          billing_reason: string | null
          created_at: string
          currency: string | null
          customer_id: string | null
          discount_amount_cents: number | null
          gross_amount: number | null
          order_id: string
          paid_at: string | null
          provider_updated_at: string | null
          recorded_at: string
          refunded_net_cents: number | null
          status: string | null
          subscription_id: string | null
          tax_amount: number | null
          user_id: string | null
        }
        Insert: {
          amount?: number
          billing_reason?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          discount_amount_cents?: number | null
          gross_amount?: number | null
          order_id: string
          paid_at?: string | null
          provider_updated_at?: string | null
          recorded_at?: string
          refunded_net_cents?: number | null
          status?: string | null
          subscription_id?: string | null
          tax_amount?: number | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          billing_reason?: string | null
          created_at?: string
          currency?: string | null
          customer_id?: string | null
          discount_amount_cents?: number | null
          gross_amount?: number | null
          order_id?: string
          paid_at?: string | null
          provider_updated_at?: string | null
          recorded_at?: string
          refunded_net_cents?: number | null
          status?: string | null
          subscription_id?: string | null
          tax_amount?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      privacy_requests: {
        Row: {
          assignee: string | null
          contact_email: string
          details: string | null
          due_at: string
          id: string
          kind: string
          outcome: string | null
          received_at: string
          responded_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          assignee?: string | null
          contact_email: string
          details?: string | null
          due_at?: string
          id?: string
          kind: string
          outcome?: string | null
          received_at?: string
          responded_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          assignee?: string | null
          contact_email?: string
          details?: string | null
          due_at?: string
          id?: string
          kind?: string
          outcome?: string | null
          received_at?: string
          responded_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          props: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          props?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          props?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          acquisition_source: Json | null
          chat_retention_days: number | null
          created_at: string | null
          email: string | null
          id: string
          language_selected_at: string | null
          onboarding_completed_at: string | null
          preferred_language: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          trial_used: boolean | null
          updated_at: string | null
          whats_new_seen_version: string | null
          winback_email_sent_at: string | null
        }
        Insert: {
          acquisition_source?: Json | null
          chat_retention_days?: number | null
          created_at?: string | null
          email?: string | null
          id: string
          language_selected_at?: string | null
          onboarding_completed_at?: string | null
          preferred_language?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          trial_used?: boolean | null
          updated_at?: string | null
          whats_new_seen_version?: string | null
          winback_email_sent_at?: string | null
        }
        Update: {
          acquisition_source?: Json | null
          chat_retention_days?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          language_selected_at?: string | null
          onboarding_completed_at?: string | null
          preferred_language?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          trial_used?: boolean | null
          updated_at?: string | null
          whats_new_seen_version?: string | null
          winback_email_sent_at?: string | null
        }
        Relationships: []
      }
      recommendation_history: {
        Row: {
          adopted: boolean | null
          adopted_at: string | null
          ai_explanation: string | null
          archetype: string | null
          avg_elixir: number | null
          battles_after_adoption: number | null
          created_at: string | null
          deck_name: string | null
          difficulty: string | null
          expires_at: string | null
          id: string
          language: string | null
          outcome_tracked_at: string | null
          player_tag: string
          recommendation_reason: string
          recommendation_score: number
          recommendation_type: string | null
          recommended_cards: Json | null
          recommended_deck_id: string | null
          user_id: string
          win_rate_after: number | null
          win_rate_before: number | null
          wins_after_adoption: number | null
        }
        Insert: {
          adopted?: boolean | null
          adopted_at?: string | null
          ai_explanation?: string | null
          archetype?: string | null
          avg_elixir?: number | null
          battles_after_adoption?: number | null
          created_at?: string | null
          deck_name?: string | null
          difficulty?: string | null
          expires_at?: string | null
          id?: string
          language?: string | null
          outcome_tracked_at?: string | null
          player_tag: string
          recommendation_reason: string
          recommendation_score: number
          recommendation_type?: string | null
          recommended_cards?: Json | null
          recommended_deck_id?: string | null
          user_id: string
          win_rate_after?: number | null
          win_rate_before?: number | null
          wins_after_adoption?: number | null
        }
        Update: {
          adopted?: boolean | null
          adopted_at?: string | null
          ai_explanation?: string | null
          archetype?: string | null
          avg_elixir?: number | null
          battles_after_adoption?: number | null
          created_at?: string | null
          deck_name?: string | null
          difficulty?: string | null
          expires_at?: string | null
          id?: string
          language?: string | null
          outcome_tracked_at?: string | null
          player_tag?: string
          recommendation_reason?: string
          recommendation_score?: number
          recommendation_type?: string | null
          recommended_cards?: Json | null
          recommended_deck_id?: string | null
          user_id?: string
          win_rate_after?: number | null
          win_rate_before?: number | null
          wins_after_adoption?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_history_recommended_deck_id_fkey"
            columns: ["recommended_deck_id"]
            isOneToOne: false
            referencedRelation: "deck_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      return_experiment_accounts: {
        Row: {
          arm: string
          assigned_at: string
          checkout_at: string | null
          dismissed_at: string | null
          experiment_key: string
          seen_at: string | null
          user_id: string
        }
        Insert: {
          arm: string
          assigned_at?: string
          checkout_at?: string | null
          dismissed_at?: string | null
          experiment_key: string
          seen_at?: string | null
          user_id: string
        }
        Update: {
          arm?: string
          assigned_at?: string
          checkout_at?: string | null
          dismissed_at?: string | null
          experiment_key?: string
          seen_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_experiment_accounts_experiment_key_fkey"
            columns: ["experiment_key"]
            isOneToOne: false
            referencedRelation: "return_experiments"
            referencedColumns: ["experiment_key"]
          },
        ]
      }
      return_experiments: {
        Row: {
          experiment_key: string
          window_utc: unknown
        }
        Insert: {
          experiment_key: string
          window_utc: unknown
        }
        Update: {
          experiment_key?: string
          window_utc?: unknown
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
      trial_coaching_followup: {
        Row: {
          answered_at: string | null
          attempted_at: string | null
          delivery_language: string | null
          first_attempted_at: string | null
          opted_in_at: string | null
          opted_task: string | null
          reason: string | null
          reminder_attempt: string | null
          reminder_attempt_task: string | null
          reminder_payload: Json | null
          reminder_send_started_at: string | null
          resend_message_id: string | null
          returned_at: string | null
          sent_at: string | null
          subscription_id: string
          summary_attempt: string | null
          summary_attempt_task: string | null
          summary_attempted_at: string | null
          summary_first_attempted_at: string | null
          summary_message_id: string | null
          summary_opted_in_at: string | null
          summary_payload: Json | null
          summary_player_tag: string | null
          summary_send_started_at: string | null
          summary_sent_at: string | null
          summary_task: string | null
          summary_ticket: string | null
          ticket: string | null
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          attempted_at?: string | null
          delivery_language?: string | null
          first_attempted_at?: string | null
          opted_in_at?: string | null
          opted_task?: string | null
          reason?: string | null
          reminder_attempt?: string | null
          reminder_attempt_task?: string | null
          reminder_payload?: Json | null
          reminder_send_started_at?: string | null
          resend_message_id?: string | null
          returned_at?: string | null
          sent_at?: string | null
          subscription_id: string
          summary_attempt?: string | null
          summary_attempt_task?: string | null
          summary_attempted_at?: string | null
          summary_first_attempted_at?: string | null
          summary_message_id?: string | null
          summary_opted_in_at?: string | null
          summary_payload?: Json | null
          summary_player_tag?: string | null
          summary_send_started_at?: string | null
          summary_sent_at?: string | null
          summary_task?: string | null
          summary_ticket?: string | null
          ticket?: string | null
          user_id: string
        }
        Update: {
          answered_at?: string | null
          attempted_at?: string | null
          delivery_language?: string | null
          first_attempted_at?: string | null
          opted_in_at?: string | null
          opted_task?: string | null
          reason?: string | null
          reminder_attempt?: string | null
          reminder_attempt_task?: string | null
          reminder_payload?: Json | null
          reminder_send_started_at?: string | null
          resend_message_id?: string | null
          returned_at?: string | null
          sent_at?: string | null
          subscription_id?: string
          summary_attempt?: string | null
          summary_attempt_task?: string | null
          summary_attempted_at?: string | null
          summary_first_attempted_at?: string | null
          summary_message_id?: string | null
          summary_opted_in_at?: string | null
          summary_payload?: Json | null
          summary_player_tag?: string | null
          summary_send_started_at?: string | null
          summary_sent_at?: string | null
          summary_task?: string | null
          summary_ticket?: string | null
          ticket?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_coaching_followup_opted_task_fkey"
            columns: ["opted_task"]
            isOneToOne: false
            referencedRelation: "coaching_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_coaching_followup_opted_task_fkey"
            columns: ["opted_task"]
            isOneToOne: false
            referencedRelation: "current_trial_coaching"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "trial_coaching_followup_summary_task_fkey"
            columns: ["summary_task"]
            isOneToOne: false
            referencedRelation: "coaching_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_coaching_followup_summary_task_fkey"
            columns: ["summary_task"]
            isOneToOne: false
            referencedRelation: "current_trial_coaching"
            referencedColumns: ["task_id"]
          },
        ]
      }
      trial_conversion_periods: {
        Row: {
          ends_at: string
          first_cancel_at: string | null
          started_at: string
          subscription_id: string
          superseded_at: string | null
          user_id: string
        }
        Insert: {
          ends_at: string
          first_cancel_at?: string | null
          started_at: string
          subscription_id: string
          superseded_at?: string | null
          user_id: string
        }
        Update: {
          ends_at?: string
          first_cancel_at?: string | null
          started_at?: string
          subscription_id?: string
          superseded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trial_marketing_snapshots: {
        Row: {
          captured_at: string
          state_at_start: string
          subscription_id: string
          trial_started_at: string
          user_id: string | null
        }
        Insert: {
          captured_at?: string
          state_at_start: string
          subscription_id: string
          trial_started_at: string
          user_id?: string | null
        }
        Update: {
          captured_at?: string
          state_at_start?: string
          subscription_id?: string
          trial_started_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      trial_surface_visits: {
        Row: {
          day_utc: string
          first_seen: string
          last_seen: string
          phase: string
          step: string
          subscription_id: string
        }
        Insert: {
          day_utc: string
          first_seen: string
          last_seen: string
          phase: string
          step: string
          subscription_id: string
        }
        Update: {
          day_utc?: string
          first_seen?: string
          last_seen?: string
          phase?: string
          step?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_surface_visits_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "trial_conversion_facts"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "trial_surface_visits_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "trial_conversion_periods"
            referencedColumns: ["subscription_id"]
          },
        ]
      }
      trial_test_accounts: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
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
      user_fraud_status: {
        Row: {
          created_at: string
          feature_limits: Json | null
          fraud_score: number
          last_signal_at: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          signals_count: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_limits?: Json | null
          fraud_score?: number
          last_signal_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signals_count?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_limits?: Json | null
          fraud_score?: number
          last_signal_at?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          signals_count?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          account_slots: number | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          ends_at: string | null
          id: string
          last_event_at: string | null
          needs_ai_selection: boolean | null
          pending_account_slots: number | null
          pending_change_effective_at: string | null
          polar_customer_external_id: string | null
          polar_customer_id: string | null
          polar_subscription_id: string | null
          status: string
          updated_at: string | null
          user_id: string
          variant_id: string | null
        }
        Insert: {
          account_slots?: number | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          ends_at?: string | null
          id?: string
          last_event_at?: string | null
          needs_ai_selection?: boolean | null
          pending_account_slots?: number | null
          pending_change_effective_at?: string | null
          polar_customer_external_id?: string | null
          polar_customer_id?: string | null
          polar_subscription_id?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          variant_id?: string | null
        }
        Update: {
          account_slots?: number | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          ends_at?: string | null
          id?: string
          last_event_at?: string | null
          needs_ai_selection?: boolean | null
          pending_account_slots?: number | null
          pending_change_effective_at?: string | null
          polar_customer_external_id?: string | null
          polar_customer_id?: string | null
          polar_subscription_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          variant_id?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string | null
          event_type: string
          id: string
          payload_summary: Json | null
          processed_at: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          payload_summary?: Json | null
          processed_at?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          payload_summary?: Json | null
          processed_at?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      welcome_cutover: {
        Row: {
          activated_at: string
          singleton: boolean
        }
        Insert: {
          activated_at?: string
          singleton?: boolean
        }
        Update: {
          activated_at?: string
          singleton?: boolean
        }
        Relationships: []
      }
      winback_campaigns: {
        Row: {
          admin_user_id: string
          created_at: string
          discount_percent: number
          id: string
          polar_discount_id: string | null
          promo_code: string
          sent_at: string
          target_email: string
          target_user_active_days: number | null
          target_user_activity_score: number | null
          target_user_ai_requests: number | null
          target_user_battles_tracked: number | null
          target_user_chat_messages: number | null
          target_user_id: string
          target_user_linked_accounts: number | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          discount_percent: number
          id?: string
          polar_discount_id?: string | null
          promo_code: string
          sent_at?: string
          target_email: string
          target_user_active_days?: number | null
          target_user_activity_score?: number | null
          target_user_ai_requests?: number | null
          target_user_battles_tracked?: number | null
          target_user_chat_messages?: number | null
          target_user_id: string
          target_user_linked_accounts?: number | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          discount_percent?: number
          id?: string
          polar_discount_id?: string | null
          promo_code?: string
          sent_at?: string
          target_email?: string
          target_user_active_days?: number | null
          target_user_activity_score?: number | null
          target_user_ai_requests?: number | null
          target_user_battles_tracked?: number | null
          target_user_chat_messages?: number | null
          target_user_id?: string
          target_user_linked_accounts?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      current_trial_coaching: {
        Row: {
          cancel_at_period_end: boolean | null
          language: string | null
          opted_in_at: string | null
          opted_task: string | null
          player_tag: string | null
          reason: string | null
          returned_at: string | null
          sent_at: string | null
          started_at: string | null
          subscription_id: string | null
          task_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_coaching_followup_opted_task_fkey"
            columns: ["opted_task"]
            isOneToOne: false
            referencedRelation: "coaching_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_coaching_followup_opted_task_fkey"
            columns: ["opted_task"]
            isOneToOne: false
            referencedRelation: "current_trial_coaching"
            referencedColumns: ["task_id"]
          },
        ]
      }
      due_trial_coaching: {
        Row: {
          email: string | null
          language: string | null
          player_tag: string | null
          subscription_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
      due_trial_summary: {
        Row: {
          email: string | null
          language: string | null
          player_tag: string | null
          subscription_id: string | null
          task_id: string | null
          trial_ends_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_coaching_followup_summary_task_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "coaching_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_coaching_followup_summary_task_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "current_trial_coaching"
            referencedColumns: ["task_id"]
          },
        ]
      }
      trial_conversion_facts: {
        Row: {
          active_days: number | null
          ai_uses: number | null
          canceled_at: string | null
          card_seen: string | null
          chat_messages: number | null
          email: string | null
          first_paid_at: string | null
          first_return_after_end: string | null
          has_payment: boolean | null
          has_saved_summary: boolean | null
          is_test: boolean | null
          last_action_after_cancel: string | null
          last_seen: string | null
          linked_tags: number | null
          matched: string | null
          recommendation_seen: string | null
          renewal_off: boolean | null
          requested: string | null
          segment: string | null
          status: string | null
          subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          uncertain_d7: boolean | null
          user_id: string | null
          within_d7: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_api_measurements: { Args: { p_minutes?: number }; Returns: Json }
      acquisition_is_first: { Args: { p_user: string }; Returns: boolean }
      admin_first_value_report: {
        Args: {
          p_at?: string
          p_cohort?: string
          p_from?: string
          p_metric?: string
          p_offset?: number
          p_to?: string
        }
        Returns: Json
      }
      admin_marketing_reach: { Args: never; Returns: Json }
      admin_privacy_requests: {
        Args: never
        Returns: {
          assignee: string | null
          contact_email: string
          details: string | null
          due_at: string
          id: string
          kind: string
          outcome: string | null
          received_at: string
          responded_at: string | null
          status: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "privacy_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_return_results: {
        Args: { p_currency?: string; p_days: number; p_key: string }
        Returns: {
          arm: string
          assigned: number
          checkout_started: number
          dismissed: number
          full_price_renewals: number
          mature: number
          missing_payment_times: number
          paid_net_cents: number
          paying: number
          seen: number
          unreconciled_partial_refunds: number
        }[]
      }
      admin_revenue_detail: {
        Args: {
          p_at?: string
          p_from: string
          p_include_tests?: boolean
          p_limit?: number
          p_metric: string
          p_offset?: number
          p_to: string
        }
        Returns: Json
      }
      admin_revenue_overview: {
        Args: {
          p_at?: string
          p_from: string
          p_include_tests?: boolean
          p_to: string
        }
        Returns: Json
      }
      admin_set_marketing_age: {
        Args: { p_adult: boolean; p_user: string }
        Returns: undefined
      }
      admin_set_marketing_market: {
        Args: { p_market: string; p_user: string }
        Returns: undefined
      }
      admin_set_trial_test_account: {
        Args: { p_test: boolean; p_user: string }
        Returns: undefined
      }
      admin_trial_conversion: {
        Args: { p_days?: number; p_include_tests?: boolean }
        Returns: {
          active_days: number | null
          ai_uses: number | null
          canceled_at: string | null
          card_seen: string | null
          chat_messages: number | null
          email: string | null
          first_paid_at: string | null
          first_return_after_end: string | null
          has_payment: boolean | null
          has_saved_summary: boolean | null
          is_test: boolean | null
          last_action_after_cancel: string | null
          last_seen: string | null
          linked_tags: number | null
          matched: string | null
          recommendation_seen: string | null
          renewal_off: boolean | null
          requested: string | null
          segment: string | null
          status: string | null
          subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          uncertain_d7: boolean | null
          user_id: string | null
          within_d7: boolean | null
        }[]
        SetofOptions: {
          from: "*"
          to: "trial_conversion_facts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_trial_marketing: { Args: { p_days?: number }; Returns: Json }
      admin_unstarted_audience: {
        Args: { p_at?: string; p_include_tests?: boolean }
        Returns: Json
      }
      admin_update_privacy_request: {
        Args: {
          p_assignee: string
          p_id: string
          p_outcome: string
          p_status: string
        }
        Returns: undefined
      }
      admin_user_directory: {
        Args: {
          p_access?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
        }
        Returns: Json
      }
      admin_winback_candidates: { Args: never; Returns: Json[] }
      begin_confirmed_welcome: {
        Args: { p_payload: Json; p_user: string }
        Returns: Json
      }
      begin_reminder_send: {
        Args: { p_attempt: string; p_subscription: string; p_user: string }
        Returns: boolean
      }
      begin_summary_send: {
        Args: { p_attempt: string; p_subscription: string; p_user: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_identifier: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      claim_confirmed_welcome: {
        Args: { p_ticket: string }
        Returns: {
          email: string
          language: string
          payload: Json
          user_id: string
        }[]
      }
      claim_first_value: {
        Args: {
          p_language: string
          p_model: string
          p_tag: string
          p_user: string
        }
        Returns: Json
      }
      claim_first_value_translation: {
        Args: {
          p_hash: string
          p_language: string
          p_model: string
          p_user: string
        }
        Returns: Json
      }
      claim_marketing_delivery: {
        Args: { p_campaign: string; p_payload: Json; p_user: string }
        Returns: Json
      }
      claim_player_tag_for_trial: {
        Args: { p_player_tag: string; p_user_id: string }
        Returns: boolean
      }
      claim_polar_order_sync: { Args: { p_ticket: string }; Returns: number }
      claim_reminder_attempt: {
        Args: { p_ticket: string }
        Returns: {
          attempt: string
          attempt_task: string
          due_task: string
          email: string
          language: string
          payload: Json
          player_tag: string
          send_started_at: string
          subscription_id: string
          user_id: string
        }[]
      }
      claim_summary_attempt: {
        Args: { p_ticket: string }
        Returns: {
          attempt: string
          attempt_task: string
          due_task: string
          email: string
          language: string
          payload: Json
          player_tag: string
          send_started_at: string
          subscription_id: string
          user_id: string
        }[]
      }
      claim_trial_coaching_reminder: {
        Args: { p_ticket: string }
        Returns: {
          email: string
          language: string
          payload: Json
          player_tag: string
          subscription_id: string
          user_id: string
        }[]
      }
      claim_trial_summary: {
        Args: { p_ticket: string }
        Returns: {
          email: string
          language: string
          payload: Json
          player_tag: string
          subscription_id: string
          task_id: string
          trial_ends_at: string
          user_id: string
        }[]
      }
      claim_winback_delivery: {
        Args: { p_campaign: string; p_payload: Json; p_user: string }
        Returns: Json
      }
      cleanup_old_api_logs: { Args: never; Returns: undefined }
      detect_multi_account_abuse: {
        Args: { p_fingerprint_hash: string; p_user_id: string }
        Returns: boolean
      }
      detect_velocity_abuse: {
        Args: {
          p_feature_name: string
          p_max_requests?: number
          p_user_id: string
          p_window_seconds?: number
        }
        Returns: boolean
      }
      fail_first_value: {
        Args: { p_call: string; p_code: string; p_usage?: Json; p_user: string }
        Returns: undefined
      }
      finish_first_value: {
        Args: { p_call: string; p_result: Json; p_usage: Json; p_user: string }
        Returns: undefined
      }
      finish_polar_order_sync: {
        Args: { p_more: boolean; p_ticket: string }
        Returns: boolean
      }
      finish_trial_ai: {
        Args: { p_id: string; p_success: boolean }
        Returns: undefined
      }
      first_value_cohort: {
        Args: { p_at: string; p_cohort: string; p_from: string; p_to: string }
        Returns: {
          ai_calls: number
          anchor_at: string
          cohort: string
          cost_usd: number
          email: string
          feedback: string
          input_tokens: number
          output_tokens: number
          paid_at: string
          renewal_at: string
          steps: Json
          trial_at: string
          uncertain_calls: number
          undated_payment: boolean
          unknown_cost_calls: number
          user_id: string
        }[]
      }
      first_value_feedback: { Args: { p_reason?: string }; Returns: boolean }
      first_value_metric: {
        Args: { p_at: string; p_metric: string; p_row: Json }
        Returns: boolean
      }
      first_value_observe: {
        Args: { p_step: string; p_user: string }
        Returns: undefined
      }
      first_value_reason: { Args: { p_user: string }; Returns: string }
      first_value_request_allowed: {
        Args: { p_user: string }
        Returns: boolean
      }
      first_value_state: { Args: { p_user: string }; Returns: Json }
      freeze_reminder_attempt: {
        Args: {
          p_payload: Json
          p_subscription: string
          p_task: string
          p_user: string
        }
        Returns: {
          attempt: string
          payload: Json
        }[]
      }
      freeze_summary_attempt: {
        Args: {
          p_payload: Json
          p_subscription: string
          p_task: string
          p_user: string
        }
        Returns: {
          attempt: string
          payload: Json
        }[]
      }
      freeze_trial_coaching_reminder: {
        Args: { p_payload: Json; p_subscription: string; p_user: string }
        Returns: Json
      }
      freeze_trial_summary: {
        Args: {
          p_payload: Json
          p_subscription: string
          p_task: string
          p_user: string
        }
        Returns: Json
      }
      get_daily_feature_usage: {
        Args: { p_date?: string; p_feature_name: string; p_user_id: string }
        Returns: number
      }
      get_fraud_overview_stats: { Args: never; Returns: Json }
      get_my_first_value: { Args: never; Returns: Json }
      get_my_marketing_consent: {
        Args: { p_claim_invite?: boolean }
        Returns: Json
      }
      get_trial_funnel: {
        Args: { p_days?: number }
        Returns: {
          active_days: number
          ai_uses: number
          canceled_at: string
          chat_messages: number
          converted: boolean
          email: string
          hours_to_cancel: number
          last_seen: string
          linked_tags: number
          status: string
          trial_end: string
          trial_start: string
          user_id: string
        }[]
      }
      get_trial_revenue_metrics: { Args: { p_days?: number }; Returns: Json }
      get_user_activity_metrics: { Args: { p_user_id: string }; Returns: Json }
      has_admin_role: {
        Args: {
          p_role?: Database["public"]["Enums"]["admin_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { p_user_id: string }; Returns: boolean }
      is_player_tag_available_for_trial: {
        Args: { p_player_tag: string; p_user_id: string }
        Returns: boolean
      }
      mark_first_value_shown: { Args: { p_user: string }; Returns: Json }
      mark_marketing_delivery_uncertain: {
        Args: { p_campaign: string; p_key: string; p_user: string }
        Returns: undefined
      }
      mark_marketing_prompt: { Args: { p_action: string }; Returns: undefined }
      marketing_collection_open: { Args: never; Returns: boolean }
      marketing_collection_open_for: {
        Args: { p_user: string }
        Returns: boolean
      }
      marketing_collection_reason: { Args: { p_user: string }; Returns: string }
      marketing_decision: { Args: { p_user: string }; Returns: Json }
      marketing_in_scope: {
        Args: { p_list: string[]; p_market: string }
        Returns: boolean
      }
      marketing_market_of: { Args: { p_user: string }; Returns: string }
      marketing_state_at: {
        Args: { p_at?: string; p_user: string }
        Returns: {
          email: string
          event_id: number
          since: string
          source: string
          state: string
          text_version: string
          verified: boolean
        }[]
      }
      marketing_subscription_access: {
        Args: { p_at?: string; p_user: string }
        Returns: boolean
      }
      my_privacy_requests: {
        Args: never
        Returns: {
          due_at: string
          id: string
          kind: string
          outcome: string
          received_at: string
          responded_at: string
          status: string
        }[]
      }
      my_return_experiment: { Args: never; Returns: Json }
      observe_return_offer: {
        Args: { p_key: string; p_step: string }
        Returns: undefined
      }
      observe_trial_step: { Args: { p_step: string }; Returns: undefined }
      polar_positive_net: {
        Args: { p_amount: number; p_refunded: number; p_status: string }
        Returns: number
      }
      queue_confirmed_welcomes: {
        Args: { anon_key: string; project_url: string }
        Returns: undefined
      }
      queue_polar_order_sync: {
        Args: { anon_key: string; project_url: string }
        Returns: undefined
      }
      queue_trial_coaching_reminders: {
        Args: { anon_key: string; project_url: string }
        Returns: undefined
      }
      record_acquisition_step: { Args: { p_step: string }; Returns: undefined }
      record_checkout_created: { Args: { p_user: string }; Returns: undefined }
      record_confirmed_welcome: {
        Args: { p_message: string; p_user: string }
        Returns: boolean
      }
      record_first_value_error: {
        Args: { p_action: string; p_code: string; p_user: string }
        Returns: undefined
      }
      record_first_value_match: {
        Args: { p_match: Json; p_shown: string; p_user: string }
        Returns: Json
      }
      record_first_value_step: { Args: { p_step: string }; Returns: undefined }
      record_marketing_delivery: {
        Args: {
          p_campaign: string
          p_key: string
          p_message_id: string
          p_user: string
        }
        Returns: boolean
      }
      record_marketing_delivery_at: {
        Args: {
          p_accepted_at: string
          p_campaign: string
          p_key: string
          p_message_id: string
          p_user: string
        }
        Returns: boolean
      }
      record_marketing_suppression: {
        Args: { p_email: string; p_reason: string }
        Returns: undefined
      }
      record_polar_payment_dates: { Args: { p_dates: Json }; Returns: number }
      record_provider_email_event: {
        Args: {
          p_block_reason: string
          p_email: string
          p_event_id: string
          p_type: string
        }
        Returns: string
      }
      record_reminder_send: {
        Args: {
          p_attempt: string
          p_message: string
          p_subscription: string
          p_user: string
        }
        Returns: boolean
      }
      record_return_checkout: { Args: { p_user: string }; Returns: undefined }
      record_summary_send: {
        Args: {
          p_attempt: string
          p_message: string
          p_subscription: string
          p_user: string
        }
        Returns: boolean
      }
      release_reminder_attempt: {
        Args: { p_attempt: string; p_subscription: string; p_user: string }
        Returns: undefined
      }
      release_summary_attempt: {
        Args: { p_attempt: string; p_subscription: string; p_user: string }
        Returns: undefined
      }
      reserve_trial_ai: {
        Args: { p_feature: string; p_request_key: string; p_user_id: string }
        Returns: Json
      }
      revenue_cohort: {
        Args: {
          p_at?: string
          p_from: string
          p_include_tests: boolean
          p_to: string
        }
        Returns: {
          checkout_at: string
          continue_at: string
          current_sub_paid: boolean
          email: string
          first_paid_at: string
          first_renewal_at: string
          has_access: boolean
          has_payment: boolean
          is_test: boolean
          offer_seen_at: string
          pricing_at: string
          renewal_off: boolean
          signup_at: string
          sub_status: string
          trial_clicked_at: string
          trial_end: string
          trial_paid_at: string
          trial_payment_at: string
          trial_start: string
          trial_time_unknown: boolean
          trial_undated: boolean
          ui_measured: boolean
          undated_payment: boolean
          user_id: string
          verified_at: string
        }[]
      }
      revenue_metric_match: {
        Args: { c: Record<string, unknown>; p_at: string; p_metric: string }
        Returns: boolean
      }
      set_my_marketing_consent: {
        Args: {
          p_action: string
          p_expected: string
          p_language: string
          p_request_key: string
          p_source: string
          p_text_version: string
        }
        Returns: Json
      }
      submit_privacy_request: {
        Args: { p_details: string; p_kind: string }
        Returns: string
      }
      take_trial_coaching_reminder: {
        Args: { p_ticket: string }
        Returns: {
          email: string
          language: string
          player_tag: string
          subscription_id: string
          user_id: string
        }[]
      }
      take_trial_summary: {
        Args: { p_ticket: string }
        Returns: {
          email: string
          language: string
          player_tag: string
          subscription_id: string
          task_id: string
          trial_ends_at: string
          user_id: string
        }[]
      }
      trial_cancel_answers: {
        Args: { p_days: number }
        Returns: {
          reason: string
          total: number
        }[]
      }
      trial_coaching_state: { Args: never; Returns: Json }
      trial_summary_state: { Args: never; Returns: Json }
      unsubscribe_marketing: { Args: { p_user: string }; Returns: string }
      unsubscribe_marketing_delivery: {
        Args: { p_campaign: string; p_user: string }
        Returns: string
      }
      update_trial_coaching: {
        Args: { p_action: string; p_subscription: string; p_value?: string }
        Returns: Json
      }
      update_trial_summary:
        | { Args: { p_on: boolean; p_player_tag: string }; Returns: Json }
        | {
            Args: { p_on: boolean; p_player_tag: string; p_task: string }
            Returns: Json
          }
      update_user_fraud_score: { Args: { p_user_id: string }; Returns: number }
      winback_cooldown_at: {
        Args: { p_at: string; p_campaign?: string; p_user: string }
        Returns: Json
      }
      write_player_cache: {
        Args: { p_data: Json; p_tag: string; p_type: string }
        Returns: undefined
      }
    }
    Enums: {
      admin_role: "admin" | "moderator" | "support"
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
      admin_role: ["admin", "moderator", "support"],
      app_role: ["admin", "user"],
    },
  },
} as const
