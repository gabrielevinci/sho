'use client';

import { useEffect } from 'react';
import { ExclamationTriangleIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Portal from './Portal';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  type?: 'delete' | 'reset' | 'warning';
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText = 'Annulla',
  type = 'warning',
  isLoading = false
}: ConfirmationModalProps) {
  // Gestione tasti
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !isLoading) {
        onConfirm();
      } else if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onConfirm, onClose, isLoading]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'delete':
        return <TrashIcon className="h-8 w-8 text-red-500" />;
      case 'reset':
        return <ArrowPathIcon className="h-8 w-8 text-orange-500" />;
      default:
        return <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />;
    }
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'delete':
        return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'reset':
        return 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500';
      default:
        return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-[9999]">
        <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4 shadow-xl">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-shrink-0">
              {getIcon()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600">
              {message}
            </p>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${getConfirmButtonStyle()}`}
            >
              {isLoading ? 'Attendere...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
