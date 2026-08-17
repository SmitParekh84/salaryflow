import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";
import { BRAND } from "@/lib/brand";
import { SITE_ORIGIN } from "@/lib/site-url";
import { THEME_COLORS } from "@/lib/theme";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
/**
 * The mono face is worn by the OTP field and one confirmation string in the
 * admin console — two screens out of thirty. Declaring it here still emitted a
 * `<link rel="preload">` on every page, so the landing page and the whole app
 * spent a request and part of their bandwidth budget fetching a font they will
 * almost certainly never paint. `preload: false` leaves the family available
 * and lets the two screens that use it fetch it when they need it.
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

import ClientAuthWrapper from "@/components/client-auth-wrapper";

export const metadata: Metadata = {
  // Required for Open Graph and canonical URLs to resolve as absolute. Without
  // it Next emits relative og:image paths, which every crawler rejects.
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: `${BRAND.name} — ${BRAND.brandline.replace(/\.$/, "")}`,
    // Sub-pages set only their own name; the brand is appended here so no page
    // has to repeat it and none is left with a bare, ambiguous title.
    template: `%s — ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.brandline.replace(/\.$/, "")}`,
    description: BRAND.description,
    url: "/",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.brandline.replace(/\.$/, "")}`,
    description: BRAND.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aartha",
  },
  icons: {
    icon: [
      { url: "/icons/favicon.ico", type: "image/x-icon" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-64.png", sizes: "64x64", type: "image/png" },
    ],
    shortcut: "/icons/favicon-32.png",
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
  width: "device-width",
  initialScale: 1,
  // No maximumScale: capping zoom fails WCAG 2.1 AA 1.4.4 (Resize Text). Fields
  // are 16px on mobile, so iOS has no reason to auto-zoom on focus anyway.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider>
          <ClientAuthWrapper>{children}</ClientAuthWrapper>
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
