import { useState, useEffect, useCallback } from "react";

import { supabase } from "@/integrations/supabase/client";
import { WHATS_NEW_VERSION as CURRENT_VERSION } from "@/components/announcements/WhatsNewModal";
const STORAGE_KEY = "whats-new-seen";
const ORACLE_RELEASE_DATE_KEY = "oracle-release-date";
const ORACLE_NEW_BADGE_DAYS = 7;

export function useWhatsNew({ autoOpen = true }: { autoOpen?: boolean } = {}) {
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showOracleNewBadge, setShowOracleNewBadge] = useState(false);

  useEffect(() => {
    if (!autoOpen) return;
    if (localStorage.getItem(STORAGE_KEY) === CURRENT_VERSION) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("whats_new_seen_version").eq("id", user.id).maybeSingle();
        if (data?.whats_new_seen_version === CURRENT_VERSION) {
          localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
          return;
        }
      }
      if (!cancelled) timer = setTimeout(() => setShowWhatsNew(true), 500);
    })();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [autoOpen]);

  useEffect(() => {
    // Check Oracle "NEW" badge expiration
    const releaseDate = localStorage.getItem(ORACLE_RELEASE_DATE_KEY);
    
    if (!releaseDate) {
      // First time seeing the feature - set the release date
      localStorage.setItem(ORACLE_RELEASE_DATE_KEY, new Date().toISOString());
      setShowOracleNewBadge(true);
    } else {
      // Check if 7 days have passed
      const release = new Date(releaseDate);
      const now = new Date();
      const daysDiff = (now.getTime() - release.getTime()) / (1000 * 60 * 60 * 24);
      setShowOracleNewBadge(daysDiff < ORACLE_NEW_BADGE_DAYS);
    }
  }, []);

  const dismissWhatsNew = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setShowWhatsNew(false);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from("profiles").update({ whats_new_seen_version: CURRENT_VERSION }).eq("id", user.id).then(() => {});
    });
  }, []);

  const openWhatsNew = useCallback(() => {
    setShowWhatsNew(true);
  }, []);

  return { showWhatsNew, dismissWhatsNew, openWhatsNew, showOracleNewBadge };
}
