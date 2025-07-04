import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import PWAProvider from "./components/pwa-provider";
import TransitionProvider from "./components/transition-provider";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Buddy - Simple Payment Processing",
  description: "Simple and secure payment processing made easy",
  manifest: "/manifest.json",
  themeColor: "#000000",
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
        <meta name="theme-color" content="#000000" />
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
      <body className={`${ibmPlexSans.variable} font-sans bg-base-100 text-base-content antialiased`}>
        <TransitionProvider>
          <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
            <PWAProvider />
            {children}
          </div>
        </TransitionProvider>
      </body>
    </html>
  );
}
