'use client';

import { useEffect, useState } from 'react';

interface NoSSRProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number; // Opzionale: delay prima del mount per evitare flash
}

export default function NoSSR({ children, fallback = null, delay = 0 }: NoSSRProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => {
        setIsMounted(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      setIsMounted(true);
    }
  }, [delay]);

  if (!isMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
