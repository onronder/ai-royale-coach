-- Additional pre-release cohorts for the read-only forecast. The caller rolls back.
SET LOCAL search_path TO public, boundary_fixture;
INSERT INTO auth.users(id,email) SELECT account(n), 'impact'||n||'@example.invalid' FROM generate_series(10,24) n;
INSERT INTO user_subscriptions(user_id,status,account_slots,polar_subscription_id,current_period_end,cancel_at_period_end)
SELECT account(n), state, slots, 'impact-'||n, now()+days*interval '1 day', n=22 FROM (VALUES
  (10,'active',2,1),(11,'active',1,1),(12,'expired',1,-1),(13,'expired',1,-1),(14,'expired',1,-1),
  (15,'past_due',1,-1),(17,'expired',1,-1),(18,'expired',1,-1),(19,'trialing',1,-1),(20,'active',1,1),
  (21,'active',1,1),(22,'active',1,-1),(23,'expired',1,-1),(24,'expired',1,-1)
) s(n,state,slots,days);
UPDATE profiles SET trial_ends_at=NULL, trial_used=true WHERE id IN (SELECT account(n) FROM generate_series(10,24) n);
UPDATE profiles SET trial_ends_at=now()+interval '1 day', trial_used=false WHERE id=account(17);
INSERT INTO admin_roles(user_id,role) VALUES(account(18),'admin');
INSERT INTO player_profiles(user_id,player_tag,ai_enabled)
SELECT account(n), tag, enabled FROM (VALUES
  (10,'P99',true),(10,'#P99',false),(10,'P90',true),(11,'P99',false),(12,'P99',false),(12,'P90',false),
  (13,'P99',false),(13,'P88',false),(14,'#P99',false),(15,'P99',false),(16,'P99',false),
  (17,'P99',false),(18,'P99',false),(19,'P99',false),(20,'P99',true),(21,'P99',true),
  (21,'P90',true),(22,'P99',false),(23,'PJJ',false),(24,'PJJ',false)
) links(n,tag,enabled);
INSERT INTO analyses(player_tag,analysis_type,input_fingerprint,output) VALUES
  ('#P99','profile_summary','profile_#P99_100_20260101_en','{}'),
  ('P99','profile_summary','profile_P99_105_20260102_en','{}'),
  ('P90','profile_summary','profile_#P90_99_20260103_tr','{}'),
  ('#P99','profile_summary',fingerprint(20),'{}'),
  ('P88','profile_summary',fingerprint(13),'{}'),
  ('P90','deck','profile_P90_unrelated','{}'),
  ('P99','api_player','api_old_player','{}'),
  ('#P99','api_battles','api_old_battles','{}'),
  ('#PJJ','profile_summary','profile_'||account(23)||'_truncated_tr','{}');
