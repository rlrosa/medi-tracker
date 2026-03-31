import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { GlobalNotifications } from '@/components/GlobalNotifications'
import { CapacitorInitializer } from '@/components/CapacitorInitializer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3005'),
  title: 'MediTracker — Smart Medication Management',
  description: 'Track and manage your medications easily. Never miss a dose with smart alerts and historical tracking.',
  keywords: ['medication tracker', 'pill reminder', 'health app', 'caregiver tool'],
  authors: [{ name: 'MediTracker Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'MediTracker — Smart Medication Management',
    description: 'Track and manage your medications easily. Smart alerts for you and your family.',
    siteName: 'MediTracker',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'MediTracker Dashboard Preview',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MediTracker — Smart Medication Management',
    description: 'Track and manage your medications easily.',
    images: ['/og-image.png'],
  },
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    title: 'MediTracker',
    statusBarStyle: 'black-translucent',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "MediTracker",
              "operatingSystem": "Web",
              "applicationCategory": "HealthApplication",
              "description": "Smart medication tracking and reminder application.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              }
            })
          }}
        />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <CapacitorInitializer />
          <GlobalNotifications />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
