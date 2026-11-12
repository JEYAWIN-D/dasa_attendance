import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Sparkles } from 'lucide-react';

export default function StreakFlame({ streakCount = 0, longestStreak = 0, size = "md", showLongest = false }) {
  const isHighStreak = streakCount >= 7;

  const sizeClasses = {
    sm: { icon: "w-4 h-4", text: "text-sm", pad: "px-2.5 py-1" },
    md: { icon: "w-5 h-5", text: "text-base font-bold", pad: "px-3.5 py-1.5" },
    lg: { icon: "w-7 h-7", text: "text-2xl font-extrabold", pad: "px-4 py-2" },
  }[size] || { icon: "w-5 h-5", text: "text-base font-bold", pad: "px-3.5 py-1.5" };

  return (
    <div className="flex items-center gap-2">
      <motion.div
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className={`relative flex items-center gap-2 rounded-2xl border transition-all ${sizeClasses.pad} ${
          streakCount > 0
            ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/80 shadow-xs'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        {/* Animated Flame Icon */}
        <div className="relative">
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              rotate: [-3, 3, -3],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="text-amber-500"
          >
            <Flame className={`${sizeClasses.icon} fill-amber-500 filter drop-shadow-sm`} />
          </motion.div>

          {isHighStreak && (
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1 text-amber-500"
            >
              <Sparkles className="w-3 h-3" />
            </motion.div>
          )}
        </div>

        {/* Counter */}
        <div className="flex items-baseline gap-1 font-mono">
          <motion.span
            key={streakCount}
            initial={{ y: -4, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`${sizeClasses.text} text-gradient-flame font-bold tracking-tight`}
          >
            {streakCount}
          </motion.span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800/80">
            {streakCount === 1 ? 'day' : 'days'}
          </span>
        </div>
      </motion.div>

      {showLongest && longestStreak > 0 && (
        <span className="text-xs text-slate-500 font-mono">
          (Best: <strong className="text-slate-800">{longestStreak}d</strong>)
        </span>
      )}
    </div>
  );
}
