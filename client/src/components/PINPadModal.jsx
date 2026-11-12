import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Delete, X, ShieldCheck } from 'lucide-react';

export default function PINPadModal({ isOpen, onClose, onSubmit, employeeName, employeeCode, error }) {
  const [pin, setPin] = useState('');

  if (!isOpen) return null;

  const handleDigit = (digit) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  const handleConfirm = () => {
    if (pin.length >= 4) {
      onSubmit(pin);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl text-slate-800"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Lock className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Security PIN Verification</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Identity verification for <span className="font-bold text-slate-800">{employeeName}</span> ({employeeCode})
            </p>
          </div>

          {/* Digit indicators */}
          <div className="flex justify-center items-center gap-3 mb-4">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                  pin.length > idx
                    ? 'bg-amber-500 border-amber-600 scale-110 shadow-xs'
                    : 'bg-transparent border-slate-300'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="mb-3 text-center text-xs text-red-600 bg-red-50 border border-red-200 py-2 px-3 rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Number Pad Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit.toString())}
                className="py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-base font-bold text-slate-800 transition-all shadow-2xs active:scale-95"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClear}
              className="py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-500 border border-slate-200 transition-colors"
            >
              CLEAR
            </button>

            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-base font-bold text-slate-800 transition-all shadow-2xs active:scale-95"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 flex items-center justify-center transition-colors"
            >
              <Delete className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            disabled={pin.length < 4}
            onClick={handleConfirm}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Verify & Proceed</span>
          </button>

          <p className="text-[11px] text-center text-slate-400 mt-3 font-mono">
            Default Demo PIN: <strong className="text-slate-700">1234</strong>
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
