import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SwipeableTabsWrapperProps {
  children: ReactNode;
  activeTab: string;
}

export const SwipeableTabsWrapper = ({
  children,
  activeTab,
}: SwipeableTabsWrapperProps) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
