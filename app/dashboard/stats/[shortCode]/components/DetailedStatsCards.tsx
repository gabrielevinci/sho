'use client';

import { useState, useEffect } from 'react';
import NumberFormat from '@/app/components/NumberFormat';
import NoSSR from '@/app/components/NoSSR';
import { normalizeCountryName } from '@/lib/database-helpers';
import { Globe, MapPin, Share2, Monitor, Languages, Smartphone, HardDrive } from 'lucide-react';

interface DetailedAnalytics {
  link_id: number;
  total_clicks: number;
  unique_clicks: number;
  countries: Array<{ country: string; count: number }>;
  cities: Array<{ city: string; count: number }>;
  browsers: Array<{ browser: string; count: number }>;
  devices: Array<{ device: string; count: number }>;
  operating_systems: Array<{ os: string; count: number }>;
  referrers: Array<{ referrer: string; count: number }>;
  languages: Array<{ language: string; count: number }>;
}

interface DetailedStatsCardsProps {
  shortCode: string;
  filter: string;
  startDate?: string;
  endDate?: string;
}

// Funzione per ottenere la bandiera del paese
const getCountryFlag = (countryCode: string): string => {
  if (!countryCode) return '🌍';
  
  // Se è un codice di 2 caratteri, converti in emoji
  if (countryCode.length === 2 && /^[A-Z]{2}$/i.test(countryCode)) {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }
  
  // Mapping per nomi di paesi comuni a codici ISO
  const countryNameToCode: { [key: string]: string } = {
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
    'peru': 'PE', 'perù': 'PE',
    'venezuela': 'VE',
    'egypt': 'EG', 'egitto': 'EG',
    'south africa': 'ZA', 'sudafrica': 'ZA',
    'nigeria': 'NG',
    'thailand': 'TH', 'tailandia': 'TH',
    'singapore': 'SG',
    'malaysia': 'MY',
    'philippines': 'PH', 'filippine': 'PH',
    'indonesia': 'ID',
    'vietnam': 'VN',
    'new zealand': 'NZ', 'nuova zelanda': 'NZ'
  };
  
  const normalizedName = countryCode.toLowerCase().trim();
  const isoCode = countryNameToCode[normalizedName];
  
  if (isoCode) {
    const codePoints = isoCode
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }
  
  return '🌍';
};

// Funzione per ottenere l'emoji del browser
const getBrowserEmoji = (browser: string): string => {
  const browserLower = browser.toLowerCase();
  if (browserLower.includes('chrome')) return '🟢';
  if (browserLower.includes('firefox')) return '🦊';
  if (browserLower.includes('safari')) return '🧭';
  if (browserLower.includes('edge')) return '🔷';
  if (browserLower.includes('opera')) return '⭕';
  if (browserLower.includes('brave')) return '🦁';
  if (browserLower.includes('samsung')) return '📱';
  if (browserLower.includes('vivaldi')) return '🎨';
  if (browserLower.includes('tor')) return '🔒';
  return '🌐';
};

// Funzione per ottenere l'emoji del dispositivo
const getDeviceEmoji = (device: string): string => {
  const deviceLower = device.toLowerCase();
  if (deviceLower.includes('mobile') || deviceLower.includes('phone')) return '📱';
  if (deviceLower.includes('tablet')) return '📱';
  if (deviceLower.includes('desktop') || deviceLower.includes('computer')) return '💻';
  return '📱';
};

// Funzione per ottenere l'emoji del sistema operativo
const getOSEmoji = (os: string): string => {
  const osLower = os.toLowerCase();
  if (osLower.includes('windows')) return '🪟';
  if (osLower.includes('mac') || osLower.includes('darwin')) return '🍎';
  if (osLower.includes('linux') || osLower.includes('ubuntu')) return '🐧';
  if (osLower.includes('android')) return '🤖';
  if (osLower.includes('ios') || osLower.includes('iphone')) return '📱';
  if (osLower.includes('chrome')) return '💻'; // Chrome OS
  return '💻';
};

