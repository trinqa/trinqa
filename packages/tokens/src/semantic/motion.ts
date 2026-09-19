import { motion } from '../canonical';

export const semanticMotion = {
  press: motion.press,
  selection: motion.selection,
  contentChange: motion.contentChange,
  processing: motion.processing,
} as const;
