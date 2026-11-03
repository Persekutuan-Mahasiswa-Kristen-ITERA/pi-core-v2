import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { MotionObserver } from "@/components/common/motion-observer";
import { LocaleProvider } from "@/lib/i18n/client";
import { getLocale } from "@/lib/i18n/server";
import { APP_NAME, APP_SHORT_NAME, THEME_COLOR, BACKGROUND_COLOR } from "@/lib/app-config";
import "./globals.css";

// One family for the whole app, as in the Stitch design: a warm humanist grotesk with tabular
// figures. Self-hosted by next/font at build time, so it also works offline. Variable font.
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });

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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    // suppressHydrationWarning: the static offline page sets `lang` from the cookie before hydration.
    <html
      lang={locale}
      className={`${jakarta.variable} antialiased`}
      style={{ backgroundColor: BACKGROUND_COLOR }}
      suppressHydrationWarning
    >
      <body className="min-h-dvh">
        <LocaleProvider locale={locale}>
          {children}
          <Toaster position="top-center" closeButton />
          <MotionObserver />
        </LocaleProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
