'use client';

import { useEffect, useState } from 'react';

interface DateFormatProps {
  date: string | Date;
  options?: Intl.DateTimeFormatOptions;
  locale?: string;
}

export default function DateFormat({ 
  date, 
  options = {}, 
  locale = 'it-IT' 
}: DateFormatProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span>---</span>;
  }

  try {
    return <span>{new Date(date).toLocaleDateString(locale, options)}</span>;
  } catch (error) {
    console.error('Error formatting date:', error);
    return <span>Data non valida</span>;
  }
}
