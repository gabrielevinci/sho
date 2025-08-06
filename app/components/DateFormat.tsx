'use client';

import { useEffect, useState } from 'react';

interface DateFormatProps {
  date: string | Date;
  options?: Intl.DateTimeFormatOptions;
  locale?: string;
  timeZone?: string;
}

export default function DateFormat({ 
  date, 
  options = {}, 
  locale = 'it-IT',
  timeZone = 'Europe/Rome' // Default al fuso orario di Roma
}: DateFormatProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span>---</span>;
  }

  try {
    // Unisce le opzioni con il timeZone
    const finalOptions = {
      ...options,
      timeZone
    };
    
    return <span>{new Date(date).toLocaleDateString(locale, finalOptions)}</span>;
  } catch (error) {
    console.error('Error formatting date:', error);
    return <span>Data non valida</span>;
  }
}
