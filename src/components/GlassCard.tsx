import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'green' | 'red' | 'blue' | 'purple';
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className, glowColor = 'blue' }) => {
  const glowClasses = {
    green: 'before:from-[#00FF00]/50 before:to-transparent',
    red: 'before:from-[#FF0000]/50 before:to-transparent',
    blue: 'before:from-[#0088FF]/50 before:to-transparent',
    purple: 'before:from-[#AA00FF]/50 before:to-transparent',
  };

  return (
    <div className={cn(
      "relative group p-[1px] rounded-2xl overflow-hidden",
      className
    )}>
      {/* Fiber-optic border effect */}
      <div className={cn(
        "absolute inset-0 opacity-50 group-hover:opacity-100 transition-opacity duration-500",
        "bg-gradient-to-r from-transparent via-white/20 to-transparent animate-fiber-optic"
      )} />
      
      {/* Main Glass Surface */}
      <div className="relative h-full w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl overflow-hidden">
        {/* Subtle inner glow */}
        <div className={cn(
          "absolute -inset-20 opacity-10 pointer-events-none bg-radial-gradient",
          glowColor === 'green' && "from-green-500/20 to-transparent",
          glowColor === 'red' && "from-red-500/20 to-transparent",
          glowColor === 'blue' && "from-blue-500/20 to-transparent",
          glowColor === 'purple' && "from-purple-500/20 to-transparent",
        )} />
        
        {children}
      </div>
    </div>
  );
};