// Funzione per ottenere il dominio da un URL
const getDomainFromURL = (url: string): string => {
  if (!url || url === 'Direct' || url === 'Diretto') return 'Diretto';
  
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    // Se l'URL non è valido, prova a estrarre il dominio manualmente
    const domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    return domain || 'Sconosciuto';
  }
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
  renderItem 
}: {
  title: string;
  icon: React.ReactNode;
  borderColor: string;
  bgColor: string;
  iconColor: string;
  data: Array<any>;
  totalClicks: number;
  uniqueClicks: number;
  renderItem: (item: any, index: number) => React.ReactNode;
}) => (
  <div className={`bg-white rounded-lg shadow-sm border-l-4 ${borderColor} transition-all duration-300 hover:shadow-md`}>
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-3 ${bgColor} rounded-full`}>
            <div className={`h-5 w-5 ${iconColor}`}>
              {icon}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{data.length} elementi unici</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        {data.length === 0 ? (
          <p className="text-gray-500 text-sm">Nessun dato disponibile</p>
        ) : (
          data.slice(0, 8).map((item, index) => renderItem(item, index))
        )}
      </div>
      
      {data.length > 8 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            E altri {data.length - 8} elementi...
          </p>
        </div>
      )}
    </div>
  </div>
);

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

  useEffect(() => {
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
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Statistiche Dettagliate</h2>
        <p className="text-gray-600">Analisi approfondita del traffico del tuo link</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
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
          renderItem={(country, index) => (
            <div key={index} className="flex items-center justify-between py-1.5">
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getCountryFlag(country.country)}</span>
                <span className="text-sm font-medium text-gray-900">
                  {normalizeCountryName(country.country) || 'Sconosciuto'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  <NoSSR fallback="--">
                    <NumberFormat value={country.count} />
                  </NoSSR>
                </div>
                <div className="text-xs text-gray-500">
                  {analytics.total_clicks > 0 ? ((country.count / analytics.total_clicks) * 100).toFixed(1) : 0}%
                </div>
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
          renderItem={(city, index) => (
            <div key={index} className="flex items-center justify-between py-1.5">
              <div className="flex items-center space-x-3">
                <span className="text-lg">🏙️</span>
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {city.city || 'Sconosciuto'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  <NoSSR fallback="--">
                    <NumberFormat value={city.count} />
                  </NoSSR>
                </div>
                <div className="text-xs text-gray-500">
                  {analytics.total_clicks > 0 ? ((city.count / analytics.total_clicks) * 100).toFixed(1) : 0}%
                </div>
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
          renderItem={(referrer, index) => (
            <div key={index} className="flex items-center justify-between py-1.5">
              <div className="flex items-center space-x-3">
                <span className="text-lg">🔗</span>
                <span className="text-sm font-medium text-gray-900 truncate max-w-28" title={referrer.referrer}>
                  {getDomainFromURL(referrer.referrer) || 'Diretto'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  <NoSSR fallback="--">
                    <NumberFormat value={referrer.count} />
                  </NoSSR>
                </div>
                <div className="text-xs text-gray-500">
                  {analytics.total_clicks > 0 ? ((referrer.count / analytics.total_clicks) * 100).toFixed(1) : 0}%
                </div>
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
          renderItem={(browser, index) => (
            <div key={index} className="flex items-center justify-between py-1.5">
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getBrowserEmoji(browser.browser)}</span>
                <span className="text-sm font-medium text-gray-900">
                  {browser.browser || 'Sconosciuto'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  <NoSSR fallback="--">
                    <NumberFormat value={browser.count} />
                  </NoSSR>
                </div>
                <div className="text-xs text-gray-500">
                  {analytics.total_clicks > 0 ? ((browser.count / analytics.total_clicks) * 100).toFixed(1) : 0}%
                </div>
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
          renderItem={(language, index) => (
            <div key={index} className="flex items-center justify-between py-1.5">
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getLanguageEmoji(language.language)}</span>
                <span className="text-sm font-medium text-gray-900 uppercase">
                  {language.language || 'Sconosciuto'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  <NoSSR fallback="--">
                    <NumberFormat value={language.count} />
                  </NoSSR>
                </div>
                <div className="text-xs text-gray-500">
                  {analytics.total_clicks > 0 ? ((language.count / analytics.total_clicks) * 100).toFixed(1) : 0}%
                </div>
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
          renderItem={(device, index) => (
            <div key={index} className="flex items-center justify-between py-1.5">
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getDeviceEmoji(device.device)}</span>
                <span className="text-sm font-medium text-gray-900">
                  {device.device || 'Sconosciuto'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  <NoSSR fallback="--">
                    <NumberFormat value={device.count} />
                  </NoSSR>
                </div>
                <div className="text-xs text-gray-500">
                  {analytics.total_clicks > 0 ? ((device.count / analytics.total_clicks) * 100).toFixed(1) : 0}%
                </div>
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
          renderItem={(os, index) => (
            <div key={index} className="flex items-center justify-between py-1.5">
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getOSEmoji(os.os)}</span>
                <span className="text-sm font-medium text-gray-900">
                  {os.os || 'Sconosciuto'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  <NoSSR fallback="--">
                    <NumberFormat value={os.count} />
                  </NoSSR>
                </div>
                <div className="text-xs text-gray-500">
                  {analytics.total_clicks > 0 ? ((os.count / analytics.total_clicks) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}
