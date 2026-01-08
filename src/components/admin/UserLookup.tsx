import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, User, Tag, Shield } from 'lucide-react';
import { FraudReviewPanel } from './FraudReviewPanel';

/**
 * Search for users by email or player tag to view their fraud status.
 */
export function UserLookup() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'email' | 'player_tag'>('email');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: searchResults, isLoading, refetch } = useQuery({
    queryKey: ['user-lookup', searchQuery, searchType],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];

      if (searchType === 'email') {
        // Search by email in profiles
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, email')
          .ilike('email', `%${searchQuery}%`)
          .limit(10);

        if (error) throw error;

        // Get fraud status for found users
        if (!profiles?.length) return [];

        const userIds = profiles.map(p => p.id);
        const { data: fraudStatuses } = await supabase
          .from('user_fraud_status')
          .select('*')
          .in('user_id', userIds);

        return profiles.map(profile => ({
          user_id: profile.id,
          email: profile.email,
          fraud_status: fraudStatuses?.find(fs => fs.user_id === profile.id) || null,
        }));
      } else {
        // Search by player tag
        const normalizedTag = searchQuery.replace('#', '').toUpperCase();
        const { data: playerProfiles, error } = await supabase
          .from('player_profiles')
          .select('user_id, player_tag')
          .ilike('player_tag', `%${normalizedTag}%`)
          .limit(10);

        if (error) throw error;

        if (!playerProfiles?.length) return [];

        const userIds = [...new Set(playerProfiles.map(p => p.user_id))];
        
        const [{ data: profiles }, { data: fraudStatuses }] = await Promise.all([
          supabase.from('profiles').select('id, email').in('id', userIds),
          supabase.from('user_fraud_status').select('*').in('user_id', userIds),
        ]);

        return userIds.map(userId => ({
          user_id: userId,
          email: profiles?.find(p => p.id === userId)?.email || t('common.unknown'),
          player_tags: playerProfiles.filter(pp => pp.user_id === userId).map(pp => pp.player_tag),
          fraud_status: fraudStatuses?.find(fs => fs.user_id === userId) || null,
        }));
      }
    },
    enabled: false,
  });

  const handleSearch = () => {
    refetch();
  };

  if (selectedUserId) {
    return (
      <FraudReviewPanel
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          {t('admin.userLookup.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Controls */}
        <div className="flex gap-2">
          <Button
            variant={searchType === 'email' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchType('email')}
          >
            <User className="h-4 w-4 mr-1" />
            {t('admin.userLookup.email')}
          </Button>
          <Button
            variant={searchType === 'player_tag' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSearchType('player_tag')}
          >
            <Tag className="h-4 w-4 mr-1" />
            {t('admin.userLookup.playerTag')}
          </Button>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder={searchType === 'email' ? t('admin.userLookup.searchByEmail') : t('admin.userLookup.searchByPlayerTag')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isLoading}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            {t('common.searching')}
          </div>
        ) : searchResults?.length ? (
          <div className="space-y-2">
            {searchResults.map((result) => (
              <div
                key={result.user_id}
                className="p-4 rounded-lg bg-muted/50 flex items-center justify-between cursor-pointer hover:bg-muted transition-colors"
                onClick={() => setSelectedUserId(result.user_id)}
              >
                <div>
                  <div className="font-medium">{result.email}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {result.user_id}
                  </div>
                  {'player_tags' in result && Array.isArray(result.player_tags) && result.player_tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {(result.player_tags as string[]).map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {result.fraud_status ? (
                    <>
                      <span className={`text-sm font-medium ${
                        result.fraud_status.fraud_score >= 70 ? 'text-red-500' :
                        result.fraud_status.fraud_score >= 40 ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {t('admin.userLookup.score')}: {result.fraud_status.fraud_score}
                      </span>
                      {result.fraud_status.status === 'soft_blocked' && (
                        <Shield className="h-4 w-4 text-red-500" />
                      )}
                    </>
                  ) : (
                    <Badge variant="outline" className="text-green-500">{t('admin.userLookup.clean')}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : searchQuery && !isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            {t('admin.userLookup.noUsersFound')}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
