import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GENYX AI',
  description: 'Sua assistente pessoal avançada',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-br">
      <body>{children}</body>
    </html>
  )
}

