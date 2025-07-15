/**
 * Client-side fingerprint collection script
 * Questo script viene eseguito quando un utente clicca su un link
 * per raccogliere il fingerprint avanzato e inviarlo al server
 */

import { collectAdvancedFingerprint, AdvancedFingerprint } from './advanced-fingerprint';

export interface FingerprintData {
  shortCode: string;
  fingerprint: AdvancedFingerprint;
  timestamp: number;
  pageLoadTime: number;
  clickPosition?: { x: number; y: number };
  scrollPosition?: { x: number; y: number };
  mouseMovements?: Array<{ x: number; y: number; timestamp: number }>;
  keystrokes?: number;
  timeOnPage?: number;
}

class ClickTracker {
  private shortCode: string;
  private startTime: number;
  private mouseMovements: Array<{ x: number; y: number; timestamp: number }> = [];
  private keystrokes: number = 0;
  private clickPosition?: { x: number; y: number };

  constructor(shortCode: string) {
    this.shortCode = shortCode;
    this.startTime = Date.now();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Track mouse movements (sample every 100ms to avoid too much data)
    let lastMouseTime = 0;
    document.addEventListener('mousemove', (e) => {
      const now = Date.now();
      if (now - lastMouseTime > 100) {
        this.mouseMovements.push({
          x: e.clientX,
          y: e.clientY,
          timestamp: now
        });
        lastMouseTime = now;
        
        // Keep only last 50 movements to limit data size
        if (this.mouseMovements.length > 50) {
          this.mouseMovements.shift();
        }
      }
    });

    // Track keystrokes (just count, don't record actual keys for privacy)
    document.addEventListener('keydown', () => {
      this.keystrokes++;
    });

    // Track click position on the link
    document.addEventListener('click', (e) => {
      this.clickPosition = {
        x: e.clientX,
        y: e.clientY
      };
    });
  }

  public async collectAndSend(): Promise<void> {
    try {
      const fingerprint = await collectAdvancedFingerprint();
      const pageLoadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      const timeOnPage = Date.now() - this.startTime;

      const data: FingerprintData = {
        shortCode: this.shortCode,
        fingerprint,
        timestamp: Date.now(),
        pageLoadTime,
        clickPosition: this.clickPosition,
        scrollPosition: {
          x: window.pageXOffset,
          y: window.pageYOffset
        },
        mouseMovements: this.mouseMovements,
        keystrokes: this.keystrokes,
        timeOnPage
      };

      // Send fingerprint data to server
      await this.sendFingerprintData(data);
    } catch (error) {
      console.error('Error collecting fingerprint:', error);
    }
  }

  private async sendFingerprintData(data: FingerprintData): Promise<void> {
    try {
      const response = await fetch('/api/analytics/fingerprint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error sending fingerprint data:', error);
      // Try to send with beacon as fallback
      try {
        navigator.sendBeacon('/api/analytics/fingerprint', JSON.stringify(data));
      } catch (beaconError) {
        console.error('Beacon fallback also failed:', beaconError);
      }
    }
  }
}

// Global function to initialize tracking
(window as { initAdvancedTracking?: (shortCode: string) => void }).initAdvancedTracking = (shortCode: string) => {
  const tracker = new ClickTracker(shortCode);
  
  // Collect fingerprint immediately
  tracker.collectAndSend();
  
  // Also collect on page unload
  window.addEventListener('beforeunload', () => {
    tracker.collectAndSend();
  });
};

// Auto-init if shortCode is provided in meta tag
document.addEventListener('DOMContentLoaded', () => {
  const metaTag = document.querySelector('meta[name="short-code"]') as HTMLMetaElement;
  if (metaTag && metaTag.content) {
    (window as { initAdvancedTracking?: (shortCode: string) => void }).initAdvancedTracking?.(metaTag.content);
  }
});
