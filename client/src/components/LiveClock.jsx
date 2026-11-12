import React, { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';

export default function LiveClock({ showDate = true, className = "" }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const ampm = time.getHours() >= 12 ? 'PM' : 'AM';

  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className={`flex items-center gap-2 font-mono ${className}`}>
      {showDate && (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200 font-sans shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-amber-600" />
          <span className="font-semibold text-slate-700">{dateStr}</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
        <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
        <span className="text-xs font-bold tracking-wider text-slate-900">
          {hours}:{minutes}
          <span className="text-slate-400 text-[11px] ml-0.5">:{seconds}</span>
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700 ml-1 bg-slate-100 border border-slate-200 px-1 py-0.5 rounded">
          {ampm}
        </span>
      </div>
    </div>
  );
}
