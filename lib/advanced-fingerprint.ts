/**
 * Advanced Browser Fingerprinting System
 * Raccoglie una vasta gamma di informazioni del browser e del dispositivo
 * per creare un fingerprint unico e tracciabile
 */

export interface AdvancedFingerprint {
  // Browser Info
  userAgent: string;
  language: string;
  languages: string[];
  platform: string;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  
  // Screen & Display
  screenWidth: number;
  screenHeight: number;
  screenColorDepth: number;
  screenPixelDepth: number;
  availScreenWidth: number;
  availScreenHeight: number;
  devicePixelRatio: number;
  
  // Viewport
  viewportWidth: number;
  viewportHeight: number;
  
  // Timezone & Location
  timezone: string;
  timezoneOffset: number;
  
  // Hardware
  hardwareConcurrency: number;
  maxTouchPoints: number;
  
  // Audio Context
  audioFingerprint: string;
  
  // Canvas Fingerprint
  canvasFingerprint: string;
  
  // WebGL Fingerprint
  webglVendor: string;
  webglRenderer: string;
  webglFingerprint: string;
  
  // Fonts
  availableFonts: string[];
  
  // Plugins
  plugins: string[];
  
  // Storage
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  webSQL: boolean;
  
  // Network
  connectionType: string;
  connectionSpeed: string;
  
  // Battery (se disponibile)
  batteryLevel?: number;
  batteryCharging?: boolean;
  
  // Media Devices
  mediaDevices: string[];
  
  // Performance
  performanceFingerprint: string;
  
  // CSS Features
  cssFeatures: string[];
  
  // JavaScript Features
  jsFeatures: string[];
  
  // Hash finale
  fingerprintHash: string;
}

export class AdvancedFingerprintCollector {
  private fingerprint: Partial<AdvancedFingerprint> = {};

  async collect(): Promise<AdvancedFingerprint> {
    await Promise.all([
      this.collectBasicInfo(),
      this.collectScreenInfo(),
      this.collectTimezoneInfo(),
      this.collectHardwareInfo(),
      this.collectAudioFingerprint(),
      this.collectCanvasFingerprint(),
      this.collectWebGLFingerprint(),
      this.collectFonts(),
      this.collectPlugins(),
      this.collectStorageInfo(),
      this.collectNetworkInfo(),
      this.collectBatteryInfo(),
      this.collectMediaDevices(),
      this.collectPerformanceInfo(),
      this.collectCSSFeatures(),
      this.collectJSFeatures()
    ]);

    // Genera hash finale
    this.fingerprint.fingerprintHash = await this.generateFinalHash();
    
    return this.fingerprint as AdvancedFingerprint;
  }

  private collectBasicInfo(): void {
    this.fingerprint.userAgent = navigator.userAgent;
    this.fingerprint.language = navigator.language;
    this.fingerprint.languages = navigator.languages ? Array.from(navigator.languages) : [];
    this.fingerprint.platform = navigator.platform;
    this.fingerprint.cookieEnabled = navigator.cookieEnabled;
    this.fingerprint.doNotTrack = navigator.doNotTrack;
  }

  private collectScreenInfo(): void {
    this.fingerprint.screenWidth = screen.width;
    this.fingerprint.screenHeight = screen.height;
    this.fingerprint.screenColorDepth = screen.colorDepth;
    this.fingerprint.screenPixelDepth = screen.pixelDepth;
    this.fingerprint.availScreenWidth = screen.availWidth;
    this.fingerprint.availScreenHeight = screen.availHeight;
    this.fingerprint.devicePixelRatio = window.devicePixelRatio;
    this.fingerprint.viewportWidth = window.innerWidth;
    this.fingerprint.viewportHeight = window.innerHeight;
  }

  private collectTimezoneInfo(): void {
    this.fingerprint.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.fingerprint.timezoneOffset = new Date().getTimezoneOffset();
  }

  private collectHardwareInfo(): void {
    this.fingerprint.hardwareConcurrency = navigator.hardwareConcurrency || 0;
    this.fingerprint.maxTouchPoints = navigator.maxTouchPoints || 0;
  }

