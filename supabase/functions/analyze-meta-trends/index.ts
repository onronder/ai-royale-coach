import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch deck archetypes from database
    const { data: archetypes, error: dbError } = await supabase
      .from('deck_archetypes')
      .select('*');

    if (dbError) throw dbError;

    // Fetch deck templates for usage/win rate data
    const { data: templates, error: templatesError } = await supabase
      .from('deck_templates')
      .select('*');

    if (templatesError) throw templatesError;

    // Calculate real trends from actual data
    // Note: Without historical snapshots, we can't calculate real trends
    // This would require storing daily/weekly meta snapshots
    const trends = archetypes.map((arch: any) => {
      const relatedTemplates = templates.filter((t: any) => t.archetype === arch.name);
      
      // Count actual usage from templates (real data from DB)
      const templateCount = relatedTemplates.length;
      const popularity = relatedTemplates.reduce((sum: number, t: any) => sum + (t.popularity_score || 0), 0) / (relatedTemplates.length || 1);

      return {
        archetype: arch.name,
        template_count: templateCount,
        popularity,
        // Trend calculation requires historical data snapshots
        trend: 'stable',
        change_7d: 0,
        note: 'Historical trend data not available - requires time-series snapshots'
      };
    });

    // Sort by popularity
    trends.sort((a: any, b: any) => b.popularity - a.popularity);

    return new Response(
      JSON.stringify({ trends }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-meta-trends:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
