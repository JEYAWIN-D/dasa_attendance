import React from 'react';
import { Zap, AlertTriangle, Sparkles, CheckCircle2 } from 'lucide-react';

export default function NicknameBadge({ nickname, showDescription = false, size = "md" }) {
  if (!nickname) return null;

  const configs = {
    'Minnal Murali': {
      title: 'Minnal Murali',
      desc: 'Lightning Fast: Arrives before scheduled shift',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
      icon: Zap,
      iconColor: 'text-sky-600 fill-sky-600'
    },
    'Chopplangi': {
      title: 'Chopplangi',
      desc: 'Late Arrival: Checked in past grace period',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: AlertTriangle,
      iconColor: 'text-amber-600'
    },
    'Kutty Dragon': {
      title: 'Kutty Dragon',
      desc: 'Dynamic Mix: Alternates early & punctual',
      badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
      icon: Sparkles,
      iconColor: 'text-purple-600'
    },
    'On-Time Star': {
      title: 'On-Time Star',
      desc: 'Clockwork: Consistently punctual in grace window',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600'
    }
  };

  const current = configs[nickname] || {
    title: nickname,
    desc: 'Attendance Recognition',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Sparkles,
    iconColor: 'text-slate-500'
  };

  const IconComponent = current.icon;

  const sizeClasses = {
    sm: "text-xs px-2.5 py-0.5 gap-1 font-semibold",
    md: "text-xs px-3 py-1 gap-1.5 font-bold",
    lg: "text-sm px-3.5 py-1.5 gap-2 font-bold"
  }[size] || "text-xs px-3 py-1 gap-1.5 font-bold";

  return (
    <div className="inline-flex flex-col">
      <span
        title={current.desc}
        className={`inline-flex items-center rounded-full border ${current.badgeClass} ${sizeClasses} shadow-2xs transition-all duration-200 cursor-help`}
      >
        <IconComponent className={`w-3.5 h-3.5 shrink-0 ${current.iconColor}`} />
        <span>{current.title}</span>
      </span>
      {showDescription && (
        <span className="text-[11px] text-slate-500 mt-1">{current.desc}</span>
      )}
    </div>
  );
}
