'use client';

import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';

const parentPages = [
  { path: '/', title: 'Home', icon: '🏠' },
  { path: '/demo', title: 'Demo', icon: '✨' },
  { path: '/settings', title: 'Settings', icon: '⚙️' },
  { path: '/profile', title: 'Profile', icon: '👤' },
  { path: '/help', title: 'Help', icon: '❓' },
];

export default function MobileMenu() {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-base-100/95 backdrop-blur-sm border-t border-base-300 z-[9999] pb-safe"
      style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999 }}
    >
      <div className="flex items-center justify-around px-2 py-3">
        {parentPages.map((page) => (
          <button
            key={page.path}
            onClick={() => handleNavigation(page.path)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-w-[60px] relative ${
              pathname === page.path
                ? 'text-primary bg-primary/10 scale-110'
                : 'text-base-content/60 hover:text-base-content hover:bg-base-200/50'
            }`}
          >
            <div className="text-xl mb-1">{page.icon}</div>
            <div className="text-xs font-medium leading-tight">{page.title}</div>
            {pathname === page.path && (
              <div className="absolute -top-1 w-1 h-1 bg-primary rounded-full"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
} 