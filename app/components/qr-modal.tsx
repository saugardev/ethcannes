'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Image from 'next/image';
import BlackButton from './black-button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useModal } from '@/providers/modal-provider';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  address: string;
}

export default function QrModal({ 
  isOpen, 
  onClose, 
  amount, 
  address 
}: QrModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const { setModalOpen } = useModal();

  console.log('QR Modal render - isOpen:', isOpen, 'onClose type:', typeof onClose);

  useEffect(() => {
    if (isOpen && amount && address) {
      // Generate actual QR code
      const qrData = `ethereum:${address}?value=${amount}&token=USDC`;
      QRCode.toDataURL(qrData, {
        width: 256,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).then(url => {
        setQrCodeUrl(url);
      }).catch(err => {
        console.error('QR code generation failed:', err);
      });
    }
  }, [isOpen, amount, address]);

  useEffect(() => {
    setModalOpen(isOpen);
  }, [isOpen, setModalOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    console.log('QR Modal close button clicked');
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
        zIndex: 999999,
        position: 'fixed',
        overflow: 'hidden'
      }}
    >
      {/* Header without X button */}
      <div className="w-full h-16 flex items-center justify-center px-4 lg:px-6 sticky top-0 z-50 bg-background">
        <h1 className="text-lg lg:text-xl font-bold text-base-content tracking-tight">Scan to Pay</h1>
      </div>
      
      <div className="flex items-center justify-center p-4 pb-32 h-full">
        {/* Centered content */}
        <div className="flex items-center justify-center p-4 pb-32 h-full">
          <div className="text-center space-y-6 max-w-md">
            <div className="relative w-64 h-64 mx-auto bg-white rounded-2xl p-4 shadow-lg">
              {qrCodeUrl ? (
                <Image 
                  src={qrCodeUrl} 
                  alt="QR Code for payment" 
                  width={256} 
                  height={256} 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <div className="text-gray-500 text-sm text-center">
                    Generating QR Code...
                  </div>
                </div>
              )}
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
        
      </div>
        
      {/* Fixed bottom button */}
      <div className="fixed bottom-24 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-base-300">
        <div className="max-w-md mx-auto space-y-3">
          <p className="text-sm text-base-content/70 text-center">
            Have the sender scan this QR code to send you ${amount} USDC
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