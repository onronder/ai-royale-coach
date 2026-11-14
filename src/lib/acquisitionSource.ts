import { supabase } from "@/integrations/supabase/client";

const KEY = "air_acquisition_source";

/** Remember the first landing's UTM/referrer on this device (first touch wins). */
export function captureAcquisitionSource() {
  try {
    if (localStorage.getItem(KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const src: Record<string, string> = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref"].forEach((k) => {
      const v = params.get(k);
      if (v) src[k] = v.slice(0, 120);
    });
    if (document.referrer && !document.referrer.startsWith(window.location.origin)) {
      src.referrer = document.referrer.slice(0, 200);
    }
    src.landing_path = window.location.pathname.slice(0, 120);
    src.captured_at = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(src));
  } catch {
    /* storage unavailable */
  }
}

/** Save the remembered source on the profile once, only if none is stored yet. */
export async function persistAcquisitionSource(userId: string) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    await supabase
      .from("profiles")
      .update({ acquisition_source: JSON.parse(raw) })
      .eq("id", userId)
      .is("acquisition_source", null);
  } catch {
    /* non-critical */
  }
}
