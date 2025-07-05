'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import BlackButton from './black-button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useModal } from '@/providers/modal-provider';

interface NfcModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  address: string;
}

export default function NfcModal({ 
  isOpen, 
  onClose, 
  amount, 
  address 
}: NfcModalProps) {
  const [isListening, setIsListening] = useState(false);
  const { setModalOpen } = useModal();

  useEffect(() => {
    if (isOpen && amount && address) {
      // Start NFC listening
      setIsListening(true);
      
      // In a real implementation, you would setup NFC listener
      // For now, we'll just simulate the setup
      console.log('Setting up NFC for payment request:', { amount, address });
      
      // TODO: Implement actual NFC logic
      // if ('NDEFReader' in window) {
      //   const ndef = new NDEFReader();
      //   ndef.scan();
      // }
    }
    
    return () => {
      setIsListening(false);
    };
  }, [isOpen, amount, address]);

  useEffect(() => {
    setModalOpen(isOpen);
  }, [isOpen, setModalOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    console.log('NFC Modal close button clicked');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed top-0 left-0 right-0 bottom-0 bg-background"
      style={{ 
        height: '100vh', 
        width: '100vw', 
        zIndex: 99999,
        position: 'fixed',
        overflow: 'hidden'
      }}
    >
      {/* Header without X button */}
      <div className="w-full h-16 flex items-center justify-center px-4 lg:px-6 sticky top-0 z-50 bg-background">
        <h1 className="text-lg lg:text-xl font-bold text-base-content tracking-tight">Tap to Pay</h1>
      </div>
      
      <div className="flex items-center justify-center p-4 pb-32 h-full">
        <div className="text-center space-y-6 max-w-md">
          <div className="relative w-64 h-64 mx-auto">
            {/* NFC Image - using a placeholder for now */}
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <div className="text-white text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 bg-white rounded-full"></div>
                </div>
                <p className="text-sm font-medium">NFC Ready</p>
                {isListening && (
                  <div className="mt-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse mx-auto"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-base-content/70 text-lg">
              Request ${amount} USDC
            </p>
            <p className="text-xs text-base-content/50 break-all">
              To: {address}
            </p>
          </div>
        </div>
      </div>
        
      {/* Fixed bottom button */}
      <div className="fixed bottom-24 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-base-300">
        <div className="max-w-md mx-auto space-y-3">
          <p className="text-sm text-base-content/70 text-center">
            {isListening ? 'Hold your device near the sender\'s phone to receive' : 'Setting up NFC...'} ${amount} USDC
          </p>
          <BlackButton
            onClick={handleClose}
            icon={<XMarkIcon className="w-4 h-4" />}
            className="w-full"
          >
            Cancel
          </BlackButton>
        </div>
      </div>
    </motion.div>
  );
} 