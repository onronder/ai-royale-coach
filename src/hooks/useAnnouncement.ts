import { useState, useEffect, useCallback } from 'react';

interface Announcement {
  id: string;
  translationKey: string;
  icon: string;
  gradient: string;
  iconColor: string;
  link?: string;
  expiresAt?: Date;
}

// Current announcement - update this when you have new features to announce
const CURRENT_ANNOUNCEMENT: Announcement = {
  id: 'oracle-launch-2025',
  translationKey: 'oracle',
  icon: 'Eye',
  gradient: 'from-emerald to-emerald/80',
  iconColor: 'text-emerald-foreground',
  link: '/oracle',
  expiresAt: new Date('2025-02-15'), // Show for ~1 month
};

const STORAGE_KEY = 'dismissed-announcements';
const DISMISS_DURATION_DAYS = 7;

interface DismissedAnnouncement {
  id: string;
  dismissedAt: number;
}

export function useAnnouncement() {
  const [isVisible, setIsVisible] = useState(false);
  const [announcement] = useState<Announcement>(CURRENT_ANNOUNCEMENT);

  useEffect(() => {
    // Check if announcement has expired
    if (announcement.expiresAt && new Date() > announcement.expiresAt) {
      setIsVisible(false);
      return;
    }

    // Check localStorage for dismissed announcements
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const dismissed: DismissedAnnouncement[] = JSON.parse(stored);
        const found = dismissed.find(d => d.id === announcement.id);
        
        if (found) {
          const dismissedDate = new Date(found.dismissedAt);
          const expiryDate = new Date(dismissedDate);
          expiryDate.setDate(expiryDate.getDate() + DISMISS_DURATION_DAYS);
          
          // If dismissal hasn't expired, keep hidden
          if (new Date() < expiryDate) {
            setIsVisible(false);
            return;
          }
        }
      }
      
      // Show the announcement
      setIsVisible(true);
    } catch {
      // On error, show announcement
      setIsVisible(true);
    }
  }, [announcement.id, announcement.expiresAt]);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const dismissed: DismissedAnnouncement[] = stored ? JSON.parse(stored) : [];
      
      // Update or add dismissal record
      const existingIndex = dismissed.findIndex(d => d.id === announcement.id);
      const newRecord: DismissedAnnouncement = {
        id: announcement.id,
        dismissedAt: Date.now(),
      };
      
      if (existingIndex >= 0) {
        dismissed[existingIndex] = newRecord;
      } else {
        dismissed.push(newRecord);
      }
      
      // Keep only recent dismissals (last 10)
      const recentDismissed = dismissed.slice(-10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentDismissed));
    } catch {
      // Silently fail on localStorage errors
    }
  }, [announcement.id]);

  return {
    isVisible,
    announcement,
    dismiss,
  };
}
