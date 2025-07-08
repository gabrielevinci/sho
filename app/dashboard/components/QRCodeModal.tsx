'use client';

import { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  onToast?: (message: string, type: 'success' | 'error') => void;
}

export default function QRCodeModal({
  isOpen,
  onClose,
  url,
  title,
  onToast
}: QRCodeModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

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
      // Usa un servizio gratuito per generare il QR code
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error('Errore durante la generazione del QR code:', error);
      onToast?.('Errore durante la generazione del QR code', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [url, onToast]);

  useEffect(() => {
    if (isOpen && url) {
      generateQRCode();
    }
  }, [isOpen, generateQRCode, url]);

  const downloadQRCode = async () => {
    if (!qrCodeUrl) return;
    
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `qr-code-${title || 'link'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
      onToast?.('QR Code scaricato con successo', 'success');
    } catch (error) {
      console.error('Errore durante il download:', error);
      onToast?.('Errore durante il download', 'error');
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
    <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            QR Code
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="text-center mb-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <Image 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  width={192}
                  height={192}
                  className="mx-auto object-contain"
                />
              </div>
              
              <div className="text-sm text-gray-600 break-all">
                {title && <p className="font-medium mb-1">{title}</p>}
                <p>{url}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-center space-x-2">
          <button
            onClick={copyUrlToClipboard}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 flex items-center space-x-1"
          >
            <ClipboardIcon className="h-4 w-4" />
            <span>Copia URL</span>
          </button>
          
          <button
            onClick={downloadQRCode}
            disabled={isLoading || !qrCodeUrl}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            <span>Scarica</span>
          </button>
        </div>
      </div>
    </div>
  );
}
