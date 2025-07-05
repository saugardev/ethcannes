'use client';

import { usePrivy } from "@privy-io/react-auth";
import BlackButton from './black-button';
import Image from 'next/image';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LockClosedIcon } from "@heroicons/react/24/outline";

interface LoginGateProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function LoginGate({ 
  children, 
  title = "Welcome to Buddy",
  subtitle = "You need to login first to access your dashboard and features."
}: LoginGateProps) {
  const { ready, authenticated, login } = usePrivy();

  // Show welcome screen if not authenticated
  if (ready && !authenticated) {
    return (
      <div className="min-h-screen relative">
        {/* Centered content */}
        <div className="absolute inset-0 flex items-center justify-center p-4 pb-32">
          <div className="text-center space-y-6 max-w-md">
            <div className="relative w-64 h-64 mx-auto">
              <Image
                src="/welcome.webp"
                alt="Welcome"
                fill
                className="object-contain"
              />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-base-content">
                {title}
              </h2>
              <p className="text-base-content/70">
                {subtitle}
              </p>
            </div>
          </div>
        </div>
        
        {/* Fixed bottom button */}
        <div className="fixed bottom-5 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-base-300">
          <div className="max-w-md mx-auto">
            <BlackButton
              onClick={login}
              icon={<LockClosedIcon className="w-4 h-4" />}
              className="w-full"
            >
              Login to Buddy
            </BlackButton>
          </div>
        </div>
      </div>
    );
  }

  // Show children content with animation if authenticated
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
} 