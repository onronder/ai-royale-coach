-- Phase 1: Add DELETE RLS policies to all user-owned tables
-- These allow users to delete their own data

-- chat_messages: Users can delete own chat messages
CREATE POLICY "Users can delete own chat messages" 
ON public.chat_messages 
FOR DELETE 
USING (auth.uid() = user_id);

-- card_collection: Users can delete own card collection
CREATE POLICY "Users can delete own card collection" 
ON public.card_collection 
FOR DELETE 
USING (auth.uid() = user_id);

-- card_mastery: Users can delete own card mastery
CREATE POLICY "Users can delete own card mastery" 
ON public.card_mastery 
FOR DELETE 
USING (auth.uid() = user_id);

-- deck_usage_stats: Users can delete own deck stats
CREATE POLICY "Users can delete own deck stats" 
ON public.deck_usage_stats 
FOR DELETE 
USING (auth.uid() = user_id);

-- user_achievements: Users can delete own achievements
CREATE POLICY "Users can delete own achievements" 
ON public.user_achievements 
FOR DELETE 
USING (auth.uid() = user_id);

-- achievement_progress: Users can delete own progress
CREATE POLICY "Users can delete own progress" 
ON public.achievement_progress 
FOR DELETE 
USING (auth.uid() = user_id);

-- matchup_predictions: Users can delete own predictions
CREATE POLICY "Users can delete own predictions" 
ON public.matchup_predictions 
FOR DELETE 
USING (auth.uid() = user_id);

-- user_ai_usage: Users can delete own AI usage
CREATE POLICY "Users can delete own AI usage" 
ON public.user_ai_usage 
FOR DELETE 
USING (auth.uid() = user_id);

-- Phase 2: Add performance indexes for player_tag lookups
CREATE INDEX IF NOT EXISTS idx_notifications_player_tag ON public.notifications(player_tag);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_player_tag ON public.tournament_registrations(player_tag);
CREATE INDEX IF NOT EXISTS idx_clan_join_requests_player_tag ON public.clan_join_requests(player_tag);

-- Analyze tables to update statistics
ANALYZE public.notifications;
ANALYZE public.tournament_registrations;
ANALYZE public.clan_join_requests;