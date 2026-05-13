import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Audit GEO Gratuit — The Impacters',
  description: 'Analysez votre visibilité sur les moteurs IA (ChatGPT, Perplexity, Gemini) en 2 minutes. Rapport complet sur les 8 piliers GEO.',
  openGraph: {
    title: 'Audit GEO Gratuit — The Impacters',
    description: 'Découvrez si votre site apparaît dans les réponses IA. Analyse complète en 2 minutes.',
    url: 'https://theimpacters.fr/audit',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
