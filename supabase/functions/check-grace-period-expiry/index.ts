import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExpiredTrialUser {
  id: string;
  email: string;
  trial_ends_at: string;
  preferred_language: string | null;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("[check-grace-period-expiry] Starting scheduled check");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find users with expired grace period trials:
    // - trial_ends_at is in the past
    // - trial_used is false (haven't been processed yet)
    // - No active Polar subscription
    const { data: expiredUsers, error: queryError } = await supabase
      .from("profiles")
      .select("id, email, trial_ends_at, preferred_language")
      .lt("trial_ends_at", new Date().toISOString())
      .eq("trial_used", false)
      .not("trial_ends_at", "is", null);

    if (queryError) {
      console.error("[check-grace-period-expiry] Query error:", queryError);
      throw queryError;
    }

    if (!expiredUsers || expiredUsers.length === 0) {
      console.log("[check-grace-period-expiry] No expired grace period users found");
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: "No expired grace period users found",
          duration_ms: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[check-grace-period-expiry] Found ${expiredUsers.length} expired users`);

    const processed: string[] = [];
    const errors: { userId: string; error: string }[] = [];

    for (const user of expiredUsers as ExpiredTrialUser[]) {
      try {
        // Check if user has an active Polar subscription (skip if they do)
        const { data: subscription } = await supabase
          .from("user_subscriptions")
          .select("status")
          .eq("user_id", user.id)
          .in("status", ["active", "trialing"])
          .single();

        if (subscription) {
          console.log(`[check-grace-period-expiry] User ${user.id} has active subscription, skipping`);
          // Still mark as used since they're covered by subscription
          await supabase
            .from("profiles")
            .update({ trial_used: true, updated_at: new Date().toISOString() })
            .eq("id", user.id);
          continue;
        }

        // Mark trial as used
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ trial_used: true, updated_at: new Date().toISOString() })
          .eq("id", user.id);

        if (updateError) {
          throw updateError;
        }

        // Send trial expired email
        if (user.email) {
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              type: "trial_expired",
              email: user.email,
              language: user.preferred_language || "en",
            }),
          });

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error(`[check-grace-period-expiry] Failed to send email to ${user.email}:`, errorText);
            errors.push({ userId: user.id, error: `Email failed: ${errorText}` });
          } else {
            console.log(`[check-grace-period-expiry] Sent expiry email to ${user.email}`);
          }
        }

        processed.push(user.id);
        console.log(`[check-grace-period-expiry] Processed user ${user.id} (${user.email})`);
      } catch (userError) {
        const errorMessage = userError instanceof Error ? userError.message : String(userError);
        console.error(`[check-grace-period-expiry] Error processing user ${user.id}:`, errorMessage);
        errors.push({ userId: user.id, error: errorMessage });
      }
    }

    const result = {
      success: true,
      processed: processed.length,
      errors: errors.length,
      errorDetails: errors,
      duration_ms: Date.now() - startTime,
    };

    console.log("[check-grace-period-expiry] Completed:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[check-grace-period-expiry] Fatal error:", errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        duration_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
