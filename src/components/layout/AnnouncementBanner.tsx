import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Eye, Zap, Star, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAnnouncement } from '@/hooks/useAnnouncement';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Eye,
  Zap,
  Star,
  Trophy,
  Sparkles,
};

export function AnnouncementBanner() {
  const { t } = useTranslation();
  const { isVisible, announcement, dismiss } = useAnnouncement();

  if (!isVisible) return null;

  const IconComponent = iconMap[announcement.icon] || Sparkles;
  const translationBase = `announcement.${announcement.translationKey}`;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div
            className={cn(
              'relative w-full bg-gradient-to-r py-2 px-4',
              announcement.gradient
            )}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_ease-in-out_infinite] bg-[length:200%_100%]" />
            
            <div className="relative flex items-center justify-center gap-2 sm:gap-3 text-sm">
              {/* NEW badge */}
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 500 }}
                className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/20 text-xs font-bold uppercase tracking-wider"
              >
                <Sparkles className="h-3 w-3" />
                {t('announcement.new')}
              </motion.span>

              {/* Icon with pulse animation */}
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <IconComponent className={cn('h-4 w-4', announcement.iconColor)} />
              </motion.div>

              {/* Text content */}
              <span className="font-medium text-emerald-foreground">
                <span className="font-bold">{t(`${translationBase}.title`)}</span>
                <span className="hidden sm:inline"> – {t(`${translationBase}.description`)}</span>
              </span>

              {/* CTA link */}
              {announcement.link && (
                <Link
                  to={announcement.link}
                  onClick={dismiss}
                  className="ml-1 sm:ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/20 hover:bg-background/30 text-xs font-semibold transition-colors"
                >
                  {t(`${translationBase}.cta`)}
                  <span className="hidden sm:inline">→</span>
                </Link>
              )}

              {/* Dismiss button */}
              <button
                onClick={dismiss}
                className="absolute right-2 sm:right-4 p-1 rounded-full hover:bg-background/20 transition-colors"
                aria-label={t('common.dismiss')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
