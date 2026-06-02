import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Davyn Dashboard',
  description: 'Partner opportunities dashboard — Davyn Limited',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  )
}
