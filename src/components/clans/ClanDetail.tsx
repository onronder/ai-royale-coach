import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Shield, MapPin, Send } from "lucide-react";
import { toast } from "sonner";

interface Clan {
  id?: string;
  rank?: number;
  clan_tag: string;
  name: string;
  description?: string | null;
  type?: string | null;
  required_trophies?: number;
  member_count: number;
  war_trophies?: number;
  clan_score?: number;
  clan_war_trophies?: number;
  location?: string | null;
  badge_id?: number;
}

interface ClanDetailProps {
  clan: Clan | null;
  isOpen: boolean;
  onClose: () => void;
  playerTag: string;
  playerName: string;
}

export function ClanDetail({ clan, isOpen, onClose, playerTag, playerName }: ClanDetailProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const getClanTypeColor = (type: string | null) => {
    switch (type) {
      case 'open': return 'bg-green-500';
      case 'invite_only': return 'bg-yellow-500';
      case 'closed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleJoinRequest = async () => {
    if (!clan) return;

    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) {
      toast.error('Please sign in to send a join request');
      return;
    }

    setIsSending(true);
    const { error } = await supabase
      .from('clan_join_requests')
      .insert({
        clan_id: clan.id,
        user_id: session.session.user.id,
        player_tag: playerTag,
        player_name: playerName,
        message: message.trim() || null
      });

    if (error) {
      console.error('Join request error:', error);
      if (error.code === '23505') {
        toast.error('You already have a pending request to this clan');
      } else {
        toast.error('Failed to send join request');
      }
    } else {
      toast.success('Join request sent successfully!');
      setMessage("");
      onClose();
    }
    setIsSending(false);
  };

  if (!clan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Clan Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{clan.name}</h2>
              <p className="text-muted-foreground">{clan.clan_tag}</p>
              <Badge className={`${getClanTypeColor(clan.type)} text-white`}>
                {clan.type?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>
          </div>

          {clan.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{clan.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Members</p>
                <p className="font-semibold">{clan.member_count} / 50</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Trophy className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Required Trophies</p>
                <p className="font-semibold">{(clan.required_trophies || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Shield className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">{clan.clan_score ? 'Clan Score' : 'War Trophies'}</p>
                <p className="font-semibold">{(clan.clan_score || clan.war_trophies || 0).toLocaleString()}</p>
              </div>
            </div>

            {clan.location && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <MapPin className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-semibold">{clan.location}</p>
                </div>
              </div>
            )}
          </div>

          {clan.type !== 'closed' && clan.id && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold">Send Join Request</h3>
              <Textarea
                placeholder="Tell the clan leaders why you want to join (optional)..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <Button 
                className="w-full" 
                onClick={handleJoinRequest}
                disabled={isSending}
              >
                <Send className="w-4 h-4 mr-2" />
                {isSending ? 'Sending...' : 'Send Join Request'}
              </Button>
            </div>
          )}

          {clan.type !== 'closed' && !clan.id && (
            <div className="pt-4 border-t text-center">
              <p className="text-sm text-muted-foreground">
                Search for this clan by tag to send a join request
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
