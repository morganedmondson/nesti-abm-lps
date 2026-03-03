import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nesti — Landing Page Generator',
  description: 'Generate a personalised Nesti pitch for any estate or letting agency',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          body {
            background-color: #F9FAFB;
            color: #0E121B;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            margin: 0;
            min-height: 100vh;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
