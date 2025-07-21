/**
 * Tipi TypeScript per le nuove tabelle del database
 */

// Tabella Links
export interface Link {
  id: number;
  short_code: string;
  original_url: string;
  title?: string;
  description?: string;
  user_id: string;  // UUID invece di number
  workspace_id: string;  // UUID invece di number
  folder_id?: string;  // UUID invece di number
  created_at: Date;
  utm_campaign?: string;
  utm_source?: string;
  utm_content?: string;
  utm_medium?: string;
  utm_term?: string;
}

// Dati per creare un nuovo link
export interface CreateLinkData {
  short_code: string;
  original_url: string;
  title?: string;
  description?: string;
  user_id: string;  // UUID invece di number
  workspace_id: string;  // UUID invece di number
  folder_id?: string;  // UUID invece di number
  utm_campaign?: string;
  utm_source?: string;
  utm_content?: string;
  utm_medium?: string;
  utm_term?: string;
}

// Tabella Clicks
export interface Click {
  id: number;
  link_id: number;
  clicked_at: Date;
  clicked_at_rome: Date;
  country?: string;
  region?: string;
  city?: string;
  referrer?: string;
  browser_name?: string;
  language_device?: string;
  device_type?: string;
  os_name?: string;
  ip_address?: string;
  user_agent?: string;
  timezone_device?: string;
  click_fingerprint_hash: string;
  source_type?: string;
  source_detail?: string;
}

// Dati per registrare un nuovo click
export interface CreateClickData {
  link_id: number;
  country?: string;
  region?: string;
  city?: string;
  referrer?: string;
  browser_name?: string;
  language_device?: string;
  device_type?: string;
  os_name?: string;
  ip_address?: string;
  user_agent?: string;
  timezone_device?: string;
  click_fingerprint_hash: string;
}

// Informazioni aggregate sui click
export interface LinkAnalytics {
  link_id: number;
  total_clicks: number;
  unique_clicks: number;
  countries: Array<{ country: string; count: number }>;
  browsers: Array<{ browser: string; count: number }>;
  devices: Array<{ device: string; count: number }>;
  operating_systems: Array<{ os: string; count: number }>;
  referrers: Array<{ referrer: string; count: number }>;
  daily_clicks: Array<{ date: string; clicks: number }>;
}

// Risposta API per ottenere i link
export interface LinksResponse {
  links: Array<Link & { click_count: number; unique_click_count: number }>;
}

// Risposta API per creare un link
export interface CreateLinkResponse {
  success: boolean;
  link: Link;
}

// Geolocalizzazione
export interface GeoLocation {
  country?: string;
  region?: string;
  city?: string;
}

// Informazioni del dispositivo
export interface DeviceInfo {
  browser_name: string;
  device_type: string;
  os_name: string;
  language_device?: string;
  timezone_device?: string;
}

// Fingerprint completo per il click
export interface ClickFingerprint {
  link_id: number;
  country?: string;
  region?: string;
  city?: string;
  ip_address?: string;
  language_device?: string;
  timezone_device?: string;
}
