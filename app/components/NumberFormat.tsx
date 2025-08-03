'use client';

import { useEffect, useState } from 'react';

interface NumberFormatProps {
  value: number;
  className?: string;
}

/**
 * Component per formattare numeri che previene errori di hydration
 * Usa una formattazione consistente e sicura per SSR
 */
export default function NumberFormat({ value, className }: NumberFormatProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Durante la fase di hydration, usa una formattazione semplice e consistente
  if (!isMounted) {
    return <span className={className}>{value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}</span>;
  }

  // Dopo l'hydration, usa la formattazione locale
  return <span className={className}>{value.toLocaleString('it-IT')}</span>;
}
