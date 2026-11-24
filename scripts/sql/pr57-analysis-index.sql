-- Run as its own top-level statement after 0055, outside a transaction block.
CREATE INDEX CONCURRENTLY analyses_owner_player_history
  ON public.analyses(user_id, analysis_type, player_tag, created_at DESC);
