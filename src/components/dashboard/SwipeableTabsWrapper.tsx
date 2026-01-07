import { ReactNode, useRef } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";

interface SwipeableTabsWrapperProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: string[];
}

export const SwipeableTabsWrapper = ({
  children,
  activeTab,
  onTabChange,
  tabs,
}: SwipeableTabsWrapperProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5]);

  const currentIndex = tabs.indexOf(activeTab);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    const velocityThreshold = 500;

    const isSwipeLeft = info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold;
    const isSwipeRight = info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold;

    if (isSwipeLeft && currentIndex < tabs.length - 1) {
      onTabChange(tabs[currentIndex + 1]);
    } else if (isSwipeRight && currentIndex > 0) {
      onTabChange(tabs[currentIndex - 1]);
    }
  };

  return (
    <motion.div
      ref={containerRef}
      className="md:hidden touch-pan-y"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      style={{ x, opacity }}
      whileTap={{ cursor: "grabbing" }}
    >
      {children}
      
      {/* Swipe indicator dots */}
      <div className="flex justify-center gap-1.5 mt-4 pb-2">
        {tabs.map((tab, index) => (
          <div
            key={tab}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? "w-4 bg-primary" 
                : "w-1.5 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
};
