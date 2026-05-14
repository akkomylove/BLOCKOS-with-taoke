'use client';

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 24, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="12" height="12" rx="2.5" fill="url(#logo-grad)" opacity="0.95" />
      <rect x="17" y="3" width="12" height="12" rx="2.5" fill="url(#logo-grad)" opacity="0.55" />
      <rect x="3" y="17" width="12" height="12" rx="2.5" fill="url(#logo-grad)" opacity="0.3" />
      <rect x="17" y="17" width="12" height="12" rx="2.5" fill="url(#logo-grad)" opacity="0.7" />
      <rect x="3" y="3" width="12" height="12" rx="2.5" stroke="#93c5fd" strokeWidth="0.6" opacity="0.6" />
      <rect x="17" y="3" width="12" height="12" rx="2.5" stroke="#93c5fd" strokeWidth="0.6" opacity="0.6" />
      <rect x="3" y="17" width="12" height="12" rx="2.5" stroke="#93c5fd" strokeWidth="0.6" opacity="0.6" />
      <rect x="17" y="17" width="12" height="12" rx="2.5" stroke="#93c5fd" strokeWidth="0.6" opacity="0.6" />
    </svg>
  );
}