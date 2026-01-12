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
      profiles: {
        Row: {
          chat_retention_days: number | null
          created_at: string | null
          email: string | null
          id: string
          onboarding_completed_at: string | null
          preferred_language: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          trial_used: boolean | null
          updated_at: string | null
          winback_email_sent_at: string | null
        }
        Insert: {
          chat_retention_days?: number | null
          created_at?: string | null
          email?: string | null
          id: string
          onboarding_completed_at?: string | null
          preferred_language?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          trial_used?: boolean | null
          updated_at?: string | null
          winback_email_sent_at?: string | null
        }
        Update: {
          chat_retention_days?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          onboarding_completed_at?: string | null
          preferred_language?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          trial_used?: boolean | null
          updated_at?: string | null
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
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
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
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
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
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
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
      winback_campaigns: {
        Row: {
          admin_user_id: string
          created_at: string
          discount_percent: number
          id: string
          promo_code: string
          sent_at: string
          target_email: string
          target_user_id: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          discount_percent: number
          id?: string
          promo_code: string
          sent_at?: string
          target_email: string
          target_user_id: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          discount_percent?: number
          id?: string
          promo_code?: string
          sent_at?: string
          target_email?: string
          target_user_id?: string
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
      claim_player_tag_for_trial: {
        Args: { p_player_tag: string; p_user_id: string }
        Returns: boolean
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
      get_daily_feature_usage: {
        Args: { p_date?: string; p_feature_name: string; p_user_id: string }
        Returns: number
      }
      get_fraud_overview_stats: { Args: never; Returns: Json }
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
      update_user_fraud_score: { Args: { p_user_id: string }; Returns: number }
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
      admin_role: ["admin", "moderator", "support"],
      app_role: ["admin", "user"],
    },
  },
} as const
