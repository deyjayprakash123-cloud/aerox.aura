import type { ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BentoCardProps {
  className?: string;
  children: ReactNode;
  delay?: number;
}

export const BentoCard = ({ className, children, delay = 0 }: BentoCardProps) => {
  return (
    <div
      className={cn(
        "glass-panel p-6 flex flex-col gap-4 relative overflow-hidden transition-all duration-300 hover:shadow-[0_8px_32px_0_rgba(0,255,255,0.2)] hover:border-cyan-500/30",
        className
      )}
      style={{
        animation: `fadeInUp 0.8s ease-out ${delay}s both`,
      }}
    >
      {/* Glossy highlight top edge */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {children}
    </div>
  );
};
