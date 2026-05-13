'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const STEPS = [
  { id: 'init', label: 'Initialisation de l\'audit' },
  { id: 'pagespeed_mobile', label: 'Performance mobile' },
  { id: 'pagespeed_desktop', label: 'Performance desktop' },
  { id: 'schema', label: 'Données structurées Schema.org' },
  { id: 'headings', label: 'Structure des titres H1/H2/H3' },
  { id: 'content', label: 'Analyse du contenu' },
  { id: 'media', label: 'Images et attributs ALT' },
  { id: 'robots', label: 'Indexation et robots.txt' },
  { id: 'competitor', label: 'Analyse du concurrent' },
  { id: 'scoring', label: 'Scoring des 8 piliers GEO' },
  { id: 'report', label: 'Génération du rapport' },
  { id: 'email', label: 'Envoi du rapport par email' },
]

function LoadingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const auditId = searchParams.get('id')
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('Initialisation...')
  const [status, setStatus] = useState('pending')
  const [error, setError] = useState('')
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!auditId) {
      router.push('/audit')
      return
    }

    // Polling toutes les 2 secondes
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/audit-status?id=${auditId}`)
        const data = await res.json()

        if (data.error) {
          setError('Audit introuvable.')
          clearInterval(intervalRef.current)
          return
        }

        setProgress(data.progress || 0)
        setCurrentStep(data.current_step || 'En cours...')
        setStatus(data.status)

        if (data.status === 'completed') {
          clearInterval(intervalRef.current)
          router.push(`/audit/results/${auditId}`)
        }

        if (data.status === 'error') {
          clearInterval(intervalRef.current)
          setError(data.error_message || 'Une erreur est survenue.')
        }

      } catch (err) {
        console.error('Erreur polling:', err)
      }
    }, 2000)

    return () => clearInterval(intervalRef.current)
  }, [auditId, router])

  const completedSteps = Math.floor((progress / 100) * STEPS.length)

  return (
    <div className="min-h-screen bg-beige flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-10 h-10 bg-sage-dark rounded-sm flex items-center justify-center">
            <span className="text-white text-sm font-semibold">TI</span>
          </div>
        </div>

        {error ? (
          <div className="bg-white rounded-2xl border border-red-200 p-6 text-center">
            <div className="text-red-500 text-2xl mb-3">⚠</div>
            <h2 className="font-display text-xl text-ink mb-2">Erreur d'analyse</h2>
            <p className="text-muted text-sm mb-4">{error}</p>
            <button
              onClick={() => router.push('/audit')}
              className="bg-sage-dark text-white text-sm px-4 py-2 rounded-lg hover:bg-ink transition-colors"
            >
              Recommencer
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-beige-mid p-8 shadow-sm">

            {/* Titre */}
            <h2 className="font-display text-2xl text-ink text-center mb-1">
              Analyse en cours
            </h2>
            <p className="text-muted text-sm text-center mb-6">
              Votre rapport arrive dans environ 60 secondes
            </p>

            {/* Barre de progression principale */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted">{currentStep}</span>
                <span className="text-xs font-medium text-sage-dark">{progress}%</span>
              </div>
              <div className="h-2 bg-beige rounded-full overflow-hidden">
                <div
                  className="h-full bg-sage-dark rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Étapes */}
            <div className="space-y-2">
              {STEPS.map((step, idx) => {
                const isDone = idx < completedSteps
                const isActive = idx === completedSteps
                return (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className={`
                      w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                      ${isDone ? 'bg-sage-dark' : isActive ? 'bg-sage-mid animate-pulse-slow' : 'bg-beige border border-beige-mid'}
                    `}>
                      {isDone && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {isActive && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className={`text-xs transition-colors ${
                      isDone ? 'text-sage-dark font-medium' :
                      isActive ? 'text-ink font-medium' :
                      'text-muted'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>

          </div>
        )}

      </div>
    </div>
  )
}

export default function LoadingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-beige flex items-center justify-center">
        <div className="text-muted text-sm">Chargement...</div>
      </div>
    }>
      <LoadingContent />
    </Suspense>
  )
}
