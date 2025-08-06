'use client';

import { useState, useEffect } from 'react';
import NumberFormat from '@/app/components/NumberFormat';
import NoSSR from '@/app/components/NoSSR';
import { normalizeCountryName } from '@/lib/database-helpers';
import { Globe, MapPin, Share2, Monitor, Languages, Smartphone, HardDrive, ChevronUp, ChevronDown } from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';
import { Icon } from '@iconify/react';

interface DetailedAnalytics {
  link_id: number;
  total_clicks: number;
  unique_clicks: number;
  countries: Array<{ country: string; count: number; unique_count: number }>;
  cities: Array<{ city: string; count: number; unique_count: number }>;
  browsers: Array<{ browser: string; count: number; unique_count: number }>;
  devices: Array<{ device: string; count: number; unique_count: number }>;
  operating_systems: Array<{ os: string; count: number; unique_count: number }>;
  referrers: Array<{ referrer: string; count: number; unique_count: number }>;
  languages: Array<{ language: string; count: number; unique_count: number }>;
}

interface DetailedStatsCardsProps {
  shortCode: string;
  filter: string;
  startDate?: string;
  endDate?: string;
}

type SortField = 'name' | 'count' | 'unique_count' | 'percentage';
type SortDirection = 'asc' | 'desc';

interface SortState {
  field: SortField;
  direction: SortDirection;
}

// Funzione per ordinare i dati
const sortData = (data: any[], sortState: SortState, nameKey: string, totalClicks: number): any[] => {
  return [...data].sort((a, b) => {
    let aValue: any, bValue: any;
    
    if (sortState.field === 'name') {
      aValue = formatDisplayName(a[nameKey]).toLowerCase();
      bValue = formatDisplayName(b[nameKey]).toLowerCase();
    } else if (sortState.field === 'percentage') {
      aValue = totalClicks > 0 ? (a.count / totalClicks) * 100 : 0;
      bValue = totalClicks > 0 ? (b.count / totalClicks) * 100 : 0;
    } else {
      aValue = a[sortState.field];
      bValue = b[sortState.field];
    }
    
    if (aValue < bValue) return sortState.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortState.direction === 'asc' ? 1 : -1;
    return 0;
  });
};

// Componente per header ordinabile
const SortableHeader = ({ children, field, currentSort, onSort }: {
  children: React.ReactNode;
  field: SortField;
  currentSort: SortState;
  onSort: (field: SortField) => void;
}) => {
  const isActive = currentSort.field === field;
  const IconComponent = isActive && currentSort.direction === 'asc' ? ChevronUp : ChevronDown;
  
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
    >
      <span>{children}</span>
      <IconComponent 
        className={`h-3 w-3 transition-opacity ${isActive ? 'opacity-100' : 'opacity-30'}`} 
      />
    </button>
  );
};

// Funzione migliorata per ottenere la bandiera del paese

