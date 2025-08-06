'use client';

import { useEffect, useState } from 'react';

interface TimeFormatProps {
  date: string | Date;
  options?: Intl.DateTimeFormatOptions;
  locale?: string;
  timeZone?: string;
  showDate?: boolean;
  showTime?: boolean;
}

export default function TimeFormat({ 
  date, 
  options = {}, 
  locale = 'it-IT',
  timeZone = 'Europe/Rome',
  showDate = true,
  showTime = true
}: TimeFormatProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span>---</span>;
  }

  try {
    // Determina le opzioni di base in base ai props
    let defaultOptions: Intl.DateTimeFormatOptions = {};
    
    if (showDate && showTime) {
      defaultOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
    } else if (showDate) {
      defaultOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      };
    } else if (showTime) {
      defaultOptions = {
        hour: '2-digit',
        minute: '2-digit'
      };
    }
    
    // Unisce le opzioni con il timeZone
    const finalOptions = {
      ...defaultOptions,
      ...options,
      timeZone
    };
    
    if (showDate && showTime) {
      return <span>{new Date(date).toLocaleString(locale, finalOptions)}</span>;
    } else if (showTime) {
      return <span>{new Date(date).toLocaleTimeString(locale, finalOptions)}</span>;
    } else {
      return <span>{new Date(date).toLocaleDateString(locale, finalOptions)}</span>;
    }
  } catch (error) {
    console.error('Error formatting time:', error);
    return <span>Orario non valido</span>;
  }
}
