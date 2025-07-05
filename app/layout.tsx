import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import PWAProvider from "@/providers/pwa-provider";
import TransitionProvider from "./components/transition-provider";
import MobileMenu from "./components/mobile-menu";
import NexusProvider from "@/providers/nexus-provider";
import PrivyProvider from "@/providers/privy-provider";
import WalletConnection from "./components/wallet-connection";
import AuthRedirect from "./components/auth-redirect";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Buddy - Simple Payment Processing",
  description: "Simple and secure payment processing made easy",
  manifest: "/manifest.json",
  themeColor: "#eeeef4",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Buddy",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#eeeef4" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Buddy" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="view-transition" content="same-origin" />
        <style>{`
          @view-transition {
            navigation: auto;
          }
        `}</style>
      </head>
      <body className={`${ibmPlexSans.variable} font-sans bg-background text-base-content antialiased overflow-x-hidden`}>
        <NexusProvider>
          <PrivyProvider>
            <WalletConnection />
            <PWAProvider />
            <AuthRedirect>
              <div className="min-h-screen relative">
                <TransitionProvider>
                  {children}
                </TransitionProvider>
              </div>
            </AuthRedirect>
            <MobileMenu />
          </PrivyProvider>
        </NexusProvider>

      </body>
    </html>
  );
}
