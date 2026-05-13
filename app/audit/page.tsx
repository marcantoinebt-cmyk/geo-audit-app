'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const SECTORS = [
  'Hôtellerie & Tourisme',
  'E-commerce',
  'Services B2B',
  'Restauration',
  'Immobilier',
  'Santé & Bien-être',
  'Formation & Éducation',
  'Artisanat & Créateurs',
  'Autre',
]

export default function AuditPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    main_url: '',
    competitor_url: '',
    sector: '',
    email: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  function normalizeUrl(url: string): string {
    if (!url) return url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'https://' + url
    }
    return url
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validation
    if (!form.main_url || !form.email || !form.sector) {
      setError('Merci de remplir tous les champs obligatoires.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setError('Adresse email invalide.')
      return
    }

    setLoading(true)

    try {
      const payload = {
        ...form,
        main_url: normalizeUrl(form.main_url),
        competitor_url: form.competitor_url ? normalizeUrl(form.competitor_url) : '',
      }

      const res = await fetch('/api/start-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Une erreur est survenue.')
      }

      router.push(`/audit/loading?id=${data.audit_id}`)
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue. Réessayez.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-beige flex flex-col">
      {/* Header */}
      <header className="border-b border-beige-mid px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sage-dark rounded-sm flex items-center justify-center">
            <span className="text-white text-xs font-semibold">TI</span>
          </div>
          <span className="font-display text-ink font-medium text-lg">The Impacters</span>
        </div>
        <span className="text-xs text-muted bg-sage-light px-3 py-1 rounded-full">
          Audit GEO gratuit
        </span>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-xl w-full">

          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="text-xs font-medium text-sage-dark bg-sage-light border border-sage-mid px-4 py-1.5 rounded-full">
              Méthode 8 piliers GEO · Cegos 2026
            </span>
          </div>

          {/* Titre */}
          <h1 className="font-display text-4xl text-ink text-center leading-tight mb-3">
            Votre site apparaît-il<br />
            <em>dans les réponses de l'IA ?</em>
          </h1>

          <p className="text-muted text-center text-sm leading-relaxed mb-8">
            Analysez votre visibilité sur ChatGPT, Perplexity et Gemini.<br />
            Rapport complet sur les 8 piliers GEO en 2 minutes. Gratuit.
          </p>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-beige-mid p-6 shadow-sm space-y-4">

            {/* URL principale */}
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                URL de votre site <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="main_url"
                value={form.main_url}
                onChange={handleChange}
                placeholder="https://www.votresite.com"
                className="w-full px-3.5 py-2.5 text-sm border border-beige-mid rounded-lg bg-beige focus:outline-none focus:border-sage-mid transition-colors"
              />
            </div>

            {/* URL concurrent */}
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                URL d'un concurrent
                <span className="text-muted font-normal ml-1">(optionnel — pour le benchmark)</span>
              </label>
              <input
                type="text"
                name="competitor_url"
                value={form.competitor_url}
                onChange={handleChange}
                placeholder="https://www.concurrent.com"
                className="w-full px-3.5 py-2.5 text-sm border border-beige-mid rounded-lg bg-beige focus:outline-none focus:border-sage-mid transition-colors"
              />
            </div>

            {/* Secteur */}
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                Votre secteur d'activité <span className="text-red-400">*</span>
              </label>
              <select
                name="sector"
                value={form.sector}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-sm border border-beige-mid rounded-lg bg-beige focus:outline-none focus:border-sage-mid transition-colors appearance-none cursor-pointer"
              >
                <option value="">Sélectionnez votre secteur</option>
                {SECTORS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">
                Email professionnel <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="vous@votreentreprise.com"
                className="w-full px-3.5 py-2.5 text-sm border border-beige-mid rounded-lg bg-beige focus:outline-none focus:border-sage-mid transition-colors"
              />
            </div>

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-red-600 text-xs">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sage-dark hover:bg-ink text-white font-medium text-sm py-3 px-6 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Lancement...
                </>
              ) : (
                <>
                  Lancer mon audit GEO gratuit
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </>
              )}
            </button>

            {/* RGPD */}
            <p className="text-xs text-muted text-center leading-relaxed">
              Votre email est utilisé uniquement pour vous envoyer votre rapport.
              Pas de spam. Désabonnement en un clic.
            </p>
          </form>

          {/* Social proof */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-sage-mid rounded-full"></span>
              Méthode Cegos 2026
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-sage-mid rounded-full"></span>
              8 piliers GEO analysés
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-sage-mid rounded-full"></span>
              Rapport DOCX inclus
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
