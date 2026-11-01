import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { APP_NAME, APP_SHORT_NAME, THEME_COLOR, BACKGROUND_COLOR } from "@/lib/app-config";
import "./globals.css";

// One family for the whole app: a friendly grotesk with open word spacing and tabular figures.
// Variable font, so one file covers every weight.
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: APP_SHORT_NAME, template: `%s · ${APP_SHORT_NAME}` },
  description: APP_NAME,
  applicationName: APP_SHORT_NAME,
  appleWebApp: {
    capable: true,
    title: APP_SHORT_NAME,
    // Dark status-bar text on the light chrome.
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEME_COLOR,
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} antialiased`} style={{ backgroundColor: BACKGROUND_COLOR }}>
      <body className="min-h-dvh">
        {children}
        <Toaster position="top-center" richColors closeButton />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
