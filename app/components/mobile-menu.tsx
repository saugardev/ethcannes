'use client';

import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { 
  ArrowDownIcon, 
  ArrowUpIcon, 
  ClockIcon, 
  CogIcon 
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import { usePrivy } from "@privy-io/react-auth";
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

const parentPages = [
  { path: '/history', title: 'Tx History', icon: 'history' },
  { path: '/send', title: 'Send', icon: 'send' },
  { path: '/', title: 'Home', icon: 'home' },
  { path: '/receive', title: 'Receive', icon: 'receive' },
  { path: '/settings', title: 'Settings', icon: 'settings' },
];

export default function MobileMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const previousAuthState = useRef<boolean | null>(null);
  const isFreshLogin = useRef(false);

  // Track authentication state changes to detect fresh logins
  useEffect(() => {
    if (ready) {
      if (previousAuthState.current === false && authenticated === true) {
        // User just logged in (transition from false to true)
        isFreshLogin.current = true;
        // Reset the flag after animation completes
        setTimeout(() => {
          isFreshLogin.current = false;
        }, 3000);
      }
      previousAuthState.current = authenticated;
    }
  }, [ready, authenticated]);

  if (!ready || !authenticated) {
    return null;
  }

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const renderIcon = (iconType: string, isActive: boolean) => {
    const iconClass = `w-6 h-6 ${isActive ? 'text-primary' : 'text-base-content/60'}`;
    
    switch (iconType) {
      case 'home':
        return (
          <Image
            src="/logo.svg"
            alt="Home"
            width={24}
            height={24}
            className={isActive ? 'opacity-100' : 'opacity-60'}
          />
        );
      case 'receive':
        return <ArrowDownIcon className={iconClass} />;
      case 'send':
        return <ArrowUpIcon className={iconClass} />;
      case 'history':
        return <ClockIcon className={iconClass} />;
      case 'settings':
        return <CogIcon className={iconClass} />;
      default:
        return null;
    }
  };

      return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeInOut", delay: isFreshLogin.current ? 2 : 0 }}
      className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-base-300 z-[9999] pb-safe"
      style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999 }}
    >
      <div className="flex items-center justify-around px-2 py-3">
        {parentPages.map((page, index) => (
          <motion.button
            key={page.path}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
            onClick={() => handleNavigation(page.path)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-[60px] relative ${
              pathname === page.path
                ? 'text-primary bg-primary/10 scale-110'
                : 'text-base-content/60 hover:text-base-content hover:bg-base-200/50'
            }`}
          >
            <div className="mb-1">{renderIcon(page.icon, pathname === page.path)}</div>
            <div className="text-xs font-medium leading-tight">{page.title}</div>
            {pathname === page.path && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
                className="absolute -top-1 w-1 h-1 bg-primary rounded-full"
              />
            )}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
} 