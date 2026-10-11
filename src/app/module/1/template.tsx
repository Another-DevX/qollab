"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Short fade on page navigation. Uses opacity only (no transform) so the
 * sticky Bloch-sphere columns keep working.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
