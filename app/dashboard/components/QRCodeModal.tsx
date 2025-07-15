'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, ClipboardIcon, CogIcon } from '@heroicons/react/24/outline';
import NextImage from 'next/image';
import Portal from './Portal';
import { useClickOutside } from '../hooks/useClickOutside';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

type QRSize = '200' | '300' | '400' | '500';
type QRFormat = 'png' | 'jpg' | 'svg';

export default function QRCodeModal({
  isOpen,
  onClose,
  url,
  title,
  onToast
}: QRCodeModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [size, setSize] = useState<QRSize>('300');
  const [format, setFormat] = useState<QRFormat>('png');
  const [errorCorrection, setErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [foregroundColor, setForegroundColor] = useState('000000');
  const [backgroundColor, setBackgroundColor] = useState('ffffff');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrCacheRef = useRef<Map<string, string>>(new Map());

  // Click esterno per chiudere il modal
  const modalRef = useClickOutside<HTMLDivElement>(() => {
    if (!isLoading) {
      onClose();
    }
  }, isOpen);

  // Funzione per resettare le opzioni avanzate ai valori predefiniti
  const resetAdvancedOptions = useCallback(() => {
    setSize('300');
    setFormat('png');
    setErrorCorrection('M');
    setForegroundColor('000000');
    setBackgroundColor('ffffff');
    onToast?.('Opzioni avanzate ripristinate ai valori predefiniti', 'success');
  }, [onToast]);

  // Gestione tasti
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const generateQRCode = useCallback(async () => {
    setIsLoading(true);
    try {
      // Crea una chiave di cache basata sui parametri
      const cacheKey = `${url}-${size}-${format}-${errorCorrection}-${foregroundColor}-${backgroundColor}`;
      
      // Controlla se abbiamo già questo QR in cache
      if (qrCacheRef.current.has(cacheKey)) {
        setQrCodeUrl(qrCacheRef.current.get(cacheKey)!);
        setIsLoading(false);
        return;
      }

      // Genera il QR code con parametri personalizzati
      const params = new URLSearchParams({
        size: `${size}x${size}`,
        data: url,
        format: format,
        ecc: errorCorrection,
        color: foregroundColor,
        bgcolor: backgroundColor,
        qzone: '2', // Quiet zone
        margin: '10'
      });
      
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
      
      // Pre-carica l'immagine per verificare che sia valida
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          // Salva in cache
          qrCacheRef.current.set(cacheKey, qrUrl);
          setQrCodeUrl(qrUrl);
          resolve();
        };
        img.onerror = () => reject(new Error('Errore nel caricamento del QR code'));
        img.src = qrUrl;
      });
      
    } catch (error) {
      console.error('Errore durante la generazione del QR code:', error);
      onToast?.('Errore durante la generazione del QR code', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [url, size, format, errorCorrection, foregroundColor, backgroundColor, onToast]);

  useEffect(() => {
    if (isOpen && url) {
      generateQRCode();
    }
  }, [isOpen, generateQRCode, url]);

  const downloadQRCode = async () => {
    if (!qrCodeUrl) return;
    
    try {
      setIsLoading(true);
      
      // Usa canvas per generare un'immagine di alta qualità
      const canvas = canvasRef.current;
      if (!canvas) {
        throw new Error('Canvas non disponibile');
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Contesto canvas non disponibile');
      }
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          // Imposta le dimensioni del canvas
          const canvasSize = parseInt(size);
          canvas.width = canvasSize;
          canvas.height = canvasSize;
          
          // Disegna l'immagine sul canvas
          ctx.drawImage(img, 0, 0, canvasSize, canvasSize);
          
          // Converti il canvas in blob
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Errore nella generazione del blob'));
              return;
            }
            
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            
            // Nome file più descrittivo
            const sanitizedTitle = (title || 'link').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const timestamp = new Date().toISOString().slice(0, 10);
            link.download = `qr_${sanitizedTitle}_${size}x${size}_${timestamp}.${format}`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            window.URL.revokeObjectURL(downloadUrl);
            onToast?.('QR Code scaricato con successo', 'success');
            resolve();
          }, `image/${format}`, 0.95);
        };
        
        img.onerror = () => reject(new Error('Errore nel caricamento dell\'immagine'));
        img.src = qrCodeUrl;
      });
      
    } catch (error) {
      console.error('Errore durante il download:', error);
      onToast?.('Errore durante il download del QR code', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const copyUrlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      onToast?.('URL copiato negli appunti', 'success');
    } catch (error) {
      console.error('Errore durante la copia:', error);
      onToast?.('Errore durante la copia', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4">
        <div ref={modalRef} className={`bg-white rounded-3xl shadow-2xl w-full mx-4 overflow-hidden backdrop-blur-sm border border-white/20 ${
          showAdvanced ? 'max-w-3xl max-h-[85vh] overflow-y-auto' : 'max-w-2xl'
        }`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-2xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 4h4m12 0h2M4 20h4m12 0h2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Generatore QR Code
                  </h3>
                  <p className="text-blue-100 text-sm">
                    Crea e personalizza il tuo QR Code
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`p-2 rounded-2xl transition-all duration-200 ${
                    showAdvanced 
                      ? 'bg-white/20 text-white' 
                      : 'bg-white/10 text-blue-100 hover:bg-white/20 hover:text-white'
                  }`}
                  title="Opzioni avanzate"
                >
                  <CogIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-2xl transition-all duration-200 text-blue-100 hover:text-white"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Contenuto principale */}
          <div className="p-6">
            {/* Opzioni avanzate */}
            {showAdvanced && (
              <div className="mb-6 p-5 bg-gray-50 rounded-3xl border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <CogIcon className="w-5 h-5 text-gray-600 mr-2" />
                    <h4 className="text-lg font-medium text-gray-900">Opzioni avanzate</h4>
                  </div>
                  <button
                    onClick={resetAdvancedOptions}
                    className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl transition-colors"
                    title="Ripristina impostazioni predefinite"
                  >
                    Reset
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dimensioni
                      </label>
                      <select
                        value={size}
                        onChange={(e) => setSize(e.target.value as QRSize)}
                        className="w-full text-sm border border-gray-300 rounded-2xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      >
                        <option value="200">200x200 px (Piccolo)</option>
                        <option value="300">300x300 px (Medio)</option>
                        <option value="400">400x400 px (Grande)</option>
                        <option value="500">500x500 px (Extra Large)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Formato file
                      </label>
                      <select
                        value={format}
                        onChange={(e) => setFormat(e.target.value as QRFormat)}
                        className="w-full text-sm border border-gray-300 rounded-2xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      >
                        <option value="png">PNG (Migliore qualità)</option>
                        <option value="jpg">JPG (File più piccolo)</option>
                        <option value="svg">SVG (Vettoriale)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Correzione errori
                      </label>
                      <select
                        value={errorCorrection}
                        onChange={(e) => setErrorCorrection(e.target.value as 'L' | 'M' | 'Q' | 'H')}
                        className="w-full text-sm border border-gray-300 rounded-2xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      >
                        <option value="L">Basso - 7% (Veloce)</option>
                        <option value="M">Medio - 15% (Bilanciato)</option>
                        <option value="Q">Alto - 25% (Sicuro)</option>
                        <option value="H">Massimo - 30% (Robusto)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Colore QR Code
                      </label>
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <input
                            type="color"
                            value={`#${foregroundColor}`}
                            onChange={(e) => setForegroundColor(e.target.value.slice(1))}
                            className="w-12 h-10 border-2 border-gray-300 rounded-2xl cursor-pointer shadow-sm"
                          />
                        </div>
                        <input
                          type="text"
                          value={foregroundColor}
                          onChange={(e) => setForegroundColor(e.target.value.replace('#', ''))}
                          className="flex-1 text-sm border border-gray-300 rounded-2xl px-3 py-2 font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="000000"
                          maxLength={6}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Colore sfondo
                      </label>
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <input
                            type="color"
                            value={`#${backgroundColor}`}
                            onChange={(e) => setBackgroundColor(e.target.value.slice(1))}
                            className="w-12 h-10 border-2 border-gray-300 rounded-2xl cursor-pointer shadow-sm"
                          />
                        </div>
                        <input
                          type="text"
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value.replace('#', ''))}
                          className="flex-1 text-sm border border-gray-300 rounded-2xl px-3 py-2 font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="ffffff"
                          maxLength={6}
                        />
                      </div>
                    </div>
                    
                    {/* Preview colori */}
                    <div className="mt-4 p-3 bg-white rounded-2xl border border-gray-200">
                      <p className="text-xs text-gray-600 mb-2">Anteprima colori:</p>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: `#${foregroundColor}` }}
                          title="Colore QR Code"
                        />
                        <span className="text-xs text-gray-500">su</span>
                        <div 
                          className="w-6 h-6 rounded border border-gray-300"
                          style={{ backgroundColor: `#${backgroundColor}` }}
                          title="Colore sfondo"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Area QR Code */}
            <div className="text-center mb-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-80 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-300">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mb-4"></div>
                  <p className="text-gray-600 font-medium">Generazione QR Code...</p>
                  <p className="text-gray-400 text-sm mt-1">Ottimizzazione in corso</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-3xl border border-gray-200 shadow-inner">
                    {qrCodeUrl ? (
                      <div className="flex justify-center">
                        <div className="bg-white p-4 rounded-2xl shadow-lg">
                          <NextImage 
                            src={qrCodeUrl} 
                            alt="QR Code" 
                            width={
                              size === '200' ? 192 :
                              size === '300' ? 256 :
                              size === '400' ? 288 :
                              320
                            }
                            height={
                              size === '200' ? 192 :
                              size === '300' ? 256 :
                              size === '400' ? 288 :
                              320
                            }
                            className={`object-contain rounded ${
                              size === '200' ? 'w-48 h-48' :
                              size === '300' ? 'w-64 h-64' :
                              size === '400' ? 'w-72 h-72' :
                              'w-80 h-80'
                            }`}
                            style={{ maxWidth: '100%', maxHeight: '400px' }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="w-64 h-64 mx-auto bg-gray-200 flex flex-col items-center justify-center rounded-2xl">
                        <svg className="w-16 h-16 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-gray-500 font-medium">Errore nel caricamento</span>
                        <span className="text-gray-400 text-sm">Riprova con impostazioni diverse</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Informazioni link */}
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
                    <div className="text-left">
                      {title && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Titolo</span>
                          <p className="text-sm font-medium text-blue-900 break-words">{title}</p>
                        </div>
                      )}
                      <div className="mb-2">
                        <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">URL</span>
                        <p className="text-sm text-blue-800 break-all">{url}</p>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-blue-600">
                        <span>📐 {size}×{size}px</span>
                        <span>📄 {format.toUpperCase()}</span>
                        <span>🛡️ Correzione {errorCorrection}</span>
                        <span>🎨 #{foregroundColor} su #{backgroundColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Azioni */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={copyUrlToClipboard}
                className="flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all duration-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                <ClipboardIcon className="h-5 w-5 mr-2" />
                Copia URL
              </button>
              
              <button
                onClick={downloadQRCode}
                disabled={isLoading || !qrCodeUrl}
                className="flex-1 flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg"
              >
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                {isLoading ? 'Elaborazione...' : `Scarica ${format.toUpperCase()}`}
              </button>
            </div>
          </div>
          
          {/* Canvas nascosto per il download */}
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </Portal>
  );
}
