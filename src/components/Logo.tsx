'use client';

import Image from 'next/image';

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 24, className = '' }: LogoProps) {
  return (
    <Image
      src="/brand/blockos-icon-256.png"
      width={size}
      height={size}
      sizes={size + 'px'}
      alt=""
      aria-hidden="true"
      className={('block shrink-0 rounded-[22%] ' + className).trim()}
    />
  );
}
