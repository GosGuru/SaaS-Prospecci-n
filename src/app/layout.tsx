import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'ProspectoSAS - CRM & Prospección Inteligente',
  description: 'Plataforma de prospección y ventas con Google Places, WhatsApp y Email',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`} suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#12121a',
                color: '#e4e4e7',
                border: '1px solid #2a2a3a',
                borderRadius: '12px',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#12121a',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#12121a',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
