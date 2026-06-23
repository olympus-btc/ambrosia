import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useTranslations } from "next-intl";

const DELETE_THRESHOLD = 100;

export function SwipeableCartItem({ onRemove, isTouchDevice, children }) {
  const translateCart = useTranslations("cart");
  const dragX = useMotionValue(0);
  const deleteBackgroundOpacity = useTransform(dragX, [-DELETE_THRESHOLD, 0], [1, 0]);

  if (!isTouchDevice) {
    return children;
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      <motion.div
        className="absolute inset-0 bg-red-500 flex items-center justify-end px-5 rounded-lg"
        style={{ opacity: deleteBackgroundOpacity }}
      >
        <span className="text-white font-semibold text-sm">{translateCart("summary.swipeDelete")}</span>
      </motion.div>
      <motion.div
        style={{ x: dragX }}
        drag="x"
        dragConstraints={{ left: -DELETE_THRESHOLD, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.x < -DELETE_THRESHOLD) {
            animate(dragX, -500, { duration: 0.2 }).then(() => onRemove());
          } else {
            animate(dragX, 0, { type: "spring", stiffness: 500, damping: 40 });
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