// Funzione per formattare i nomi in modo user-friendly
const formatDisplayName = (value: string): string => {
  if (!value || value.toLowerCase() === 'unknown' || value.toLowerCase() === 'sconosciuto') return 'Sconosciuto';
  
  // Decodifica URL encoding completo (inclusi caratteri speciali)
  let decoded = value;
  try {
    // Decodifica multipla per gestire encoding annidati
    let previousDecoded = '';
    while (decoded !== previousDecoded) {
      previousDecoded = decoded;
      decoded = decodeURIComponent(decoded);
    }
  } catch {
    // Se la decodifica fallisce, prova con decodifiche manuali per i casi più comuni
    decoded = value
      .replace(/%20/g, ' ')          // Spazi
      .replace(/%21/g, '!')          // !
      .replace(/%22/g, '"')          // "
      .replace(/%23/g, '#')          // #
      .replace(/%24/g, '$')          // $
      .replace(/%25/g, '%')          // %
      .replace(/%26/g, '&')          // &
      .replace(/%27/g, "'")          // '
      .replace(/%28/g, '(')          // (
      .replace(/%29/g, ')')          // )
      .replace(/%2A/g, '*')          // *
      .replace(/%2B/g, '+')          // +
      .replace(/%2C/g, ',')          // ,
      .replace(/%2D/g, '-')          // -
      .replace(/%2E/g, '.')          // .
      .replace(/%2F/g, '/')          // /
      .replace(/%3A/g, ':')          // :
      .replace(/%3B/g, ';')          // ;
      .replace(/%3C/g, '<')          // <
      .replace(/%3D/g, '=')          // =
      .replace(/%3E/g, '>')          // >
      .replace(/%3F/g, '?')          // ?
      .replace(/%40/g, '@')          // @
      .replace(/%5B/g, '[')          // [
      .replace(/%5C/g, '\\')         // \
      .replace(/%5D/g, ']')          // ]
      .replace(/%5E/g, '^')          // ^
      .replace(/%5F/g, '_')          // _
      .replace(/%60/g, '`')          // `
      .replace(/%7B/g, '{')          // {
      .replace(/%7C/g, '|')          // |
      .replace(/%7D/g, '}')          // }
      .replace(/%7E/g, '~');         // ~
  }
  
  // Sostituisci + con spazi e _ con spazi
  decoded = decoded.replace(/[+_]/g, ' ');
  
  // Trim e normalizza spazi multipli
  decoded = decoded.trim().replace(/\s+/g, ' ');
  
  // Converti in lowercase per il confronto
  const lowerDecoded = decoded.toLowerCase();
  
  // Se dopo la decodifica è "unknown", ritorna la versione italiana
  if (lowerDecoded === 'unknown') return 'Sconosciuto';
  
  // Mappatura per casi speciali (compresi nomi di città)
  const specialCases: { [key: string]: string } = {
    // Ricerche e referrer
    'qr code': 'QR Code',
    'bing search': 'Bing',
    'google search': 'Google',
    'duckduckgo': 'DuckDuckGo',
    'yahoo search': 'Yahoo',
    'internal': 'Accesso interno',
    'direct': 'Accesso diretto',
    
    // Social media
    'facebook': 'Facebook',
    'instagram': 'Instagram',
    'linkedin': 'LinkedIn',
    'twitter': 'Twitter',
    'tiktok': 'TikTok',
    'youtube': 'YouTube',
    'whatsapp': 'WhatsApp',
    'telegram': 'Telegram',
    
    // Browser
    'chrome': 'Chrome',
    'firefox': 'Firefox',
    'safari': 'Safari',
    'edge': 'Edge',
    'opera': 'Opera',
    'microsoft edge': 'Microsoft Edge',
    'samsung internet': 'Samsung Internet',
    'brave': 'Brave',
    'vivaldi': 'Vivaldi',
    'tor browser': 'Tor Browser',
    
    // OS
    'android': 'Android',
    'ios': 'iOS',
    'windows': 'Windows',
    'macos': 'macOS',
    'mac os': 'macOS',
    'linux': 'Linux',
    'ubuntu': 'Ubuntu',
    'chrome os': 'Chrome OS',
    
    // Dispositivi
    'iphone': 'iPhone',
    'ipad': 'iPad',
    'macbook': 'MacBook',
    'samsung': 'Samsung',
    'xiaomi': 'Xiaomi',
    'huawei': 'Huawei',
    'oneplus': 'OnePlus',
    'mobile': 'Mobile',
    'tablet': 'Tablet',
    'desktop': 'Desktop',
    'smart tv': 'Smart TV',
    
    // Città famose (casi speciali)
    'new york': 'New York',
    'los angeles': 'Los Angeles',
    'san francisco': 'San Francisco',
    'san jose': 'San Jose',
    'santa clara': 'Santa Clara',
    'las vegas': 'Las Vegas',
    'new delhi': 'New Delhi',
    'buenos aires': 'Buenos Aires',
    'rio de janeiro': 'Rio de Janeiro',
    'são paulo': 'São Paulo',
    'sao paulo': 'São Paulo',
    'mexico city': 'Mexico City',
    'costa rica': 'Costa Rica',
    'puerto rico': 'Puerto Rico',
    'hong kong': 'Hong Kong',
    'kuala lumpur': 'Kuala Lumpur',
    'cape town': 'Cape Town',
    'tel aviv': 'Tel Aviv',
    'abu dhabi': 'Abu Dhabi',
    'saint petersburg': 'Saint Petersburg',
    'ho chi minh city': 'Ho Chi Minh City'
  };
  
  // Controlla se è un caso speciale
  if (specialCases[lowerDecoded]) {
    return specialCases[lowerDecoded];
  }
  
  // Capitalizza la prima lettera di ogni parola, gestendo apostrofi e trattini
  return decoded.split(/(\s|-|')/).map((part, index) => {
    if (part.match(/\s|-|'/)) return part; // Mantieni separatori
    if (part.length === 0) return part;
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).join('');
};

// Funzione migliorata per ottenere la bandiera del paese
const getCountryFlag = (country: string): React.ReactNode => {
  if (!country) return '🌍';
  
  const countryLower = country.toLowerCase().trim();
  
  // Mapping per codici ISO dei paesi
  const countryToCode: { [key: string]: string } = {
    'italy': 'IT', 'italia': 'IT',
    'united states': 'US', 'stati uniti': 'US', 'usa': 'US',
    'germany': 'DE', 'germania': 'DE',
    'france': 'FR', 'francia': 'FR',
    'spain': 'ES', 'spagna': 'ES',
    'united kingdom': 'GB', 'regno unito': 'GB', 'uk': 'GB', 'england': 'GB',
    'netherlands': 'NL', 'paesi bassi': 'NL', 'holland': 'NL',
    'japan': 'JP', 'giappone': 'JP',
    'china': 'CN', 'cina': 'CN',
    'russia': 'RU', 'russia federazione': 'RU', 'russian federation': 'RU',
    'brazil': 'BR', 'brasile': 'BR',
    'canada': 'CA',
    'australia': 'AU',
    'india': 'IN',
    'south korea': 'KR', 'corea del sud': 'KR', 'korea': 'KR',
    'switzerland': 'CH', 'svizzera': 'CH',
    'austria': 'AT',
    'belgium': 'BE', 'belgio': 'BE',
    'sweden': 'SE', 'svezia': 'SE',
    'norway': 'NO', 'norvegia': 'NO',
    'denmark': 'DK', 'danimarca': 'DK',
    'finland': 'FI', 'finlandia': 'FI',
    'poland': 'PL', 'polonia': 'PL',
    'portugal': 'PT', 'portogallo': 'PT',
    'greece': 'GR', 'grecia': 'GR',
    'turkey': 'TR', 'turchia': 'TR',
    'israel': 'IL', 'israele': 'IL',
    'mexico': 'MX', 'messico': 'MX',
    'argentina': 'AR',
    'chile': 'CL',
    'colombia': 'CO',
    'peru': 'PE', 'perù': 'PE'
  };

  const countryCode = countryToCode[countryLower];
  
  if (countryCode) {
    return (
      <ReactCountryFlag 
        countryCode={countryCode} 
        svg 
        style={{
          width: '1.2em',
          height: '1.2em',
        }}
        title={country}
      />
    );
  }
  
  // Fallback per paesi non mappati
  return '🌍';
};

// Funzione per ottenere icone dei browser
const getBrowserIcon = (browser: string): React.ReactNode => {
  if (!browser) return <Icon icon="mdi:web" width="1.2em" height="1.2em" color="#6b7280" />;
  
  const browserLower = browser.toLowerCase().trim();
  
  if (browserLower.includes('chrome')) {
    return <Icon icon="logos:chrome" width="1.2em" height="1.2em" />;
  } else if (browserLower.includes('firefox')) {
    return <Icon icon="logos:firefox" width="1.2em" height="1.2em" />;
  } else if (browserLower.includes('safari')) {
    return <Icon icon="logos:safari" width="1.2em" height="1.2em" />;
  } else if (browserLower.includes('edge')) {
    return <Icon icon="logos:microsoft-edge" width="1.2em" height="1.2em" />;
  } else if (browserLower.includes('opera')) {
    return <Icon icon="logos:opera" width="1.2em" height="1.2em" />;
  } else if (browserLower.includes('brave')) {
    return <Icon icon="logos:brave" width="1.2em" height="1.2em" />;
  } else if (browserLower.includes('vivaldi')) {
    return <Icon icon="logos:vivaldi" width="1.2em" height="1.2em" />;
  }
  
  return <Icon icon="mdi:web" width="1.2em" height="1.2em" color="#6b7280" />;
};

// Funzione per ottenere icone dei sistemi operativi
const getOSIcon = (os: string): React.ReactNode => {
  if (!os) return <Icon icon="mdi:monitor" width="1.2em" height="1.2em" color="#6b7280" />;
  
  const osLower = os.toLowerCase().trim();
  
  if (osLower.includes('windows')) {
    return <Icon icon="simple-icons:windows" width="1.2em" height="1.2em" color="#0078d4" />;
  } else if (osLower.includes('macos') || osLower.includes('mac os')) {
    return <Icon icon="logos:apple" width="1.2em" height="1.2em" />;
  } else if (osLower.includes('ios')) {
    return <Icon icon="logos:apple" width="1.2em" height="1.2em" />;
  } else if (osLower.includes('android')) {
    return <Icon icon="logos:android-icon" width="1.2em" height="1.2em" />;
  } else if (osLower.includes('linux')) {
    return <Icon icon="logos:linux-tux" width="1.2em" height="1.2em" />;
  } else if (osLower.includes('ubuntu')) {
    return <Icon icon="logos:ubuntu" width="1.2em" height="1.2em" />;
  }
  
  return <Icon icon="mdi:monitor" width="1.2em" height="1.2em" color="#6b7280" />;
};

// Funzione per ottenere icone dei dispositivi
const getDeviceIcon = (device: string): React.ReactNode => {
  if (!device) return <Icon icon="mdi:devices" width="1.2em" height="1.2em" color="#6b7280" />;
  
  const deviceLower = device.toLowerCase().trim();
  
  if (deviceLower.includes('mobile') || deviceLower.includes('phone')) {
    return <Icon icon="mdi:cellphone" width="1.2em" height="1.2em" color="#10b981" />;
  } else if (deviceLower.includes('tablet') || deviceLower.includes('ipad')) {
    return <Icon icon="mdi:tablet" width="1.2em" height="1.2em" color="#8b5cf6" />;
  } else if (deviceLower.includes('desktop') || deviceLower.includes('computer')) {
    return <Icon icon="mdi:monitor" width="1.2em" height="1.2em" color="#3b82f6" />;
  } else if (deviceLower.includes('laptop')) {
    return <Icon icon="mdi:laptop" width="1.2em" height="1.2em" color="#6366f1" />;
  }
  
  return <Icon icon="mdi:devices" width="1.2em" height="1.2em" color="#6b7280" />;
};

// Funzione per ottenere icone delle lingue
const getLanguageIcon = (language: string): React.ReactNode => {
  if (!language) return '🌍';
  
  const langLower = language.toLowerCase().trim();
  
  // Mapping per bandiere delle lingue
  if (langLower.includes('it')) return <ReactCountryFlag countryCode="IT" svg style={{ width: '1.2em', height: '1.2em' }} />;
  if (langLower.includes('en')) return <ReactCountryFlag countryCode="US" svg style={{ width: '1.2em', height: '1.2em' }} />;
  if (langLower.includes('es')) return <ReactCountryFlag countryCode="ES" svg style={{ width: '1.2em', height: '1.2em' }} />;
  if (langLower.includes('fr')) return <ReactCountryFlag countryCode="FR" svg style={{ width: '1.2em', height: '1.2em' }} />;
  if (langLower.includes('de')) return <ReactCountryFlag countryCode="DE" svg style={{ width: '1.2em', height: '1.2em' }} />;
  if (langLower.includes('pt')) return <ReactCountryFlag countryCode="PT" svg style={{ width: '1.2em', height: '1.2em' }} />;
  if (langLower.includes('ru')) return <ReactCountryFlag countryCode="RU" svg style={{ width: '1.2em', height: '1.2em' }} />;
  if (langLower.includes('ja')) return <ReactCountryFlag countryCode="JP" svg style={{ width: '1.2em', height: '1.2em' }} />;
  if (langLower.includes('zh')) return <ReactCountryFlag countryCode="CN" svg style={{ width: '1.2em', height: '1.2em' }} />;
  if (langLower.includes('ko')) return <ReactCountryFlag countryCode="KR" svg style={{ width: '1.2em', height: '1.2em' }} />;
  if (langLower.includes('ar')) return <ReactCountryFlag countryCode="SA" svg style={{ width: '1.2em', height: '1.2em' }} />;
  if (langLower.includes('hi')) return <ReactCountryFlag countryCode="IN" svg style={{ width: '1.2em', height: '1.2em' }} />;
  
  return '🌍';
};
const getLanguageEmoji = (language: string): string => {
  if (!language) return '🌍';
  
  const langLower = language.toLowerCase().trim();
  
  // Mapping per codici lingua standard
  const languageToFlag: { [key: string]: string } = {
    'it': '🇮🇹', 'it-it': '🇮🇹', 'italian': '🇮🇹', 'italiano': '🇮🇹',
    'en': '🇺🇸', 'en-us': '🇺🇸', 'en-gb': '🇬🇧', 'english': '🇺🇸', 'inglese': '🇺🇸',
    'es': '🇪🇸', 'es-es': '🇪🇸', 'spanish': '🇪🇸', 'spagnolo': '🇪🇸',
    'fr': '🇫🇷', 'fr-fr': '🇫🇷', 'french': '🇫🇷', 'francese': '🇫🇷',
    'de': '🇩🇪', 'de-de': '🇩🇪', 'german': '🇩🇪', 'tedesco': '🇩🇪',
    'pt': '🇵🇹', 'pt-pt': '🇵🇹', 'pt-br': '🇧🇷', 'portuguese': '🇵🇹', 'portoghese': '🇵🇹',
    'ru': '🇷🇺', 'ru-ru': '🇷🇺', 'russian': '🇷🇺', 'russo': '🇷�',
    'ja': '🇯🇵', 'ja-jp': '🇯🇵', 'japanese': '🇯🇵', 'giapponese': '🇯🇵',
    'ko': '🇰🇷', 'ko-kr': '🇰🇷', 'korean': '🇰🇷', 'coreano': '🇰🇷',
    'zh': '🇨🇳', 'zh-cn': '🇨🇳', 'zh-tw': '🇹🇼', 'chinese': '🇨🇳', 'cinese': '🇨🇳',
    'ar': '🇸🇦', 'ar-sa': '🇸🇦', 'arabic': '🇸🇦', 'arabo': '🇸🇦',
    'nl': '🇳🇱', 'nl-nl': '🇳🇱', 'dutch': '🇳🇱', 'olandese': '🇳🇱',
    'sv': '🇸🇪', 'sv-se': '🇸🇪', 'swedish': '🇸🇪', 'svedese': '🇸🇪',
    'no': '🇳🇴', 'no-no': '🇳🇴', 'norwegian': '🇳🇴', 'norvegese': '🇳🇴',
    'da': '🇩🇰', 'da-dk': '🇩🇰', 'danish': '🇩🇰', 'danese': '��',
    'fi': '🇫🇮', 'fi-fi': '🇫🇮', 'finnish': '🇫🇮', 'finlandese': '🇫🇮',
    'pl': '🇵🇱', 'pl-pl': '🇵🇱', 'polish': '🇵🇱', 'polacco': '🇵🇱',
    'tr': '🇹🇷', 'tr-tr': '🇹🇷', 'turkish': '🇹🇷', 'turco': '🇹🇷',
    'el': '🇬🇷', 'el-gr': '🇬🇷', 'greek': '🇬🇷', 'greco': '🇬🇷',
    'he': '🇮🇱', 'he-il': '🇮🇱', 'hebrew': '🇮🇱', 'ebraico': '🇮🇱',
    'hi': '🇮🇳', 'hi-in': '🇮🇳', 'hindi': '🇮🇳',
    'th': '🇹🇭', 'th-th': '🇹🇭', 'thai': '🇹🇭',
    'vi': '🇻🇳', 'vi-vn': '🇻🇳', 'vietnamese': '��'
  };
  
  // Prova a trovare una corrispondenza diretta
  const flag = languageToFlag[langLower];
  if (flag) return flag;
  
  // Prova a estrarre il codice lingua (primi 2 caratteri)
  const langCode = langLower.substring(0, 2);
  const langFlag = languageToFlag[langCode];
  if (langFlag) return langFlag;
  
  return '🌍';
};

// Funzione per estrarre il dominio dall'URL del referrer
const getDomainFromURL = (url: string): string => {
  if (!url || url.toLowerCase() === 'unknown' || url.toLowerCase() === 'sconosciuto' || url === 'direct') {
    return 'Accesso diretto';
  }
  
  try {
    // Prima prova a decodificare l'URL se contiene caratteri encoded
    let decodedUrl = url;
    if (url.includes('%')) {
      try {
        decodedUrl = decodeURIComponent(url);
      } catch {
        // Se la decodifica fallisce, usa l'URL originale
        decodedUrl = url;
      }
    }
    
    // Prova a parsare come URL
    const urlObj = new URL(decodedUrl.startsWith('http') ? decodedUrl : `https://${decodedUrl}`);
    let domain = urlObj.hostname.replace(/^www\./, '');
    
    // Rimuovi eventuali subdomain comuni
    domain = domain.replace(/^m\./, '').replace(/^mobile\./, '');
    
    return formatDisplayName(domain);
  } catch {
    // Se non è un URL valido, potrebbe essere un valore già processato
    // Controlla se contiene caratteri URL-encoded o altri caratteri speciali
    if (url.includes('%') || url.includes('+') || url.includes('_')) {
      return formatDisplayName(url);
    }
    
    // Se non è URL-encoded, capitalizza semplicemente
    return formatDisplayName(url);
  }
};

// Funzione per ottenere icone dei referrer
const getReferrerIcon = (referrer: string): React.ReactNode => {
  if (!referrer || referrer.toLowerCase() === 'unknown' || referrer.toLowerCase() === 'sconosciuto' || referrer === 'direct') {
    return <Icon icon="mdi:link-variant" width="1.2em" height="1.2em" color="#6b7280" />;
  }
  
  const referrerLower = referrer.toLowerCase();
  
  // Social media e siti famosi
  if (referrerLower.includes('google')) {
    return <Icon icon="logos:google-icon" width="1.2em" height="1.2em" />;
  } else if (referrerLower.includes('facebook')) {
    return <Icon icon="logos:facebook" width="1.2em" height="1.2em" />;
  } else if (referrerLower.includes('instagram')) {
    return <Icon icon="skill-icons:instagram" width="1.2em" height="1.2em" />;
  } else if (referrerLower.includes('twitter') || referrerLower.includes('x.com')) {
    return <Icon icon="logos:twitter" width="1.2em" height="1.2em" />;
  } else if (referrerLower.includes('linkedin')) {
    return <Icon icon="logos:linkedin-icon" width="1.2em" height="1.2em" />;
  } else if (referrerLower.includes('youtube')) {
    return <Icon icon="logos:youtube-icon" width="1.2em" height="1.2em" />;
  } else if (referrerLower.includes('whatsapp')) {
    return <Icon icon="logos:whatsapp-icon" width="1.2em" height="1.2em" />;
  } else if (referrerLower.includes('telegram')) {
    return <Icon icon="logos:telegram" width="1.2em" height="1.2em" />;
  } else if (referrerLower.includes('tiktok')) {
    return <Icon icon="logos:tiktok-icon" width="1.2em" height="1.2em" />;
  } else if (referrerLower.includes('bing')) {
    return <Icon icon="logos:bing" width="1.2em" height="1.2em" />;
  } else if (referrerLower.includes('yahoo')) {
    return <Icon icon="logos:yahoo" width="1.2em" height="1.2em" />;
  } else if (referrerLower.includes('duckduckgo')) {
    return <Icon icon="simple-icons:duckduckgo" width="1.2em" height="1.2em" color="#DE5833" />;
  } else if (referrerLower.includes('reddit')) {
    return <Icon icon="logos:reddit-icon" width="1.2em" height="1.2em" />;
  } else if (referrerLower.includes('pinterest')) {
    return <Icon icon="logos:pinterest" width="1.2em" height="1.2em" />;
  } else if (referrerLower.includes('github')) {
    return <Icon icon="logos:github-icon" width="1.2em" height="1.2em" />;
  } else if (referrerLower.includes('qr')) {
    return <Icon icon="mdi:qrcode" width="1.2em" height="1.2em" color="#4f46e5" />;
  }
  
  return <Icon icon="mdi:web" width="1.2em" height="1.2em" color="#6b7280" />;
};

// Componente per card di statistiche dettagliate
const StatCard = ({ 
  title, 
  icon, 
  borderColor, 
  bgColor, 
  iconColor, 
  data, 
  totalClicks, 
  uniqueClicks,
  renderItem,
  nameKey
}: {
  title: string;
  icon: React.ReactNode;
  borderColor: string;
  bgColor: string;
  iconColor: string;
  data: Array<any>;
  totalClicks: number;
  uniqueClicks: number;
  renderItem: (item: any, index: number, totalClicks: number) => React.ReactNode;
  nameKey: string;
}) => {
  const [sortState, setSortState] = useState<SortState>({ field: 'count', direction: 'desc' });
  
  const handleSort = (field: SortField) => {
    setSortState(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };
  
  const sortedData = sortData(data, sortState, nameKey, totalClicks);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="p-4">
        {/* Header compatto */}
        <div className="flex items-center space-x-2 mb-3">
          <div className={`p-1.5 ${bgColor} rounded flex items-center justify-center`}>
            <div className={`${iconColor} flex items-center justify-center`}>
              {icon}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
            <p className="text-xs text-gray-500">{data.length} voci</p>
          </div>
        </div>
        
        {data.length === 0 ? (
          <p className="text-gray-500 text-xs py-4 text-center">Nessun dato</p>
        ) : (
          <div>
            {/* Header tabella compatto con ordinamento */}
            <div className="grid grid-cols-12 gap-2 text-[10px] font-medium text-gray-500 uppercase tracking-wide pb-1.5 border-b border-gray-100">
              <span className="col-span-6">
                <SortableHeader field="name" currentSort={sortState} onSort={handleSort}>
                  Nome
                </SortableHeader>
              </span>
              <span className="col-span-2 text-right">
                <SortableHeader field="count" currentSort={sortState} onSort={handleSort}>
                  Visite
                </SortableHeader>
              </span>
              <span className="col-span-2 text-right">
                <SortableHeader field="unique_count" currentSort={sortState} onSort={handleSort}>
                  Unici
                </SortableHeader>
              </span>
              <span className="col-span-2 text-right">
                <SortableHeader field="percentage" currentSort={sortState} onSort={handleSort}>
                  % visite
                </SortableHeader>
              </span>
            </div>
            
            {/* Contenuto scrollabile compatto */}
            <div className={`${sortedData.length > 8 ? 'max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400' : ''} space-y-0.5 mt-1.5 pr-1`}>
              {sortedData.map((item, index) => renderItem(item, index, totalClicks))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function DetailedStatsCards({ shortCode, filter, startDate, endDate }: DetailedStatsCardsProps) {
  const [analytics, setAnalytics] = useState<DetailedAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetailedAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let days = '365'; // Default
      
      // Converti il filtro in giorni
      if (filter === '24h') days = '1';
      else if (filter === '7d') days = '7';
      else if (filter === '30d') days = '30';
      else if (filter === '90d') days = '90';
      else if (filter === '365d') days = '365';
      else if (filter === 'all' || filter === 'sempre') days = '9999';
      
      const params = new URLSearchParams({
        shortCode,
        days
      });
      
      const response = await fetch(`/api/analytics?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei dati');
      }
      
      const data = await response.json();
      setAnalytics(data.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setIsLoading(false);
  }
};

// Backwards compatibility functions (usano le nuove funzioni sotto)
const getBrowserEmoji = (browser: string): React.ReactNode => getBrowserIcon(browser);
const getDeviceEmoji = (device: string): React.ReactNode => getDeviceIcon(device);  
const getOSEmoji = (os: string): React.ReactNode => getOSIcon(os);

// Funzione per ottenere il dominio da un URL
const getDomainFromURL = (url: string): string => {
  if (!url || url === 'Direct' || url === 'Diretto') return 'Diretto';
  
  // Se l'URL contiene caratteri URL encoded, prova a formattarlo
  if (url.includes('%') || url.includes('+')) {
    const formatted = formatDisplayName(url);
    // Se la formattazione ha prodotto un risultato sensato (no http/www), usa quello
    if (!formatted.includes('http') && !formatted.includes('www.') && formatted !== url) {
      return formatted;
    }
  }
  
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    // Se l'URL non è valido, prova a estrarre il dominio manualmente
    const domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    
    // Se anche questo fallisce, applica la formattazione generale
    if (!domain || domain === url) {
      return formatDisplayName(url);
    }
    
    return domain || 'Sconosciuto';
  }
};  useEffect(() => {
    fetchDetailedAnalytics();
  }, [shortCode, filter, startDate, endDate]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border-l-4 border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gray-100 rounded-full w-11 h-11 animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-24 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="text-red-500 mb-2">
          <svg className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-gray-600">Errore nel caricamento delle statistiche dettagliate</p>
        <p className="text-sm text-gray-500 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Card Paesi */}
      <StatCard
          title="Paesi"
          icon={<Globe className="h-5 w-5" />}
          borderColor="border-blue-500"
          bgColor="bg-blue-100"
          iconColor="text-blue-600"
          data={analytics.countries}
          totalClicks={analytics.total_clicks}
          uniqueClicks={analytics.unique_clicks}
          nameKey="country"
          renderItem={(country, index, totalClicks) => (
            <div key={index} className="grid grid-cols-12 gap-2 py-1.5 text-xs hover:bg-gray-50 rounded">
              <div className="col-span-6 flex items-center space-x-2 min-w-0">
                <span className="flex items-center">{getCountryFlag(country.country)}</span>
                <span className="font-medium text-gray-900 truncate" title={normalizeCountryName(country.country)}>
                  {formatDisplayName(normalizeCountryName(country.country)) || 'Sconosciuto'}
                </span>
              </div>
              <div className="col-span-2 text-right font-medium text-gray-900">
                <NoSSR fallback="--">
                  <NumberFormat value={country.count} />
                </NoSSR>
              </div>
              <div className="col-span-2 text-right font-medium text-blue-600">
                <NoSSR fallback="--">
                  <NumberFormat value={country.unique_count} />
                </NoSSR>
              </div>
              <div className="col-span-2 text-right text-gray-500 font-medium">
                {totalClicks > 0 ? ((country.count / totalClicks) * 100).toFixed(1) : 0}%
              </div>
            </div>
          )}
        />

        {/* Card Città */}
        <StatCard
          title="Città"
          icon={<MapPin className="h-5 w-5" />}
          borderColor="border-indigo-500"
          bgColor="bg-indigo-100"
          iconColor="text-indigo-600"
          data={analytics.cities}
          totalClicks={analytics.total_clicks}
          uniqueClicks={analytics.unique_clicks}
          nameKey="city"
          renderItem={(city, index, totalClicks) => (
            <div key={index} className="grid grid-cols-12 gap-2 py-1.5 text-xs hover:bg-gray-50 rounded">
              <div className="col-span-6 flex items-center space-x-2 min-w-0">
                <span className="text-sm">🏙️</span>
                <span className="font-medium text-gray-900 truncate" title={city.city}>
                  {formatDisplayName(city.city) || 'Sconosciuto'}
                </span>
              </div>
              <div className="col-span-2 text-right font-medium text-gray-900">
                <NoSSR fallback="--">
                  <NumberFormat value={city.count} />
                </NoSSR>
              </div>
              <div className="col-span-2 text-right font-medium text-indigo-600">
                <NoSSR fallback="--">
                  <NumberFormat value={city.unique_count} />
                </NoSSR>
              </div>
              <div className="col-span-2 text-right text-gray-500 font-medium">
                {totalClicks > 0 ? ((city.count / totalClicks) * 100).toFixed(1) : 0}%
              </div>
            </div>
          )}
        />

        {/* Card Origine Traffico */}
        <StatCard
          title="Origine Traffico"
          icon={<Share2 className="h-5 w-5" />}
          borderColor="border-green-500"
          bgColor="bg-green-100"
          iconColor="text-green-600"
          data={analytics.referrers}
          totalClicks={analytics.total_clicks}
          uniqueClicks={analytics.unique_clicks}
          nameKey="referrer"
          renderItem={(referrer, index, totalClicks) => (
            <div key={index} className="grid grid-cols-12 gap-2 py-1.5 text-xs hover:bg-gray-50 rounded">
              <div className="col-span-6 flex items-center space-x-2 min-w-0">
                <span className="text-sm">{getReferrerIcon(referrer.referrer)}</span>
                <span className="font-medium text-gray-900 truncate" title={referrer.referrer}>
                  {getDomainFromURL(referrer.referrer) || 'Diretto'}
                </span>
              </div>
              <div className="col-span-2 text-right font-medium text-gray-900">
                <NoSSR fallback="--">
                  <NumberFormat value={referrer.count} />
                </NoSSR>
              </div>
              <div className="col-span-2 text-right font-medium text-green-600">
                <NoSSR fallback="--">
                  <NumberFormat value={referrer.unique_count} />
                </NoSSR>
              </div>
              <div className="col-span-2 text-right text-gray-500 font-medium">
                {totalClicks > 0 ? ((referrer.count / totalClicks) * 100).toFixed(1) : 0}%
              </div>
            </div>
          )}
        />

        {/* Card Browser */}
        <StatCard
          title="Browser"
          icon={<Monitor className="h-5 w-5" />}
          borderColor="border-purple-500"
          bgColor="bg-purple-100"
          iconColor="text-purple-600"
          data={analytics.browsers}
          totalClicks={analytics.total_clicks}
          uniqueClicks={analytics.unique_clicks}
          nameKey="browser"
          renderItem={(browser, index, totalClicks) => (
            <div key={index} className="grid grid-cols-12 gap-2 py-1.5 text-xs hover:bg-gray-50 rounded">
              <div className="col-span-6 flex items-center space-x-2 min-w-0">
                <span className="text-sm">{getBrowserIcon(browser.browser)}</span>
                <span className="font-medium text-gray-900 truncate" title={browser.browser}>
                  {formatDisplayName(browser.browser) || 'Sconosciuto'}
                </span>
              </div>
              <div className="col-span-2 text-right font-medium text-gray-900">
                <NoSSR fallback="--">
                  <NumberFormat value={browser.count} />
                </NoSSR>
              </div>
              <div className="col-span-2 text-right font-medium text-purple-600">
                <NoSSR fallback="--">
                  <NumberFormat value={browser.unique_count} />
                </NoSSR>
              </div>
              <div className="col-span-2 text-right text-gray-500 font-medium">
                {totalClicks > 0 ? ((browser.count / totalClicks) * 100).toFixed(1) : 0}%
              </div>
            </div>
          )}
        />

        {/* Card Lingue */}
        <StatCard
          title="Lingue"
          icon={<Languages className="h-5 w-5" />}
          borderColor="border-pink-500"
          bgColor="bg-pink-100"
          iconColor="text-pink-600"
          data={analytics.languages}
          totalClicks={analytics.total_clicks}
          uniqueClicks={analytics.unique_clicks}
          nameKey="language"
          renderItem={(language, index, totalClicks) => (
            <div key={index} className="grid grid-cols-12 gap-2 py-1.5 text-xs hover:bg-gray-50 rounded">
              <div className="col-span-6 flex items-center space-x-2 min-w-0">
                <span className="flex items-center">{getLanguageIcon(language.language)}</span>
                <span className="font-medium text-gray-900 uppercase truncate" title={language.language}>
                  {language.language || 'Sconosciuto'}
                </span>
              </div>
              <div className="col-span-2 text-right font-medium text-gray-900">
                <NoSSR fallback="--">
                  <NumberFormat value={language.count} />
                </NoSSR>
              </div>
              <div className="col-span-2 text-right font-medium text-pink-600">
                <NoSSR fallback="--">
                  <NumberFormat value={language.unique_count} />
                </NoSSR>
              </div>
              <div className="col-span-2 text-right text-gray-500 font-medium">
                {totalClicks > 0 ? ((language.count / totalClicks) * 100).toFixed(1) : 0}%
              </div>
            </div>
          )}
        />

        {/* Card Dispositivi */}
        <StatCard
          title="Dispositivi"
          icon={<Smartphone className="h-5 w-5" />}
          borderColor="border-teal-500"
          bgColor="bg-teal-100"
          iconColor="text-teal-600"
          data={analytics.devices}
          totalClicks={analytics.total_clicks}
          uniqueClicks={analytics.unique_clicks}
          nameKey="device"
          renderItem={(device, index, totalClicks) => (
            <div key={index} className="grid grid-cols-12 gap-2 py-1.5 text-xs hover:bg-gray-50 rounded">
              <div className="col-span-6 flex items-center space-x-2 min-w-0">
                <span className="text-sm">{getDeviceIcon(device.device)}</span>
                <span className="font-medium text-gray-900 truncate" title={device.device}>
                  {formatDisplayName(device.device) || 'Sconosciuto'}
                </span>
              </div>
              <div className="col-span-2 text-right font-medium text-gray-900">
                <NoSSR fallback="--">
                  <NumberFormat value={device.count} />
                </NoSSR>
              </div>
              <div className="col-span-2 text-right font-medium text-teal-600">
                <NoSSR fallback="--">
                  <NumberFormat value={device.unique_count} />
                </NoSSR>
              </div>
              <div className="col-span-2 text-right text-gray-500 font-medium">
                {totalClicks > 0 ? ((device.count / totalClicks) * 100).toFixed(1) : 0}%
              </div>
            </div>
          )}
        />

        {/* Card Sistemi Operativi */}
        <StatCard
          title="Sistemi Operativi"
          icon={<HardDrive className="h-5 w-5" />}
          borderColor="border-orange-500"
          bgColor="bg-orange-100"
          iconColor="text-orange-600"
          data={analytics.operating_systems}
          totalClicks={analytics.total_clicks}
          uniqueClicks={analytics.unique_clicks}
          nameKey="os"
          renderItem={(os, index, totalClicks) => (
            <div key={index} className="grid grid-cols-12 gap-2 py-1.5 text-xs hover:bg-gray-50 rounded">
              <div className="col-span-6 flex items-center space-x-2 min-w-0">
                <span className="text-sm">{getOSIcon(os.os)}</span>
                <span className="font-medium text-gray-900 truncate" title={os.os}>
                  {formatDisplayName(os.os) || 'Sconosciuto'}
                </span>
              </div>
              <div className="col-span-2 text-right font-medium text-gray-900">
                <NoSSR fallback="--">
                  <NumberFormat value={os.count} />
                </NoSSR>
              </div>
              <div className="col-span-2 text-right font-medium text-orange-600">
                <NoSSR fallback="--">
                  <NumberFormat value={os.unique_count} />
                </NoSSR>
              </div>
              <div className="col-span-2 text-right text-gray-500 font-medium">
                {totalClicks > 0 ? ((os.count / totalClicks) * 100).toFixed(1) : 0}%
              </div>
            </div>
          )}
        />
    </div>
  );
}
