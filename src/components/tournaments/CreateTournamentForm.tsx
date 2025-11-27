import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trophy } from "lucide-react";

interface CreateTournamentFormProps {
  onSuccess: () => void;
}

export function CreateTournamentForm({ onSuccess }: CreateTournamentFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prizePool, setPrizePool] = useState("0");
  const [entryFee, setEntryFee] = useState("0");
  const [maxParticipants, setMaxParticipants] = useState("16");
  const [startDate, setStartDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be signed in to create a tournament");
        return;
      }

      const { error } = await supabase.from('tournaments').insert({
        name,
        description: description || null,
        prize_pool: parseInt(prizePool),
        entry_fee: parseInt(entryFee),
        max_participants: parseInt(maxParticipants),
        start_date: new Date(startDate).toISOString(),
        tournament_type: 'single_elimination',
        status: 'registration',
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Tournament created successfully!");
      onSuccess();
      
      // Reset form
      setName("");
      setDescription("");
      setPrizePool("0");
      setEntryFee("0");
      setMaxParticipants("16");
      setStartDate("");
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast.error("Failed to create tournament");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Create New Tournament
        </CardTitle>
        <CardDescription>
          Set up a new Clash Royale tournament for players to compete
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tournament Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Weekend Warriors Championship"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your tournament..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prizePool">Prize Pool</Label>
              <Input
                id="prizePool"
                type="number"
                min="0"
                value={prizePool}
                onChange={(e) => setPrizePool(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entryFee">Entry Fee</Label>
              <Input
                id="entryFee"
                type="number"
                min="0"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxParticipants">Max Participants *</Label>
              <Input
                id="maxParticipants"
                type="number"
                min="2"
                max="256"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Tournament"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}