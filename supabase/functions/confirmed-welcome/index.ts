import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import * as React from "https://esm.sh/react@18.3.1";
import { renderAsync } from "https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1";
import { productLanguage } from "../_shared/language.ts";
import { WelcomeEmail, getWelcomeSubject } from "../_shared/welcome-email.tsx";
import { deliverWelcome } from "./delivery.ts";

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    return await deliverWelcome(
      req,
      async (name, args) => {
        const { data, error } = await db.rpc(name, args);
        if (error) throw error;
        return data;
      },
      async (signup) => {
        const language = productLanguage(signup.language);
        const appUrl = Deno.env.get("APP_URL") || "https://ai-royale.com";
        return {
          from: "AI Royale <noreply@notification.ai-royale.com>",
          to: [signup.email],
          subject: getWelcomeSubject(language),
          html: await renderAsync(React.createElement(WelcomeEmail, { language, appUrl })),
        };
      },
      async (mail, key) => {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + Deno.env.get("RESEND_API_KEY"),
            "Content-Type": "application/json",
            "Idempotency-Key": key,
          },
          body: JSON.stringify(mail),
          signal: AbortSignal.timeout(10000),
        });
        const id = response.ok && (await response.json()).id;
        if (typeof id !== "string" || !id) throw new Error("Missing provider acceptance");
        return id;
      },
    );
  } catch {
    console.error("Confirmed welcome could not be delivered or recorded");
    return new Response(null, { status: 503 });
  }
});
