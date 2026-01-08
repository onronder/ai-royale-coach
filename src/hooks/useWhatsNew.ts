import { useState, useEffect, useCallback } from "react";

const CURRENT_VERSION = "1.0.0";
const STORAGE_KEY = "whats-new-seen";
const ORACLE_RELEASE_DATE_KEY = "oracle-release-date";
const ORACLE_NEW_BADGE_DAYS = 7;

export function useWhatsNew() {
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showOracleNewBadge, setShowOracleNewBadge] = useState(false);

  useEffect(() => {
    const seenVersion = localStorage.getItem(STORAGE_KEY);
    if (seenVersion !== CURRENT_VERSION) {
      // Small delay to let the dashboard load first
      const timer = setTimeout(() => {
        setShowWhatsNew(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

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
  }, []);

  const openWhatsNew = useCallback(() => {
    setShowWhatsNew(true);
  }, []);

  return { showWhatsNew, dismissWhatsNew, openWhatsNew, showOracleNewBadge };
}
