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

    // Calculate meta trends
    const trends = archetypes.map((arch: any) => {
      const relatedTemplates = templates.filter((t: any) => t.archetype === arch.name);
      const avgWinRate = relatedTemplates.reduce((sum: number, t: any) => sum + (t.win_rate || 50), 0) / (relatedTemplates.length || 1);
      const avgUsageRate = relatedTemplates.reduce((sum: number, t: any) => sum + (t.usage_rate || 5), 0) / (relatedTemplates.length || 1);
      
      // Simulate trend calculation (in production, this would compare historical data)
      const change7d = (Math.random() - 0.5) * 10;
      const trend = change7d > 3 ? 'hot' : change7d < -3 ? 'cold' : 'stable';
      
      const popularity = relatedTemplates.reduce((sum: number, t: any) => sum + (t.popularity_score || 50), 0) / (relatedTemplates.length || 1);

      return {
        archetype: arch.name,
        win_rate: avgWinRate,
        usage_rate: avgUsageRate,
        trend,
        change_7d: change7d,
        popularity,
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
