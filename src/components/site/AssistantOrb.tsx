import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const EASE = [0.4, 0, 0.2, 1] as const;

/**
 * The living orb: a glossy sphere that breathes, bobs and throws a soft halo.
 * While the assistant is thinking the same loops tighten up so the UI visibly
 * "wakes up" instead of showing a static spinner.
 *
 * Shared by the public AI chat hero and the admin assistant widget so both
 * surfaces use the exact same animation.
 */
export function AssistantOrb({
  thinking,
  compact,
  className,
}: {
  thinking?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const t = thinking ? 1.1 : 3.4;
  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        compact ? "h-28" : "h-40",
        className,
      )}
    >
      {/* halo */}
      <motion.div
        className="absolute rounded-full blur-2xl"
        style={{
          width: compact ? 92 : 118,
          height: compact ? 92 : 118,
          background:
            "radial-gradient(circle, rgba(59,130,246,0.55) 0%, rgba(59,130,246,0) 70%)",
        }}
        animate={{ scale: [1, 1.22, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: t, repeat: Infinity, ease: EASE }}
      />
      {/* expanding rings */}
      {[0, 0.55].map((delay) => (
        <motion.div
          key={delay}
          className="absolute rounded-full border border-primary/25"
          style={{ width: compact ? 84 : 108, height: compact ? 84 : 108 }}
          animate={{ scale: [0.9, 1.35], opacity: [0.55, 0] }}
          transition={{ duration: t, repeat: Infinity, ease: EASE, delay: delay * t }}
        />
      ))}
      {/* orbiting dot */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: compact ? 84 : 108, height: compact ? 84 : 108 }}
        animate={{ rotate: 360 }}
        transition={{ duration: thinking ? 4 : 9, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary/70" />
      </motion.div>
      {/* sphere */}
      <motion.div
        className="relative rounded-full"
        style={{
          width: compact ? 56 : 74,
          height: compact ? 56 : 74,
          background:
            "radial-gradient(circle at 32% 26%, #bfdbfe 0%, #60a5fa 34%, #2563eb 66%, #1e3a8a 100%)",
          boxShadow:
            "0 22px 45px -14px rgba(30,64,175,0.7), inset 0 -8px 16px rgba(0,0,0,0.22), inset 0 6px 12px rgba(255,255,255,0.45)",
        }}
        animate={{ y: [0, -7, 0], scale: [1, 1.04, 1] }}
        transition={{ duration: t, repeat: Infinity, ease: EASE }}
      />
    </div>
  );
}
