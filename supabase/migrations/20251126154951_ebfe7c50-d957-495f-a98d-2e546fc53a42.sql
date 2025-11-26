-- Create tournaments table
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  prize_pool INTEGER NOT NULL DEFAULT 0,
  entry_fee INTEGER NOT NULL DEFAULT 0,
  max_participants INTEGER NOT NULL,
  tournament_type TEXT NOT NULL CHECK (tournament_type IN ('single_elimination', 'double_elimination', 'round_robin')),
  status TEXT NOT NULL DEFAULT 'registration' CHECK (status IN ('registration', 'in_progress', 'completed', 'cancelled')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create tournament registrations
CREATE TABLE public.tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  player_tag TEXT NOT NULL,
  player_name TEXT NOT NULL,
  ranking INTEGER,
  is_eliminated BOOLEAN DEFAULT false,
  registered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

-- Create tournament brackets (matches)
CREATE TABLE public.tournament_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  player1_id UUID REFERENCES public.tournament_registrations(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES public.tournament_registrations(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES public.tournament_registrations(id) ON DELETE SET NULL,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create clans table
CREATE TABLE public.clans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_tag TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  badge_id INTEGER,
  type TEXT CHECK (type IN ('open', 'invite_only', 'closed')),
  required_trophies INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 0,
  war_trophies INTEGER DEFAULT 0,
  location TEXT,
  leader_tag TEXT,
  leader_name TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create clan join requests
CREATE TABLE public.clan_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID REFERENCES public.clans(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  player_tag TEXT NOT NULL,
  player_name TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clan_id, user_id)
);

-- Create saved decks table
CREATE TABLE public.saved_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cards JSONB NOT NULL,
  archetype TEXT,
  avg_elixir DECIMAL(3,1),
  synergy_score INTEGER,
  meta_score INTEGER,
  win_rate DECIMAL(5,2),
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_decks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournaments
CREATE POLICY "Anyone can view tournaments"
ON public.tournaments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create tournaments"
ON public.tournaments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Tournament creators can update their tournaments"
ON public.tournaments FOR UPDATE
USING (auth.uid() = created_by);

-- RLS Policies for tournament registrations
CREATE POLICY "Anyone can view tournament registrations"
ON public.tournament_registrations FOR SELECT USING (true);

CREATE POLICY "Users can register for tournaments"
ON public.tournament_registrations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for tournament brackets
CREATE POLICY "Anyone can view tournament brackets"
ON public.tournament_brackets FOR SELECT USING (true);

-- RLS Policies for clans
CREATE POLICY "Anyone can view clans"
ON public.clans FOR SELECT USING (true);

-- RLS Policies for clan join requests
CREATE POLICY "Users can view own join requests"
ON public.clan_join_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create join requests"
ON public.clan_join_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for saved decks
CREATE POLICY "Users can view own decks"
ON public.saved_decks FOR SELECT
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create own decks"
ON public.saved_decks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own decks"
ON public.saved_decks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own decks"
ON public.saved_decks FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_tournaments_status ON public.tournaments(status);
CREATE INDEX idx_tournaments_start_date ON public.tournaments(start_date);
CREATE INDEX idx_tournament_registrations_tournament ON public.tournament_registrations(tournament_id);
CREATE INDEX idx_tournament_brackets_tournament ON public.tournament_brackets(tournament_id);
CREATE INDEX idx_tournament_brackets_round ON public.tournament_brackets(tournament_id, round_number);
CREATE INDEX idx_clans_tag ON public.clans(clan_tag);
CREATE INDEX idx_clans_war_trophies ON public.clans(war_trophies DESC);
CREATE INDEX idx_clan_join_requests_status ON public.clan_join_requests(status);
CREATE INDEX idx_saved_decks_user ON public.saved_decks(user_id);
CREATE INDEX idx_saved_decks_public ON public.saved_decks(is_public) WHERE is_public = true;

-- Enable realtime for tournaments and brackets
ALTER TABLE public.tournaments REPLICA IDENTITY FULL;
ALTER TABLE public.tournament_brackets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_brackets;

-- Triggers for updated_at
CREATE TRIGGER update_tournaments_updated_at
BEFORE UPDATE ON public.tournaments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_clans_updated_at
BEFORE UPDATE ON public.clans
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_clan_join_requests_updated_at
BEFORE UPDATE ON public.clan_join_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_saved_decks_updated_at
BEFORE UPDATE ON public.saved_decks
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();