'use client';

import { usePrivy } from "@privy-io/react-auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

interface AuthRedirectProps {
  children: React.ReactNode;
}

export default function AuthRedirect({ children }: AuthRedirectProps) {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !authenticated && pathname !== '/') {
      router.push('/');
    }
  }, [ready, authenticated, pathname, router]);

  // If not ready, show loading
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  // If not authenticated and not on home page, don't render (will redirect)
  if (!authenticated && pathname !== '/') {
    return null;
  }

  return <>{children}</>;
} 