  private async collectAudioFingerprint(): Promise<void> {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(0);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      this.fingerprint.audioFingerprint = Array.from(dataArray).slice(0, 30).join(',');
      
      oscillator.stop();
      audioContext.close();
    } catch {
      this.fingerprint.audioFingerprint = 'unavailable';
    }
  }

  private collectCanvasFingerprint(): void {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 200;
      canvas.height = 50;

      // Draw complex pattern
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('🌈 Advanced Fingerprint 🔍', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Advanced Fingerprint', 4, 17);

      // Add gradient
      const gradient = ctx.createLinearGradient(0, 0, 200, 50);
      gradient.addColorStop(0, 'red');
      gradient.addColorStop(0.5, 'green');
      gradient.addColorStop(1, 'blue');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 25, 200, 25);

      this.fingerprint.canvasFingerprint = canvas.toDataURL();
    } catch {
      this.fingerprint.canvasFingerprint = 'unavailable';
    }
  }

  private collectWebGLFingerprint(): void {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
      
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        this.fingerprint.webglVendor = debugInfo ? gl.getParameter((debugInfo as { UNMASKED_VENDOR_WEBGL: number }).UNMASKED_VENDOR_WEBGL) : 'unknown';
        this.fingerprint.webglRenderer = debugInfo ? gl.getParameter((debugInfo as { UNMASKED_RENDERER_WEBGL: number }).UNMASKED_RENDERER_WEBGL) : 'unknown';
        
        // Create WebGL fingerprint
        const vertex = gl.createShader(gl.VERTEX_SHADER);
        const fragment = gl.createShader(gl.FRAGMENT_SHADER);
        
        if (vertex && fragment) {
          gl.shaderSource(vertex, 'attribute vec2 a; void main(){gl_Position=vec4(a,0.,1.);}');
          gl.shaderSource(fragment, 'precision mediump float; void main(){gl_FragColor=vec4(1.,0.,0.,1.);}');
          gl.compileShader(vertex);
          gl.compileShader(fragment);
          
          const program = gl.createProgram();
          if (program) {
            gl.attachShader(program, vertex);
            gl.attachShader(program, fragment);
            gl.linkProgram(program);
            
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
            
            const position = gl.getAttribLocation(program, 'a');
            gl.enableVertexAttribArray(position);
            gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
            
            gl.useProgram(program);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            
            const pixels = new Uint8Array(4);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            this.fingerprint.webglFingerprint = Array.from(pixels).join(',');
          }
        }
      } else {
        this.fingerprint.webglVendor = 'unavailable';
        this.fingerprint.webglRenderer = 'unavailable';
        this.fingerprint.webglFingerprint = 'unavailable';
      }
    } catch {
      this.fingerprint.webglVendor = 'error';
      this.fingerprint.webglRenderer = 'error';
      this.fingerprint.webglFingerprint = 'error';
    }
  }

  private async collectFonts(): Promise<void> {
    const testFonts = [
      'Arial', 'Arial Black', 'Arial Narrow', 'Arial Rounded MT Bold',
      'Bookman Old Style', 'Bradley Hand ITC', 'Century', 'Century Gothic',
      'Comic Sans MS', 'Courier', 'Courier New', 'Georgia', 'Gentium',
      'Helvetica', 'Impact', 'King', 'Lucida Console', 'Lalit', 'Modena',
      'Monotype Corsiva', 'Papyrus', 'Tahoma', 'TeX', 'Times',
      'Times New Roman', 'Trebuchet MS', 'Verdana', 'Verona'
    ];

    const availableFonts: string[] = [];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const h = document.getElementsByTagName('body')[0];

    const s = document.createElement('span');
    s.style.fontSize = testSize;
    s.innerHTML = testString;
    const defaultWidth = s.offsetWidth;
    const defaultHeight = s.offsetHeight;

    for (const font of testFonts) {
      s.style.fontFamily = font;
      h.appendChild(s);
      if (s.offsetWidth !== defaultWidth || s.offsetHeight !== defaultHeight) {
        availableFonts.push(font);
      }
      h.removeChild(s);
    }

    this.fingerprint.availableFonts = availableFonts;
  }

  private collectPlugins(): void {
    const plugins: string[] = [];
    if (navigator.plugins) {
      for (let i = 0; i < navigator.plugins.length; i++) {
        plugins.push(navigator.plugins[i].name);
      }
    }
    this.fingerprint.plugins = plugins;
  }

  private collectStorageInfo(): void {
    this.fingerprint.localStorage = !!window.localStorage;
    this.fingerprint.sessionStorage = !!window.sessionStorage;
    this.fingerprint.indexedDB = !!window.indexedDB;
    this.fingerprint.webSQL = !!(window as { openDatabase?: unknown }).openDatabase;
  }

  private collectNetworkInfo(): void {
    const connection = (navigator as { connection?: { effectiveType?: string; downlink?: number }; mozConnection?: { effectiveType?: string; downlink?: number }; webkitConnection?: { effectiveType?: string; downlink?: number } }).connection || 
                      (navigator as { mozConnection?: { effectiveType?: string; downlink?: number } }).mozConnection || 
                      (navigator as { webkitConnection?: { effectiveType?: string; downlink?: number } }).webkitConnection;
    if (connection) {
      this.fingerprint.connectionType = connection.effectiveType || 'unknown';
      this.fingerprint.connectionSpeed = connection.downlink ? connection.downlink.toString() : 'unknown';
    } else {
      this.fingerprint.connectionType = 'unknown';
      this.fingerprint.connectionSpeed = 'unknown';
    }
  }

  private async collectBatteryInfo(): Promise<void> {
    try {
      const battery = await (navigator as { getBattery?: () => Promise<{ level: number; charging: boolean }> }).getBattery?.();
      if (battery) {
        this.fingerprint.batteryLevel = battery.level;
        this.fingerprint.batteryCharging = battery.charging;
      }
    } catch {
      // Battery API not available
    }
  }

  private async collectMediaDevices(): Promise<void> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        this.fingerprint.mediaDevices = devices.map(device => device.kind);
      } else {
        this.fingerprint.mediaDevices = [];
      }
    } catch {
      this.fingerprint.mediaDevices = [];
    }
  }

  private collectPerformanceInfo(): void {
    if (performance && (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory) {
      const memory = (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      this.fingerprint.performanceFingerprint = [
        memory.usedJSHeapSize,
        memory.totalJSHeapSize,
        memory.jsHeapSizeLimit
      ].join(',');
    } else {
      this.fingerprint.performanceFingerprint = 'unavailable';
    }
  }

  private collectCSSFeatures(): void {
    const features: string[] = [];
    const testElement = document.createElement('div');
    
    const cssTests = [
      'display: flex',
      'display: grid',
      'filter: blur(1px)',
      'transform: rotate(1deg)',
      'border-radius: 1px',
      'box-shadow: 1px 1px 1px black',
      'text-shadow: 1px 1px 1px black',
      'background: linear-gradient(red, blue)'
    ];

    cssTests.forEach(test => {
      try {
        testElement.style.cssText = test;
        if (testElement.style.length > 0) {
          features.push(test.split(':')[0].trim());
        }
      } catch {
        // Feature not supported
      }
    });

    this.fingerprint.cssFeatures = features;
  }

  private collectJSFeatures(): void {
    const features: string[] = [];
    
    const jsTests = {
      'WebGL': () => !!(window as { WebGLRenderingContext?: unknown }).WebGLRenderingContext,
      'Worker': () => !!window.Worker,
      'SharedWorker': () => !!(window as { SharedWorker?: unknown }).SharedWorker,
      'ServiceWorker': () => 'serviceWorker' in navigator,
      'FileReader': () => !!window.FileReader,
      'Blob': () => !!window.Blob,
      'WebSockets': () => !!window.WebSocket,
      'ES6': () => {
        try {
          return eval('(function*(){})') && eval('(()=>{})') && eval('class{}');
        } catch {
          return false;
        }
      }
    };

    Object.entries(jsTests).forEach(([name, test]) => {
      try {
        if (test()) features.push(name);
      } catch {
        // Feature not supported
      }
    });

    this.fingerprint.jsFeatures = features;
  }

  private async generateFinalHash(): Promise<string> {
    const data = JSON.stringify(this.fingerprint);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
  }
}

// Utility function to collect fingerprint
export async function collectAdvancedFingerprint(): Promise<AdvancedFingerprint> {
  const collector = new AdvancedFingerprintCollector();
  return await collector.collect();
}
