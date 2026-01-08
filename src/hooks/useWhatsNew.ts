import { useState, useEffect, useCallback } from "react";

const CURRENT_VERSION = "1.0.0";
const STORAGE_KEY = "whats-new-seen";

export function useWhatsNew() {
  const [showWhatsNew, setShowWhatsNew] = useState(false);

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

  const dismissWhatsNew = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    setShowWhatsNew(false);
  }, []);

  return { showWhatsNew, dismissWhatsNew };
}
