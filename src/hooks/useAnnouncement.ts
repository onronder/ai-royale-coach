import { useState, useEffect, useCallback } from 'react';

interface Announcement {
  id: string;
  translationKey: string;
  icon: string;
  gradient: string;
  iconColor: string;
  textColor: string;
  link?: string;
  expiresAt?: Date;
}

// All announcements to rotate through
const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'oracle-2026',
    translationKey: 'oracle',
    icon: 'Eye',
    gradient: 'from-emerald to-emerald/80',
    iconColor: 'text-emerald-foreground',
    textColor: 'text-emerald-foreground',
    link: '/oracle',
    expiresAt: new Date('2026-02-15'),
  },
  {
    id: 'pro-dna-2026',
    translationKey: 'proDna',
    icon: 'Dna',
    gradient: 'from-purple-500 to-violet-500',
    iconColor: 'text-white',
    textColor: 'text-white',
    link: '/dashboard?tab=analytics',
    expiresAt: new Date('2026-02-15'),
  },
  {
    id: 'dream-arena-2026',
    translationKey: 'dreamArena',
    icon: 'Swords',
    gradient: 'from-orange-500 to-amber-500',
    iconColor: 'text-white',
    textColor: 'text-white',
    link: '/dream-arena',
    expiresAt: new Date('2026-02-15'),
  },
  {
    id: 'ai-pro-2026',
    translationKey: 'aiPro',
    icon: 'Sparkles',
    gradient: 'from-primary to-cyan-500',
    iconColor: 'text-primary-foreground',
    textColor: 'text-primary-foreground',
    link: '/settings',
    expiresAt: new Date('2026-02-15'),
  },
];

const STORAGE_KEY = 'dismissed-announcements';
const ROTATION_KEY = 'announcement-rotation-index';
const DISMISS_DURATION_DAYS = 7;

interface DismissedAnnouncement {
  id: string;
  dismissedAt: number;
}

function getValidAnnouncements(): Announcement[] {
  const now = new Date();
  return ANNOUNCEMENTS.filter(a => !a.expiresAt || now <= a.expiresAt);
}

function getDismissedIds(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Set();
    
    const dismissed: DismissedAnnouncement[] = JSON.parse(stored);
    const now = new Date();
    const validDismissals = new Set<string>();
    
    dismissed.forEach(d => {
      const dismissedDate = new Date(d.dismissedAt);
      const expiryDate = new Date(dismissedDate);
      expiryDate.setDate(expiryDate.getDate() + DISMISS_DURATION_DAYS);
      
      if (now < expiryDate) {
        validDismissals.add(d.id);
      }
    });
    
    return validDismissals;
  } catch {
    return new Set();
  }
}

function getNextAnnouncementIndex(validAnnouncements: Announcement[], dismissedIds: Set<string>): number {
  try {
    const storedIndex = localStorage.getItem(ROTATION_KEY);
    let startIndex = storedIndex ? parseInt(storedIndex, 10) : 0;
    
    // Find next non-dismissed announcement
    for (let i = 0; i < validAnnouncements.length; i++) {
      const index = (startIndex + i) % validAnnouncements.length;
      if (!dismissedIds.has(validAnnouncements[index].id)) {
        // Store the next index for rotation
        localStorage.setItem(ROTATION_KEY, String((index + 1) % validAnnouncements.length));
        return index;
      }
    }
    
    return -1; // All dismissed
  } catch {
    return 0;
  }
}

export function useAnnouncement() {
  const [isVisible, setIsVisible] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement>(ANNOUNCEMENTS[0]);

  useEffect(() => {
    const validAnnouncements = getValidAnnouncements();
    if (validAnnouncements.length === 0) {
      setIsVisible(false);
      return;
    }

    const dismissedIds = getDismissedIds();
    const index = getNextAnnouncementIndex(validAnnouncements, dismissedIds);
    
    if (index === -1) {
      setIsVisible(false);
      return;
    }
    
    setAnnouncement(validAnnouncements[index]);
    setIsVisible(true);
  }, []);

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
