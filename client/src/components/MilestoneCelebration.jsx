import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Flame, Sparkles, X } from 'lucide-react';

export default function MilestoneCelebration({ milestone, streakCount, onClose }) {
  useEffect(() => {
    if (milestone) {
      const end = Date.now() + 2.5 * 1000;
      const colors = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6'];

      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [milestone]);

  if (!milestone) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200 p-8 text-center shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Glowing Animated Trophy Icon */}
          <div className="relative inline-block mb-3">
            <motion.div
              animate={{ rotate: [-4, 4, -4], scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30"
            >
              <Flame className="w-9 h-9 text-white fill-white" />
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute -top-2 -right-2 text-amber-500"
            >
              <Sparkles className="w-6 h-6" />
            </motion.div>
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 mb-2">
            Streak Milestone Unlocked!
          </span>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
            {milestone.name}
          </h2>

          <p className="text-xs text-slate-600 mb-5">
            {milestone.desc}
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5 flex items-center justify-around">
            <div className="text-center">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Current Streak</span>
              <span className="text-2xl font-black text-amber-600 font-mono">
                {streakCount || milestone.days} <span className="text-xs font-normal text-slate-500">days</span>
              </span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Achievement</span>
              <span className="text-xs font-bold text-amber-700 flex items-center gap-1 justify-center mt-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                Badge Awarded
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs tracking-wide shadow-sm transition-all"
          >
            Awesome! Keep The Fire Burning 🔥
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
